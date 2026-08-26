// ============================================================================
// Экспорт текущего вида 3D-сцены в PNG (html2canvas)
// с аннотациями (название проекта, дата, размеры кузова, количество грузов)
// ============================================================================

import type { Vehicle, LayoutVariant } from '../../types';

/**
 * Сохраняет DOM-элемент (канвас 3D-сцены) как изображение PNG.
 * @param elementId id элемента, содержимое которого нужно сохранить
 * @param filename имя файла без расширения
 * @param vehicle автомобиль (для аннотаций)
 * @param variant вариант раскладки (для аннотаций)
 */
export async function exportSceneToPng(
  elementId: string,
  filename: string,
  vehicle?: Vehicle,
  variant?: LayoutVariant,
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error(`Element "${elementId}" not found`);
  }

  // Динамический импорт html2canvas для ленивой загрузки
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(el, {
    backgroundColor: '#0f172a',
    useCORS: true,
    scale: 2,
  });

  // Добавляем аннотации поверх скриншота
  const annotCanvas = document.createElement('canvas');
  annotCanvas.width = canvas.width;
  annotCanvas.height = canvas.height;
  const ctx = annotCanvas.getContext('2d');
  if (!ctx) {
    // Fallback — без аннотаций
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
  }

  // Копируем скриншот
  ctx.drawImage(canvas, 0, 0);

  // Аннотации
  const padding = 20;
  const fontSize = Math.max(16, Math.round(canvas.width / 80));
  const smallFont = Math.max(12, Math.round(fontSize * 0.75));

  // Верхняя полоса с информацией
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, fontSize + padding * 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CargoPlanner', padding, padding + fontSize / 2);

  // Дата справа
  ctx.font = `${smallFont}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(dateStr, canvas.width - padding, padding + fontSize / 2);

  // Нижняя полоса с метриками
  if (vehicle || variant) {
    const bottomY = canvas.height - fontSize * 2 - padding;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, bottomY, canvas.width, canvas.height - bottomY);

    ctx.fillStyle = '#ffffff';
    ctx.font = `${smallFont}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let info = '';
    if (vehicle) {
      info = `${vehicle.name} | ${vehicle.length}x${vehicle.width}x${vehicle.height} mm`;
    }
    if (variant) {
      info += ` | ${variant.items.length} items | Vol: ${variant.volumeFill}% | Wt: ${variant.weightFill}%`;
    }
    ctx.fillText(info, padding, bottomY + (canvas.height - bottomY) / 2);
  }

  // Скачиваем
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = annotCanvas.toDataURL('image/png');
  link.click();
}
