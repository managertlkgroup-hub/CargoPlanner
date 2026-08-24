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
function getOrientations(box: Box, allowRotation: boolean): Orientation[] {
  // Цилиндр: ось всегда вдоль X (длина), ширина = высота = диаметр.
  // Вертикальный поворот запрещён.
  if (box.shape === 'cylinder') {
    return [{ dx: box.length, dy: box.height, dz: box.width, rotY: 0 }];
  }
  // Прямоугольник: если вращение разрешено — пробуем два поворота в плане (0 и 90°).
  if (!allowRotation) {
    return [{ dx: box.length, dy: box.height, dz: box.width, rotY: 0 }];
  }
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

  const points: { x: number; y: number; z: number }[] = [{ x: 0, y: 0, z: 0 }];

  // Сортировка боксов в зависимости от варианта
  const sorted = [...boxes];
  if (sortMode === 'along') {
    // Вдоль: сначала длинные грузы
    sorted.sort((a, b) => b.length - a.length);
  } else if (sortMode === 'across') {
    // Поперёк: сначала широкие грузы
    sorted.sort((a, b) => b.width - a.width);
  } else {
    // Смешанный: по максимальному габариту (по убыванию)
    sorted.sort(
      (a, b) =>
        Math.max(b.length, b.width, b.height) - Math.max(a.length, a.width, a.height),
    );
  }

  for (const box of sorted) {
    const orientations = getOrientations(box, settings.allowRotation);
    let bestFit: { orientation: Orientation; point: { x: number; y: number; z: number } } | null = null;
    let bestScore = Infinity;

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

        // Выбираем лучшую точку (минимизируем "высоту" и занимаемую область)
        const score =
          point.y +
          point.x / bin.length +
          point.z / bin.width +
          (point.x + placedLength) / bin.length +
          (point.z + placedWidth) / bin.width;

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
      points.push(
        { x: point.x + placedBox.placedLength, y: point.y, z: point.z },
        { x: point.x, y: point.y + placedBox.placedHeight, z: point.z },
        { x: point.x, y: point.y, z: point.z + placedBox.placedWidth },
      );
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