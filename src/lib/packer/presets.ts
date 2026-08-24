// ============================================================================
// Стандартные пресеты автомобилей и паллет
// ============================================================================

import type { Vehicle } from '../../types';

/** Стандартные пресеты кузовов (мм и кг) */
export const VEHICLE_PRESETS: Vehicle[] = [
  {
    id: 'gazelle-15',
    name: 'ГАЗель 1.5т',
    length: 3000,
    width: 1800,
    height: 1700,
    maxWeight: 1500,
  },
  {
    id: 'gazelle-2',
    name: 'ГАЗель 2т',
    length: 3200,
    width: 1900,
    height: 1800,
    maxWeight: 2000,
  },
  {
    id: 'bychok-3',
    name: 'Бычок 3т',
    length: 3800,
    width: 2000,
    height: 1900,
    maxWeight: 3000,
  },
  {
    id: 'zil-5',
    name: 'ЗИЛ 5т',
    length: 4200,
    width: 2200,
    height: 2100,
    maxWeight: 5000,
  },
  {
    id: 'kamaz-10',
    name: 'КамАЗ 10т',
    length: 5500,
    width: 2400,
    height: 2400,
    maxWeight: 10000,
  },
  {
    id: 'fura-20',
    name: 'Фура 20т',
    length: 13600,
    width: 2450,
    height: 2600,
    maxWeight: 20000,
  },
];

/** Возвращает готовый пресет по id или первый пресет по умолчанию */
export function getVehiclePreset(id?: string): Vehicle {
  if (!id) return VEHICLE_PRESETS[0];
  return VEHICLE_PRESETS.find((v) => v.id === id) ?? VEHICLE_PRESETS[0];
}

/**
 * Возвращает список стандартных пресетов автомобилей.
 * Используется как исходный список транспортных средств по умолчанию.
 */
export function getDefaultVehicles(): Vehicle[] {
  return VEHICLE_PRESETS.map((v) => ({ ...v }));
}

/** Тип паллеты для быстрого добавления */
export interface PalletPreset {
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
}

/** Доступные пресеты паллет */
export const PALLET_PRESETS: Record<'euro' | 'fin', PalletPreset> = {
  euro: { name: 'Европаллет', length: 1200, width: 800, height: 144, weight: 25 },
  fin: { name: 'Финпаллет', length: 1200, width: 1000, height: 144, weight: 30 },
};