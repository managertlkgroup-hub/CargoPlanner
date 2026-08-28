// ============================================================================
// Автоподбор автомобиля под грузы
// ============================================================================

import type { Cargo, Vehicle } from '../types';
import { getCargoVolume } from '../types';

export interface VehicleMatch {
  vehicle: Vehicle;
  /** Суммарный объём грузов (мм³) */
  totalCargoVolume: number;
  /** Суммарный вес грузов (кг) */
  totalCargoWeight: number;
  /** Объём кузова (мм³) */
  binVolume: number;
  /** % заполнения объёма */
  volumeFill: number;
  /** % заполнения по весу */
  weightFill: number;
  /** Заполнение объёма с учётом геометрического заполнения (~70% макс.) */
  effectiveFill: number;
}

/**
 * Рассчитывает суммарный объём и вес всех грузов.
 */
function getTotals(cargo: Cargo[]): { volume: number; weight: number } {
  let totalVolume = 0;
  let totalWeight = 0;
  for (const c of cargo) {
    totalVolume += getCargoVolume(c) * c.quantity;
    totalWeight += c.weight * c.quantity;
  }
  return { volume: totalVolume, weight: totalWeight };
}

/**
 * Подбирает подходящие автомобили для списка грузов.
 * Возвращает отсортированный по заполнению (ближайший больший) список.
 */
export function matchVehicles(cargo: Cargo[], vehicles: Vehicle[]): VehicleMatch[] {
  if (cargo.length === 0) return [];

  const { volume, weight } = getTotals(cargo);
  const matches: VehicleMatch[] = [];

  for (const v of vehicles) {
    const binVolume = v.length * v.width * v.height;
    const volumeFill = binVolume > 0 ? (volume / binVolume) * 100 : 0;
    const weightFill = v.maxWeight > 0 ? (weight / v.maxWeight) * 100 : 0;

    // Эффективное заполнение: геометрическая упаковка может достичь макс. ~70-85%
    const effectiveFill = volumeFill / 0.70;

    matches.push({
      vehicle: v,
      totalCargoVolume: volume,
      totalCargoWeight: weight,
      binVolume,
      volumeFill: Math.round(volumeFill * 10) / 10,
      weightFill: Math.round(weightFill * 10) / 10,
      effectiveFill: Math.round(effectiveFill * 10) / 10,
    });
  }

  // Сортируем: сначала те, где объём помещается, потом остальные
  matches.sort((a, b) => {
    const aFits = a.effectiveFill <= 100 && a.weightFill <= 100;
    const bFits = b.effectiveFill <= 100 && b.weightFill <= 100;
    if (aFits !== bFits) return aFits ? -1 : 1;
    // Среди подходящих — ближайший к 80% заполнения
    if (aFits && bFits) {
      const aScore = Math.abs(a.effectiveFill - 80);
      const bScore = Math.abs(b.effectiveFill - 80);
      return aScore - bScore;
    }
    // Среди неподходящих — по возрастанию объёма
    return a.binVolume - b.binVolume;
  });

  return matches;
}
