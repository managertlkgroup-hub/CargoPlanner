// ============================================================================
// Экспорт текущего вида в PNG высокого разрешения
// Рисует: заголовок, 2D-схему грузов (вид сверху), легенду, шкалу масштаба,
//         метрики, подпись варианта
// ============================================================================

import type { Vehicle, LayoutVariant } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { unitLabel, formatWeight, WEIGHT_UNIT_LABEL, formatDimension, type WeightUnit, nameOf } from '../../utils/helpers';
import { tr, type Lang } from '../../i18n';

/** Вычисляет слой груза */
function layerOf(item: { position: { y: number }; dimensions: { height: number } }): number {
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

/** Габарит груза в плане (вид сверху) с учётом поворота вокруг Y */
function ground(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { w: item.dimensions.width, h: item.dimensions.length }
    : { w: item.dimensions.length, h: item.dimensions.width };
}

/** Выбирает «красивое» значение для шкалы масштаба: кратное 1/2/5 × 10^k,
 *  ближайшее к ~35% длины кузова, но не больше ~40% длины кузова,
 *  чтобы линейка занимала разумную долю (примерно 20–35%) ширины схемы
 *  и была читаемой. Например, для кузова 13.6 м вернёт 5 м (≈37%),
 *  для 20 м — 5 м (25%), для 3 м — 1 м (33%). */
function niceScale(mm: number): number {
  if (mm <= 0) return 1000;
  const target = mm * 0.35;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const norm = target / pow;
  const mul = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  let nice = mul * pow;
  const cap = mm * 0.4;
  while (nice > cap) {
    nice /= 10;
  }
  return Math.max(1, Math.round(nice));
}

/** Генерирует цвет фона из hex с заданной прозрачностью (rgba) */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Сохраняет 2D-схему расстановки грузов как PNG высокого разрешения.
 * Содержит: заголовок, 2D-схему (вид сверху), легенду грузов,
 *           шкалу масштаба, метрики, подпись варианта.
 */
export async function exportSceneToPng(
  _elementId: string,
  filename: string,
  vehicle?: Vehicle,
  variant?: LayoutVariant,
  weightUnit: WeightUnit = 'kg',
  lang: Lang = 'ru',
): Promise<void> {
  const unit = useAppStore.getState().unit;
  const settings = useAppStore.getState().settings;
  const fmt = (mm: number) => formatDimension(mm, unit);

  const enabledGaps = [
    { label: tr(lang, 'gaps.wallShort'), value: settings.gapWalls ?? 0 },
    { label: tr(lang, 'gaps.widthShort'), value: settings.gapWidth ?? 0 },
    { label: tr(lang, 'gaps.lengthShort'), value: settings.gapLength ?? 0 },
  ].filter(g => g.value > 0);
  const fmtGap = (mm: number) => `${formatDimension(mm, unit)} ${unitLabel(lang, unit)}`;

  const cargoLegend: { name: string; color: string; count: number }[] = [];
  if (variant && variant.items.length > 0) {
    const map = new Map<string, { name: string; color: string; count: number }>();
    for (const item of variant.items) {
      const name = nameOf(item, lang);
      const existing = map.get(name);
      if (existing) {
        existing.count++;
      } else {
        map.set(name, { name, color: item.color, count: 1 });
      }
    }
    cargoLegend.push(...map.values());
  }

  const S = 3;
  const PAD = 40 * S;
  const HEADER_H = 70 * S;
  const CARGO_LEGEND_H = cargoLegend.length > 0 ? (cargoLegend.length * 22 + 40) * S : 0;
  const SCALE_BAR_H = vehicle && vehicle.length > 0 ? 60 * S : 0;
  const METRICS_H = (120 + enabledGaps.length * 18) * S;
  const FOOTER_H = 40 * S;

  // Размер 2D-схемы (вид сверху), сохраняя пропорции кузова
  const SCHEME_W = 1400;
  const vlen = vehicle ? Math.max(1, vehicle.length) : 1000;
  const vwid = vehicle ? Math.max(1, vehicle.width) : 1000;
  const SCHEME_H = Math.max(200, Math.round(SCHEME_W * (vwid / vlen)));

  const minW = 1920;
  const totalW = Math.max(minW, SCHEME_W + PAD * 2);
  const totalH = HEADER_H + SCHEME_H + PAD + CARGO_LEGEND_H + SCALE_BAR_H + METRICS_H + FOOTER_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create 2d context');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, HEADER_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${22 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tr(lang, 'png.title'), PAD, HEADER_H / 2);

  ctx.font = `${13 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  const dateStr = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  ctx.fillText(dateStr, canvas.width - PAD, HEADER_H / 2 - 8 * S);

  if (variant) {
    ctx.fillStyle = '#3b82f6';
    ctx.font = `bold ${14 * S}px system-ui, sans-serif`;
    ctx.fillText(
      `${tr(lang, 'png.variant')}: ${tr(lang, variant.labelKey || 'mode.along')}`,
      canvas.width - PAD, HEADER_H / 2 + 12 * S,
    );
  }

  // ── 2D-схема (вид сверху) ─────────────────────────────────────────────────
  const schemeX = (totalW - SCHEME_W) / 2;
  const schemeY = HEADER_H + PAD / 2;
  const pxPerMm = SCHEME_W / vlen;

  // Фон кузова
  ctx.fillStyle = '#fefefe';
  ctx.fillRect(schemeX, schemeY, SCHEME_W, SCHEME_H);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3 * S;
  ctx.strokeRect(schemeX, schemeY, SCHEME_W, SCHEME_H);

  if (variant && vehicle) {
    // Отрисуем грузы в порядке слоёв (нижние раньше)
    const items = [...variant.items].sort((a, b) => layerOf(a) - layerOf(b));
    items.forEach((item, i) => {
      const { w, h } = ground(item);
      const bx = schemeX + item.position.x * pxPerMm;
      const by = schemeY + item.position.z * pxPerMm;
      const bw = w * pxPerMm;
      const bh = h * pxPerMm;
      const color = item.color || '#3b82f6';

      ctx.fillStyle = withAlpha(color, 0.75);
      ctx.fillRect(bx, by, Math.max(3, bw), Math.max(3, bh));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * S;
      ctx.strokeRect(bx, by, Math.max(3, bw), Math.max(3, bh));

      if (bw > 8 * S && bh > 6 * S) {
        ctx.fillStyle = color;
        ctx.font = `bold ${11 * S}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), bx + bw / 2, by + bh / 2);
      }
    });
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${12 * S}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tr(lang, 'png.noScheme'), schemeX + SCHEME_W / 2, schemeY + SCHEME_H / 2);
  }

  let currentY = schemeY + SCHEME_H + PAD;

  if (cargoLegend.length > 0) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${14 * S}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tr(lang, 'png.legend'), PAD, currentY);

    let ly = currentY + 22 * S;
    for (const item of cargoLegend) {
      ctx.fillStyle = item.color;
      ctx.fillRect(PAD, ly - 6 * S, 12 * S, 12 * S);
      ctx.fillStyle = '#1e293b';
      ctx.font = `${12 * S}px system-ui, sans-serif`;
      ctx.fillText(`${item.name}  ×${item.count}`, PAD + 18 * S, ly);
      ly += 22 * S;
    }
    currentY = ly + 10 * S;
  }

  if (vehicle && vehicle.length > 0) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${14 * S}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tr(lang, 'png.scale'), PAD, currentY);

    const niceLen = niceScale(vehicle.length);
    const barPixelWidth = niceLen * pxPerMm;

    const barX = PAD;
    const barLineY = currentY + 26 * S;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.moveTo(barX, barLineY);
    ctx.lineTo(barX + barPixelWidth, barLineY);
    ctx.stroke();

    const tickH = 8 * S;
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(barX, barLineY - tickH);
    ctx.lineTo(barX, barLineY + tickH);
    ctx.moveTo(barX + barPixelWidth, barLineY - tickH);
    ctx.lineTo(barX + barPixelWidth, barLineY + tickH);
    ctx.stroke();

    const niceDisplay = formatDimension(niceLen, unit);
    const label = `${niceDisplay} ${unitLabel(lang, unit)}`;
    ctx.fillStyle = '#1e293b';
    ctx.font = `${11 * S}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, barX + barPixelWidth / 2, barLineY + tickH + 6 * S);

    currentY = barLineY + tickH + 30 * S;
  }

  const metricsY = currentY + 10 * S;
  if (vehicle && variant) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(PAD, metricsY, totalW - PAD * 2, METRICS_H);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, metricsY, totalW - PAD * 2, METRICS_H);

    ctx.fillStyle = '#1e293b';
    ctx.font = `${12 * S}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const layers = new Set(variant.items.map(i => layerOf(i))).size;

    const metrics = [
      `${nameOf(vehicle, lang)} (${fmt(vehicle.length)}×${fmt(vehicle.width)}×${fmt(vehicle.height)} ${unitLabel(lang, unit)})`,
      `${tr(lang, 'png.items')}: ${variant.items.length}`,
      `${tr(lang, 'png.layers')}: ${layers}`,
      `${tr(lang, 'png.fillVolume')}: ${variant.volumeFill ?? 0}%`,
      `${tr(lang, 'png.totalWeight')}: ${formatWeight(variant.totalWeight ?? 0, weightUnit)} ${WEIGHT_UNIT_LABEL[weightUnit]}`,
      `${tr(lang, 'png.fillWeight')}: ${variant.weightFill ?? 0}%`,
    ];
    metrics.forEach((m, i) => {
      ctx.fillText(m, PAD + 10 * S, metricsY + 18 * S + i * 18 * S);
    });

    if (enabledGaps.length > 0) {
      ctx.font = `bold ${12 * S}px system-ui, sans-serif`;
      const gapBase = metricsY + 18 * S + metrics.length * 18 * S;
      ctx.fillStyle = '#475569';
      ctx.fillText(tr(lang, 'gaps.title'), PAD + 10 * S, gapBase);
      ctx.font = `${12 * S}px system-ui, sans-serif`;
      enabledGaps.forEach((g, i) => {
        ctx.fillStyle = '#334155';
        ctx.fillText(`${g.label}: ${fmtGap(g.value)}`, PAD + 10 * S, gapBase + (i + 1) * 18 * S);
      });
    }
  }

  const footerY = metricsY + METRICS_H + 10 * S;
  ctx.fillStyle = '#64748b';
  ctx.font = `${10 * S}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tr(lang, 'png.footer'), totalW / 2, footerY);

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
