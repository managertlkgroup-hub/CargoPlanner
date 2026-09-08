// ============================================================================
// AI-подсказки по улучшению упаковки
// ============================================================================

import type { ComponentType } from 'react';
import { Package, AlertTriangle, Scale, Layers, ArrowUp } from 'lucide-react';
import type { PackResult, Vehicle, Unit, Cargo } from '../../types';
import { UNIT_LABEL, formatDimension } from '../../utils/helpers';
import { tr, trf, type Lang } from '../../i18n';
import { canStackAll } from './packer';

export interface PackingSuggestion {
  id: string;
  /** Lucide-иконка (компонент) для отображения рядом с подсказкой */
  icon: ComponentType<{ size?: number | string; className?: string }>;
  message: string;
  /** Грузы, к которым относится подсказка */
  cargoIds: string[];
}

/**
 * Анализирует результат упаковки и генерирует подсказки для ТЕКУЩЕГО варианта.
 * @param totalCargo — общее количество единиц груза (сумма quantity). Позволяет
 *   корректно показывать подсказку о неразмещённых грузах именно для активного
 *   варианта (placedCount < totalCargo), а не сравнивать варианты между собой.
 */
export function generateSuggestions(
  result: PackResult,
  vehicle: Vehicle,
  activeVariantId?: string | null,
  unit: Unit = 'mm',
  lang: Lang = 'ru',
  totalCargo?: number,
  cargo?: Cargo[],
  gapsEnabled?: boolean,
): PackingSuggestion[] {
  const suggestions: PackingSuggestion[] = [];
  // Используем активный вариант, а не всегда variants[0]
  const variant = activeVariantId
    ? result.variants.find(v => v.id === activeVariantId) ?? result.variants[0]
    : result.variants[0];
  if (!variant || variant.items.length === 0) return suggestions;

  // Штабелирование реально возможно только если грузы совместимы, двойная высота
  // помещается в кузов и физическая раскладка на второй слой возможна. Если нет —
  // не предлагаем штабелирование и не упоминаем его в подсказках о неразмещённых.
  const stackOk = cargo && cargo.length > 0 ? canStackAll(vehicle, cargo).ok : true;

  // 1. Низкое заполнение объёма
  if (variant.volumeFill < 50) {
    suggestions.push({
      id: 'low-fill',
      icon: Package,
      message: trf(lang, 'sg.lowFill', { p: `${variant.volumeFill}%` }),
      cargoIds: [],
    });
  }

  // 2. Есть неразмещённые грузы для ТЕКУЩЕГО активного варианта
  const placedCount = variant.items.length;
  const totalCargoCount = totalCargo ?? placedCount;
  if (placedCount < totalCargoCount) {
    suggestions.push({
      id: 'unplaced',
      icon: AlertTriangle,
      message: gapsEnabled ? tr(lang, 'sg.unplacedGaps') : tr(lang, 'sg.unplacedNoGaps'),
      cargoIds: [],
    });
  }

  // 3. Вес близок к пределу
  if (variant.weightFill > 85) {
    suggestions.push({
      id: 'weight-near-limit',
      icon: Scale,
      message: trf(lang, 'sg.weightLimit', { p: `${variant.weightFill}%` }),
      cargoIds: variant.items.map(it => it.id),
    });
  }

  // 4. Анализ свободного пространства — грузы на полу, но есть место сверху
  //    (только если штабелирование в принципе возможно; иначе такой вариант
  //    не предлагаем — только смену режима или уменьшение зазоров)
  const floorItems = variant.items.filter(it => it.position.y === 0);
  const stackedItems = variant.items.filter(it => it.position.y > 0);
  // Физическая проверка: поместится ли второй слой (2 × высота груза ≤ высота кузова)
  const maxFloorHeight = floorItems.length
    ? Math.max(...floorItems.map(it => it.dimensions.height))
    : 0;
  const canStackTwo = stackOk && maxFloorHeight > 0 && maxFloorHeight * 2 <= vehicle.height;
  if (stackOk && floorItems.length > 3 && stackedItems.length === 0) {
    const stackableFloor = floorItems.filter(it => it.stackable);
    if (stackableFloor.length >= 2) {
      if (canStackTwo) {
        suggestions.push({
          id: 'enable-stacking',
          icon: Layers,
          message: trf(lang, 'sg.enableStacking', { n: stackableFloor.length }),
          cargoIds: stackableFloor.map(it => it.id),
        });
      } else {
        suggestions.push({
          id: 'stacking-impossible',
          icon: Layers,
          message: trf(lang, 'sg.stackingImpossible', {
            h: `${formatDimension(maxFloorHeight, unit)} ${UNIT_LABEL[unit]}`,
            v: `${formatDimension(vehicle.height, unit)} ${UNIT_LABEL[unit]}`,
          }),
          cargoIds: stackableFloor.map(it => it.id),
        });
      }
    }
  }

  // 5. Все грузы на одном уровне — потенциал для второго слоя
  const maxY = Math.max(...variant.items.map(it => it.position.y + it.dimensions.height));
  if (maxY < vehicle.height * 0.6 && floorItems.length > 2) {
    suggestions.push({
      id: 'second-layer',
      icon: ArrowUp,
      message: trf(lang, 'sg.secondLayer', {
        a: `${formatDimension(maxY, unit)} ${UNIT_LABEL[unit]}`,
        b: `${formatDimension(vehicle.height, unit)} ${UNIT_LABEL[unit]}`,
      }),
      cargoIds: [],
    });
  }

  // 6. Баланс: центр тяжести сильно смещён по оси X (вдоль кузова)
  let totalW = 0, cogX = 0;
  let totalWz = 0, cogZ = 0;
  variant.items.forEach(it => {
    const rotY = it.rotationY ?? 0;
    const isOdd90 = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
    const effL = isOdd90 ? it.dimensions.width : it.dimensions.length;
    const effW = isOdd90 ? it.dimensions.length : it.dimensions.width;
    totalW += it.weight;
    cogX += it.weight * (it.position.x + effL / 2);
    totalWz += it.weight;
    cogZ += it.weight * (it.position.z + effW / 2);
  });
  if (totalW > 0) {
    const avgX = cogX / totalW;
    const centerX = vehicle.length / 2;
    if (Math.abs(avgX - centerX) > vehicle.length * 0.2) {
      const side = avgX < centerX ? tr(lang, 'sg.front') : tr(lang, 'sg.rear');
      suggestions.push({
        id: 'balance-long',
        icon: Scale,
        message: trf(lang, 'sg.balanceLong', {
          side,
          d: `${formatDimension(Math.abs(avgX - centerX), unit)} ${UNIT_LABEL[unit]}`,
        }),
        cargoIds: [],
      });
    }
  }
  // 7. Баланс по ширине (Z)
  if (totalWz > 0) {
    const avgZ = cogZ / totalWz;
    const centerZ = vehicle.width / 2;
    if (Math.abs(avgZ - centerZ) > vehicle.width * 0.2) {
      const sideZ = avgZ < centerZ ? tr(lang, 'sg.left') : tr(lang, 'sg.right');
      suggestions.push({
        id: 'balance-width',
        icon: Scale,
        message: trf(lang, 'sg.balanceWidth', {
          side: sideZ,
          d: `${formatDimension(Math.abs(avgZ - centerZ), unit)} ${UNIT_LABEL[unit]}`,
        }),
        cargoIds: [],
      });
    }
  }

  // Дедупликация по id (защита от дублей)
  const seen = new Set<string>();
  return suggestions.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}
