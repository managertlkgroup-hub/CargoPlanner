// ============================================================================
// Стандартные пресеты автомобилей и грузов
// ============================================================================

import type { Vehicle, LoadingMethod } from '../../types';

/** Способы загрузки для тентованных кузовов (наиболее универсальные) */
const TENT_METHODS: LoadingMethod[] = [
  'rear', 'side', 'top', 'side_both', 'full_tent_removal',
  'crossbar_removal', 'post_removal', 'no_gate',
  'hydraulic_tail', 'ramps', 'lathing',
];

/** Стандартные пресеты кузовов (мм и кг) */
export const VEHICLE_PRESETS: Vehicle[] = [
  {
    id: 'truck-1t',
    name: '1 тонна',
    length: 2800, width: 1800, height: 1800, maxWeight: 1000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-15t',
    name: '1.5 тонны',
    length: 3000, width: 1950, height: 1700, maxWeight: 1500,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-2t',
    name: '2 тонны',
    length: 3800, width: 1900, height: 1900, maxWeight: 2000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-3t',
    name: '3 тонны',
    length: 4200, width: 2000, height: 2000, maxWeight: 3000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-5t',
    name: '5 тонн',
    length: 6200, width: 2450, height: 2400, maxWeight: 5000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-7t',
    name: '7 тонн',
    length: 7200, width: 2450, height: 2400, maxWeight: 7000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-10t',
    name: '10 тонн',
    length: 8200, width: 2450, height: 2400, maxWeight: 10000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-20t',
    name: '20 тонн (фура)',
    length: 13600, width: 2460, height: 2600, maxWeight: 20000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
  },
  {
    id: 'truck-20t-train',
    name: '20 тонн (автопоезд)',
    length: 15900, width: 2500, height: 2500, maxWeight: 20000,
    loadingMethods: TENT_METHODS, unloadingMethods: TENT_METHODS,
    defaultLoadingMethod: 'rear', defaultUnloadingMethod: 'rear',
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

/** Тип груза для быстрого добавления */
export interface CargoPreset {
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  shape: 'box' | 'cylinder';
  diameter?: number;
}

/** Доступные пресеты грузов */
export const CARGO_PRESETS: CargoPreset[] = [
  // Паллеты
  { name: 'Европаллета', length: 1200, width: 800, height: 145, weight: 25, shape: 'box' },
  { name: 'Американская паллета', length: 1200, width: 1200, height: 150, weight: 30, shape: 'box' },
  { name: 'Финская паллета', length: 1200, width: 1000, height: 145, weight: 28, shape: 'box' },
  
  // Еврокуб и биг-бэг
  { name: 'Еврокуб (IBC)', length: 1200, width: 1000, height: 1160, weight: 70, shape: 'box' },
  { name: 'Биг-бэг', length: 950, width: 950, height: 1400, weight: 50, shape: 'box' },
  
  // Бочка
  { name: 'Стальная бочка (216.5 л)', length: 880, width: 585, height: 585, weight: 20, shape: 'cylinder', diameter: 585 },
  
  // Картонные коробки
  { name: 'Картонная коробка маленькая', length: 200, width: 150, height: 100, weight: 1, shape: 'box' },
  { name: 'Картонная коробка средняя', length: 500, width: 400, height: 300, weight: 5, shape: 'box' },
  { name: 'Картонная коробка большая', length: 900, width: 700, height: 500, weight: 15, shape: 'box' },
  
  // Деревянные ящики
  { name: 'Деревянный ящик маленький', length: 500, width: 400, height: 300, weight: 10, shape: 'box' },
  { name: 'Деревянный ящик средний', length: 800, width: 600, height: 500, weight: 25, shape: 'box' },
  { name: 'Деревянный ящик большой', length: 1200, width: 800, height: 1000, weight: 45, shape: 'box' },
  
  // Пластиковые ящики
  { name: 'Пластиковый ящик маленький', length: 400, width: 300, height: 200, weight: 3, shape: 'box' },
  { name: 'Пластиковый ящик средний', length: 800, width: 600, height: 400, weight: 8, shape: 'box' },
  { name: 'Пластиковый ящик большой', length: 1200, width: 1000, height: 600, weight: 18, shape: 'box' },
  
  // Мешки
  { name: 'Мешок маленький', length: 500, width: 700, height: 300, weight: 10, shape: 'box' },
  { name: 'Мешок средний', length: 700, width: 1000, height: 400, weight: 20, shape: 'box' },
  { name: 'Мешок большой', length: 1000, width: 1500, height: 500, weight: 35, shape: 'box' },
];

/**
 * Возвращает список пресетов грузов для быстрого выбора.
 */
export function getCargoPresets(): CargoPreset[] {
  return CARGO_PRESETS;
}