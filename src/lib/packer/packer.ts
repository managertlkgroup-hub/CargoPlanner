// ============================================================================
// Алгоритм 3D-бинпакинга (упаковка грузов в кузов автомобиля)
//
// Реализован жадный алгоритм на основе "крайних точек" (Extreme Points).
// Учитывает:
//   - ограничение по весу (суммарный вес не превышает грузоподъёмность);
//   - геометрическое размещение внутри кузова;
//   - вращение грузов по осям (поворот вокруг оси Y на 90° и перевороты);
//   - штабелирование (stackable) с учётом максимальной высоты штабеля.
//
// Поддерживает три стратегии:
//   along  — все грузы ориентированы вдоль длины кузова;
//   across — все грузы ориентированы вдоль ширины кузова;
//   mixed  — автоматический выбор лучшей ориентации для каждого груза.
// ============================================================================

import type { Cargo, Dimensions, PackResult, PackSettings, PackedItem } from '../../types';
import type { Box, Orientation, PackerInput, PlacedBox } from './types';

/** Палитра цветов для визуализации грузов */
const COLOR_PALETTE = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function colorForId(id: string): string {
  return COLOR_PALETTE[hashId(id) % COLOR_PALETTE.length];
}

/** Размножает грузы на количество штук и сортирует по объёму (по убыванию) */
function expandCargo(cargo: Cargo[], strategy: 'along' | 'across' | 'mixed'): Box[] {
  const boxes: Box[] = [];
  cargo.forEach((c) => {
    for (let i = 0; i < c.quantity; i++) {
      boxes.push({
        id: `${c.id}#${i}`,
        name: c.name,
        length: c.length,
        width: c.width,
        height: c.height,
        weight: c.weight,
        stackable: c.stackable,
      });
    }
  });

  // Для "mixed" сортируем по убыванию объёма (классический эвристический приём),
  // для "along"/"across" сортируем по площади основания под соответствующую ось.
  if (strategy === 'mixed') {
    boxes.sort((a, b) => b.length * b.width * b.height - a.length * a.width * a.height);
  } else if (strategy === 'along') {
    boxes.sort((a, b) => b.length * b.width - a.length * a.width);
  } else {
    boxes.sort((a, b) => b.width * b.length - a.width * a.length);
  }
  return boxes;
}

/** Возвращает возможные ориентации груза с учётом стратегии и настроек */
function getOrientations(box: Box, strategy: 'along' | 'across' | 'mixed', allowRotation: boolean): Orientation[] {
  const { length: L, width: W, height: H } = box;

  // Ориентации: [dx, dy, dz, rotY]
  // base — горизонтальное размещение без переворота
  const baseHoriz: Orientation = { dx: L, dy: H, dz: W, rotY: 0 };
  const baseHorizRot: Orientation = { dx: W, dy: H, dz: L, rotY: 90 };

  // Перевёрнутые ориентации (груз лежит на боку)
  const sideA: Orientation = { dx: W, dy: L, dz: H, rotY: 90 };
  const sideARot: Orientation = { dx: H, dy: L, dz: W, rotY: 0 };
  const sideB: Orientation = { dx: L, dy: W, dz: H, rotY: 0 };
  const sideBRot: Orientation = { dx: H, dy: W, dz: L, rotY: 90 };

  const all: Orientation[] = [baseHoriz, baseHorizRot];

  // Вращение/перевороты добавляем только если разрешены
  if (allowRotation) {
    all.push(sideA, sideARot, sideB, sideBRot);
  }

  switch (strategy) {
    case 'along':
      // Предпочтение: длина груза вдоль длины кузова
      return [baseHoriz, baseHorizRot, ...all.filter((o) => o !== baseHoriz && o !== baseHorizRot)];
    case 'across':
      // Предпочтение: длина груза вдоль ширины кузова
      return [baseHorizRot, baseHoriz, ...all.filter((o) => o !== baseHoriz && o !== baseHorizRot)];
    default:
      return all;
  }
}

/**
 * Запускает упаковку одной стратегии.
 * Возвращает список размещённых коробок или null, если что-то не поместилось
 * по геометрии (не считая остатка по весу).
 */
function packWithStrategy(input: PackerInput, strategy: 'along' | 'across' | 'mixed'): PlacedBox[] | null {
  const { bin, maxWeight, settings } = input;
  const boxes = expandCargo(input.cargo, strategy);

  // Точки-кандидаты для размещения (крайние точки). Начинаем с угла кузова.
  const freePoints: Array<{ x: number; y: number; z: number }> = [{ x: 0, y: 0, z: 0 }];
  const placed: PlacedBox[] = [];

  let currentWeight = 0;
  // Текущая "высота пола" слоя — для оценки штабелирования
  const floorY = new Map<string, number>();

  function overlaps(p: { x: number; y: number; z: number }, dims: Dimensions): boolean {
    const p2 = { x: p.x + dims.length, y: p.y + dims.height, z: p.z + dims.width };
    if (p2.x > bin.length || p2.y > bin.height || p2.z > bin.width) return true;
    for (const q of placed) {
      const q2 = {
        x: q.x + q.placedLength,
        y: q.y + q.placedHeight,
        z: q.z + q.placedWidth,
      };
      const noOverlap =
        p.x >= q2.x || q.x >= p2.x ||
        p.y >= q2.y || q.y >= p2.y ||
        p.z >= q2.z || q.z >= p2.z;
      if (!noOverlap) return true;
    }
    return false;
  }

  /** Проверяет, поддерживается ли коробка снизу (не висит в воздухе) */
  function isSupported(p: { x: number; y: number; z: number }, dims: Dimensions): boolean {
    if (p.y <= 0.001) return true; // на полу кузова
    // Проверяем, есть ли под коробкой хотя бы одна опорная коробка (stackable)
    for (const q of placed) {
      const qTop = q.y + q.placedHeight;
      const qX = { min: q.x, max: q.x + q.placedLength };
      const qZ = { min: q.z, max: q.z + q.placedWidth };
      const overlapX = p.x < qX.max - 0.001 && p.x + dims.length > qX.min + 0.001;
      const overlapZ = p.z < qZ.max - 0.001 && p.z + dims.width > qZ.min + 0.001;
      if (Math.abs(qTop - p.y) < 0.001 && overlapX && overlapZ && q.stackable) {
        return true;
      }
    }
    return false;
  }

  /** Проверяет ограничение по максимальной высоте штабеля для данной позиции */
  function stackHeightOk(p: { x: number; y: number; z: number }, dims: Dimensions): boolean {
    if (settings.maxStackHeight <= 0) return true; // без ограничений
    // Высота штабеля = высота пола под коробкой + высота коробки
    const supportFloor = floorY.get(`${p.x.toFixed(1)}|${p.z.toFixed(1)}`) ?? 0;
    return supportFloor + dims.height <= settings.maxStackHeight;
  }

  let remainingBoxes = [...boxes];
  while (remainingBoxes.length > 0) {
    const box = remainingBoxes[0];
    remainingBoxes = remainingBoxes.slice(1);

    // Проверка веса: если коробка не влезает по весу — пропускаем её
    // (она остаётся неразмещённой, но это не критично для геометрии)
    if (currentWeight + box.weight > maxWeight) {
      continue;
    }

    const orientations = getOrientations(box, strategy, settings.allowRotation);
    let placedBox: PlacedBox | null = null;
    let bestPoint = null;
    let bestOrient: Orientation | null = null;

    // Перебираем все свободные точки в порядке добавления
    for (const point of freePoints) {
      for (const orient of orientations) {
        const dims: Dimensions = {
          length: orient.dx,
          width: orient.dz,
          height: orient.dy,
        };
        if (point.x + dims.length > bin.length + 0.001) continue;
        if (point.z + dims.width > bin.width + 0.001) continue;
        if (point.y + dims.height > bin.height + 0.001) continue;

        if (overlaps(point, dims)) continue;
        if (!isSupported(point, dims)) continue;
        if (!stackHeightOk(point, dims)) continue;

        bestPoint = point;
        bestOrient = orient;
        break;
      }
      if (bestPoint) break;
    }

    if (bestPoint && bestOrient) {
      const pb: PlacedBox = {
        ...box,
        x: bestPoint.x,
        y: bestPoint.y,
        z: bestPoint.z,
        placedLength: bestOrient.dx,
        placedWidth: bestOrient.dz,
        placedHeight: bestOrient.dy,
        rotY: bestOrient.rotY,
      };
      placed.push(pb);
      currentWeight += box.weight;

      // Добавляем крайние точки от новой коробки
      const nfp = {
        x: bestPoint.x + pb.placedLength,
        y: bestPoint.y,
        z: bestPoint.z,
      };
      const nfp2 = {
        x: bestPoint.x,
        y: bestPoint.y + pb.placedHeight,
        z: bestPoint.z,
      };
      const nfp3 = {
        x: bestPoint.x,
        y: bestPoint.y,
        z: bestPoint.z + pb.placedWidth,
      };
      freePoints.push(nfp, nfp2, nfp3);
    }
    // Если не смогли разместить — оставляем груз неразмещённым
  }

  // Считаем, успешно ли упакованы ВСЕ грузы по геометрии
  // (вес-остаток допустим — он обрабатывается на уровне вариантов)
  const placedIds = new Set(placed.map((p) => p.id));
  const unplacedByWeight = boxes.some(
    (b) => !placedIds.has(b.id) && b.weight <= maxWeight && b.weight > 0,
  );
  // Если какие-то коробки не поместились по геометрии (не из-за веса) — неудача
  const geometryFailed = boxes.some((b) => {
    if (placedIds.has(b.id)) return false;
    // Определяем причину приблизительно: коробка меньше по весу, чем лимит
    return currentWeight + b.weight <= maxWeight;
  });

  void unplacedByWeight;

  if (geometryFailed) {
    return null;
  }

  return placed;
}

/** Преобразует размещённые коробки в объект LayoutVariant */
function buildVariant(
  placed: PlacedBox[],
  input: PackerInput,
  id: string,
  label: string,
): PackResult['variants'][number] {
  const binVolume = input.bin.length * input.bin.width * input.bin.height;
  let totalWeight = 0;
  let totalVolume = 0;

  const items: PackedItem[] = placed.map((p) => {
    const v = p.placedLength * p.placedWidth * p.placedHeight;
    totalWeight += p.weight;
    totalVolume += v;
    return {
      id: p.id,
      name: p.name,
      dimensions: {
        length: p.placedLength,
        width: p.placedWidth,
        height: p.placedHeight,
      },
      weight: p.weight,
      position: { x: p.x, y: p.y, z: p.z },
      rotation: { y: p.rotY },
      color: colorForId(p.id),
      stackable: p.stackable,
    };
  });

  const volumeFill = binVolume > 0 ? (totalVolume / binVolume) * 100 : 0;
  const weightFill = input.maxWeight > 0 ? (totalWeight / input.maxWeight) * 100 : 0;

  return {
    id,
    label,
    items,
    volumeFill: Math.round(volumeFill * 10) / 10,
    weightFill: Math.round(weightFill * 10) / 10,
    totalWeight,
    totalVolume,
    freeVolume: Math.max(0, binVolume - totalVolume),
    freeWeight: Math.max(0, input.maxWeight - totalWeight),
  };
}

/** Основная точка входа: расчёт трёх вариантов раскладки */
export function packCargo(input: PackerInput): PackResult {
  const binVolume = input.bin.length * input.bin.width * input.bin.height;
  const totalCargoWeight = input.cargo.reduce((sum, c) => sum + c.weight * c.quantity, 0);

  // 1. Предварительная проверка по весу
  if (totalCargoWeight > input.maxWeight) {
    return {
      error: `Суммарный вес грузов (${totalCargoWeight} кг) превышает грузоподъёмность автомобиля (${input.maxWeight} кг).`,
      variants: [],
    };
  }

  // 2. Предварительная проверка по объёму
  const totalCargoVolume = input.cargo.reduce(
    (sum, c) => sum + c.length * c.width * c.height * c.quantity,
    0,
  );
  if (totalCargoVolume > binVolume) {
    return {
      error: `Суммарный объём грузов превышает объём кузова автомобиля. Невозможно разместить все грузы.`,
      variants: [],
    };
  }

  // 3. Запускаем три стратегии
  const strategies: Array<{ id: string; label: string; fn: 'along' | 'across' | 'mixed' }> = [
    { id: 'along', label: 'Вдоль', fn: 'along' },
    { id: 'across', label: 'Поперёк', fn: 'across' },
    { id: 'mixed', label: 'Смешанный', fn: 'mixed' },
  ];

  const variants: PackResult['variants'] = [];
  for (const s of strategies) {
    const placed = packWithStrategy(input, s.fn);
    if (placed) {
      variants.push(buildVariant(placed, input, s.id, s.label));
    }
  }

  if (variants.length === 0) {
    return {
      error: 'Не удалось разместить грузы в кузове автомобиля. Проверьте габариты грузов и настройки.',
      variants: [],
    };
  }

  // Сортируем варианты по лучшему заполнению объёма (для умолчания берём best)
  variants.sort((a, b) => b.volumeFill - a.volumeFill);

  return { error: null, variants };
}