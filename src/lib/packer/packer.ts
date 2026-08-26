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

  // Список крайних точек, отсортированный по приоритету (y, x, z)
  const points: { x: number; y: number; z: number }[] = [{ x: 0, y: 0, z: 0 }];

  // Сортировка боксов в зависимости от режима
  let sorted: Box[];
  if (sortMode === 'along') {
    // Для режима 'along' сортируем по убыванию длины (самые длинные первыми)
    sorted = [...boxes].sort((a, b) => b.length - a.length);
  } else if (sortMode === 'across') {
    // Для режима 'across' сортируем по убыванию ширины (самые широкие первыми)
    sorted = [...boxes].sort((a, b) => b.width - a.width);
  } else {
    // Для 'mixed' сортируем по убыванию площади основания (крупные первыми)
    sorted = [...boxes].sort((a, b) => (b.length * b.width) - (a.length * a.width));
  }
  
  console.log(`[packIntoBin] Режим: ${sortMode}, грузов: ${sorted.length}, кузов: ${bin.length}x${bin.width}x${bin.height}`);

  for (let boxIdx = 0; boxIdx < sorted.length; boxIdx++) {
    const box = sorted[boxIdx];
    const orientations = getOrientations(box, sortMode);
    let bestFit: { orientation: Orientation; point: { x: number; y: number; z: number }; score: number; secondary: number } | null = null;
    let bestScore = Infinity;
    let bestSecondary = Infinity;

    // Сортируем точки для приоритетного размещения:
    // along: сначала по Y, потом по X, потом по Z (заполняем по Z вдоль X)
    // across: сначала по Y, потом по Z, потом по X (заполняем по X вдоль Z)
    // mixed: сначала по Y, потом по min(X,Z), потом по max(X,Z)
    points.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (sortMode === 'along') {
        if (a.x !== b.x) return a.x - b.x;
        return a.z - b.z;
      } else if (sortMode === 'across') {
        if (a.z !== b.z) return a.z - b.z;
        return a.x - b.x;
      } else {
        // mixed: заполняем по той оси, где больше оставшегося места
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

        // Выход за границы кузова
        if (point.x + placedLength > bin.length) continue;
        if (point.y + placedHeight > bin.height) continue;
        if (point.z + placedWidth > bin.width) continue;

        // Ограничение высоты штабеля
        if (
          settings.maxStackHeight > 0 &&
          point.y + placedHeight > settings.maxStackHeight
        ) {
          continue;
        }

        // Если груз не штабелируется, он должен стоять на полу (y = 0)
        if (!box.stackable && point.y !== 0) continue;

        const candidate: PlacedBox = {
          ...box,
          x: point.x,
          y: point.y,
          z: point.z,
          placedLength,
          placedWidth,
          placedHeight,
          rotY: orientation.rotY,
        };

        // Проверка пересечений с уже размещёнными
        if (placed.some((p) => intersects(candidate, p))) continue;

        // Проверка весового лимита
        if (usedWeight + box.weight > maxWeight) continue;

        // Эвристика зависит от режима:
        // along: длинная сторона вдоль X, заполняем Z-строки → минимизируем X, потом Z
        // across: длинная сторона вдоль Z, заполняем X-строки → минимизируем Z, потом X
        // mixed: для каждой точки перебираем обе ориентации, выбираем по плотности
        let score: number;
        let secondary = 0;
        if (sortMode === 'along') {
          score = point.y * 1000000 + point.x * 1000 + point.z;
        } else if (sortMode === 'across') {
          score = point.y * 1000000 + point.z * 1000 + point.x;
        } else {
          // mixed: минимизируем «Bounding Box» — чем компактнее размещение, тем лучше
          score = point.y * 1000000 + (point.x + point.z) * 500;
          // Вторичный критерий: минимизируем дисбаланс оставшегося пространства
          // (ориентация, оставляющая более симметричное пространство, лучше)
          const remainX = bin.length - point.x - placedLength;
          const remainZ = bin.width - point.z - placedWidth;
          secondary = Math.abs(remainX - remainZ);
        }

        if (score < bestScore || (score === bestScore && secondary < bestSecondary)) {
          bestScore = score;
          bestSecondary = secondary;
          bestFit = { orientation, point, score, secondary };
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
      // Точка справа от груза (по оси X)
      points.push({ x: point.x + placedBox.placedLength, y: point.y, z: point.z });
      // Точка сверху от груза (по оси Y)
      points.push({ x: point.x, y: point.y + placedBox.placedHeight, z: point.z });
      // Точка сзади от груза (по оси Z)
      points.push({ x: point.x, y: point.y, z: point.z + placedBox.placedWidth });
      
      // Удаляем дубликаты точек (с небольшой погрешностью)
      const uniquePoints: { x: number; y: number; z: number }[] = [];
      const epsilon = 0.001;
      for (const p of points) {
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