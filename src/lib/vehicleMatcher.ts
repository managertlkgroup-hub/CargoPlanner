// ============================================================================
// Автоподбор автомобиля под грузы
// Показывает для каждого автомобиля два варианта упаковки:
//   - без штабелирования;
//   - со штабелированием (на всю высоту кузова);
// и наилучший режим раскладки (вдоль/поперёк/смешанный) для каждого из них.
// ============================================================================

import type { Cargo, LoadingPoint, PackedItem, PackResult, PackSettings, Vehicle } from '../types';
import { getCargoVolume } from '../types';
import { packItems } from './packer/packer';

export type LayoutMode = 'along' | 'across' | 'mixed';

/** Габариты bounding box размещённых грузов (мм) */
export interface CargoBounds {
  l: number;
  w: number;
  h: number;
}

/** Результат упаковки для одного варианта штабелирования */
export interface StackOption {
  /** Режим раскладки, давший лучший результат */
  mode: LayoutMode;
  /** Сколько единиц груза поместилось */
  placed: number;
  /** Заполнение объёма кузова, % */
  volumeFill: number;
  /** Заполнение по весу, % */
  weightFill: number;
  /** Габариты (min bounding box) размещённых грузов, мм */
  bBox: CargoBounds;
  /** Все ли единицы груза поместились */
  fits: boolean;
}

export interface VehicleMatch {
  vehicle: Vehicle;
  /** Суммарный объём грузов (мм³) */
  totalCargoVolume: number;
  /** Суммарный вес грузов (кг) */
  totalCargoWeight: number;
  /** Общее количество единиц груза (сумма quantities) */
  totalUnits: number;
  /** Объём кузова (мм³) */
  binVolume: number;
  /** Вариант «Без штабелирования» */
  withoutStacking: StackOption;
  /** Вариант «Со штабелированием» */
  withStacking: StackOption;
  /** Максимальное число размещённых единиц среди обоих вариантов */
  bestPlaced: number;
  /** Сколько единиц не поместилось (остаток) */
  overflow: number;
  /** Остаток в % от общего количества */
  overflowPct: number;
  /** Груз помещается целиком хотя бы в одном варианте */
  fits: boolean;
  /** Заполнение объёма лучшего варианта, % (совместимость) */
  volumeFill: number;
  /** Заполнение по весу лучшего варианта, % (совместимость) */
  weightFill: number;
  /** Геометрическое прогнозируемое заполнение, % (совместимость) */
  effectiveFill: number;
}

/** Рассчитывает суммарный объём, вес и количество единиц всех грузов. */
function getTotals(cargo: Cargo[]): { volume: number; weight: number; units: number } {
  let totalVolume = 0;
  let totalWeight = 0;
  let units = 0;
  for (const c of cargo) {
    const q = Math.max(1, Math.floor(c.quantity || 1));
    totalVolume += getCargoVolume(c) * q;
    totalWeight += c.weight * q;
    units += q;
  }
  return { volume: totalVolume, weight: totalWeight, units };
}

/** Минимальный bounding box размещённых грузов (Д×Ш×В в мм, с учётом поворотов) */
function calcBounds(items: PackedItem[]): CargoBounds {
  let maxX = 0, maxZ = 0, maxY = 0;
  for (const item of items) {
    const rotY = item.rotationY ?? item.rotation?.y ?? 0;
    const isOdd90 = Math.round((((rotY % 360) + 360) % 360) / 90) % 2 === 1;
    const effL = isOdd90 ? item.dimensions.width : item.dimensions.length;
    const effW = isOdd90 ? item.dimensions.length : item.dimensions.width;
    maxX = Math.max(maxX, item.position.x + effL);
    maxZ = Math.max(maxZ, item.position.z + effW);
    maxY = Math.max(maxY, item.position.y + item.dimensions.height);
  }
  return { l: Math.round(maxX), w: Math.round(maxZ), h: Math.round(maxY) };
}

/**
 * Выбирает лучший вариант раскладки:
 *   1) максимальное количество размещённых грузов;
 *   2) при равенстве — более компактный (минимальный объём bounding box).
 */
function bestVariant(result: PackResult | null, totalUnits: number): StackOption {
  if (!result || result.variants.length === 0) {
    return { mode: 'along', placed: 0, volumeFill: 0, weightFill: 0, bBox: { l: 0, w: 0, h: 0 }, fits: false };
  }
  const best = [...result.variants].sort((a, b) => {
    if (b.items.length !== a.items.length) return b.items.length - a.items.length;
    // Одинаковое количество грузов — выбираем более компактную раскладку
    return (a.totalVolume || 0) - (b.totalVolume || 0);
  })[0];
  return {
    mode: best.id as LayoutMode,
    placed: best.items.length,
    volumeFill: best.volumeFill,
    weightFill: best.weightFill,
    bBox: calcBounds(best.items),
    fits: best.items.length === totalUnits,
  };
}

/**
 * Подбирает подходящие автомобили для списка грузов.
 * Для каждого автомобиля выполняет реальную упаковку двумя способами
 * (с/без штабелирования) и запоминает лучший режим раскладки.
 * Возвращает список, отсортированный по заполнению.
 */
export function matchVehicles(
  cargo: Cargo[],
  vehicles: Vehicle[],
  settings?: PackSettings,
  loadingPoints?: LoadingPoint[],
): VehicleMatch[] {
  if (cargo.length === 0) return [];

  const { volume, weight, units } = getTotals(cargo);
  const base: PackSettings = {
    maxStackHeight: 0,
    allowRotation: settings?.allowRotation ?? true,
    gapsEnabled: settings?.gapsEnabled ?? false,
    gap: settings?.gap ?? 0,
    gapWalls: settings?.gapWalls ?? 0,
    gapWidth: settings?.gapWidth ?? 0,
    gapLength: settings?.gapLength ?? 0,
  };

  const matches: VehicleMatch[] = [];

  for (const v of vehicles) {
    const binVolume = v.length * v.width * v.height;

    const noStack = packItems(v, cargo, { ...base, maxStackHeight: 0 }, loadingPoints);
    const withStack = packItems(v, cargo, { ...base, maxStackHeight: v.height }, loadingPoints);
    const optNo = bestVariant(noStack, units);
    const optStack = bestVariant(withStack, units);

    const bestPlaced = Math.max(optNo.placed, optStack.placed);
    const overflow = Math.max(0, units - bestPlaced);
    const overflowPct = units > 0 ? Math.round((overflow / units) * 100) : 0;
    const fits = bestPlaced === units;

    const best = optStack.placed >= optNo.placed ? optStack : optNo;

    matches.push({
      vehicle: v,
      totalCargoVolume: volume,
      totalCargoWeight: weight,
      totalUnits: units,
      binVolume,
      withoutStacking: optNo,
      withStacking: optStack,
      bestPlaced,
      overflow,
      overflowPct,
      fits,
      volumeFill: best.volumeFill,
      weightFill: best.weightFill,
      effectiveFill: Math.round((best.volumeFill / 0.7) * 10) / 10,
    });
  }

  // Сортируем: сначала подходящие (все единицы помещаются), затем остальные.
  matches.sort((a, b) => {
    if (a.fits !== b.fits) return a.fits ? -1 : 1;
    if (a.fits && b.fits) {
      // Среди подходящих — ближайший к 80% заполнения
      const aScore = Math.abs(a.volumeFill - 80);
      const bScore = Math.abs(b.volumeFill - 80);
      return aScore - bScore;
    }
    // Среди неподходящих — по возрастанию объёма кузова
    return a.binVolume - b.binVolume;
  });

  return matches;
}