// ============================================================================
// Экспорт отчёта в XLSX — 5 листов: Сводка, Грузы, Схема, Зазоры, Инструкция.
// Используется exceljs (браузерная сборка), т.к. SheetJS (xlsx) в OSS-сборке
// не записывает цвета заливки ячеек. Лист «Схема» рисует каждый груз
// ПРЯМОУГОЛЬНИКОМ (объединённый диапазон ячеек) с заливкой цвета слоя
// и номером по центру, в масштабе, пропорциональном кузову.
// ============================================================================

import ExcelJS from 'exceljs';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';
import { formatWeight, formatDimension, UNIT_LABEL, nameOf, type Unit, weightUnitLabel, volumeToM3 } from '../../utils/helpers';
import type { WeightUnit } from '../../utils/helpers';
import { useAppStore } from '../../store/useAppStore';
import { tr, type Lang } from '../../i18n';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtDimension(mm: number, unit: Unit): string {
  return formatDimension(mm, unit);
}

// Цвета слоёв для визуальной схемы (hex без #, ARGB добавит префикс FF)
const SCHEME_COLORS = ['3B82F6', '22C55E', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899'];

/** Определяет номер слоя груза */
function layerOfPacked(item: { layer?: number; position: { y: number }; dimensions: { height: number } }): number {
  if (item.layer != null) return item.layer;
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

/** Тонкая рамка для ячеек/прямоугольников */
function thinBorder(): ExcelJS.Borders {
  return {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'thin', color: { argb: 'FF334155' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    right: { style: 'thin', color: { argb: 'FF334155' } },
  } as ExcelJS.Borders;
}

export async function exportToXLSX(
  vehicle: Vehicle,
  _cargos: Cargo[],
  variants: LayoutVariant[],
  weightUnit: WeightUnit = 'kg',
  lang: Lang = 'ru',
): Promise<void> {
  const wb = new ExcelJS.Workbook();
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

  buildSummarySheet(wb, vehicle, variants, best, settings, fmt, U, W, weightUnit, lang);
  buildCargoSheet(wb, best, fmt, W, weightUnit, lang);
  buildSchemeSheet(wb, vehicle, best, lang);
  buildGapsSheet(wb, settings, fmt, lang);
  buildInstructionsSheet(wb, lang);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as unknown as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'cargo-plan.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── Sheet 1: Сводка / Summary ──────────────────────────────────────────────

function buildSummarySheet(
  wb: ExcelJS.Workbook,
  vehicle: Vehicle,
  variants: LayoutVariant[],
  best: LayoutVariant,
  settings: import('../../types').PackSettings,
  fmt: (mm: number) => string,
  U: string,
  W: string,
  wu: WeightUnit,
  lang: Lang,
): void {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.summary'));
  ws.getColumn(1).width = 34;
  ws.getColumn(2).width = 26;
  let r = 1;

  const header = (text: string) => {
    const cell = ws.getCell(r, 1);
    cell.value = text;
    cell.font = { bold: true };
    r++;
  };
  const param = (p: string, v: string | number | undefined) => {
    ws.getCell(r, 1).value = p;
    if (v !== undefined && v !== null) ws.getCell(r, 2).value = v;
    r++;
  };
  const blank = () => r++;

  header(tr(lang, 'xl.param'));
  param(tr(lang, 'xl.value'), '');
  blank();

  header(tr(lang, 'xl.date'));
  param(new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US'), '');
  blank();

  header(tr(lang, 'xl.vehicle'));
  param(tr(lang, 'xls.name'), nameOf(vehicle, lang));
  param(tr(lang, 'xl.dimensions'), `${fmt(vehicle.length)}×${fmt(vehicle.width)}×${fmt(vehicle.height)} ${U}`);
  param(tr(lang, 'xls.maxWeightU').replace(', {u}', `, ${W}`), formatWeight(vehicle.maxWeight, wu));
  param(tr(lang, 'xl.bodyVolume'), volumeToM3(vehicle.length * vehicle.width * vehicle.height, lang));
  blank();

  header(tr(lang, 'xl.bestVariant'));
  param(tr(lang, 'xl.numVariants'), variants.length);
  param(tr(lang, 'metric.placed'), best.items.length);
  param(tr(lang, 'xl.totalWeight'), formatWeight(best.totalWeight, wu));
  blank();
  param(tr(lang, 'xl.bodyVolumeM3'), volumeToM3(vehicle.length * vehicle.width * vehicle.height, lang));
  param(tr(lang, 'xl.cargoVolumeM3'), volumeToM3(best.totalVolume, lang));
  param(tr(lang, 'xl.freeVolumeM3'), volumeToM3(best.freeVolume, lang));
  param(tr(lang, 'metric.volumeFill'), `${round2(best.volumeFill)}%`);
  param(tr(lang, 'metric.weightFill'), `${round2(best.weightFill)}%`);
  blank();

  // COG
  const n = best.items.length;
  if (n > 0) {
    let sx = 0, sy = 0, sz = 0, tw = 0;
    for (const it of best.items) { sx += it.position.x * it.weight; sy += it.position.y * it.weight; sz += it.position.z * it.weight; tw += it.weight; }
    if (tw > 0) {
      header(tr(lang, 'xl.cog'));
      param(tr(lang, 'xl.cogX'), `${fmt(sx / tw)} ${U}`);
      param(tr(lang, 'xl.cogY'), `${fmt(sy / tw)} ${U}`);
      param(tr(lang, 'xl.cogZ'), `${fmt(sz / tw)} ${U}`);
      blank();
    }
  }

  const maxLayer = best.items.reduce((m, it) => Math.max(m, it.layer ?? 0), 0);
  param(tr(lang, 'metric.layers'), maxLayer + 1);
  blank();

  header(tr(lang, 'gaps.title'));
  param(tr(lang, 'gaps.walls'), settings.gapWalls > 0 ? `${fmt(settings.gapWalls)} ${U}` : '—');
  param(tr(lang, 'gaps.width'), settings.gapWidth > 0 ? `${fmt(settings.gapWidth)} ${U}` : '—');
  param(tr(lang, 'gaps.length'), settings.gapLength > 0 ? `${fmt(settings.gapLength)} ${U}` : '—');
  param(tr(lang, 'xl.gapsEnabled'), settings.gapsEnabled ? tr(lang, 'xls.yes') : tr(lang, 'xls.no'));
}

// ─── Sheet 2: Грузы / Cargo ─────────────────────────────────────────────────

function buildCargoSheet(
  wb: ExcelJS.Workbook,
  best: LayoutVariant,
  fmt: (mm: number) => string,
  W: string,
  wu: WeightUnit,
  lang: Lang,
): void {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.cargo'));
  const widths = [6, 24, 14, 32, 8, 10, 16, 10, 10, 10, 16, 30];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headers = [
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
  ];
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };

  best.items.forEach((it, idx) => {
    const dims = `${fmt(it.dimensions.length)}×${fmt(it.dimensions.width)}×${fmt(it.dimensions.height)}`;
    const pos = `(${fmt(it.position.x)}, ${fmt(it.position.y)}, ${fmt(it.position.z)})`;
    const method = (it.layer ?? 0) > 0 ? tr(lang, 'xl.method.stacking') : tr(lang, 'xl.method.sideBySide');
    ws.addRow([
      idx + 1,
      nameOf(it, lang),
      it.shape === 'cylinder' ? tr(lang, 'shape.cylinder') : tr(lang, 'shape.rect'),
      dims,
      (it.layer ?? 0) + 1,
      it.rotationY ?? 0,
      method,
      formatWeight(it.weight, wu),
      it.stopOrder ?? '',
      it.maxLoad ?? '',
      it.compatibilityGroup ?? '',
      pos,
    ]);
  });
}

// ─── Sheet 3: Схема / Scheme ─────────────────────────────────────────────────
//
// Доступная сетка: кузов разбит на ячейки (≈ RES мм). В каждую ячейку заданной
// площади груза записывается его НОМЕР, ячейки заливаются цветом слоя.
// Слои разделяются пустой строкой. Внизу — легенда «№ — название — размеры».

function buildSchemeSheet(
  wb: ExcelJS.Workbook,
  vehicle: Vehicle,
  best: LayoutVariant,
  lang: Lang,
): void {
  const { unit } = useAppStore.getState();
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.scheme'));

  ws.addRow([tr(lang, 'xl.scheme.title')]).font = { bold: true, size: 14 };
  ws.addRow([tr(lang, 'xl.vehicle'), nameOf(vehicle, lang)]);
  ws.addRow([tr(lang, 'xl.scheme.gridHint')]);
  ws.addRow([]);

  const numbered = best.items.map((it, i) => ({ it, num: i + 1 }));
  const maxL = best.items.reduce((m, it) => Math.max(m, layerOfPacked(it)), 0);

  // Сетка кузова: одна ячейка = RES мм
  const RES = 200; // мм на ячейку
  const nCols = Math.max(1, Math.round(vehicle.length / RES));
  const nRows = Math.max(1, Math.round(vehicle.width / RES));
  const colPerMm = nCols / Math.max(1, vehicle.length);
  const rowPerMm = nRows / Math.max(1, vehicle.width);

  for (let layer = 0; layer <= maxL; layer++) {
    const layerItems = numbered.filter(({ it }) => layerOfPacked(it) === layer);
    if (layerItems.length === 0) continue;
    const colorIdx = layer % SCHEME_COLORS.length;
    const color = 'FF' + SCHEME_COLORS[colorIdx];

    ws.addRow([`${tr(lang, 'xl.scheme.layer')} ${layer + 1}${layer === 0 ? tr(lang, 'xl.scheme.layerFloor') : ''}`]).font = { bold: true };
    const gridStart = ws.rowCount + 1; // первая строка сетки этого слоя (1-индекс)

    // Записываем номер груза в каждую ячейку его площади
    for (const { it, num } of layerItems) {
      const c0 = Math.round(it.position.x * colPerMm);
      const c1 = Math.min(nCols - 1, Math.max(c0, Math.round((it.position.x + it.dimensions.length) * colPerMm) - 1));
      const r0 = Math.round(it.position.z * rowPerMm);
      const r1 = Math.min(nRows - 1, Math.max(r0, Math.round((it.position.z + it.dimensions.width) * rowPerMm) - 1));

      for (let rr = r0; rr <= r1; rr++) {
        for (let cc = c0; cc <= c1; cc++) {
          const cell = ws.getCell(gridStart + rr, cc + 1);
          cell.value = num;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          cell.border = thinBorder();
        }
      }
    }

    // Доводим лист до полной высоты сетки слоя (разделитель слоёв — пустая строка ниже)
    const needed = gridStart + nRows - 1;
    for (let rr = ws.rowCount + 1; rr <= needed; rr++) {
      ws.getCell(rr, 1).value = '';
    }
    ws.addRow([]);
  }

  // Легенда: № — название — размеры — слой
  ws.addRow([tr(lang, 'xl.scheme.legend'), tr(lang, 'xl.scheme.dims'), tr(lang, 'xl.scheme.layer')]).font = { bold: true };
  for (const { it, num } of numbered) {
    const layer = layerOfPacked(it) ?? 0;
    const dims = `${fmtDimension(it.dimensions.length, unit)}×${fmtDimension(it.dimensions.width, unit)}×${fmtDimension(it.dimensions.height, unit)}`;
    const row = ws.addRow([`${num}. ${nameOf(it, lang)}`, dims, layer + 1]);
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + SCHEME_COLORS[layer % SCHEME_COLORS.length] },
    };
    row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }

  // Ширины столбцов сетки — узкие, чтобы схема была компактной
  for (let c = 1; c <= nCols; c++) {
    ws.getColumn(c).width = 4;
  }
}

// ─── Sheet 4: Зазоры / Gaps ─────────────────────────────────────────────────

function buildGapsSheet(
  wb: ExcelJS.Workbook,
  settings: import('../../types').PackSettings,
  fmt: (mm: number) => string,
  lang: Lang,
): void {
  const unit = useAppStore.getState().unit;
  const U = UNIT_LABEL[unit];
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.gaps'));
  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 12;

  const header = ws.addRow([tr(lang, 'xl.gapParam'), tr(lang, 'xl.value'), tr(lang, 'xl.status')]);
  header.font = { bold: true };
  ws.addRow([tr(lang, 'gaps.walls'), settings.gapWalls > 0 ? `${fmt(settings.gapWalls)} ${U}` : '—', settings.gapWalls > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  ws.addRow([tr(lang, 'gaps.width'), settings.gapWidth > 0 ? `${fmt(settings.gapWidth)} ${U}` : '—', settings.gapWidth > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  ws.addRow([tr(lang, 'gaps.length'), settings.gapLength > 0 ? `${fmt(settings.gapLength)} ${U}` : '—', settings.gapLength > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  ws.addRow([tr(lang, 'xl.gapsEnabled'), settings.gapsEnabled ? tr(lang, 'xls.yes') : tr(lang, 'xls.no'), '']);
  ws.addRow([]);
  ws.addRow([tr(lang, 'xl.note'), tr(lang, 'xl.gapsNote'), '']);
}

// ─── Sheet 5: Инструкция / Instructions ─────────────────────────────────────

function buildInstructionsSheet(wb: ExcelJS.Workbook, lang: Lang): void {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.instructions'));
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 80;

  const header = ws.addRow([tr(lang, 'xl.instrTopic'), tr(lang, 'xl.instrDesc')]);
  header.font = { bold: true };
  ws.addRow([tr(lang, 'xl.instrStopOrder'), tr(lang, 'xl.instrStopOrderDesc')]);
  ws.addRow([tr(lang, 'xl.instrMaxLoad'), tr(lang, 'xl.instrMaxLoadDesc')]);
  ws.addRow([tr(lang, 'xl.instrCompatGroup'), tr(lang, 'xl.instrCompatGroupDesc')]);
  ws.addRow([tr(lang, 'xl.instrMixed'), tr(lang, 'xl.instrMixedDesc')]);
}