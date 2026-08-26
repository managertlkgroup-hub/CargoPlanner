// ============================================================================
// Экспорт текущего вида в PNG — захватывает 2D-канвас
// с аннотациями на русском (название проекта, дата, размеры кузова, грузы)
// ============================================================================

import type { Vehicle, LayoutVariant } from '../../types';

/**
 * Сохраняет 2D-канвас раскладки как PNG с аннотациями.
 * @param filename имя файла без расширения
 * @param vehicle автомобиль (для аннотаций)
 * @param variant вариант раскладки (для аннотаций)
 */
export async function exportSceneToPng(
  _elementId: string,
  filename: string,
  vehicle?: Vehicle,
  variant?: LayoutVariant,
): Promise<void> {
  // Ищем 2D canvas (не WebGL) — Scene2D использует обычный canvas
  let sourceCanvas: HTMLCanvasElement | null = null;

  // Пробуем найти canvas в 2D-контейнере
  const sceneContainer = document.querySelector('.scene-container');
  if (sceneContainer) {
    const canvases = sceneContainer.querySelectorAll('canvas');
    for (const c of Array.from(canvases)) {
      // WebGL canvas имеет getContext('webgl') или ('webgl2')
      const gl = c.getContext('webgl') || c.getContext('webgl2');
      if (!gl) {
        sourceCanvas = c;
        break;
      }
    }
  }

  if (!sourceCanvas) {
    // Fallback: ищем любой 2D canvas
    const allCanvases = document.querySelectorAll('canvas');
    for (const c of Array.from(allCanvases)) {
      const test = c.getContext('2d');
      if (test && c.width > 100 && c.height > 100) {
        sourceCanvas = c;
        break;
      }
    }
  }

  if (!sourceCanvas) {
    throw new Error('Не удалось найти 2D-канвас для экспорта');
  }

  // Создаём итоговый canvas с аннотациями
  const padding = 40;
  const headerH = 60;
  const footerH = 50;
  const canvas = document.createElement('canvas');
  const scale = 2; // retina
  canvas.width = sourceCanvas.width + padding * 2;
  canvas.height = sourceCanvas.height + padding * 2 + headerH + footerH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create 2d context');

  // Фон
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Верхняя полоса — заголовок
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, headerH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${20 * scale}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CargoPlanner', padding, headerH / 2);

  // Дата справа
  ctx.font = `${12 * scale}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(dateStr, canvas.width - padding, headerH / 2);

  // Рисуем канвас раскладки
  ctx.drawImage(sourceCanvas, padding, headerH + padding / 2, sourceCanvas.width, sourceCanvas.height);

  // Нижняя полоса — аннотации
  const footerY = headerH + sourceCanvas.height + padding;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, footerY, canvas.width, footerH);

  ctx.fillStyle = '#ffffff';
  ctx.font = `${11 * scale}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let info = '';
  if (vehicle) {
    info = `${vehicle.name} | ${vehicle.length}×${vehicle.width}×${vehicle.height} мм`;
  }
  if (variant) {
    info += ` | ${variant.items.length} грузов | Заполнение: ${variant.volumeFill}% | Вес: ${variant.weightFill}%`;
  }
  ctx.fillText(info, padding, footerY + footerH / 2);

  // Скачиваем
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
