// ============================================================================
// Экспорт отчёта в PDF — canvas-based для поддержки кириллицы
// Рендерим отчёт на canvas, затем встраиваем в jsPDF как изображение
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';


/** Форматирует объём мм³ в м³ */
function volToM3(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
}

/** Получает эффективные размеры основания груза с учётом поворота */
function getEffectiveGround(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { effLength: item.dimensions.width, effWidth: item.dimensions.length }
    : { effLength: item.dimensions.length, effWidth: item.dimensions.width };
}

/** Рисует заголовок на canvas */
function drawHeader(ctx: CanvasRenderingContext2D, w: number, y: number): number {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Отчёт о загрузке', 30, 15);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`CargoPlanner — ${new Date().toLocaleDateString('ru-RU')}`, 30, 45);
  return y + 20;
}

/** Рисует секцию текста на canvas */
function drawSection(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _w: number,
  lines: string[],
  opts?: { bold?: boolean; fontSize?: number; color?: string },
): number {
  const fontSize = opts?.fontSize ?? 14;
  const fontWeight = opts?.bold ? 'bold ' : '';
  ctx.font = `${fontWeight}${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = opts?.color ?? '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += fontSize + 6;
  }
  return y;
}

/** Рисует 2D-вид сверху (XZ) раскладки */
function drawTopView(
  ctx: CanvasRenderingContext2D,
  vehicle: Vehicle,
  variant: LayoutVariant,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  const vw = vehicle.length * scale;
  const vh = vehicle.width * scale;

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, vw, vh);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(offsetX, offsetY, vw, vh);

  variant.items.forEach((item) => {
    const { effLength, effWidth } = getEffectiveGround(item);
    const x = offsetX + item.position.x * scale;
    const y = offsetY + item.position.z * scale;
    const iw = effLength * scale;
    const ih = effWidth * scale;
    ctx.fillStyle = item.color || '#3b82f6';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x, y, iw, ih);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, iw, ih);

    if (iw > 14 && ih > 14) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Порядковый номер груза (1-based)
      const itemIdx = variant.items.indexOf(item) + 1;
      ctx.fillText(String(itemIdx), x + iw / 2, y + ih / 2);
    }
  });

  // Масштабная линейка
  const rulerLen = 1000; // 1 метр
  const rulerPx = rulerLen * scale;
  if (rulerPx > 30) {
    const rx = offsetX;
    const ry = offsetY + vh + 8;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rulerPx, ry);
    ctx.stroke();
    // Засечки
    ctx.beginPath();
    ctx.moveTo(rx, ry - 3);
    ctx.lineTo(rx, ry + 3);
    ctx.moveTo(rx + rulerPx, ry - 3);
    ctx.lineTo(rx + rulerPx, ry + 3);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('1 м', rx + rulerPx / 2, ry + 5);
  }
}



/** Рисует таблицу грузов */
function drawCargoTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pageW: number,
  cargo: Cargo[],
): number {
  const headers = ['Название', 'Форма', 'Размеры, мм', 'Вес, кг', 'Кол-во'];
  const colX = [x, x + 130, x + 195, x + 310, x + 380];

  // Header row
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x, y, pageW - x * 2, 22);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  headers.forEach((h, i) => ctx.fillText(h, colX[i], y + 5));
  y += 24;

  // Data rows
  ctx.font = '11px system-ui, sans-serif';
  for (const c of cargo) {
    const size = c.shape === 'cylinder'
      ? `Ø${c.diameter}×${c.length}`
      : `${c.length}×${c.width ?? 0}×${c.height ?? 0}`;
    ctx.fillStyle = '#1e293b';
    ctx.fillText(c.name, colX[0], y);
    ctx.fillText(c.shape === 'box' ? 'Прямоуг.' : 'Цилиндр', colX[1], y);
    ctx.fillText(size, colX[2], y);
    ctx.fillText(String(c.weight), colX[3], y);
    ctx.fillText(String(c.quantity), colX[4], y);
    y += 18;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + pageW - x * 2, y - 4);
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
  // Рендерим в 2x для высокого качества
  const DPR = 2;
  const baseW = 794;  // A4 portrait @ 96dpi (logical)
  const baseH = 1123;

  const canvas = document.createElement('canvas');
  canvas.width = baseW * DPR;
  canvas.height = baseH * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas');

  // Масштабируем контекст, чтобы рисовать в логических координатах
  ctx.scale(DPR, DPR);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, baseW, baseH);

  let y = 70;

  // Header
  y = drawHeader(ctx, baseW, y);
  y += 14;

  // Vehicle info
  y = drawSection(ctx, 30, y, baseW, [
    `Автомобиль: ${vehicle.name}`,
    `Кузов: ${vehicle.length}×${vehicle.width}×${vehicle.height} мм`,
    `Грузоподъёмность: ${vehicle.maxWeight} кг`,
  ], { bold: false, fontSize: 13 });
  y += 8;

  // Metrics
  y = drawSection(ctx, 30, y, baseW, [
    `Вариант раскладки: ${variant.label}`,
  ], { bold: true, fontSize: 14 });
  y = drawSection(ctx, 30, y, baseW, [
    `Заполнение объёма: ${variant.volumeFill}%`,
    `Заполнение по весу: ${variant.weightFill}%`,
    `Суммарный вес: ${variant.totalWeight} кг`,
    `Свободный объём: ${volToM3(variant.freeVolume)}`,
    `Размещено грузов: ${variant.items.length} шт.`,
  ], { fontSize: 12 });
  y += 8;

  // Cargo dimensions
  if (variant.items.length > 0) {
    let maxX = 0, maxZ = 0, maxY = 0;
    variant.items.forEach((item) => {
      const { effLength, effWidth } = getEffectiveGround(item);
      maxX = Math.max(maxX, item.position.x + effLength);
      maxZ = Math.max(maxZ, item.position.z + effWidth);
      maxY = Math.max(maxY, item.position.y + item.dimensions.height);
    });
    y = drawSection(ctx, 30, y, baseW, [
      'Габариты груза:',
      `  Длина: ${Math.round(maxX)} мм`,
      `  Ширина: ${Math.round(maxZ)} мм`,
      `  Высота: ${Math.round(maxY)} мм`,
      `  Объём: ${(maxX * maxZ * maxY / 1e9).toFixed(2)} м³`,
    ], { fontSize: 12 });
  }
  y += 14;

  // Top view
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Вид сверху:', 30, y);
  y += 8;
  const topScale = Math.min(300 / vehicle.length, 180 / vehicle.width, 1.5);
  drawTopView(ctx, vehicle, variant, 30, y, topScale);
  y += vehicle.width * topScale + 24;

  // Легенда номеров (номер → название груза)
  ctx.fillStyle = '#64748b';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const legendCols = 3;
  const colWidth = (baseW - 60) / legendCols;
  variant.items.forEach((item, idx) => {
    const col = idx % legendCols;
    const row = Math.floor(idx / legendCols);
    const lx = 30 + col * colWidth;
    const ly = y + row * 14;
    ctx.fillText(`${idx + 1}. ${item.name}`, lx, ly);
  });
  y += Math.ceil(variant.items.length / legendCols) * 14 + 24;

  // Cargo table
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Список грузов:', 30, y);
  y += 10;
  y = drawCargoTable(ctx, 30, y, baseW, cargo);

  // Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CargoPlanner — автоматический расчёт загрузки', baseW / 2, baseH - 20);
  ctx.fillText(new Date().toLocaleDateString('ru-RU'), baseW / 2, baseH - 8);

  // Convert canvas to PDF (high-res 2x)
  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
  doc.save(`load-report-${Date.now()}.pdf`);
}
