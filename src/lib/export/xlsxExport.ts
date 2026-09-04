// ============================================================================
// Экспорт отчёта в XLSX — 5 листов: Сводка, Грузы, Схема (с фигурами), Зазоры, Инструкция
// Использует exceljs для рисования прямоугольников на листе "Схема"
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

function fmtWeight(kg: number, wu: WeightUnit): string {
  return formatWeight(kg, wu);
}

// Цвета слоёв для визуальной схемы
const SCHEME_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const SCHEME_BG = ['FFDBEAFE', 'FFDCFCE7', 'FFFEF3C7', 'FFFFE2E2', 'FFEDE9FE', 'FFFCE7F3'];
const EMPTY_BG = 'FFF1F5F9';

/** Определяет номер слоя груза */
function layerOfPacked(item: { layer?: number; position: { y: number }; dimensions: { height: number } }): number {
  if (item.layer != null) return item.layer;
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

export async function exportToXLSX(
  vehicle: Vehicle,
  _cargos: Cargo[],
  variants: LayoutVariant[],
  weightUnit: WeightUnit = 'kg',
  lang: Lang = 'ru',
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const { unit, settings } = useAppStore.getState();
  const U = UNIT_LABEL[unit];
  const W = weightUnitLabel(lang, weightUnit);
  const fmt = (mm: number) => fmtDimension(mm, unit);

  // «Лучший вариант» — по максимальному заполнению объёма кузова
  const best = [...variants].sort((a, b) => {
    const dv = (b.volumeFill ?? 0) - (a.volumeFill ?? 0);
    if (dv !== 0) return dv;
    const dw = (b.weightFill ?? 0) - (a.weightFill ?? 0);
    if (dw !== 0) return dw;
    return (b.items?.length ?? 0) - (a.items?.length ?? 0);
  })[0];
  if (!best) return;

  await buildSummarySheet(workbook, vehicle, variants, best, settings, fmt, fmtWeight, U, W, weightUnit, lang);
  await buildCargoSheet(workbook, best, fmt, fmtWeight, W, weightUnit, lang);
  await buildSchemeSheet(workbook, vehicle, best, lang, unit);
  await buildGapsSheet(workbook, settings, fmt, lang);
  await buildInstructionsSheet(workbook, lang);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cargo-plan.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Sheet 1: Сводка / Summary ──────────────────────────────────────────────

async function buildSummarySheet(
  wb: ExcelJS.Workbook,
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
): Promise<void> {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.summary'));
  const r: (string | number)[][] = [];
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

  r.forEach((row, i) => {
    const rowNum = i + 1;
    ws.getRow(rowNum).values = row;
  });
  ws.columns = [{ width: 32 }, { width: 24 }];
}

// ─── Sheet 2: Грузы / Cargo ─────────────────────────────────────────────────

async function buildCargoSheet(
  wb: ExcelJS.Workbook,
  best: LayoutVariant,
  fmt: (mm: number) => string,
  fmtWeight: (kg: number, wu: WeightUnit) => string,
  W: string,
  wu: WeightUnit,
  lang: Lang,
): Promise<void> {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.cargo'));
  const hdr: (string | number)[] = [
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
  ws.getRow(1).values = hdr;
  ws.getRow(1).font = { bold: true };

  best.items.forEach((it, idx) => {
    const dims = `${fmt(it.dimensions.length)}×${fmt(it.dimensions.width)}×${fmt(it.dimensions.height)}`;
    const pos = `(${fmt(it.position.x)}, ${fmt(it.position.y)}, ${fmt(it.position.z)})`;
    const method = (it.layer ?? 0) > 0 ? tr(lang, 'xl.method.stacking') : tr(lang, 'xl.method.sideBySide');
    const rowNum = idx + 2;
    ws.getRow(rowNum).values = [
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
    ];
  });
  ws.columns = [
    { width: 6 }, { width: 24 }, { width: 14 }, { width: 32 }, { width: 8 },
    { width: 10 }, { width: 16 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 16 }, { width: 30 },
  ];
}

// ─── Sheet 3: Схема / Scheme (с фигурами) ───────────────────────────────────

async function buildSchemeSheet(
  wb: ExcelJS.Workbook,
  vehicle: Vehicle,
  best: LayoutVariant,
  lang: Lang,
  unit: Unit,
): Promise<void> {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.scheme'));

  // Заголовок
  ws.getRow(1).values = [tr(lang, 'xl.scheme.title')];
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.getRow(2).values = [tr(lang, 'xl.vehicle'), nameOf(vehicle, lang)];
  ws.getRow(3).values = [tr(lang, 'xl.scheme.gridHint')];
  ws.getRow(4).values = [''];

  const numbered = best.items.map((it, i) => ({ it, num: i + 1 }));
  const maxL = best.items.reduce((m, it) => Math.max(m, layerOfPacked(it)), 0);

  // Масштаб: 1 ячейка Excel = 10 мм
  const MM_PER_CELL = 10;
  const nCols = Math.max(1, Math.ceil(vehicle.length / MM_PER_CELL));
  const nRows = Math.max(1, Math.ceil(vehicle.width / MM_PER_CELL));

  let currentRow = 5;

  for (let layer = 0; layer <= maxL; layer++) {
    const layerItems = numbered.filter(({ it }) => layerOfPacked(it) === layer);
    const colorIdx = layer % SCHEME_COLORS.length;
    const layerColor = SCHEME_COLORS[colorIdx];
    const layerBg = SCHEME_BG[colorIdx];

    ws.getRow(currentRow).values = [`${tr(lang, 'xl.scheme.layer')} ${layer + 1}${layer === 0 ? tr(lang, 'xl.scheme.layerFloor') : ''}`];
    ws.getRow(currentRow).font = { bold: true };
    currentRow++;

    // Рисуем границы кузова
    const startRow = currentRow;

    // Рисуем прямоугольники для каждого груза через ячейки с цветом и номером
    for (const { it, num } of layerItems) {
      const cellX = Math.floor(it.position.x / MM_PER_CELL) + 1; // 1-based column
      const cellZ = Math.floor(it.position.z / MM_PER_CELL) + 1; // 1-based row
      // const cellW = Math.ceil(it.dimensions.length / MM_PER_CELL);
      // const cellH = Math.ceil(it.dimensions.width / MM_PER_CELL);
      const centerCellRow = startRow + cellZ - 1;
      const centerCellCol = cellX;
      const cell = ws.getCell(centerCellRow, centerCellCol);
      cell.value = num;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: layerBg.replace('FF', '') } };
      cell.border = {
        top: { style: 'thin', color: { argb: layerColor.replace('#', 'FF') } },
        left: { style: 'thin', color: { argb: layerColor.replace('#', 'FF') } },
        bottom: { style: 'thin', color: { argb: layerColor.replace('#', 'FF') } },
        right: { style: 'thin', color: { argb: layerColor.replace('#', 'FF') } },
      };
    }

    // Устанавливаем размеры ячеек для сетки
    for (let rr = 0; rr < nRows; rr++) {
      for (let cc = 0; cc < nCols; cc++) {
        const cell = ws.getCell(startRow + rr, cc + 1);
        if (!cell.value) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMPTY_BG.replace('FF', '') } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        }
      }
    }

    // Высота строки = 10 мм (~38 точек = 10 мм в Excel)
    for (let rr = 0; rr < nRows; rr++) {
      ws.getRow(startRow + rr).height = 38;
    }
    // Ширина колонки = 10 мм (~5 единиц ширины Excel)
    for (let cc = 0; cc < nCols; cc++) {
      ws.getColumn(cc + 1).width = 5;
    }

    currentRow += nRows;
    ws.getRow(currentRow).values = [''];
    currentRow++;
  }

  // Легенда
  ws.getRow(currentRow).values = [tr(lang, 'xl.scheme.legend')];
  ws.getRow(currentRow).font = { bold: true };
  currentRow++;

  for (const { it, num } of numbered) {
    const dims = `${fmtDimension(it.dimensions.length, unit)}×${fmtDimension(it.dimensions.width, unit)}×${fmtDimension(it.dimensions.height, unit)}`;
    ws.getRow(currentRow).values = [`${num}. ${nameOf(it, lang)}`, dims];
    currentRow++;
  }
}

// ─── Sheet 4: Зазоры / Gaps ─────────────────────────────────────────────────

async function buildGapsSheet(
  wb: ExcelJS.Workbook,
  settings: import('../../types').PackSettings,
  fmt: (mm: number) => string,
  lang: Lang,
): Promise<void> {
  const unit = useAppStore.getState().unit;
  const U = UNIT_LABEL[unit];
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.gaps'));
  const r: (string | number)[][] = [
    [tr(lang, 'xl.gapParam'), tr(lang, 'xl.value'), tr(lang, 'xl.status')],
  ];
  r.push([tr(lang, 'gaps.walls'), settings.gapWalls > 0 ? `${fmt(settings.gapWalls)} ${U}` : '—', settings.gapWalls > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  r.push([tr(lang, 'gaps.width'), settings.gapWidth > 0 ? `${fmt(settings.gapWidth)} ${U}` : '—', settings.gapWidth > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  r.push([tr(lang, 'gaps.length'), settings.gapLength > 0 ? `${fmt(settings.gapLength)} ${U}` : '—', settings.gapLength > 0 ? tr(lang, 'xl.enabled') : tr(lang, 'xl.disabled')]);
  r.push([tr(lang, 'xl.gapsEnabled'), settings.gapsEnabled ? tr(lang, 'xls.yes') : tr(lang, 'xls.no'), '']);
  r.push(['', '', '']);
  r.push([tr(lang, 'xl.note'), tr(lang, 'xl.gapsNote'), '']);

  r.forEach((row, i) => {
    ws.getRow(i + 1).values = row;
  });
  ws.columns = [{ width: 32 }, { width: 24 }, { width: 12 }];
}

// ─── Sheet 5: Инструкция / Instructions ─────────────────────────────────────

async function buildInstructionsSheet(wb: ExcelJS.Workbook, lang: Lang): Promise<void> {
  const ws = wb.addWorksheet(tr(lang, 'xl.sheet.instructions'));
  const r: (string | number)[][] = [
    [tr(lang, 'xl.instrTopic'), tr(lang, 'xl.instrDesc')],
    [tr(lang, 'xl.instrStopOrder'), tr(lang, 'xl.instrStopOrderDesc')],
    [tr(lang, 'xl.instrMaxLoad'), tr(lang, 'xl.instrMaxLoadDesc')],
    [tr(lang, 'xl.instrCompatGroup'), tr(lang, 'xl.instrCompatGroupDesc')],
    [tr(lang, 'xl.instrMixed'), tr(lang, 'xl.instrMixedDesc')],
  ];

  r.forEach((row, i) => {
    ws.getRow(i + 1).values = row;
  });
  ws.columns = [{ width: 24 }, { width: 80 }];
}
