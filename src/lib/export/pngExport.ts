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
  // Ищем WebGL canvas внутри сцены (Three.js рендерит в canvas)
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element "${elementId}" not found`);

  // Сначала пробуем захватить WebGL canvas напрямую
  let sourceCanvas: HTMLCanvasElement | null = null;
  const webglCanvas = el.querySelector('canvas');
  if (webglCanvas) {
    sourceCanvas = webglCanvas;
  } else {
    // Fallback: html2canvas для обычного DOM
    const html2canvas = (await import('html2canvas')).default;
    sourceCanvas = await html2canvas(el, { backgroundColor: '#0f172a', useCORS: true, scale: 2 });
  }

  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create 2d context');
  ctx.drawImage(sourceCanvas, 0, 0);

  // Добавляем аннотации поверх скриншота
  const annotCanvas = document.createElement('canvas');
  annotCanvas.width = canvas.width;
  annotCanvas.height = canvas.height;
  const annotCtx = annotCanvas.getContext('2d');
  if (!annotCtx) {
    // Fallback — без аннотаций
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
  }

  // Копируем скриншот
  annotCtx.drawImage(canvas, 0, 0);

  // Аннотации
  const padding = 20;
  const fontSize = Math.max(16, Math.round(canvas.width / 80));
  const smallFont = Math.max(12, Math.round(fontSize * 0.75));

  // Верхняя полоса с информацией
  annotCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  annotCtx.fillRect(0, 0, canvas.width, fontSize + padding * 2);

  annotCtx.fillStyle = '#ffffff';
  annotCtx.font = `bold ${fontSize}px system-ui, sans-serif`;
  annotCtx.textAlign = 'left';
  annotCtx.textBaseline = 'middle';
  annotCtx.fillText('CargoPlanner', padding, padding + fontSize / 2);

  // Дата справа
  annotCtx.font = `${smallFont}px system-ui, sans-serif`;
  annotCtx.textAlign = 'right';
  annotCtx.fillStyle = '#94a3b8';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  annotCtx.fillText(dateStr, canvas.width - padding, padding + fontSize / 2);

  // Нижняя полоса с метриками
  if (vehicle || variant) {
    const bottomY = canvas.height - fontSize * 2 - padding;
    annotCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    annotCtx.fillRect(0, bottomY, canvas.width, canvas.height - bottomY);

    annotCtx.fillStyle = '#ffffff';
    annotCtx.font = `${smallFont}px system-ui, sans-serif`;
    annotCtx.textAlign = 'left';
    annotCtx.textBaseline = 'middle';

    let info = '';
    if (vehicle) {
      info = `${vehicle.name} | ${vehicle.length}x${vehicle.width}x${vehicle.height} mm`;
    }
    if (variant) {
      info += ` | ${variant.items.length} items | Vol: ${variant.volumeFill}% | Wt: ${variant.weightFill}%`;
    }
    annotCtx.fillText(info, padding, bottomY + (canvas.height - bottomY) / 2);
  }

  // Скачиваем
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = annotCanvas.toDataURL('image/png');
  link.click();
}
