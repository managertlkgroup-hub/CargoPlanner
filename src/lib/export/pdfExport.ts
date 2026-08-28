// ============================================================================
// Экспорт отчёта в PDF — canvas-based, профессиональный формат
// Рендерим на canvas (2x DPI), затем встраиваем в jsPDF как изображение
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';

const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ─── Утилиты ───────────────────────────────────────────────

function ground(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { w: item.dimensions.width, h: item.dimensions.length }
    : { w: item.dimensions.length, h: item.dimensions.width };
}

function layerOf(item: { position: { y: number }; dimensions: { height: number } }): number {
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

function vol(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
}

// ─── Штриховка для верхних слоёв ───────────────────────────

function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, layer: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = '#ffffff';
  if (layer === 1) {
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.setLineDash([]);
  } else if (layer === 2) {
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  } else {
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    for (let d = -h; d < w + h; d += 7) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d - h, y + h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ─── Контекст отрисовки (с проверкой переполнения страницы) ─

class PdfCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  LM: number;   // левое поле
  RM: number;   // правое поле
  _y: number;
  private page = 1;

  constructor(ctx: CanvasRenderingContext2D, W: number, H: number) {
    this.ctx = ctx;
    this.W = W;
    this.H = H;
    this.LM = 28;
    this.RM = 28;
    this._y = 0;
  }

  get y() { return this._y; }
  set y(v: number) { this._y = v; }

  get contentW() { return this.W - this.LM - this.RM; }

  /** Проверяет, есть ли место на странице. Если нет — новая страница. */
  ensureSpace(needed: number) {
    if (this._y + needed > this.H - 30) {
      this.newPage();
    }
  }

  newPage() {
    // Подвал текущей страницы
    this.footer();
    // Новая страница
    this.page++;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.W, this.H);
    this._y = 20;
    // Заголовок новой страницы
    this.ctx.fillStyle = '#1e293b';
    this.ctx.font = `bold 12px ${FONT}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`Отчёт о загрузке — стр. ${this.page}`, this.LM, this._y);
    this._y += 18;
    this.separator();
  }

  footer() {
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = `9px ${FONT}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`CargoPlanner — стр. ${this.page}`, this.W / 2, this.H - 8);
  }

  separator() {
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.LM, this._y);
    this.ctx.lineTo(this.W - this.RM, this._y);
    this.ctx.stroke();
    this._y += 8;
  }

  sectionTitle(text: string) {
    this.ensureSpace(30);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.font = `bold 13px ${FONT}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, this.LM, this._y);
    this._y += 4;
    // Подчёркивание
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.LM, this._y + 12);
    this.ctx.lineTo(this.LM + this.ctx.measureText(text).width + 4, this._y + 12);
    this.ctx.stroke();
    this._y += 18;
  }

  text(line: string, opts?: { bold?: boolean; size?: number; color?: string; indent?: number }) {
    const sz = opts?.size ?? 11;
    this.ctx.font = `${opts?.bold ? 'bold ' : ''}${sz}px ${FONT}`;
    this.ctx.fillStyle = opts?.color ?? '#334155';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(line, this.LM + (opts?.indent ?? 0), this._y);
    this._y += sz + 4;
  }

  gap(px: number) { this._y += px; }
}

// ─── Заголовок (шапка) ─────────────────────────────────────

function drawCover(p: PdfCtx) {
  // Тёмный блок заголовка
  p.ctx.fillStyle = '#1e293b';
  p.ctx.fillRect(0, 0, p.W, 72);
  p.ctx.fillStyle = '#ffffff';
  p.ctx.font = `bold 22px ${FONT}`;
  p.ctx.textAlign = 'left';
  p.ctx.textBaseline = 'top';
  p.ctx.fillText('ОТЧЁТ О ЗАГРУЗКЕ', p.LM, 16);
  p.ctx.fillStyle = '#94a3b8';
  p.ctx.font = `12px ${FONT}`;
  p.ctx.fillText(`CargoPlanner  •  ${new Date().toLocaleDateString('ru-RU')}`, p.LM, 46);
  p._y = 86;
}

// ─── Информация об автомобиле ──────────────────────────────

function drawVehicleInfo(p: PdfCtx, vehicle: Vehicle) {
  p.sectionTitle('Автомобиль');
  p.text(`${vehicle.name}`, { bold: true, size: 12 });
  p.text(`Кузов: ${vehicle.length} × ${vehicle.width} × ${vehicle.height} мм`, { indent: 8 });
  p.text(`Грузоподъёмность: ${vehicle.maxWeight} кг`, { indent: 8 });
  p.gap(6);
}

// ─── Сводка по загрузке ────────────────────────────────────

function drawMetrics(p: PdfCtx, variant: LayoutVariant, vehicle: Vehicle) {
  p.sectionTitle('Сводка по загрузке');
  p.text(`Вариант раскладки: ${variant.label}`, { bold: true, size: 12 });
  p.gap(2);

  // Метрики в две колонки (более компактно)
  const left = [
    `Заполнение объёма: ${variant.volumeFill}%`,
    `Заполнение по весу: ${variant.weightFill}%`,
    `Размещено грузов: ${variant.items.length} шт.`,
    `Суммарный вес: ${variant.totalWeight} кг`,
  ];
  const right = [
    `Свободный объём: ${vol(variant.freeVolume)}`,
    `Свободный вес: ${Math.max(0, vehicle.maxWeight - variant.totalWeight)} кг`,
    `Грузоподъёмность: ${vehicle.maxWeight} кг`,
    ``,
  ];

  const sz = 11;
  const colW = p.contentW / 2;
  left.forEach((line, i) => {
    p.ctx.font = `${sz}px ${FONT}`;
    p.ctx.fillStyle = '#334155';
    p.ctx.textAlign = 'left';
    p.ctx.textBaseline = 'top';
    p.ctx.fillText(line, p.LM, p._y + i * (sz + 4));
    if (right[i]) {
      p.ctx.fillText(right[i], p.LM + colW, p._y + i * (sz + 4));
    }
  });
  p._y += left.length * (sz + 4) + 4;

  // Слои
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;
  if (maxLayer > 0) {
    p.text(`Количество слоёв: ${maxLayer + 1}`, { bold: true });
    const counts: Record<number, number> = {};
    variant.items.forEach(item => {
      const li = layerOf(item);
      counts[li] = (counts[li] || 0) + 1;
    });
    const dist = Object.entries(counts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([l, c]) => `Слой ${l}: ${c} шт.`)
      .join('  •  ');
    p.text(dist, { indent: 8, color: '#64748b' });
  }

  // Габариты
  if (variant.items.length > 0) {
    let maxX = 0, maxZ = 0, maxY = 0;
    variant.items.forEach((item) => {
      const { w, h } = ground(item);
      maxX = Math.max(maxX, item.position.x + w);
      maxZ = Math.max(maxZ, item.position.z + h);
      maxY = Math.max(maxY, item.position.y + item.dimensions.height);
    });
    p.gap(2);
    p.text(`Габариты размещения: ${Math.round(maxX)} × ${Math.round(maxZ)} × ${Math.round(maxY)} мм  (${vol(maxX * maxZ * maxY)})`, { color: '#64748b' });
  }
  p.gap(8);
}

// ─── Вид сверху (для одного слоя или всех) ───────────────

/** Рисует вид сверху. Если layer задан — только грузы этого слоя. */
function drawTopView(
  p: PdfCtx,
  vehicle: Vehicle,
  variant: LayoutVariant,
  opts?: { layer?: number; ox?: number; oy?: number; scale?: number; title?: string },
): { bottom: number; label: string } {
  const layer = opts?.layer;
  const ox = opts?.ox ?? p.LM;
  let oy = opts?.oy ?? p._y;
  const scale = opts?.scale ?? Math.min(p.contentW / vehicle.length, 180 / vehicle.width, 1.5);
  const vw = vehicle.length * scale;
  const vh = vehicle.width * scale;

  // Подпись
  const label = opts?.title ?? (layer !== undefined ? `Слой ${layer}${layer === 0 ? ' (пол)' : ''}` : 'Вид сверху');
  p.ctx.fillStyle = '#1e293b';
  p.ctx.font = `bold 11px ${FONT}`;
  p.ctx.textAlign = 'left';
  p.ctx.textBaseline = 'top';
  p.ctx.fillText(label, ox, oy);
  oy += 16;

  // Фон кузова
  p.ctx.strokeStyle = '#475569';
  p.ctx.lineWidth = 1.5;
  p.ctx.strokeRect(ox, oy, vw, vh);
  p.ctx.fillStyle = '#f8fafc';
  p.ctx.fillRect(ox, oy, vw, vh);

  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;

  // Фильтруем грузы: все или только указанный слой
  const items = layer !== undefined
    ? variant.items.filter(i => layerOf(i) === layer)
    : [...variant.items].sort((a, b) => layerOf(a) - layerOf(b));

  items.forEach((item) => {
    const { w, h } = ground(item);
    const x = ox + item.position.x * scale;
    const y = oy + item.position.z * scale;
    const iw = w * scale;
    const ih = h * scale;
    const li = layerOf(item);
    const color = maxLayer > 0 ? LAYER_COLORS[li % LAYER_COLORS.length] : (item.color || '#3b82f6');

    // Заливка
    p.ctx.fillStyle = color;
    p.ctx.globalAlpha = 0.9;
    p.ctx.fillRect(x, y, iw, ih);
    p.ctx.globalAlpha = 1;

    // Штриховка для верхних слоёв
    if (layer !== undefined && layer > 0) {
      hatch(p.ctx, x, y, iw, ih, layer);
    }

    // Обводка
    p.ctx.strokeStyle = '#1e293b';
    p.ctx.lineWidth = 1;
    p.ctx.strokeRect(x, y, iw, ih);

    // Номер
    if (iw > 12 && ih > 12) {
      p.ctx.fillStyle = '#ffffff';
      p.ctx.font = `bold 9px ${FONT}`;
      p.ctx.textAlign = 'center';
      p.ctx.textBaseline = 'middle';
      p.ctx.fillText(String(variant.items.indexOf(item) + 1), x + iw / 2, y + ih / 2);
    }
  });

  // Если слой пуст — подпись
  if (items.length === 0) {
    p.ctx.fillStyle = '#94a3b8';
    p.ctx.font = `italic 10px ${FONT}`;
    p.ctx.textAlign = 'center';
    p.ctx.textBaseline = 'middle';
    p.ctx.fillText('нет грузов', ox + vw / 2, oy + vh / 2);
  }

  // Линейка
  const rulerPx = 1000 * scale;
  if (rulerPx > 20) {
    const ry = oy + vh + 4;
    p.ctx.strokeStyle = '#64748b';
    p.ctx.lineWidth = 1;
    p.ctx.beginPath();
    p.ctx.moveTo(ox, ry); p.ctx.lineTo(ox + rulerPx, ry);
    p.ctx.moveTo(ox, ry - 2); p.ctx.lineTo(ox, ry + 2);
    p.ctx.moveTo(ox + rulerPx, ry - 2); p.ctx.lineTo(ox + rulerPx, ry + 2);
    p.ctx.stroke();
    p.ctx.fillStyle = '#64748b';
    p.ctx.font = `7px ${FONT}`;
    p.ctx.textAlign = 'center';
    p.ctx.textBaseline = 'top';
    p.ctx.fillText('1 м', ox + rulerPx / 2, ry + 3);
  }

  const bottom = oy + vh + (rulerPx > 20 ? 18 : 8);
  return { bottom, label };
}

// ─── Легенда слоёв ─────────────────────────────────────────

function drawLayerLegend(p: PdfCtx, layers: number) {
  if (layers <= 1) return;
  p.ctx.font = `bold 10px ${FONT}`;
  p.ctx.fillStyle = '#1e293b';
  p.ctx.textAlign = 'left';
  p.ctx.textBaseline = 'middle';
  p.ctx.fillText('Обозначение:', p.LM, p._y + 7);
  let lx = p.LM + 80;
  for (let i = 0; i < layers; i++) {
    const color = LAYER_COLORS[i % LAYER_COLORS.length];
    p.ctx.fillStyle = color;
    p.ctx.globalAlpha = i === 0 ? 0.9 : 0.75;
    p.ctx.fillRect(lx, p._y, 14, 14);
    p.ctx.globalAlpha = 1;
    if (i > 0) hatch(p.ctx, lx, p._y, 14, 14, i);
    p.ctx.strokeStyle = i === 0 ? '#1e293b' : '#ffffff';
    p.ctx.lineWidth = i === 0 ? 1 : 1.5;
    p.ctx.strokeRect(lx, p._y, 14, 14);

    p.ctx.fillStyle = '#334155';
    p.ctx.font = `9px ${FONT}`;
    p.ctx.textAlign = 'left';
    p.ctx.textBaseline = 'middle';
    p.ctx.fillText(`Слой ${i}${i === 0 ? ' (пол)' : ''}`, lx + 18, p._y + 7);
    lx += 100;
  }
  p._y += 22;
}

// ─── Легенда номеров (группировка по слоям) ────────────────

function drawItemLegend(p: PdfCtx, items: LayoutVariant['items']) {
  if (items.length === 0) return;

  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
  const cols = 3;
  const colW = p.contentW / cols;

  if (maxL === 0) {
    // Без слоёв — простая сетка
    p.ctx.font = `9px ${FONT}`;
    p.ctx.textAlign = 'left';
    p.ctx.textBaseline = 'top';
    p.ctx.fillStyle = '#475569';
    items.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      p.ctx.fillText(`${idx + 1}. ${item.name}`, p.LM + col * colW, p._y + row * 13);
    });
    p._y += Math.ceil(items.length / cols) * 13 + 10;
    return;
  }

  // Со слоями — группировка
  p.ctx.font = `bold 10px ${FONT}`;
  p.ctx.fillStyle = '#1e293b';
  p.ctx.textAlign = 'left';
  p.ctx.textBaseline = 'top';
  p.ctx.fillText('Номера грузов по слоям:', p.LM, p._y);
  p._y += 14;

  for (let layer = 0; layer <= maxL; layer++) {
    const layerItems = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => layerOf(item) === layer);
    if (layerItems.length === 0) continue;

    const color = LAYER_COLORS[layer % LAYER_COLORS.length];
    p.ctx.fillStyle = color;
    p.ctx.fillRect(p.LM, p._y + 1, 10, 10);
    p.ctx.fillStyle = '#1e293b';
    p.ctx.font = `bold 9px ${FONT}`;
    p.ctx.textAlign = 'left';
    p.ctx.fillText(`Слой ${layer}:`, p.LM + 14, p._y);
    p._y += 12;

    p.ctx.font = `9px ${FONT}`;
    p.ctx.fillStyle = '#475569';
    layerItems.forEach(({ item, idx }, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      p.ctx.fillText(`${idx + 1}. ${item.name}`, p.LM + 10 + col * colW, p._y + row * 13);
    });
    p._y += Math.ceil(layerItems.length / cols) * 13 + 4;
  }
  p._y += 6;
}

// ─── Таблица грузов с чёткими границами ────────────────────

function drawCargoTable(p: PdfCtx, cargo: Cargo[], items: LayoutVariant['items']) {
  p.sectionTitle('Список грузов');

  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
  const hasLayers = maxL > 0;

  // Колонки: №, Название, Форма, Размеры, Вес, Кол-во [, Слой]
  const headers = hasLayers
    ? ['№', 'Название', 'Форма', 'Размеры, мм', 'Вес, кг', 'Кол-во', 'Слой']
    : ['№', 'Название', 'Форма', 'Размеры, мм', 'Вес, кг', 'Кол-во'];

  // Ширины колонок (в px)
  const colWidths = hasLayers
    ? [24, 100, 55, 110, 52, 42, 48]
    : [24, 110, 60, 120, 56, 46];

  const totalW = colWidths.reduce((s, w) => s + w, 0);
  const startX = p.LM + (p.contentW - totalW) / 2; // центрируем
  const rowH = 18;

  // Вычисляем X координаты колонок
  const colX: number[] = [];
  let cx = startX;
  for (const w of colWidths) {
    colX.push(cx);
    cx += w;
  }

  // Сортируем грузы по слою.
  // cargo — исходный список (с quantity), items — развёрнутый (quantity штук).
  // Строим маппинг: cargo[i] → все items с таким же id.
  const itemLayersByCargoId = new Map<string, number[]>();
  items.forEach(item => {
    const id = item.id.split('-')[0]; // PackedItem id = `${p.id}-${x}-${y}-${z}`
    const arr = itemLayersByCargoId.get(id) || [];
    arr.push(layerOf(item));
    itemLayersByCargoId.set(id, arr);
  });

  const sorted = cargo.map(c => {
    const layers = itemLayersByCargoId.get(c.id) || [];
    // Берём минимум слоя для этого типа груза
    const layer = layers.length > 0 ? Math.min(...layers) : 0;
    return { c, layer };
  }).sort((a, b) => a.layer - b.layer);

  // Проверяем помещается ли таблица
  const headerH = 22;
  const tableH = headerH + sorted.length * rowH + 4;
  p.ensureSpace(tableH);

  // Шапка таблицы
  p.ctx.fillStyle = '#1e293b';
  p.ctx.fillRect(startX, p._y, totalW, headerH);
  p.ctx.font = `bold 9px ${FONT}`;
  p.ctx.fillStyle = '#ffffff';
  p.ctx.textAlign = 'left';
  p.ctx.textBaseline = 'middle';
  headers.forEach((h, i) => {
    p.ctx.fillText(h, colX[i] + 4, p._y + headerH / 2);
  });
  p._y += headerH;

  // Строки данных
  p.ctx.font = `9px ${FONT}`;
  sorted.forEach(({ c, layer: li }, rowIdx) => {
    // Чередование фона строк
    if (rowIdx % 2 === 0) {
      p.ctx.fillStyle = '#f8fafc';
      p.ctx.fillRect(startX, p._y, totalW, rowH);
    }

    // Горизонтальная линия сверху
    p.ctx.strokeStyle = '#e2e8f0';
    p.ctx.lineWidth = 0.5;
    p.ctx.beginPath();
    p.ctx.moveTo(startX, p._y);
    p.ctx.lineTo(startX + totalW, p._y);
    p.ctx.stroke();

    const size = c.shape === 'cylinder'
      ? `Ø${c.diameter}×${c.length}`
      : `${c.length}×${c.width ?? 0}×${c.height ?? 0}`;

    const vals = [
      String(rowIdx + 1),
      c.name,
      c.shape === 'box' ? 'Прямоуг.' : 'Цилиндр',
      size,
      String(c.weight),
      String(c.quantity),
    ];

    p.ctx.textAlign = 'left';
    p.ctx.textBaseline = 'middle';
    const cellY = p._y + rowH / 2;

    vals.forEach((v, i) => {
      p.ctx.fillStyle = '#1e293b';
      p.ctx.fillText(v, colX[i] + 4, cellY);
    });

    // Колонка «Слой»
    if (hasLayers) {
      const color = LAYER_COLORS[li % LAYER_COLORS.length];
      const sx = colX[6];
      // Цветной фон
      p.ctx.fillStyle = color;
      p.ctx.globalAlpha = 0.12;
      p.ctx.fillRect(sx + 2, p._y + 2, totalW - (colX[6] - startX) - 4, rowH - 4);
      p.ctx.globalAlpha = 1;
      // Кружок
      p.ctx.fillStyle = color;
      p.ctx.beginPath();
      p.ctx.arc(sx + 12, cellY, 5, 0, Math.PI * 2);
      p.ctx.fill();
      // Текст
      p.ctx.fillStyle = '#1e293b';
      p.ctx.textAlign = 'left';
      p.ctx.fillText(String(li), sx + 20, cellY);
    }

    p._y += rowH;
  });

  // Нижняя граница таблицы
  p.ctx.strokeStyle = '#1e293b';
  p.ctx.lineWidth = 1;
  p.ctx.beginPath();
  p.ctx.moveTo(startX, p._y);
  p.ctx.lineTo(startX + totalW, p._y);
  p.ctx.stroke();

  // Вертикальные линии колонок
  p.ctx.strokeStyle = '#cbd5e1';
  p.ctx.lineWidth = 0.5;
  for (let i = 1; i < colX.length; i++) {
    p.ctx.beginPath();
    p.ctx.moveTo(colX[i], p._y - sorted.length * rowH - headerH);
    p.ctx.lineTo(colX[i], p._y);
    p.ctx.stroke();
  }

  p._y += 10;
}

// ─── Основная функция ──────────────────────────────────────

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

  // Белый фон
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const p = new PdfCtx(ctx, W, H);

  // ─── Страница 1 ─────────────────────────────────────────
  drawCover(p);
  drawVehicleInfo(p, vehicle);
  drawMetrics(p, variant, vehicle);

  // Определяем количество слоёв
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;
  const numLayers = maxLayer + 1;

  if (numLayers <= 1) {
    // Без штабелирования — одна общая схема
    drawTopView(p, vehicle, variant);
    p.gap(12);
  } else {
    // Со штабелированием — отдельная схема для каждого слоя
    p.sectionTitle('Вид сверху по слоям');

    // 2 в ряд если 3+ слоёв, иначе 1 в ряд
    const perRow = numLayers >= 3 ? 2 : 1;
    const cellW = perRow === 2
      ? (p.contentW - 16) / 2  // 16px зазор между схемами
      : p.contentW;
    const cellScale = Math.min(
      cellW / vehicle.length,
      140 / vehicle.width,
      1.2,
    );
    const cellH = vehicle.width * cellScale + 30; // высота ячейки (схема + подпись + линейка)

    for (let li = 0; li < numLayers; li++) {
      const col = li % perRow;
      const row = Math.floor(li / perRow);
      const ox = p.LM + col * (cellW + 16);
      const cellY = p._y + row * (cellH + 8);

      // Проверяем, поместится ли на странице
      p.ensureSpace(cellH + 10);

      drawTopView(p, vehicle, variant, {
        layer: li,
        ox,
        oy: cellY,
        scale: cellScale,
      });
    }

    // Сдвигаем Y после всех схем
    const totalRows = Math.ceil(numLayers / perRow);
    p._y += totalRows * (cellH + 8) + 8;

    // Легенда слоёв
    drawLayerLegend(p, numLayers);
  }

  drawItemLegend(p, variant.items);
  drawCargoTable(p, cargo, variant.items);

  // Подвал
  p.footer();

  // PDF
  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
  doc.save(`load-report-${Date.now()}.pdf`);
}
