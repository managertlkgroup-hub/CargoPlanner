// ============================================================================
// AI-подсказки по улучшению упаковки
// ============================================================================

import type { PackResult, Vehicle } from '../../types';

export interface PackingSuggestion {
  id: string;
  icon: string;
  message: string;
  /** Грузы, к которым относится подсказка */
  cargoIds: string[];
}

/**
 * Анализирует результат упаковки и генерирует подсказки.
 */
export function generateSuggestions(
  result: PackResult,
  vehicle: Vehicle,
): PackingSuggestion[] {
  const suggestions: PackingSuggestion[] = [];
  const variant = result.variants[0];
  if (!variant || variant.items.length === 0) return suggestions;

  // 1. Низкое заполнение объёма
  if (variant.volumeFill < 50) {
    suggestions.push({
      id: 'low-fill',
      icon: '📦',
      message: `Заполнение ${variant.volumeFill}% — попробуйте добавить больше грузов или увеличить количество.`,
      cargoIds: [],
    });
  }

  // 2. Есть неразмещённые грузы
  const totalCargoCount = variant.items.length;
  if (result.variants.some(v => v.items.length < totalCargoCount)) {
    suggestions.push({
      id: 'unplaced',
      icon: '⚠️',
      message: 'Некоторые грузы не поместились. Попробуйте режим «Смешанный» или включите штабелирование.',
      cargoIds: [],
    });
  }

  // 3. Вес близок к пределу
  if (variant.weightFill > 85) {
    suggestions.push({
      id: 'weight-near-limit',
      icon: '⚖️',
      message: `Вес загрузки ${variant.weightFill}% — близко к пределу. Распределите вес равномерно.`,
      cargoIds: variant.items.map(it => it.id),
    });
  }

  // 4. Анализ свободного пространства — грузы на полу, но есть место сверху
  const floorItems = variant.items.filter(it => it.position.y === 0);
  const stackedItems = variant.items.filter(it => it.position.y > 0);
  if (floorItems.length > 3 && stackedItems.length === 0) {
    const stackableFloor = floorItems.filter(it => it.stackable);
    if (stackableFloor.length >= 2) {
      suggestions.push({
        id: 'enable-stacking',
        icon: '📐',
        message: `${stackableFloor.length} штабелируемых грузов на полу. Включите штабелирование для экономии места.`,
        cargoIds: stackableFloor.map(it => it.id),
      });
    }
  }

  // 5. Все грузы на одном уровне — потенциал для второго слоя
  const maxY = Math.max(...variant.items.map(it => it.position.y + it.dimensions.height));
  if (maxY < vehicle.height * 0.6 && floorItems.length > 2) {
    suggestions.push({
      id: 'second-layer',
      icon: '⬆️',
      message: `Высота загрузки ${Math.round(maxY)} мм из ${vehicle.height} мм. Добавьте второй слой.`,
      cargoIds: [],
    });
  }

  // 6. Баланс: центр тяжести сильно смещён
  let totalW = 0, cogX = 0;
  variant.items.forEach(it => {
    const rotY = it.rotationY ?? 0;
    const isOdd90 = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
    const effL = isOdd90 ? it.dimensions.width : it.dimensions.length;
    totalW += it.weight;
    cogX += it.weight * (it.position.x + effL / 2);
  });
  if (totalW > 0) {
    const avgX = cogX / totalW;
    const centerX = vehicle.length / 2;
    if (Math.abs(avgX - centerX) > vehicle.length * 0.2) {
      const side = avgX < centerX ? 'задней' : 'передней';
      suggestions.push({
        id: 'balance',
        icon: '⚖️',
        message: `Грузы смещены к ${side} части кузова (${Math.abs(Math.round(avgX - centerX))} мм). Распределите тяжёлые грузы равномернее.`,
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
