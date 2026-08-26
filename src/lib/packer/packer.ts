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
    shape: cargo.shape,
    diameter: cargo.diameter,
    length: size.length,
    width: size.width,
    height: size.height,
    weight: cargo.weight,
    stackable: cargo.stackable,
    color: COLORS[index % COLORS.length],
  };
}

/** Проверка пересечения двух размещённых боксов (по осям X, Y, Z) */
function intersects(a: PlacedBox, b: PlacedBox): boolean {
  return (
    a.x < b.x + b.placedLength &&
    a.x + a.placedLength > b.x &&
    a.y < b.y + b.placedHeight &&
    a.y + a.placedHeight > b.y &&
    a.z < b.z + b.placedWidth &&
    a.z + a.placedWidth > b.z
  );
}

/** Возможные ориентации бокса. Цилиндры не могут вращаться вертикально. */
function getOrientations(box: Box, mode: 'along' | 'across' | 'mixed'): Orientation[] {
  // Цилиндр: ось всегда вдоль X (длина), ширина = высота = диаметр.
  // Вертикальный поворот запрещён.
  if (box.shape === 'cylinder') {
    return [{ dx: box.length, dy: box.height, dz: box.width, rotY: 0 }];
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
  
  // Для 'mixed' разрешаем оба варианта для перебора лучшей ориентации
  return [
    { dx: box.length, dy: box.height, dz: box.width, rotY: 0 },
    { dx: box.width, dy: box.height, dz: box.length, rotY: 90 },
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
): PlacedBox[] {
  const placed: PlacedBox[] = [];
  let usedWeight = 0;

  // Список крайних точек
  const points: { x: number; y: number; z: number }[] = [{ x: 0, y: 0, z: 0 }];

  // Сортировка боксов в зависимости от режима
  let sorted: Box[];
  if (sortMode === 'along') {
    sorted = [...boxes].sort((a, b) => b.length - a.length);
  } else if (sortMode === 'across') {
    sorted = [...boxes].sort((a, b) => b.width - a.width);
  } else {
    sorted = [...boxes].sort((a, b) => (b.length * b.width) - (a.length * a.width));
  }

  console.log(`[packIntoBin] Режим: ${sortMode}, грузов: ${sorted.length}, кузов: ${bin.length}x${bin.width}x${bin.height}`);

  // Счётчик уже размещённых ориентаций (только для mixed)
  let alongCount = 0;
  let acrossCount = 0;

  for (let boxIdx = 0; boxIdx < sorted.length; boxIdx++) {
    const box = sorted[boxIdx];
    const orientations = getOrientations(box, sortMode);
    let bestFit: { orientation: Orientation; point: { x: number; y: number; z: number } } | null = null;
    let bestScore = Infinity;

    // Сортируем точки для приоритетного размещения
    points.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (sortMode === 'along') {
        // along: длинная сторона вдоль X → заполняем по Z (min X, потом min Z)
        if (a.x !== b.x) return a.x - b.x;
        return a.z - b.z;
      } else if (sortMode === 'across') {
        // across: длинная сторона вдоль Z → заполняем по X (min Z, потом min X)
        if (a.z !== b.z) return a.z - b.z;
        return a.x - b.x;
      } else {
        // mixed: min(X+Z) — равномерное заполнение
        const sumA = a.x + a.z;
        const sumB = b.x + b.z;
        if (sumA !== sumB) return sumA - sumB;
        return a.x - b.x;
      }
    });

    for (const point of points) {
      for (const orientation of orientations) {
        const placedLength = orientation.dx;
        const placedWidth = orientation.dz;
        const placedHeight = orientation.dy;

        if (point.x + placedLength > bin.length) continue;
        if (point.y + placedHeight > bin.height) continue;
        if (point.z + placedWidth > bin.width) continue;

        if (settings.maxStackHeight > 0 && point.y + placedHeight > settings.maxStackHeight) continue;
        if (!box.stackable && point.y !== 0) continue;

        const candidate: PlacedBox = {
          ...box,
          x: point.x, y: point.y, z: point.z,
          placedLength, placedWidth, placedHeight,
          rotY: orientation.rotY,
        };

        if (placed.some((p) => intersects(candidate, p))) {
          const collider = placed.find((p) => intersects(candidate, p));
          if (collider) {
            console.warn(
              `[packIntoBin] Коллизия: ${box.name} (point=(${point.x},${point.y},${point.z}), ` +
              `size=${placedLength}x${placedWidth}) с ` +
              `${collider.name} (x=${collider.x}, z=${collider.z}, ` +
              `size=${collider.placedLength}x${collider.placedWidth}) — пропуск`
            );
          }
          continue;
        }
        if (usedWeight + box.weight > maxWeight) continue;

        // === SCORING ===
        let score: number;

        if (sortMode === 'along') {
          // along: длинная сторона вдоль X, заполняем Z → min X, потом min Z
          score = point.y * 1e9 + point.x * 1e6 + point.z;
        } else if (sortMode === 'across') {
          // across: длинная сторона вдоль Z, заполняем по X → min Z, потом min X
          score = point.y * 1e9 + point.z * 1e6 + point.x;
        } else {
          // mixed: минимизируем расстояние до начала + штраф за перекос
          score = point.y * 1e9 + (point.x + point.z) * 1e3;
          // Бонус за чередование ориентаций (смешиваем вдоль/поперёк)
          const isAlong = orientation.rotY === 0;
          const dominated = isAlong ? alongCount : acrossCount;
          const other = isAlong ? acrossCount : alongCount;
          if (dominated > other) {
            score += (dominated - other) * 1e4; // штраф за «лишнюю» ориентацию
          } else {
            score -= 1; // лёгкий бонус за «недостающую» ориентацию
          }
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

      // Трекаем количество ориентаций для mixed
      if (sortMode === 'mixed') {
        if (orientation.rotY === 0) alongCount++;
        else acrossCount++;
      }
      usedWeight += box.weight;

      // Добавляем новые крайние точки после размещения груза
      // Точка справа от груза (по оси X)
      points.push({ x: point.x + placedBox.placedLength, y: point.y, z: point.z });
      // Точка сверху от груза (по оси Y)
      points.push({ x: point.x, y: point.y + placedBox.placedHeight, z: point.z });
      // Точка сзади от груза (по оси Z)
      points.push({ x: point.x, y: point.y, z: point.z + placedBox.placedWidth });
      
      // Удаляем дубликаты и точки, попавшие внутрь уже размещённых грузов
      const uniquePoints: { x: number; y: number; z: number }[] = [];
      const epsilon = 0.001;
      for (const p of points) {
        // Пропускаем точки внутри размещённых грузов
        const insidePlaced = placed.some(pl =>
          p.x >= pl.x - epsilon && p.x <= pl.x + pl.placedLength + epsilon &&
          p.y >= pl.y - epsilon && p.y <= pl.y + pl.placedHeight + epsilon &&
          p.z >= pl.z - epsilon && p.z <= pl.z + pl.placedWidth + epsilon
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
    } else {
      console.log(`[packIntoBin] Не удалось разместить груз: ${box.name} (${box.length}x${box.width}x${box.height})`);
    }
  }
  
  console.log(`[packIntoBin] Размещено грузов: ${placed.length} из ${sorted.length}`);
  if (placed.length > 0) {
    console.log('[packIntoBin] Координаты размещённых грузов:');
    placed.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name}: x=${p.x}, y=${p.y}, z=${p.z}, size=${p.placedLength}x${p.placedWidth}x${p.placedHeight}`);
    });

    // Пост-проверка: убеждаемся что нет пересечений между размещёнными грузами
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (intersects(placed[i], placed[j])) {
          console.warn(
            `[packIntoBin] ⚠️ КОЛЛИЗИЯ: ${placed[i].name} (x=${placed[i].x}, z=${placed[i].z}, ` +
            `size=${placed[i].placedLength}x${placed[i].placedWidth}) и ` +
            `${placed[j].name} (x=${placed[j].x}, z=${placed[j].z}, ` +
            `size=${placed[j].placedLength}x${placed[j].placedWidth})`
          );
        }
      }
    }
  }

  return placed;
}

/** Преобразует размещённый бокс в PackedItem (формат store / сцены) */
function toPackedItem(p: PlacedBox): PackedItem {
  const dims =
    p.rotY === 90
      ? { length: p.placedWidth, width: p.placedLength, height: p.placedHeight }
      : { length: p.placedLength, width: p.placedWidth, height: p.placedHeight };

  return {
    id: `${p.id}-${p.x}-${p.y}-${p.z}`,
    name: p.name,
    shape: p.shape,
    diameter: p.diameter,
    dimensions: dims,
    weight: p.weight,
    position: { x: p.x, y: p.y, z: p.z },
    rotationY: p.rotY,
    color: p.color,
    stackable: p.stackable,
  };
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
    };

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
      const placed = packIntoBin(bin, vehicle.maxWeight, boxes, resolvedSettings, mode);

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
        return toPackedItem(p);
      });

      const binVolume = bin.length * bin.width * bin.height;
      const volumeFill = binVolume > 0 ? (totalVolume / binVolume) * 100 : 0;
      const weightFill = vehicle.maxWeight > 0 ? (totalWeight / vehicle.maxWeight) * 100 : 0;

      return {
        id: mode,
        label,
        items,
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