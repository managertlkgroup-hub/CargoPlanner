// ============================================================================
// Экспорт отчёта в PDF — canvas-based для поддержки кириллицы
// Рендерим отчёт на canvas, затем встраиваем в jsPDF как изображение
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';

/** Шрифт для canvas */
const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Цвета слоёв */
const LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function vol(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
}

function ground(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { w: item.dimensions.width, h: item.dimensions.length }
    : { w: item.dimensions.length, h: item.dimensions.width };
}

function layerOf(item: { position: { y: number }; dimensions: { height: number } }): number {
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

/** Рисует штриховку для верхних слоёв */
function drawHatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, layer: number, _color: string) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (layer === 1) {
    // Пунктирная рамка (1 штрих)
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.setLineDash([]);
  } else if (layer === 2) {
    // Двойная рамка
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  } else if (layer >= 3) {
    // Диагональные линии
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    const step = 8;
    for (let d = -h; d < w + h; d += step) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d - h, y + h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

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

/** Рисует вид сверху с штриховкой для верхних слоёв */
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

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, vw, vh);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(ox, oy, vw, vh);

  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;

  // Сначала рисуем слой 0 (задний план), потом верхние слои поверх
  const sortedItems = [...variant.items].sort((a, b) => layerOf(a) - layerOf(b));

  sortedItems.forEach((item) => {
    const { w, h } = ground(item);
    const x = ox + item.position.x * scale;
    const y = oy + item.position.z * scale;
    const iw = w * scale;
    const ih = h * scale;
    const li = layerOf(item);

    const color = maxLayer > 0 ? LAYER_COLORS[li % LAYER_COLORS.length] : (item.color || '#3b82f6');

    // Заливка
    ctx.fillStyle = color;
    ctx.globalAlpha = li === 0 ? 0.9 : 0.75;
    ctx.fillRect(x, y, iw, ih);
    ctx.globalAlpha = 1;

    // Штриховка для верхних слоёв
    if (maxLayer > 0 && li > 0) {
      drawHatch(ctx, x, y, iw, ih, li, color);
    }

    // Обводка
    ctx.strokeStyle = li === 0 ? '#1e293b' : '#ffffff';
    ctx.lineWidth = li === 0 ? 1 : 1.5;
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

/** Легенда слоёв с примерами штриховки */
function drawLayerLegend(ctx: CanvasRenderingContext2D, x: number, y: number, layers: number): number {
  if (layers <= 1) return y;
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Обозначение слоёв:', x, y + 7);
  y += 16;

  for (let i = 0; i < layers; i++) {
    const lx = x + i * 110;
    const color = LAYER_COLORS[i % LAYER_COLORS.length];

    // Цветной квадрат 14×14 с штриховкой
    ctx.fillStyle = color;
    ctx.globalAlpha = i === 0 ? 0.9 : 0.75;
    ctx.fillRect(lx, y, 14, 14);
    ctx.globalAlpha = 1;
    if (i > 0) drawHatch(ctx, lx, y, 14, 14, i, color);
    ctx.strokeStyle = i === 0 ? '#1e293b' : '#ffffff';
    ctx.lineWidth = i === 0 ? 1 : 1.5;
    ctx.strokeRect(lx, y, 14, 14);

    // Текст
    ctx.fillStyle = '#1e293b';
    ctx.font = `9px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Слой ${i}${i === 0 ? ' (пол)' : ''}`, lx + 18, y + 7);
  }
  return y + 22;
}

/** Легенда номеров — сгруппирована по слоям */
function drawItemLegend(ctx: CanvasRenderingContext2D, x: number, y: number, items: LayoutVariant['items']): number {
  if (items.length === 0) return y;

  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
  const hasLayers = maxL > 0;

  if (!hasLayers) {
    // Без слоёв — обычная легенда 3 колонки
    const cols = 3;
    const colW = (794 - 48) / cols;
    ctx.font = `9px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#475569';
    items.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.fillText(`${idx + 1}. ${item.name}`, x + col * colW, y + row * 14);
    });
    return y + Math.ceil(items.length / cols) * 14 + 12;
  }

  // Со слоями — группировка по слоям
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Грузы по слоям:', x, y);
  y += 14;

  const cols = 3;
  const colW = (794 - 48) / cols;

  for (let layer = 0; layer <= maxL; layer++) {
    const layerItems = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => layerOf(item) === layer);

    if (layerItems.length === 0) continue;

    // Заголовок слоя
    const color = LAYER_COLORS[layer % LAYER_COLORS.length];
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 2, 10, 10);
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold 9px ${FONT}`;
    ctx.fillText(`Слой ${layer}:`, x + 14, y + 1);
    y += 13;

    // Номера грузов этого слоя
    ctx.font = `9px ${FONT}`;
    ctx.fillStyle = '#475569';
    layerItems.forEach(({ item, idx }, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      ctx.fillText(`${idx + 1}. ${item.name}`, x + 10 + col * colW, y + row * 13);
    });
    y += Math.ceil(layerItems.length / cols) * 13 + 4;
  }

  return y + 8;
}

/** Таблица грузов — отсортирована по слоям, цветная колонка «Слой» */
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
    ? [x, x + 115, x + 180, x + 290, x + 355, x + 415]
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

  // Сортируем грузы по слою (сначала слой 0, потом 1 и т.д.)
  const cargoWithLayer = cargo.map(c => {
    const matchingItem = items.find(it => it.name === c.name);
    return { cargo: c, layer: matchingItem ? layerOf(matchingItem) : 0 };
  });
  cargoWithLayer.sort((a, b) => a.layer - b.layer);

  // Строки данных
  ctx.font = `10px ${FONT}`;
  for (const { cargo: c, layer: li } of cargoWithLayer) {
    const size = c.shape === 'cylinder'
      ? `Ø${c.diameter}×${c.length}`
      : `${c.length}×${c.width ?? 0}×${c.height ?? 0}`;

    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.fillText(c.name, colX[0], y);
    ctx.fillText(c.shape === 'box' ? 'Прямоуг.' : 'Цилиндр', colX[1], y);
    ctx.fillText(size, colX[2], y);
    ctx.fillText(String(c.weight), colX[3], y);
    ctx.fillText(String(c.quantity), colX[4], y);

    if (hasLayers) {
      // Цветной фон ячейки «Слой»
      const color = LAYER_COLORS[li % LAYER_COLORS.length];
      const cellX = colX[5] - 2;
      const cellY = y - 1;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(cellX, cellY, 30, 14);
      ctx.globalAlpha = 1;

      // Цветной кружок
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(colX[5] + 5, y + 5, 4, 0, Math.PI * 2);
      ctx.fill();

      // Номер слоя
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.fillText(String(li), colX[5] + 12, y);
    }

    y += 16;

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
  const W = 794;
  const H = 1123;

  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas');
  ctx.scale(DPR, DPR);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const LM = 24;
  let y = drawHeader(ctx, W);
  y += 10;

  // Автомобиль
  y = drawInfo(ctx, LM, y, [
    `Автомобиль: ${vehicle.name}`,
    `Кузов: ${vehicle.length}×${vehicle.width}×${vehicle.height} мм`,
    `Грузоподъёмность: ${vehicle.maxWeight} кг`,
  ], { size: 11 });
  y += 6;

  // Метрики
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
    // Распределение по слоям
    const layerCounts: Record<number, number> = {};
    variant.items.forEach(item => {
      const li = layerOf(item);
      layerCounts[li] = (layerCounts[li] || 0) + 1;
    });
    const dist = Object.entries(layerCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([l, cnt]) => `Слой ${l}: ${cnt} шт.`)
      .join(', ');
    y = drawInfo(ctx, LM, y, [`Распределение: ${dist}`], { size: 11 });
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
  y += 12;

  // Вид сверху
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Вид сверху:', LM, y);
  y += 8;

  const topScale = Math.min((W - LM * 2) / vehicle.length, 180 / vehicle.width, 1.5);
  const { maxY: viewBottom, layers } = drawTopView(ctx, vehicle, variant, LM, y, topScale);
  y = viewBottom + 20;

  // Легенда слоёв
  y = drawLayerLegend(ctx, LM, y, layers);

  // Легенда номеров (группировка по слоям)
  y = drawItemLegend(ctx, LM, y, variant.items);
  y += 8;

  // Таблица
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Список грузов:', LM, y);
  y += 8;
  y = drawCargoTable(ctx, LM, y, W, cargo, variant.items);

  // Подвал
  ctx.fillStyle = '#94a3b8';
  ctx.font = `9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CargoPlanner — автоматический расчёт загрузки', W / 2, H - 10);

  // PDF
  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
  doc.save(`load-report-${Date.now()}.pdf`);
}
