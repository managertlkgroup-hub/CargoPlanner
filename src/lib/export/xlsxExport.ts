// ============================================================================
// Экспорт отчёта в XLSX — 4 листа: Сводка, Грузы, Зазоры, Инструкция
// ============================================================================

import * as XLSX from 'xlsx';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';
import { formatWeight, formatDimension, UNIT_LABEL, nameOf, type Unit, weightUnitLabel, volumeToM3 } from '../../utils/helpers';
import type { WeightUnit } from '../../utils/helpers';
import { useAppStore } from '../../store/useAppStore';
import { tr, type Lang } from '../../i18n';

type SheetRows = (string | number)[][];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtDimension(mm: number, unit: Unit): string {
  return formatDimension(mm, unit);
}

function fmtWeight(kg: number, wu: WeightUnit): string {
  return formatWeight(kg, wu);
}

/** Определяет номер слоя груза */
function layerOfPacked(item: { layer?: number; position: { y: number }; dimensions: { height: number } }): number {
  if (item.layer != null) return item.layer;
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

export function exportToXLSX(
  vehicle: Vehicle,
  _cargos: Cargo[],
  variants: LayoutVariant[],
  weightUnit: WeightUnit = 'kg',
  lang: Lang = 'ru',
): void {
  const wb = XLSX.utils.book_new();
  const { unit, settings } = useAppStore.getState();
  const U = UNIT_LABEL[unit];
  const W = weightUnitLabel(lang, weightUnit);
  const fmt = (mm: number) => fmtDimension(mm, unit);

  // «Лучший вариант» — по максимальному заполнению объёма кузова,
  // при равенстве — по заполнению веса, затем по количеству грузов.
  const best = [...variants].sort((a, b) => {
    const dv = (b.volumeFill ?? 0) - (a.volumeFill ?? 0);
    if (dv !== 0) return dv;
    const dw = (b.weightFill ?? 0) - (a.weightFill ?? 0);
    if (dw !== 0) return dw;
    return (b.items?.length ?? 0) - (a.items?.length ?? 0);
  })[0];
  if (!best) return;

  buildSummarySheet(wb, vehicle, variants, best, settings, fmt, fmtWeight, U, W, weightUnit, lang);
  buildCargoSheet(wb, best, fmt, fmtWeight, W, weightUnit, lang);
  buildSchemeSheet(wb, vehicle, best, lang);
  buildGapsSheet(wb, settings, fmt, lang);
  buildInstructionsSheet(wb, lang);

  XLSX.writeFile(wb, 'cargo-plan.xlsx');
}

// ─── Sheet 1: Сводка / Summary ──────────────────────────────────────────────

function buildSummarySheet(
  wb: XLSX.WorkBook,
  vehicle: Vehicle,
  variants: LayoutVariant[],
  best: LayoutVariant,
  settings: import('../../types').PackSettings,
  fmt: (mm: number) => string,
  fmtWeight: (kg: number, wu: WeightUnit) => string,
  U: string,
  W: string,
  wu: WeightUnit,
  lang: Lang,
): void {
  const r: SheetRows = [];
  const nl = () => r.push(['', '']);

  r.push([tr(lang, 'xl.param'), tr(lang, 'xl.value')]);
  nl();
  r.push([tr(lang, 'xl.date'), new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')]);
  nl();

  // Vehicle
  r.push([tr(lang, 'xl.vehicle'), '']);
  r.push([tr(lang, 'xls.name'), nameOf(vehicle, lang)]);
  r.push([tr(lang, 'xl.dimensions'), `${fmt(vehicle.length)}×${fmt(vehicle.width)}×${fmt(vehicle.height)} ${U}`]);
  r.push([tr(lang, 'xls.maxWeightU').replace(', {u}', `, ${W}`), fmtWeight(vehicle.maxWeight, wu)]);
  r.push([tr(lang, 'xl.bodyVolume'), volumeToM3(vehicle.length * vehicle.width * vehicle.height, lang)]);
  nl();

  // Variant
  r.push([tr(lang, 'xl.bestVariant'), `${tr(lang, 'xls.variantLabel').replace('{label}', tr(lang, best.labelKey)).replace('Вариант: ', '').replace('Variant: ', '')}`]);
  r.push([tr(lang, 'xl.numVariants'), variants.length]);
  r.push([tr(lang, 'metric.placed'), best.items.length]);
  r.push([tr(lang, 'xl.totalWeight'), fmtWeight(best.totalWeight, wu)]);
  nl();
  r.push([tr(lang, 'xl.bodyVolumeM3'), volumeToM3(vehicle.length * vehicle.width * vehicle.height, lang)]);
  r.push([tr(lang, 'xl.cargoVolumeM3'), volumeToM3(best.totalVolume, lang)]);
  r.push([tr(lang, 'xl.freeVolumeM3'), volumeToM3(best.freeVolume, lang)]);
  r.push([tr(lang, 'metric.volumeFill'), `${round2(best.volumeFill)}%`]);
  r.push([tr(lang, 'metric.weightFill'), `${round2(best.weightFill)}%`]);
  nl();

  // COG
  const n = best.items.length;
  if (n > 0) {
    let sx = 0, sy = 0, sz = 0, tw = 0;
    for (const it of best.items) { sx += it.position.x * it.weight; sy += it.position.y * it.weight; sz += it.position.z * it.weight; tw += it.weight; }
    if (tw > 0) {
      r.push([tr(lang, 'xl.cog'), '']);
      r.push([tr(lang, 'xl.cogX'), `${fmt(sx / tw)} ${U}`]);
      r.push([tr(lang, 'xl.cogY'), `${fmt(sy / tw)} ${U}`]);
      r.push([tr(lang, 'xl.cogZ'), `${fmt(sz / tw)} ${U}`]);
      nl();
    }
  }

  // Layers
  const maxLayer = best.items.reduce((m, it) => Math.max(m, it.layer ?? 0), 0);
  r.push([tr(lang, 'metric.layers'), maxLayer + 1]);
  nl();

  // Gaps
  r.push([tr(lang, 'gaps.title'), '']);
  r.push([tr(lang, 'gaps.walls'), settings.gapWalls > 0 ? `${fmt(settings.gapWalls)} ${U}` : '—']);
  r.push([tr(lang, 'gaps.width'), settings.gapWidth > 0 ? `${fmt(settings.gapWidth)} ${U}` : '—']);
  r.push([tr(lang, 'gaps.length'), settings.gapLength > 0 ? `${fmt(settings.gapLength)} ${U}` : '—']);
  r.push([tr(lang, 'xl.gapsEnabled'), settings.gapsEnabled ? tr(lang, 'xls.yes') : tr(lang, 'xls.no')]);

  const ws = XLSX.utils.aoa_to_sheet(r);
  ws['!cols'] = [{ wch: 32 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws, tr(lang, 'xl.sheet.summary'));
}

// ─── Sheet 2: Грузы / Cargo ─────────────────────────────────────────────────

function buildCargoSheet(
  wb: XLSX.WorkBook,
  best: LayoutVariant,
  fmt: (mm: number) => string,
  fmtWeight: (kg: number, wu: WeightUnit) => string,
  W: string,
  wu: WeightUnit,
  lang: Lang,
): void {
  const hdr: SheetRows = [
    [
      tr(lang, 'xl.col.no'),
      tr(lang, 'xls.name'),
      tr(lang, 'xls.shape'),
      tr(lang, 'xl.col.dims'),
      tr(lang, 'xl.col.layer'),
      tr(lang, 'xl.col.rotation'),
      tr(lang, 'xl.col.method'),
      tr(lang, 'xls.weightU').replace('{u}', W),
      tr(lang, 'xl.col.stopOrder'),
      tr(lang, 'xl.col.maxLoad'),
      tr(lang, 'xl.col.compatGroup'),
      tr(lang, 'xl.col.position'),
    ],
  ];
  best.items.forEach((it, idx) => {
    const dims = `${fmt(it.dimensions.length)}×${fmt(it.dimensions.width)}×${fmt(it.dimensions.height)}`;
    const pos = `(${fmt(it.position.x)}, ${fmt(it.position.y)}, ${fmt(it.position.z)})`;
    const method = (it.layer ?? 0) > 0 ? tr(lang, 'xl.method.stacking') : tr(lang, 'xl.method.sideBySide');
    hdr.push([
      idx + 1,
      nameOf(it, lang),
      it.shape === 'cylinder' ? tr(lang, 'shape.cylinder') : tr(lang, 'shape.rect'),
      dims,
      (it.layer ?? 0) + 1,
      it.rotationY ?? 0,
      method,
      fmtWeight(it.weight, wu),
      it.stopOrder ?? '',
      it.maxLoad ?? '',
      it.compatibilityGroup ?? '',
      pos,
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(hdr);
  ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 32 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, tr(lang, 'xl.sheet.cargo'));
}

// ─── Sheet 3: Схема / Scheme ─────────────────────────────────────────────────
//
// Компактная читаемая таблица расстановки грузов по слоям:
// для каждого слоя — строки грузов с номером, названием, размерами, способом
// укладки и координатами (X, Y, Z). Заменяет прежнюю «сетку» из повторяющихся
// цифр, которая была нечитаемой.

function buildSchemeSheet(
  wb: XLSX.WorkBook,
  vehicle: Vehicle,
  best: LayoutVariant,
  lang: Lang,
): void {
  const { unit } = useAppStore.getState();
  const rows: SheetRows = [];
  rows.push([tr(lang, 'xl.scheme.title')]);
  rows.push([tr(lang, 'xl.vehicle'), nameOf(vehicle, lang)]);
  rows.push([]);

  const maxL = best.items.reduce((m, it) => Math.max(m, layerOfPacked(it)), 0);

  const hdr = [
    tr(lang, 'xl.col.no'),
    tr(lang, 'xl.scheme.name'),
    tr(lang, 'xl.scheme.dims'),
    tr(lang, 'xl.scheme.method'),
    tr(lang, 'xl.scheme.posX'),
    tr(lang, 'xl.scheme.posY'),
    tr(lang, 'xl.scheme.posZ'),
    tr(lang, 'xl.scheme.rot'),
  ];

  // Нумеруем грузы по списку variant.items (№ совпадает с остальными листами)
  const numbered = best.items.map((it, i) => ({ it, num: i + 1 }));

  for (let layer = 0; layer <= maxL; layer++) {
    const layerItems = numbered.filter(({ it }) => layerOfPacked(it) === layer);
    rows.push([`${tr(lang, 'xl.scheme.layer')} ${layer + 1}${layer === 0 ? tr(lang, 'xl.scheme.layerFloor') : ''}`]);
    rows.push(hdr);
    if (layerItems.length === 0) {
      rows.push([tr(lang, 'xl.value')]);
    }
    for (const { it, num } of layerItems) {
      const method = layerOfPacked(it) > 0 ? tr(lang, 'xl.method.stacking') : tr(lang, 'xl.method.sideBySide');
      rows.push([
        num,
        nameOf(it, lang),
        `${fmtDimension(it.dimensions.length, unit)}×${fmtDimension(it.dimensions.width, unit)}×${fmtDimension(it.dimensions.height, unit)}`,
        method,
        fmtDimension(it.position.x, unit),
        fmtDimension(it.position.y, unit),
        fmtDimension(it.position.z, unit),
        it.rotationY ?? 0,
      ]);
    }
    rows.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 }, { wch: 28 }, { wch: 26 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, tr(lang, 'xl.sheet.scheme'));
}

// ─── Sheet 4: Зазоры / Gaps ─────────────────────────────────────────────────

function buildGapsSheet(
  wb: XLSX.WorkBook,
  settings: import('../../types').PackSettings,
  fmt: (mm: number) => string,
  lang: Lang,
): void {
  const unit = useAppStore.getState().unit;
  const U = UNIT_LABEL[unit];
  const r: SheetRows = [
    [tr(lang, 'xl.gapParam'), tr(lang, 'xl.value'), tr(lang, 'xl.status')],
  ];
  r.push([tr(lang, 'gaps.walls'), settings.gapWalls > 0 ? `${fmt(settings.gapWalls)} ${U}` : '—', settings.gapWalls > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  r.push([tr(lang, 'gaps.width'), settings.gapWidth > 0 ? `${fmt(settings.gapWidth)} ${U}` : '—', settings.gapWidth > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  r.push([tr(lang, 'gaps.length'), settings.gapLength > 0 ? `${fmt(settings.gapLength)} ${U}` : '—', settings.gapLength > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  r.push([tr(lang, 'xl.gapsEnabled'), settings.gapsEnabled ? tr(lang, 'xls.yes') : tr(lang, 'xls.no'), '']);
  r.push(['', '', '']);
  r.push([tr(lang, 'xl.note'), tr(lang, 'xl.gapsNote'), '']);
  const ws = XLSX.utils.aoa_to_sheet(r);
  ws['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, tr(lang, 'xl.sheet.gaps'));
}

// ─── Sheet 5: Инструкция / Instructions ─────────────────────────────────────

function buildInstructionsSheet(wb: XLSX.WorkBook, lang: Lang): void {
  const r: SheetRows = [
    [tr(lang, 'xl.instrTopic'), tr(lang, 'xl.instrDesc')],
    [tr(lang, 'xl.instrStopOrder'), tr(lang, 'xl.instrStopOrderDesc')],
    [tr(lang, 'xl.instrMaxLoad'), tr(lang, 'xl.instrMaxLoadDesc')],
    [tr(lang, 'xl.instrCompatGroup'), tr(lang, 'xl.instrCompatGroupDesc')],
    [tr(lang, 'xl.instrMixed'), tr(lang, 'xl.instrMixedDesc')],
  ];
  const ws = XLSX.utils.aoa_to_sheet(r);
  ws['!cols'] = [{ wch: 24 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws, tr(lang, 'xl.sheet.instructions'));
}
