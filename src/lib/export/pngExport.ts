// ============================================================================
// Экспорт текущего 2D-вида в PNG высокого разрешения
// Содержит: заголовок, 2D-схему, легенду слоёв, метрики, подпись варианта
// ============================================================================

import type { Vehicle, LayoutVariant } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { UNIT_LABEL, toUnit, formatWeight, WEIGHT_UNIT_LABEL, type WeightUnit } from '../../utils/helpers';

const LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/** Вычисляет слой груза */
function layerOf(item: { position: { y: number }; dimensions: { height: number } }): number {
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

/**
 * Сохраняет 2D-канвас раскладки как PNG высокого разрешения.
 * Содержит: заголовок, 2D-схему, легенду по слоям, метрики, подпись варианта.
 */
export async function exportSceneToPng(
  _elementId: string,
  filename: string,
  vehicle?: Vehicle,
  variant?: LayoutVariant,
  weightUnit: WeightUnit = 'kg',
): Promise<void> {
  // Ищем 2D canvas (не WebGL) — помечен атрибутом data-export-canvas="2d"
  let sourceCanvas: HTMLCanvasElement | null =
    document.querySelector<HTMLCanvasElement>('[data-export-canvas="2d"]');

  if (!sourceCanvas) {
    // Фолбэк: canvas с контекстом 2d и размером (без проверки WebGL, чтобы не
    // провоцировать ошибку "Canvas has an existing context of a different type")
    const allCanvases = document.querySelectorAll('canvas');
    for (const c of Array.from(allCanvases)) {
      if (c.width > 100 && c.height > 100) {
        // Не создаём 2d-контекст на WebGL-канвасе повторно; определяем по data-атрибуту
        const isWebGL = /^webgl/.test(c.getAttribute('data-export-canvas') || '');
        if (!isWebGL) { sourceCanvas = c; break; }
      }
    }
  }

  if (!sourceCanvas) throw new Error('Не удалось найти 2D-канвас для экспорта');

  const unit = useAppStore.getState().unit;
  const fmt = (mm: number) => Math.round(toUnit(mm, unit) * 100) / 100;

  // Параметры макета
  const S = 3; // scale factor для высокого разрешения
  const PAD = 40 * S;
  const HEADER_H = 70 * S;
  const LEGEND_H = variant ? Math.max(60, 28 * (variant.items.length > 0 ? [...new Set(variant.items.map(i => layerOf(i)))].length : 1) + 40) * S : 80 * S;
  const METRICS_H = 60 * S;
  const FOOTER_H = 40 * S;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // Минимальная ширина — 1920px
  const minW = 1920;
  const totalW = Math.max(minW, srcW + PAD * 2);
  const totalH = HEADER_H + srcH + PAD + LEGEND_H + METRICS_H + FOOTER_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create 2d context');

  // ── Фон ──
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Заголовок ──
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, HEADER_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${22 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CargoPlanner — Схема загрузки', PAD, HEADER_H / 2);

  // Дата и вариант справа
  ctx.font = `${13 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  ctx.fillText(dateStr, canvas.width - PAD, HEADER_H / 2 - 8 * S);

  if (variant) {
    ctx.fillStyle = '#3b82f6';
    ctx.font = `bold ${14 * S}px system-ui, sans-serif`;
    ctx.fillText(`Вариант: ${variant.label || 'Вдоль'}`, canvas.width - PAD, HEADER_H / 2 + 12 * S);
  }

  // ── 2D Схема ──
  const schemeX = (totalW - srcW) / 2;
  const schemeY = HEADER_H + PAD / 2;
  // Рамка вокруг схемы
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2 * S;
  ctx.strokeRect(schemeX - 4 * S, schemeY - 4 * S, srcW + 8 * S, srcH + 8 * S);
  ctx.drawImage(sourceCanvas, schemeX, schemeY, srcW, srcH);

  // ── Легенда слоёв ──
  const legendY = schemeY + srcH + PAD;
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold ${14 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Распределение по слоям:', PAD, legendY);

  if (variant && variant.items.length > 0) {
    // Группируем по слоям
    const layers = new Map<number, { name: string; count: number }[]>();
    variant.items.forEach((item) => {
      const layer = layerOf(item);
      if (!layers.has(layer)) layers.set(layer, []);
      const existing = layers.get(layer)!.find(l => l.name === item.name);
      if (existing) existing.count++;
      else layers.get(layer)!.push({ name: item.name, count: 1 });
    });
    const sorted = [...layers.entries()].sort((a, b) => a[0] - b[0]);

    let ly = legendY + 22 * S;
    sorted.forEach(([layer, items]) => {
      const color = LAYER_COLORS[layer] || '#64748b';
      // Цветной квадратик
      ctx.fillStyle = color;
      ctx.fillRect(PAD, ly - 8 * S, 12 * S, 12 * S);
      // Текст
      ctx.fillStyle = '#1e293b';
      ctx.font = `${12 * S}px system-ui, sans-serif`;
      const text = `Слой ${layer}: ${items.map(it => `${it.name} ×${it.count}`).join(', ')}`;
      ctx.fillText(text, PAD + 18 * S, ly);
      ly += 22 * S;
    });
  }

  // ── Метрики ──
  const metricsY = legendY + LEGEND_H;
  if (vehicle && variant) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(PAD, metricsY, totalW - PAD * 2, METRICS_H);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, metricsY, totalW - PAD * 2, METRICS_H);

    ctx.fillStyle = '#1e293b';
    ctx.font = `${12 * S}px system-ui, sans-serif`;
    ctx.textAlign = 'left';

    const metrics = [
      `${vehicle.name} (${fmt(vehicle.length)}×${fmt(vehicle.width)}×${fmt(vehicle.height)} ${UNIT_LABEL[unit]})`,
      `Грузов: ${variant.items.length}`,
      `Слоёв: ${[...new Set(variant.items.map(i => layerOf(i)))].length}`,
      `Заполнение: ${variant.volumeFill ?? 0}%`,
      `Вес: ${formatWeight(variant.totalWeight ?? 0, weightUnit)} ${WEIGHT_UNIT_LABEL[weightUnit]}`,
      `Заполнение по весу: ${variant.weightFill ?? 0}%`,
    ];
    metrics.forEach((m, i) => {
      ctx.fillText(m, PAD + 10 * S, metricsY + 18 * S + i * 18 * S);
    });
  }

  // ── Нижний колонтитул ──
  const footerY = metricsY + METRICS_H + 10 * S;
  ctx.fillStyle = '#64748b';
  ctx.font = `${10 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Сгенерировано в CargoPlanner — 3D Планировщик загрузки автомобиля', totalW / 2, footerY);

  // ── Скачиваем ──
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
