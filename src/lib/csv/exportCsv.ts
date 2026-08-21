// ============================================================================
// Экспорт грузов в CSV
// Для цилиндра: shape=cylinder, diameter=число, width/height — пустые.
// ============================================================================

import Papa from 'papaparse';
import type { Cargo } from '../../types';

/** Формирует CSV и скачивает его */
export function exportCsv(cargo: Cargo[]): void {
  const rows = cargo.map((c) => {
    if (c.shape === 'cylinder') {
      return {
        название: c.name,
        форма: 'cylinder',
        длина: c.length,
        ширина: '',
        высота: '',
        диаметр: c.diameter ?? '',
        вес: c.weight,
        количество: c.quantity,
        stackable: c.stackable ? 'true' : 'false',
      };
    }
    return {
      название: c.name,
      форма: 'box',
      длина: c.length,
      ширина: c.width ?? '',
      высота: c.height ?? '',
      диаметр: '',
      вес: c.weight,
      количество: c.quantity,
      stackable: c.stackable ? 'true' : 'false',
    };
  });

  const csv = Papa.unparse(rows, { header: true });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cargo-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}