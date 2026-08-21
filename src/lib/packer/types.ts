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
  /** Цвет отображения в 3D-сцене */
  color: string;
}