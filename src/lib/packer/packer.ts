// ============================================================================
// Алгоритм 3D-упаковки (bin packing) с учётом прямоугольных и цилиндрических грузов.
//
// Принцип работы:
//   1. Каждый груз "размножается" на quantity штук.
//   2. Для каждого из трёх вариантов (вдоль, поперёк, смешанный) строится
//      раскладка по алгоритму "крайних точек" (extreme points heuristic).
//   3. Поддерживается штабелирование (stackable) с ограничением высоты.
//   4. Цилиндры размещаются как bounding-box (ширина = высота = диаметр),
//      вертикальный поворот запрещён (ось цилиндра всегда горизонтальна вдоль X).
//   5. Грузы сортируются по порядку точки загрузки (loadingPoint.order).
// ============================================================================

import type {
  Cargo,
  LayoutVariant,
  LoadingPoint,
  PackResult,
  PackSettings,
  PackedItem,
  Vehicle,
} from '../../types';
import { getCargoSize } from '../../types';
import type { Box, Orientation, PlacedBox } from './types';

/** Палитра цветов для размещённых грузов */
const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
];

/** Конвертация груза (Cargo) во "внутреннюю коробку" (Box) */
function toBox(cargo: Cargo, index: number): Box {
  const size = getCargoSize(cargo);
  return {
    id: cargo.id,
    name: cargo.name,
    nameKey: cargo.nameKey,
    shape: cargo.shape,
    diameter: cargo.diameter,
    cylinderOrientation: cargo.cylinderOrientation,
    length: size.length,
    width: size.width,
    height: size.height,
    weight: cargo.weight,
    stackable: cargo.stackable,
    maxLoad: cargo.maxLoad,
    stopOrder: cargo.stopOrder,
    compatibilityGroup: cargo.compatibilityGroup,
    isOversize: cargo.isOversize,
    color: COLORS[index % COLORS.length],
  };
}

/** Проверка, является ли размещённый бокс вертикальным цилиндром */
function isVerticalCylinder(p: PlacedBox): boolean {
  return p.shape === 'cylinder' && p.cylinderOrientation === 'vertical';
}

/**
 * Правило совместимости при штабелировании:
 * груз можно ставить на груз только если они "одного типа" —
 *  - прямоугольный/паллета только на прямоугольный (не на цилиндр);
 *  - цилиндр только на цилиндр той же ориентации (не на паллету).
 * Цилиндр на цилиндр допускается, если ориентации совпадают (обе гор. или обе верт.),
 * иначе пересечение по основанию нестабильно физически.
 */
function canStackOn(upper: Box, below: PlacedBox): boolean {
  // Ограничение по нагрузке: если у нижнего задан положительный maxLoad,
  // верхний не должен его превышать. maxLoad = 0/не задан означает
  // «без ограничения» — ставить сверху можно грузы любого веса.
  const maxLoad = below.maxLoad ?? 0;
  if (maxLoad > 0 && upper.weight > maxLoad) return false;

  // Группы совместимости: если у обоих заданы группы и они различаются — штабелировать нельзя.
  const upGroup = upper.compatibilityGroup;
  const lowGroup = below.compatibilityGroup;
  if (upGroup != null && lowGroup != null && upGroup !== lowGroup) return false;

  const upCylinder = upper.shape === 'cylinder';
  const lowCylinder = below.shape === 'cylinder';
  if (upCylinder !== lowCylinder) return false;             // паллета не на трубу и наоборот
  if (upCylinder && lowCylinder) {
    return upper.cylinderOrientation === below.cylinderOrientation;
  }
  return true; // оба прямоугольные
}

/** Проверка пересечения двух размещённых боксов (с учётом круглых цилиндров) */
function intersects(a: PlacedBox, b: PlacedBox): boolean {
  // По высоте — всегда AABB
  if (a.y >= b.y + b.placedHeight || a.y + a.placedHeight <= b.y) return false;

  // Если оба — вертикальные цилиндры, проверяем пересечение кругов на XZ
  if (isVerticalCylinder(a) && isVerticalCylinder(b)) {
    const aDiam = a.placedLength; // для верт. цилиндра placedLength = placedWidth = diameter
    const bDiam = b.placedLength;
    const aCx = a.x + aDiam / 2;
    const aCz = a.z + aDiam / 2;
    const bCx = b.x + bDiam / 2;
    const bCz = b.z + bDiam / 2;
    const dx = aCx - bCx;
    const dz = aCz - bCz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < (aDiam + bDiam) / 2;
  }

  // Если один — вертикальный цилиндр, другой — AABB: проверяем центр окружности vs прямоугольник
  if (isVerticalCylinder(a)) {
    const aDiam = a.placedLength;
    const aCx = a.x + aDiam / 2;
    const aCz = a.z + aDiam / 2;
    const aR = aDiam / 2;
    // Ближайшая точка на прямоугольнике b к центру окружности a
    const closestX = Math.max(b.x, Math.min(aCx, b.x + b.placedLength));
    const closestZ = Math.max(b.z, Math.min(aCz, b.z + b.placedWidth));
    const dx = aCx - closestX;
    const dz = aCz - closestZ;
    return (dx * dx + dz * dz) < (aR * aR);
  }
  if (isVerticalCylinder(b)) {
    const bDiam = b.placedLength;
    const bCx = b.x + bDiam / 2;
    const bCz = b.z + bDiam / 2;
    const bR = bDiam / 2;
    const closestX = Math.max(a.x, Math.min(bCx, a.x + a.placedLength));
    const closestZ = Math.max(a.z, Math.min(bCz, a.z + a.placedWidth));
    const dx = bCx - closestX;
    const dz = bCz - closestZ;
    return (dx * dx + dz * dz) < (bR * bR);
  }

  // Стандартная AABB проверка
  return (
    a.x < b.x + b.placedLength &&
    a.x + a.placedLength > b.x &&
    a.z < b.z + b.placedWidth &&
    a.z + a.placedWidth > b.z
  );
}

/** Раздельные зазоры: от стен, между рядами по ширине (Z), между рядами по длине (X) */
export interface Gaps {
  walls: number;
  width: number;
  length: number;
}

/** Расширяет бокс на зазоры по осям X (length) и Z (width) — только для проверки коллизий */
function inflate(g: Gaps, p: PlacedBox): PlacedBox {
  return { ...p, placedLength: p.placedLength + g.length, placedWidth: p.placedWidth + g.width };
}

/**
 * Проверка пересечения с учётом направленных зазоров:
 *  - по оси X (длина кузова) — зазор между рядами по длине (gapLength);
 *  - по оси Z (ширина кузова) — зазор между рядами по ширине (gapWidth);
 *  - по оси Y (высота) — реальные размеры (зазор от потолка см. gapWalls).
 */
function intersectsGap(a: PlacedBox, b: PlacedBox, g: Gaps): boolean {
  if (g.length <= 0 && g.width <= 0) return intersects(a, b);
  return intersects(inflate(g, a), inflate(g, b));
}

/** Возможные ориентации бокса. Цилиндры не могут вращаться вертикально. */
function getOrientations(box: Box, mode: 'along' | 'across' | 'mixed'): Orientation[] {
  // Цилиндр: горизонтальная ось (длина), ширина = высота = диаметр.
  // Вертикальный поворот запрещён, горизонтальный — разрешён.
  if (box.shape === 'cylinder') {
    // Вертикальный цилиндр: проекция на пол — круг диаметром diameter
    // placedLength = placedWidth = diameter, placedHeight = длина цилиндра
    if (box.cylinderOrientation === 'vertical') {
      const d = box.diameter ?? box.width;
      return [{ dx: d, dy: box.length, dz: d, rotY: 0 }];
    }
    // Горизонтальный цилиндр (по умолчанию)
    if (mode === 'along') {
      return [{ dx: box.length, dy: box.height, dz: box.width, rotY: 0 }];
    } else if (mode === 'across') {
      return [{ dx: box.width, dy: box.height, dz: box.length, rotY: 90 }];
    } else {
      return [
        { dx: box.length, dy: box.height, dz: box.width, rotY: 0 },
        { dx: box.width, dy: box.height, dz: box.length, rotY: 90 },
      ];
    }
  }
  
  // Определяем длинную и короткую стороны основания
  const isLonger = box.length >= box.width;
  
  // Для режимов 'along' и 'across' принудительно задаём ориентацию
  if (mode === 'along') {
    // Вдоль: длинная сторона груза вдоль оси X (длины кузова)
    if (isLonger) {
      return [{ dx: box.length, dy: box.height, dz: box.width, rotY: 0 }];
    } else {
      // Если ширина больше длины, поворачиваем на 90° чтобы длинная сторона была вдоль X
      return [{ dx: box.width, dy: box.height, dz: box.length, rotY: 90 }];
    }
  }
  
  if (mode === 'across') {
    // Поперёк: длинная сторона груза вдоль оси Z (ширины кузова)
    if (isLonger) {
      // Если длина больше ширины, поворачиваем на 90° чтобы длинная сторона была вдоль Z
      return [{ dx: box.width, dy: box.height, dz: box.length, rotY: 90 }];
    } else {
      // Если ширина больше длины, оставляем как есть
      return [{ dx: box.length, dy: box.height, dz: box.width, rotY: 0 }];
    }
  }
  
  // Для 'mixed': сначала длинная сторона вдоль X (along-first), потом поперёк (across)
  if (isLonger) {
    return [
      { dx: box.length, dy: box.height, dz: box.width, rotY: 0 },
      { dx: box.width, dy: box.height, dz: box.length, rotY: 90 },
    ];
  }
  return [
    { dx: box.width, dy: box.height, dz: box.length, rotY: 90 },
    { dx: box.length, dy: box.height, dz: box.width, rotY: 0 },
  ];
}

/**
 * Классический алгоритм упаковки по крайним точкам (extreme points heuristic).
 * Возвращает список размещённых грузов.
 */
function packIntoBin(
  bin: { length: number; width: number; height: number },
  maxWeight: number,
  boxes: Box[],
  settings: PackSettings,
  sortMode: 'along' | 'across' | 'mixed',
  gaps: Gaps,
): PlacedBox[] {
  const placed: PlacedBox[] = [];
  let usedWeight = 0;

  // Ограничения рабочей области с учётом зазора от стен (периметр).
  // Первая точка отступает от передней и левой стенок на gapWalls, а правая
  // и задняя границы ограничены так, чтобы отступ от задней и правой стенок
  // был таким же (gapWalls). Так зазор от стен получается симметричным.
  const innerLen = bin.length - gaps.walls;
  const innerWid = bin.width - gaps.walls;
  const innerHgt = bin.height - gaps.walls;
  const points: { x: number; y: number; z: number }[] = [{ x: gaps.walls, y: 0, z: gaps.walls }];

  // Сортировка боксов в зависимости от режима (с учётом порядка выгрузки stopOrder)
  // stopOrder=1 (первая точка выгрузки) размещаем глубже (меньше X), т.е. укладываем раньше.
  const stopComp = (a: Box, b: Box): number => {
    const hasA = a.stopOrder != null;
    const hasB = b.stopOrder != null;
    if (hasA && hasB) return (a.stopOrder ?? 0) - (b.stopOrder ?? 0);
    return hasA ? -1 : hasB ? 1 : 0;
  };
  let sorted: Box[];
  // Стратегия смешанных грузов: сначала прямоугольные (заполняют углы/края),
  // затем цилиндрические заполняют оставшееся пространство.
  const shapeRank = (b: Box) => (b.shape === 'box' ? 0 : 1);
  if (sortMode === 'along') {
    sorted = [...boxes].sort((a, b) => (shapeRank(a) - shapeRank(b)) || stopComp(a, b) || (b.length - a.length));
  } else if (sortMode === 'across') {
    sorted = [...boxes].sort((a, b) => (shapeRank(a) - shapeRank(b)) || stopComp(a, b) || (b.width - a.width));
  } else {
    sorted = [...boxes].sort((a, b) => (shapeRank(a) - shapeRank(b)) || stopComp(a, b) || ((b.length * b.width) - (a.length * a.width)));
  }

  for (let boxIdx = 0; boxIdx < sorted.length; boxIdx++) {
    const box = sorted[boxIdx];
    const orientations = getOrientations(box, sortMode);
    let bestFit: { orientation: Orientation; point: { x: number; y: number; z: number } } | null = null;
    let bestScore = Infinity;

    // Сортируем точки для приоритетного размещения.
    // Для вдоль и поперёк приоритет одинаков: сначала длина кузова X
    // (от передней стенки к задней), затем ширина Z.
    points.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.z - b.z;
    });

    // Compute current bounding box of placed items for compactness scoring
    let currentMaxX = 0;
    let currentMaxZ = 0;
    for (const p of placed) {
      currentMaxX = Math.max(currentMaxX, p.x + p.placedLength);
      currentMaxZ = Math.max(currentMaxZ, p.z + p.placedWidth);
    }

    for (const point of points) {
      for (const orientation of orientations) {
        const placedLength = orientation.dx;
        const placedWidth = orientation.dz;
        const placedHeight = orientation.dy;

        // === НЕГАБАРИТНЫЕ ГРУЗЫ ===
        // Всегда на полу (Y=0), центрированы по ширине (Z), прижаты к передней стенке (X=0)
        let effX = point.x, effY = point.y, effZ = point.z;
        if (box.isOversize) {
          if (point.y > 0) continue; // негабарит — только на полу
          // Принудительно: X=0 (кабина), Z=центр по ширине, Y=0
          effX = 0;
          effY = 0;
          effZ = Math.max(0, (bin.width - placedWidth) / 2);
        } else {
          // Груз должен умещаться внутри рабочей области (с отступом от стен gapWalls)
          if (effX + placedLength > innerLen) continue;
          if (effZ + placedWidth > innerWid) continue;
        }
        if (effY + placedHeight > innerHgt) continue;

        if (settings.maxStackHeight > 0 && effY + placedHeight > settings.maxStackHeight) continue;
        if (settings.maxStackHeight === 0 && effY > 0) continue;
        if (settings.maxStackHeight > 0 && !box.stackable && effY !== 0) continue;

        // Проверка опоры: груз на слое > 0 должен стоять на совместимом грузе снизу
        if (effY > 0) {
          const hasSupport = placed.some((p) => {
            const isBelow = Math.abs(p.y + p.placedHeight - effY) < 0.01;
            if (!isBelow) return false;
            const overlapX = effX < p.x + p.placedLength && effX + placedLength > p.x;
            const overlapZ = effZ < p.z + p.placedWidth && effZ + placedWidth > p.z;
            return overlapX && overlapZ && canStackOn(box, p);
          });
          if (!hasSupport) continue;
        }

        const candidate: PlacedBox = {
          ...box,
          x: effX, y: effY, z: effZ,
          placedLength, placedWidth, placedHeight,
          rotY: orientation.rotY,
        };

        if (placed.some((p) => intersectsGap(candidate, p, gaps))) {
          continue;
        }
        if (usedWeight + box.weight > maxWeight) continue;

        // === SCORING ===
        // Критерии:
        //   - направление заполнения зависит от режима (вдоль/поперёк/смешанный)
        //   - компактность (footprint) — чем меньше занимаемый объём, тем лучше
        //   - штабелирование: предпочитаем ставить груз на другой груз, если это
        //     уменьшает занимаемый след (stacking включён и груз штабелируемый)
        const newMaxX = Math.max(currentMaxX, point.x + placedLength);
        const newMaxZ = Math.max(currentMaxZ, point.z + placedWidth);
        const footprintMax = Math.max(newMaxX, newMaxZ);

        const DIR = 1e6;   // направление заполнения (доминирует)
        const SEC = 1e3;   // вторичная ось внутри ряда
        const CMP = 100;   // компактность
        const Y_W = 0;     // не штрафуем вертикаль — поддержка проверяется отдельно

        let score: number;

        if (sortMode === 'along' || sortMode === 'across') {
          // Вдоль и поперёк: одинаковый приоритет заполнения — грузы размещаются
          // от передней стенки к задней по длине кузова X, ряды укладываются по
          // ширине кузова Z. Отличие режимов только в ориентации каждого груза
          // (задаётся в getOrientations), а не в направлении заполнения.
          score = point.x * DIR + point.z * SEC + point.y * Y_W + footprintMax * CMP;
        } else {
          // смешанный: единое направление заполнения (вдоль X, ряды по Z),
          // но в каждой позиции пробуем обе ориентации и выбираем более
          // компактную по площади следа. «Вдоль» слегка предпочтительнее,
          // чтобы ряды оставались аккуратными и груз выглядел естественно.
          const areaFootprint = newMaxX * newMaxZ;
          score = point.x * DIR + point.z * SEC + point.y * Y_W + areaFootprint * CMP;
          if (placedLength < placedWidth) score += CMP;
        }

        // Горка/штабель: лёгкое предпочтение нижних слоёв для устойчивости,
        // но не доминирующее — чтобы штабелирование работало, когда это компактно.
        if (effY > 0) {
          // Поощряем штабелирование: уменьшаем след, не плодим пустоты по полу
          score -= footprintMax * CMP * 0.8;
        }

        if (score < bestScore) {
          bestScore = score;
          bestFit = { orientation, point };
        }
      }
    }

    if (bestFit) {
      const { orientation, point } = bestFit;
      const placedBox: PlacedBox = {
        ...box,
        x: point.x,
        y: point.y,
        z: point.z,
        placedLength: orientation.dx,
        placedWidth: orientation.dz,
        placedHeight: orientation.dy,
        rotY: orientation.rotY,
      };
      placed.push(placedBox);

      usedWeight += box.weight;

      // Добавляем новые крайние точки после размещения груза
      // Точка справа от груза (по оси X), плюс зазор по длине
      points.push({ x: point.x + placedBox.placedLength + gaps.length, y: point.y, z: point.z });
      // Точка сверху от груза (по оси Y)
      points.push({ x: point.x, y: point.y + placedBox.placedHeight, z: point.z });
      // Точка сзади от груза (по оси Z), плюс зазор по ширине
      points.push({ x: point.x, y: point.y, z: point.z + placedBox.placedWidth + gaps.width });
      
      // Удаляем дубликаты и точки, попавшие внутрь уже размещённых грузов
      const uniquePoints: { x: number; y: number; z: number }[] = [];
      const epsilon = 0.001;
      for (const p of points) {
        // Пропускаем точки строго ВНУТРИ размещённых грузов (не на границе!)
        // Крайние точки генерируются на границах — их НЕЛЬЗЯ удалять
        const insidePlaced = placed.some(pl =>
          p.x > pl.x + epsilon && p.x < pl.x + pl.placedLength - epsilon &&
          p.y > pl.y + epsilon && p.y < pl.y + pl.placedHeight - epsilon &&
          p.z > pl.z + epsilon && p.z < pl.z + pl.placedWidth - epsilon
        );
        if (insidePlaced) continue;

        const isDuplicate = uniquePoints.some(up => 
          Math.abs(up.x - p.x) < epsilon && 
          Math.abs(up.y - p.y) < epsilon && 
          Math.abs(up.z - p.z) < epsilon
        );
        if (!isDuplicate) {
          uniquePoints.push(p);
        }
      }
      points.length = 0;
      points.push(...uniquePoints);
    }
  }
  
  return placed;
}

/** Осветляет/затемняет hex-цвет на указанный процент (положительный — светлее, отрицательный — темнее) */
function shadeColor(hex: string, percent: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, Math.round(r + (255 - r) * percent / 100)));
  g = Math.min(255, Math.max(0, Math.round(g + (255 - g) * percent / 100)));
  b = Math.min(255, Math.max(0, Math.round(b + (255 - b) * percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Преобразует размещённый бокс в PackedItem (формат store / сцены) */
function toPackedItem(p: PlacedBox, layerIndex: number): PackedItem {
  const dims =
    p.rotY === 90
      ? { length: p.placedWidth, width: p.placedLength, height: p.placedHeight }
      : { length: p.placedLength, width: p.placedWidth, height: p.placedHeight };

  // Грузы разных слоёв — разные оттенки цвета
  // 0-й слой: оригинальный цвет, 1-й: +20% светлее, 2-й: +40% и т.д.
  const color = layerIndex === 0 ? p.color : shadeColor(p.color, layerIndex * 20);

  return {
    id: `${p.id}-${p.x}-${p.y}-${p.z}`,
    name: p.name,
    nameKey: p.nameKey,
    shape: p.shape,
    diameter: p.diameter,
    cylinderOrientation: p.cylinderOrientation,
    dimensions: dims,
    weight: p.weight,
    position: { x: p.x, y: p.y, z: p.z },
    rotationY: p.rotY,
    color,
    stackable: p.stackable,
    maxLoad: p.maxLoad,
    stopOrder: p.stopOrder,
    compatibilityGroup: p.compatibilityGroup,
    isOversize: p.isOversize,
    layer: layerIndex,
  };
}

/** Габариты (bounding box) размещённых боксов по фактическим координатам, мм */
function measureBBox(placed: PlacedBox[]): { length: number; width: number; height: number } | undefined {
  if (placed.length === 0) return undefined;
  let maxX = 0, maxZ = 0, maxY = 0;
  for (const p of placed) {
    maxX = Math.max(maxX, p.x + p.placedLength);
    maxZ = Math.max(maxZ, p.z + p.placedWidth);
    maxY = Math.max(maxY, p.y + p.placedHeight);
  }
  return { length: Math.round(maxX), width: Math.round(maxZ), height: Math.round(maxY) };
}

/** Основная функция расчёта раскладки */
export function packItems(
  vehicle: Vehicle,
  cargo: Cargo[],
  settings?: PackSettings,
  loadingPoints?: LoadingPoint[],
): PackResult {
  try {
    const resolvedSettings: PackSettings = settings ?? {
      maxStackHeight: 0,
      allowRotation: true,
      gapsEnabled: false,
      gap: 0,
      gapWalls: 0,
      gapWidth: 0,
      gapLength: 0,
    };

    // Три независимых зазора (стойкое поведение при старых сохранённых настройках)
    const gaps: Gaps = {
      walls: resolvedSettings.gapsEnabled ? (resolvedSettings.gapWalls ?? 0) : 0,
      width: resolvedSettings.gapsEnabled ? (resolvedSettings.gapWidth ?? 0) : 0,
      length: resolvedSettings.gapsEnabled ? (resolvedSettings.gapLength ?? 0) : 0,
    };

    // Бин — полный объём кузова. Зазоры между грузами и от стен
    // создаются внутри packIntoBin: от периметра — gapWalls, между
    // соседними рядами по X — gapLength, по Z — gapWidth.
    const bin = {
      length: vehicle.length,
      width: vehicle.width,
      height: vehicle.height,
    };

    // Сортируем грузы по порядку точки загрузки (по возрастанию order),
    // чтобы грузы, загружаемые первыми, укладывались раньше.
    const orderByLoadingPoint = new Map<string, number>();
    if (loadingPoints && loadingPoints.length > 0) {
      loadingPoints.forEach((lp) => orderByLoadingPoint.set(lp.id, lp.order));
    }
    const sortedCargo = [...cargo].sort((a, b) => {
      const oa = a.loadingPointId !== undefined ? (orderByLoadingPoint.get(a.loadingPointId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const ob = b.loadingPointId !== undefined ? (orderByLoadingPoint.get(b.loadingPointId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });

    // Размножаем каждый груз на quantity штук
    const boxes: Box[] = [];
    sortedCargo.forEach((c, idx) => {
      const qty = Math.max(1, Math.floor(c.quantity || 1));
      for (let i = 0; i < qty; i++) {
        boxes.push(toBox(c, idx));
      }
    });

    if (boxes.length === 0) {
      return { error: null, variants: [] };
    }

    const modes: Array<{ mode: 'along' | 'across' | 'mixed'; label: string }> = [
      { mode: 'along', label: 'Вдоль кузова' },
      { mode: 'across', label: 'Поперёк кузова' },
      { mode: 'mixed', label: 'Смешанный' },
    ];

    const variants: LayoutVariant[] = modes.map(({ mode, label }) => {
      const placed = packIntoBin(bin, vehicle.maxWeight, boxes, resolvedSettings, mode, gaps);

      let totalWeight = 0;
      let totalVolume = 0;
      const items: PackedItem[] = placed.map((p) => {
        totalWeight += p.weight;
        if (p.shape === 'cylinder') {
          const d = p.diameter ?? 0;
          totalVolume += Math.PI * (d / 2) ** 2 * p.length;
        } else {
          totalVolume += p.placedLength * p.placedWidth * p.placedHeight;
        }
        // Позиция уже учитывает зазоры (стены + между грузами) — не смещаем
        const op = { ...p };
        // Вычисляем индекс слоя
        const layerIndex = Math.round(op.y / Math.max(1, op.placedHeight));
        return toPackedItem(op, layerIndex);
      });

      const binVolume = bin.length * bin.width * bin.height;
      const weightFill = vehicle.maxWeight > 0 ? (totalWeight / vehicle.maxWeight) * 100 : 0;

      // Габариты укладки (bounding box) с учётом зазоров: позиции грузов уже
      // включают зазоры (стены + между рядами), поэтому bbox растёт с зазорами.
      const dims = measureBBox(placed);
      // Габариты без учёта зазоров: перекладываем с нулевыми зазорами и замеряем
      // bbox по фактическим координатам грузов — не должна меняться от зазоров.
      const dimsWithoutGaps =
        gaps.walls > 0 || gaps.width > 0 || gaps.length > 0
          ? measureBBox(
              packIntoBin(bin, vehicle.maxWeight, boxes, resolvedSettings, mode, { walls: 0, width: 0, length: 0 }),
            )
          : dims;

      // Заполнение объёма и свободный объём считаются от СУММЫ физических объёмов
      // грузов (totalVolume), а не от bounding box — зазоры на них не влияют.
      const volumeFill = binVolume > 0 ? (totalVolume / binVolume) * 100 : 0;

      return {
        id: mode,
        label,
        labelKey: `mode.${mode}`,
        items,
        dimensions: items.length > 0 ? dims : undefined,
        dimensionsWithoutGaps: items.length > 0 ? dimsWithoutGaps : undefined,
        volumeFill: Math.round(volumeFill * 10) / 10,
        weightFill: Math.round(weightFill * 10) / 10,
        totalWeight: Math.round(totalWeight),
        totalVolume: Math.round(totalVolume),
        freeVolume: Math.max(0, binVolume - totalVolume),
        freeWeight: Math.max(0, vehicle.maxWeight - totalWeight),
      };
    });

    return { error: null, variants };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Ошибка при расчёте раскладки',
      variants: [],
    };
  }
}

/** Результат проверки возможности размещения/штабелирования */
export interface FitCheck {
  ok: boolean;
  /** Причина невозможности (для тоста) */
  reason: string;
  /** Код причины для локализованного тоста (только если !ok) */
  code?: 'tooHigh' | 'incompatible' | 'spaceWithGaps' | 'space';
  /** Имя груза, вызвавшего невозможность (для code='tooHigh') */
  cargoName?: string;
}

/** Высота груза в уложенном виде (одинаково для canFitAll/canStackAll) */
function itemPlacedHeight(c: Cargo): number {
  const size = getCargoSize(c);
  return c.shape === 'cylinder'
    ? (c.cylinderOrientation === 'vertical' ? size.length : (c.diameter ?? size.width))
    : size.height;
}

/** Есть ли заведомо несовместимые типы грузов (паллеты + цилиндры) для совместного штабелирования */
function stackIncompatible(cargo: Cargo[]): boolean {
  const stackable = cargo.filter((c) => c.stackable);
  const hasBox = stackable.some((c) => c.shape === 'box');
  const hasCyl = stackable.some((c) => c.shape === 'cylinder');
  return hasBox && hasCyl;
}

function totalQuantity(cargo: Cargo[]): number {
  return cargo.reduce((sum, c) => sum + Math.max(1, Math.floor(c.quantity || 1)), 0);
}

/**
 * Размещает все грузы и возвращает МАКСИМАЛЬНОЕ число размещённых грузов при
 * заданных настройках. Если задан mode ('along' | 'across' | 'mixed') — только
 * в этом режиме укладки; иначе — среди всех трёх режимов.
 */
function countPlaced(vehicle: Vehicle, cargo: Cargo[], gaps: Gaps, maxStackHeight: number, mode?: string): number {
  const s: PackSettings = {
    maxStackHeight,
    allowRotation: true,
    gapsEnabled: true,
    gap: gaps.walls,
    gapWalls: gaps.walls,
    gapWidth: gaps.width,
    gapLength: gaps.length,
  };
  const result = packItems(vehicle, cargo, s, undefined);
  let max = 0;
  for (const v of result.variants) {
    if (v && (mode == null || v.id === mode)) {
      max = Math.max(max, v?.items?.length ?? 0);
    }
  }
  return max;
}

/** Проверка, помещаются ли все грузы при заданных зазорах и режиме штабелирования */
export function canFitAll(vehicle: Vehicle, cargo: Cargo[], gaps: Gaps, stackingEnabled: boolean, mode?: string): FitCheck {
  const total = totalQuantity(cargo);
  const placed = countPlaced(vehicle, cargo, gaps, stackingEnabled ? vehicle.height : 0, mode);
  if (placed >= total) return { ok: true, reason: '' };
  if (stackingEnabled) {
    // 1) Груз выше кузова — штабелирование в принципе невозможно
    for (const c of cargo) {
      const itemHeight = itemPlacedHeight(c);
      if (itemHeight > vehicle.height) {
        return { ok: false, code: 'tooHigh', cargoName: c.name, reason: `груз "${c.name}" выше кузова` };
      }
    }
    // 2) Несовместимые типы грузов (паллеты нельзя ставить на цилиндры и наоборот)
    if (stackIncompatible(cargo)) {
      return { ok: false, code: 'incompatible', reason: 'несовместимые грузы' };
    }
    // 3) Не помещается по месту с текущими зазорами (можно уменьшить зазоры или отключить их)
    return {
      ok: false,
      code: 'spaceWithGaps',
      reason: 'грузы не помещаются с текущими зазорами. Уменьшите зазоры или отключите их.',
    };
  }
  return { ok: false, code: 'space', reason: `Не хватает места: не поместилось ${total - placed} грузов` };
}

/** Максимально допустимые значения трёх типов зазора (0 — тип невозможен) */
export interface GapTypeMaxes {
  /** Зазор от стен (сжимает кузов со всех сторон) */
  walls: number;
  /** Зазор между рядами по ширине */
  width: number;
  /** Зазор между рядами по длине */
  length: number;
}

/**
 * Ищет максимально допустимые значения для каждого типа зазора (от стен, между
 * рядами по ширине, между рядами по длине) для текущего режима раскладки.
 * Используется прямой геометрический расчёт: для каждого типа ищется наибольшее
 * значение (сверху вниз от геометрической верхней границы кузова) с точностью
 * до 1 мм, при котором все грузы ещё помещаются. Типы перебираются поочерёдно,
 * фиксируя уже найденные значения предыдущих — итоговый набор гарантированно
 * помещается. Если даже с зазором 1 мм грузы не помещаются — тип считается
 * невозможным и возвращается 0 мм.
 */
export function findMaxGapByType(
  vehicle: Vehicle,
  cargo: Cargo[],
  mode?: string,
  stackingEnabled = false,
): GapTypeMaxes {
  // Геометрические верхние границы поиска (в мм): зазор не может быть больше
  // соответствующего габарита кузова, от стен — больше минимального габарита.
  const bounds: Record<'walls' | 'width' | 'length', number> = {
    walls: Math.floor(Math.min(vehicle.length, vehicle.width, vehicle.height)),
    width: Math.floor(vehicle.width),
    length: Math.floor(vehicle.length),
  };
  const search = (key: 'walls' | 'width' | 'length', base: Gaps): number => {
    if (!canFitAll(vehicle, cargo, { ...base, [key]: 1 }, stackingEnabled, mode).ok) return 0;
    let lo = 1;
    let hi = bounds[key];
    // Возможность размещения монотонно убывает с ростом зазора — бинарный поиск
    // точного максимума с шагом 1 мм.
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (canFitAll(vehicle, cargo, { ...base, [key]: mid }, stackingEnabled, mode).ok) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return Math.max(0, hi);
  };
  const walls = search('walls', { walls: 0, width: 0, length: 0 });
  const width = search('width', { walls, width: 0, length: 0 });
  const length = search('length', { walls, width, length: 0 });
  return { walls, width, length };
}

/**
 * Проверка возможности штабелирования всех грузов при включении чекбокса.
 * НЕ зависит от текущих зазоров: зазоры не могут помешать штабелированию.
 * Проверяются только совместимость грузов (паллеты/цилиндры), высота груза
 * (двойная высота должна помещаться в кузов, иначе штабелирование бессмысленно,
 * а один груз не может быть выше кузова) и физическая раскладка при нулевых
 * зазорах на полную высоту кузова (несколько слоёв).
 */
export function canStackAll(vehicle: Vehicle, cargo: Cargo[]): FitCheck {
  const total = totalQuantity(cargo);
  // 1) Несовместимые типы грузов (паллеты нельзя ставить на цилиндры и наоборот)
  if (stackIncompatible(cargo)) {
    return { ok: false, code: 'incompatible', reason: 'несовместимые грузы (паллеты нельзя ставить на цилиндры и наоборот)' };
  }
  // 2) Высота груза: для штабелирования двухслойной постановки нужно, чтобы две
  //    высоты помещались в кузов (груз.height * 2 <= vehicle.height), а один груз
  //    не был выше кузова. Иначе штабелирование в принципе невозможно.
  for (const c of cargo) {
    const itemHeight = itemPlacedHeight(c);
    if (itemHeight > 0 && itemHeight * 2 > vehicle.height) {
      return { ok: false, code: 'tooHigh', cargoName: c.name, reason: `нельзя штабелировать 2 слоя груза "${c.name}"` };
    }
  }
  // 3) Раскладка при нулевых зазорах и полной высоте кузова — несколько слоёв
  const placed = countPlaced(vehicle, cargo, { walls: 0, width: 0, length: 0 }, vehicle.height);
  if (placed < total) {
    return { ok: false, code: 'space', reason: `Не хватает места: не поместилось ${total - placed} грузов` };
  }
  return { ok: true, reason: '' };
}