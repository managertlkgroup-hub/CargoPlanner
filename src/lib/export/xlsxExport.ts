// ============================================================================
// Экспорт отчёта в XLSX (Excel) — вместо CSV
//
// Формирует книгу с листами:
//   «Автомобиль» — параметры выбранного транспортного средства
//   «Грузы»      — исходный список грузов с размерами
//   «Вариант 1/2/3» — координаты каждого размещённого груза по вариантам
// ============================================================================

import * as XLSX from 'xlsx';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';
import { getCargoVolume } from '../../types';
import { UNIT_LABEL, toUnit, formatWeight, WEIGHT_UNIT_LABEL, type WeightUnit, nameOf } from '../../utils/helpers';
import { useAppStore } from '../../store/useAppStore';
import { tr, trf, type Lang } from '../../i18n';

/** Массив строк (массив массивов) для одного листа */
type SheetRows = (string | number)[][];

/**
 * Формирует и скачивает Excel-книгу с детализацией раскладки.
 * @param vehicle выбранный автомобиль
 * @param cargos исходный список грузов
 * @param variants все варианты раскладки (обычно 3)
 */
export function exportToXLSX(
  vehicle: Vehicle,
  cargos: Cargo[],
  variants: LayoutVariant[],
  weightUnit: WeightUnit = 'kg',
  lang: Lang = 'ru',
): void {
  const wb = XLSX.utils.book_new();
  const unit = useAppStore.getState().unit;
  const U = UNIT_LABEL[unit];
  const W = WEIGHT_UNIT_LABEL[weightUnit];
  const fmt = (mm: number) => Math.round(toUnit(mm, unit) * 100) / 100;

  // --- Лист «Автомобиль» ---
  const vehicleRows: SheetRows = [
    [tr(lang, 'xls.parameter'), tr(lang, 'xls.value')],
    [tr(lang, 'xls.name'), nameOf(vehicle, lang)],
    [trf(lang, 'xls.lengthU', { u: U }), fmt(vehicle.length)],
    [trf(lang, 'xls.widthU', { u: U }), fmt(vehicle.width)],
    [trf(lang, 'xls.heightU', { u: U }), fmt(vehicle.height)],
    [trf(lang, 'xls.maxWeightU', { u: W }), formatWeight(vehicle.maxWeight, weightUnit)],
    [tr(lang, 'xls.bodyVolume'), round2((vehicle.length * vehicle.width * vehicle.height) / 1e9)],
  ];
  const wsVehicle = XLSX.utils.aoa_to_sheet(vehicleRows);
  wsVehicle['!cols'] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsVehicle, tr(lang, 'xls.sheet.vehicle'));

  // --- Лист «Грузы» ---
  const cargoRows: SheetRows = [
    [tr(lang, 'xls.name'), tr(lang, 'xls.shape'), trf(lang, 'xls.lengthU', { u: U }), trf(lang, 'xls.widthU', { u: U }), trf(lang, 'xls.diamHeightU', { u: U }), trf(lang, 'xls.weightU', { u: W }), tr(lang, 'xls.qty'), tr(lang, 'xls.volumeM3'), tr(lang, 'xls.stackable')],
  ];
  cargos.forEach((c) => {
    cargoRows.push([
      nameOf(c, lang),
      c.shape === 'cylinder' ? tr(lang, 'shape.cylinder') : tr(lang, 'shape.rect'),
      fmt(c.length),
      c.shape === 'box' ? (c.width != null ? fmt(c.width) : '') : '',
      c.shape === 'cylinder' ? (c.diameter != null ? fmt(c.diameter) : '') : (c.height != null ? fmt(c.height) : ''),
      formatWeight(c.weight, weightUnit),
      c.quantity,
      round2((getCargoVolume(c) * c.quantity) / 1e9),
      c.stackable ? tr(lang, 'xls.yes') : tr(lang, 'xls.no'),
    ]);
  });
  const wsCargo = XLSX.utils.aoa_to_sheet(cargoRows);
  wsCargo['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsCargo, tr(lang, 'xls.sheet.cargo'));

  // --- Листы «Вариант N» ---
  variants.forEach((variant, idx) => {
    const sheetName = trf(lang, 'xls.sheet.variant', { n: idx + 1 });
    const rows: SheetRows = [
      [trf(lang, 'xls.variantLabel', { label: tr(lang, variant.labelKey) }), '', '', ''],
      [tr(lang, 'xls.fillVolume'), variant.volumeFill, '', ''],
      [tr(lang, 'xls.fillWeight'), variant.weightFill, '', ''],
      [trf(lang, 'xls.totalWeightU', { u: W }), formatWeight(variant.totalWeight, weightUnit), '', ''],
      [tr(lang, 'xls.freeVolume'), round2(variant.freeVolume / 1e9), '', ''],
      ['', '', '', ''],
      [tr(lang, 'xls.name'), tr(lang, 'xls.shape'), trf(lang, 'xls.sizeDWH', { u: U }), trf(lang, 'xls.weightU', { u: W })],
    ];

    variant.items.forEach((item) => {
      const sizeText =
        item.shape === 'cylinder'
          ? `Ø${fmt(item.diameter ?? 0)} × ${fmt(item.dimensions.length)}`
          : `${fmt(item.dimensions.length)}×${fmt(item.dimensions.width)}×${fmt(item.dimensions.height)}`;
      rows.push([
        nameOf(item, lang),
        item.shape === 'cylinder' ? tr(lang, 'shape.cylinder') : tr(lang, 'shape.rect'),
        sizeText,
        formatWeight(item.weight, weightUnit),
      ]);
    });

    const wsVariant = XLSX.utils.aoa_to_sheet(rows);
    wsVariant['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsVariant, sheetName);
  });

  // Скачиваем файл
  XLSX.writeFile(wb, `load-report-${Date.now()}.xlsx`);
}

/** Округляет до двух знаков */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}