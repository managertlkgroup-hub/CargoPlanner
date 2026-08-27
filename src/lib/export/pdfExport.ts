// ============================================================================
// Экспорт отчёта в PDF — canvas-based для поддержки кириллицы
// Рендерим отчёт на canvas, затем встраиваем в jsPDF как изображение
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';

/** Шрифт для canvas — поддержка кириллицы */
const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Цвета слоёв */
const LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/** Форматирует объём мм³ в м³ */
function vol(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
}

/** Получает эффективные размеры основания груза с учётом поворота */
function ground(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { w: item.dimensions.width, h: item.dimensions.length }
    : { w: item.dimensions.length, h: item.dimensions.width };
}

/** Вычисляет индекс слоя груза */
function layerOf(item: { position: { y: number }; dimensions: { height: number } }): number {
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

/** Рисует заголовок */
function drawHeader(ctx: CanvasRenderingContext2D, w: number): number {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Отчёт о загрузке', 24, 14);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`CargoPlanner — ${new Date().toLocaleDateString('ru-RU')}`, 24, 42);
  return 80;
}

/** Рисует строку информации */
function drawInfo(ctx: CanvasRenderingContext2D, x: number, y: number, lines: string[], opts?: { bold?: boolean; size?: number; color?: string }): number {
  const sz = opts?.size ?? 12;
  ctx.font = `${opts?.bold ? 'bold ' : ''}${sz}px ${FONT}`;
  ctx.fillStyle = opts?.color ?? '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += sz + 5;
  }
  return y;
}

/** Рисует вид сверху */
function drawTopView(
  ctx: CanvasRenderingContext2D,
  vehicle: Vehicle,
  variant: LayoutVariant,
  ox: number,
  oy: number,
  scale: number,
): { maxY: number; layers: number } {
  const vw = vehicle.length * scale;
  const vh = vehicle.width * scale;

  // Фон кузова
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, vw, vh);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(ox, oy, vw, vh);

  // Определяем максимальный слой
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;

  // Рисуем грузы
  variant.items.forEach((item) => {
    const { w, h } = ground(item);
    const x = ox + item.position.x * scale;
    const y = oy + item.position.z * scale;
    const iw = w * scale;
    const ih = h * scale;
    const li = layerOf(item);

    // Цвет по слою (или оригинальный цвет если нет штабелирования)
    const color = maxLayer > 0 ? LAYER_COLORS[li % LAYER_COLORS.length] : (item.color || '#3b82f6');

    // Прямоугольник груза
    ctx.fillStyle = color;
    ctx.globalAlpha = maxLayer > 0 ? (li === 0 ? 0.85 : 0.7) : 0.8;
    ctx.fillRect(x, y, iw, ih);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, iw, ih);

    // Номер груза
    if (iw > 12 && ih > 12) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const idx = variant.items.indexOf(item) + 1;
      ctx.fillText(String(idx), x + iw / 2, y + ih / 2);
    }
  });

  // Линейка
  const rulerPx = 1000 * scale;
  if (rulerPx > 25) {
    const rx = ox;
    const ry = oy + vh + 6;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rulerPx, ry);
    ctx.moveTo(rx, ry - 3);
    ctx.lineTo(rx, ry + 3);
    ctx.moveTo(rx + rulerPx, ry - 3);
    ctx.lineTo(rx + rulerPx, ry + 3);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = `8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('1 м', rx + rulerPx / 2, ry + 4);
  }

  return { maxY: oy + vh + (rulerPx > 25 ? 20 : 10), layers: maxLayer + 1 };
}

/** Рисует легенду слоёв */
function drawLayerLegend(ctx: CanvasRenderingContext2D, x: number, y: number, layers: number): number {
  if (layers <= 1) return y;
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Слои:', x, y + 6);
  let lx = x + 40;
  for (let i = 0; i < layers; i++) {
    ctx.fillStyle = LAYER_COLORS[i % LAYER_COLORS.length];
    ctx.fillRect(lx, y, 14, 14);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lx, y, 14, 14);
    ctx.fillStyle = '#1e293b';
    ctx.font = `9px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Слой ${i}`, lx + 18, y + 7);
    lx += 70;
  }
  return y + 22;
}

/** Рисует легенду номеров */
function drawItemLegend(ctx: CanvasRenderingContext2D, x: number, y: number, items: LayoutVariant['items']): number {
  const cols = 3;
  const colW = (794 - 48) / cols;
  ctx.font = `9px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#475569';
  items.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const li = layerOf(item);
    const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
    const color = maxL > 0 ? LAYER_COLORS[li % LAYER_COLORS.length] : '#1e293b';
    ctx.fillStyle = color;
    ctx.fillText(`${idx + 1}. ${item.name}`, x + col * colW, y + row * 14);
  });
  return y + Math.ceil(items.length / cols) * 14 + 16;
}

/** Рисует таблицу грузов с колонкой «Слой» */
function drawCargoTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pageW: number,
  cargo: Cargo[],
  items: LayoutVariant['items'],
): number {
  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
  const hasLayers = maxL > 0;

  const headers = hasLayers
    ? ['Название', 'Форма', 'Размеры, мм', 'Вес, кг', 'Кол-во', 'Слой']
    : ['Название', 'Форма', 'Размеры, мм', 'Вес, кг', 'Кол-во'];
  const colX = hasLayers
    ? [x, x + 120, x + 185, x + 295, x + 360, x + 420]
    : [x, x + 130, x + 200, x + 320, x + 390];

  // Шапка таблицы
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x, y, pageW - x * 2, 20);
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  headers.forEach((h, i) => ctx.fillText(h, colX[i], y + 5));
  y += 22;

  // Строки данных
  ctx.font = `10px ${FONT}`;
  for (const c of cargo) {
    const size = c.shape === 'cylinder'
      ? `Ø${c.diameter}×${c.length}`
      : `${c.length}×${c.width ?? 0}×${c.height ?? 0}`;

    // Находим слой для этого груза (берём первый matching item)
    const matchingItem = items.find(it => it.name === c.name);
    const li = matchingItem ? layerOf(matchingItem) : 0;

    ctx.fillStyle = '#1e293b';
    ctx.fillText(c.name, colX[0], y);
    ctx.fillText(c.shape === 'box' ? 'Прямоуг.' : 'Цилиндр', colX[1], y);
    ctx.fillText(size, colX[2], y);
    ctx.fillText(String(c.weight), colX[3], y);
    ctx.fillText(String(c.quantity), colX[4], y);
    if (hasLayers) {
      // Цветной кружок слоя
      const cx = colX[5] + 4;
      const cy = y + 5;
      ctx.fillStyle = LAYER_COLORS[li % LAYER_COLORS.length];
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillText(String(li), cx + 10, y);
    }
    y += 16;

    // Разделитель строки
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x + pageW - x * 2, y - 3);
    ctx.stroke();
  }
  return y;
}

/** Формирует и скачивает PDF-отчёт */
export function generatePdfReport(
  vehicle: Vehicle,
  cargo: Cargo[],
  variant: LayoutVariant,
): void {
  const DPR = 2;
  const W = 794;  // A4 @ 96dpi
  const H = 1123;

  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas');
  ctx.scale(DPR, DPR);

  // Фон
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const LM = 24; // левое/правое поле

  // === ЗАГОЛОВОК ===
  let y = drawHeader(ctx, W);
  y += 10;

  // === ИНФОРМАЦИЯ О АВТОМОБИЛЕ ===
  y = drawInfo(ctx, LM, y, [
    `Автомобиль: ${vehicle.name}`,
    `Кузов: ${vehicle.length}×${vehicle.width}×${vehicle.height} мм`,
    `Грузоподъёмность: ${vehicle.maxWeight} кг`,
  ], { size: 11 });
  y += 6;

  // === МЕТРИКИ ===
  y = drawInfo(ctx, LM, y, [`Вариант: ${variant.label}`], { bold: true, size: 12 });
  y = drawInfo(ctx, LM, y, [
    `Заполнение объёма: ${variant.volumeFill}%`,
    `Заполнение по весу: ${variant.weightFill}%`,
    `Суммарный вес: ${variant.totalWeight} кг`,
    `Свободный объём: ${vol(variant.freeVolume)}`,
    `Размещено: ${variant.items.length} шт.`,
  ], { size: 11 });

  // Слои
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;
  if (maxLayer > 0) {
    y = drawInfo(ctx, LM, y, [`Количество слоёв: ${maxLayer + 1}`], { size: 11 });
  }
  y += 6;

  // Габариты
  if (variant.items.length > 0) {
    let maxX = 0, maxZ = 0, maxY = 0;
    variant.items.forEach((item) => {
      const { w, h } = ground(item);
      maxX = Math.max(maxX, item.position.x + w);
      maxZ = Math.max(maxZ, item.position.z + h);
      maxY = Math.max(maxY, item.position.y + item.dimensions.height);
    });
    y = drawInfo(ctx, LM, y, [
      `Габариты: ${Math.round(maxX)}×${Math.round(maxZ)}×${Math.round(maxY)} мм`,
      `Объём груза: ${(maxX * maxZ * maxY / 1e9).toFixed(2)} м³`,
    ], { size: 11 });
  }
  y += 10;

  // === ВИД СВЕРХУ ===
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Вид сверху:', LM, y);
  y += 6;

  const topScale = Math.min((W - LM * 2) / vehicle.length, 180 / vehicle.width, 1.5);
  const { maxY: viewBottom, layers } = drawTopView(ctx, vehicle, variant, LM, y, topScale);
  y = viewBottom + 20;

  // === ЛЕГЕНДА СЛОЁВ ===
  y = drawLayerLegend(ctx, LM, y, layers);

  // === ЛЕГЕНДА НОМЕРОВ ===
  y = drawItemLegend(ctx, LM, y, variant.items);
  y += 8;

  // === ТАБЛИЦА ГРУЗОВ ===
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Список грузов:', LM, y);
  y += 8;
  y = drawCargoTable(ctx, LM, y, W, cargo, variant.items);

  // === ПОДВАЛ ===
  ctx.fillStyle = '#94a3b8';
  ctx.font = `9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CargoPlanner — автоматический расчёт загрузки', W / 2, H - 10);

  // Конвертация в PDF
  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
  doc.save(`load-report-${Date.now()}.pdf`);
}
