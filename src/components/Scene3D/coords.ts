// ============================================================================
// Преобразование координат между "системой пакера" и "системой сцены"
//
// Пакер хранит позицию груза как координаты ЛЕВОГО НИЖНЕГО угла (в мм)
// в системе кузова: x — вдоль длины, y — вверх, z — вдоль ширины.
//
// Сцена (Three.js) центрирована: центр кузова в точке (0,0,0). Поэтому для
// отображения вычитаем половину габаритов кузова.
// ============================================================================

import type { Point3D, Vehicle } from '../../types';

/** Преобразует позицию левого нижнего угла (мм) в координату центра в сцене (сценные ед.) */
export function packToScenePosition(
  pos: Point3D,
  dims: { length: number; width: number; height: number },
  vehicle: Vehicle,
  scale: number,
): { x: number; y: number; z: number } {
  return {
    x: pos.x * scale + (dims.length * scale) / 2 - (vehicle.length * scale) / 2,
    y: pos.y * scale + (dims.height * scale) / 2,
    z: pos.z * scale + (dims.width * scale) / 2 - (vehicle.width * scale) / 2,
  };
}

/**
 * Преобразует позицию центра в сцене обратно в координаты левого нижнего угла (мм).
 * Используется при перетаскивании.
 */
export function sceneToPackPosition(
  centerX: number,
  centerY: number,
  centerZ: number,
  dims: { length: number; width: number; height: number },
  vehicle: Vehicle,
  scale: number,
): Point3D {
  return {
    x: centerX / scale - (dims.length * scale) / 2 / scale + (vehicle.length * scale) / 2 / scale,
    y: centerY / scale - (dims.height * scale) / 2 / scale,
    z: centerZ / scale - (dims.width * scale) / 2 / scale + (vehicle.width * scale) / 2 / scale,
  };
}

/**
 * Возвращает полуширину груза по оси X в текущей ориентации (для ограничений).
 * Учитывает поворот вокруг Y: для прямоугольника длина/ширина могут меняться местами.
 */
export function halfExtentX(item: { dimensions: { length: number; width: number }; rotationY?: number }, scale: number): number {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  // При повороте на 90° или 270° длина и ширина меняются местами в плане
  const l = rot === 1 ? item.dimensions.width : item.dimensions.length;
  return (l * scale) / 2;
}

/** Полуширина груза по оси Z в текущей ориентации */
export function halfExtentZ(item: { dimensions: { length: number; width: number }; rotationY?: number }, scale: number): number {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  const w = rot === 1 ? item.dimensions.length : item.dimensions.width;
  return (w * scale) / 2;
}