// ============================================================================
// Расчёт центра тяжести (COG) всех размещённых грузов
// ============================================================================

import type { PackedItem, Vehicle } from '../../types';

export interface COGResult {
  /** Координата X центра тяжести (мм) — вдоль длины кузова */
  x: number;
  /** Координата Y центра тяжести (мм) — высота */
  y: number;
  /** Координата Z центра тяжести (мм) — вдоль ширины кузова */
  z: number;
  /** Статус: ok — в допустимых пределах, warning — близко к границе, danger — вне допустимых пределов */
  status: 'ok' | 'warning' | 'danger';
  /** Максимально допустимое смещение по ширине (допустимая зона — от оси до 80% ширины) */
  maxZOffset: number;
}

/**
 * Рассчитывает центр тяжести всех грузов.
 * COG = sum(m_i * pos_i) / sum(m_i), где pos_i — центр i-го груза.
 */
export function calculateCOG(items: PackedItem[], vehicle: Vehicle): COGResult | null {
  if (items.length === 0) return null;

  let totalWeight = 0;
  let cogX = 0;
  let cogY = 0;
  let cogZ = 0;

  for (const item of items) {
    const rotY = item.rotationY ?? 0;
    const isOdd90 = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
    const effL = isOdd90 ? item.dimensions.width : item.dimensions.length;
    const effW = isOdd90 ? item.dimensions.length : item.dimensions.width;

    // Центр масс груза
    const cx = item.position.x + effL / 2;
    const cy = item.position.y + item.dimensions.height / 2;
    const cz = item.position.z + effW / 2;

    const w = item.weight;
    totalWeight += w;
    cogX += w * cx;
    cogY += w * cy;
    cogZ += w * cz;
  }

  if (totalWeight === 0) return null;

  const x = cogX / totalWeight;
  const y = cogY / totalWeight;
  const z = cogZ / totalWeight;

  // Допустимая зона: COG по ширине должен быть в пределах [20%..80%] ширины кузова
  const centerZ = vehicle.width / 2;
  const maxZOffset = vehicle.width * 0.3; // 30% от центра в каждую сторону
  const zOffset = Math.abs(z - centerZ);

  let status: 'ok' | 'warning' | 'danger' = 'ok';
  if (zOffset > maxZOffset) {
    status = 'danger';
  } else if (zOffset > maxZOffset * 0.75) {
    status = 'warning';
  }

  return { x, y, z, status, maxZOffset };
}
