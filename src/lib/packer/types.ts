/** Единичная коробка после "размножения" груза на quantity штук */

import type { CargoShape, CylinderOrientation } from '../../types';

export interface Box {
  id: string;
  name: string;
  /** i18n-ключ названия (для стандартных пресетов грузов) */
  nameKey?: string;
  shape: CargoShape;
  /** Диаметр для цилиндров (мм), undefined для прямоугольников */
  diameter?: number;
  /** Ориентация цилиндра */
  cylinderOrientation?: CylinderOrientation;
  /** Габаритный объём для упаковки (для цилиндра width=height=diameter) */
  length: number;
  width: number;
  height: number;
  weight: number;
  stackable: boolean;
  /** Макс. нагрузка сверху, кг (0 = нельзя ничего ставить сверху) */
  maxLoad?: number;
  /** Порядок выгрузки (1 — первая точка) */
  stopOrder?: number;
  /** Группа совместимости штабелирования */
  compatibilityGroup?: string;
  /** Негабаритный груз (может выступать за пределы кузова) */
  isOversize?: boolean;
  /** Цвет отображения в 3D-сцене */
  color: string;
}

/** Ориентация бокса при размещении */
export interface Orientation {
  dx: number;
  dy: number;
  dz: number;
  rotY: number;
}

/** Размещённый бокс с координатами и размерами в сцене */
export interface PlacedBox extends Box {
  x: number;
  y: number;
  z: number;
  placedLength: number;
  placedWidth: number;
  placedHeight: number;
  rotY: number;
}