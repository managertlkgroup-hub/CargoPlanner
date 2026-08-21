// ============================================================================
// Типы для модуля упаковки (packer)
// ============================================================================

import type { Cargo, CargoShape, PackSettings } from '../../types';

/** Входные данные для упаковщика */
export interface PackerInput {
  /** Габариты кузова (мм) */
  bin: { length: number; width: number; height: number };
  /** Грузоподъёмность кузова (кг) */
  maxWeight: number;
  cargo: Cargo[];
  settings: PackSettings;
}

/** Единичная коробка после "размножения" груза на quantity штук */
export interface Box {
  id: string;
  name: string;
  shape: CargoShape;
  /** Диаметр для цилиндров (мм), undefined для прямоугольников */
  diameter?: number;
  /** Габаритный объём для упаковки (для цилиндра width=height=diameter) */
  length: number;
  width: number;
  height: number;
  weight: number;
  stackable: boolean;
}

/** Размещённый груз в 3D */
export interface PlacedBox extends Box {
  x: number;
  y: number;
  z: number;
  /** Длина по оси X с учётом поворота */
  placedLength: number;
  /** Длина по оси Z с учётом поворота */
  placedWidth: number;
  /** Высота по оси Y с учётом поворота */
  placedHeight: number;
  /** Поворот вокруг оси Y (0 или 90 градусов) */
  rotY: 0 | 90;
}

/** Ориентации груза при попытке размещения */
export interface Orientation {
  dx: number;
  dy: number;
  dz: number;
  rotY: 0 | 90;
}