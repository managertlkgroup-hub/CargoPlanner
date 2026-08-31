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
import { getCargoVolume, shapeLabel } from '../../types';
import { UNIT_LABEL, toUnit } from '../../utils/helpers';
import { useAppStore } from '../../store/useAppStore';

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
): void {
  const wb = XLSX.utils.book_new();
  const unit = useAppStore.getState().unit;
  const U = UNIT_LABEL[unit];
  const fmt = (mm: number) => Math.round(toUnit(mm, unit) * 100) / 100;

  // --- Лист «Автомобиль» ---
  const vehicleRows: SheetRows = [
    ['Параметр', 'Значение'],
    ['Название', vehicle.name],
    [`Длина, ${U}`, fmt(vehicle.length)],
    [`Ширина, ${U}`, fmt(vehicle.width)],
    [`Высота, ${U}`, fmt(vehicle.height)],
    ['Грузоподъёмность, кг', vehicle.maxWeight],
    ['Объём кузова, м³', round2((vehicle.length * vehicle.width * vehicle.height) / 1e9)],
  ];
  const wsVehicle = XLSX.utils.aoa_to_sheet(vehicleRows);
  wsVehicle['!cols'] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsVehicle, 'Автомобиль');

  // --- Лист «Грузы» ---
  const cargoRows: SheetRows = [
    ['Название', 'Форма', `Длина, ${U}`, `Ширина, ${U}`, `Высота/Диам., ${U}`, 'Вес, кг', 'Кол-во', 'Объём, м³', 'Штабелируемый'],
  ];
  cargos.forEach((c) => {
    cargoRows.push([
      c.name,
      shapeLabel(c.shape),
      fmt(c.length),
      c.shape === 'box' ? (c.width != null ? fmt(c.width) : '') : '',
      c.shape === 'cylinder' ? (c.diameter != null ? fmt(c.diameter) : '') : (c.height != null ? fmt(c.height) : ''),
      c.weight,
      c.quantity,
      round2((getCargoVolume(c) * c.quantity) / 1e9),
      c.stackable ? 'да' : 'нет',
    ]);
  });
  const wsCargo = XLSX.utils.aoa_to_sheet(cargoRows);
  wsCargo['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsCargo, 'Грузы');

  // --- Листы «Вариант N» ---
  const sheetNames = ['Вариант 1', 'Вариант 2', 'Вариант 3'];
  variants.forEach((variant, idx) => {
    const sheetName = sheetNames[idx] ?? `Вариант ${idx + 1}`;
    const rows: SheetRows = [
      [`Вариант: ${variant.label}`, '', '', ''],
      ['Заполнение объёма, %', variant.volumeFill, '', ''],
      ['Заполнение по весу, %', variant.weightFill, '', ''],
      ['Суммарный вес, кг', variant.totalWeight, '', ''],
      ['Свободный объём, м³', round2(variant.freeVolume / 1e9), '', ''],
      ['', '', '', ''],
      ['Название', 'Форма', `Размер (Д×Ш×В), ${U}`, 'Вес, кг'],
    ];

    variant.items.forEach((item) => {
      const sizeText =
        item.shape === 'cylinder'
          ? `Ø${fmt(item.diameter ?? 0)} × ${fmt(item.dimensions.length)}`
          : `${fmt(item.dimensions.length)}×${fmt(item.dimensions.width)}×${fmt(item.dimensions.height)}`;
      rows.push([
        item.name,
        shapeLabel(item.shape),
        sizeText,
        item.weight,
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