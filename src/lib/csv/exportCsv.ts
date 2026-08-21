// ============================================================================
// Экспорт грузов в CSV
// ============================================================================

import Papa from 'papaparse';
import type { Cargo } from '../../types';

/** Формирует CSV и скачивает его */
export function exportCsv(cargo: Cargo[]): void {
  const rows = cargo.map((c) => ({
    название: c.name,
    длина: c.length,
    ширина: c.width,
    высота: c.height,
    вес: c.weight,
    количество: c.quantity,
    stackable: c.stackable ? 'true' : 'false',
  }));

  const csv = Papa.unparse(rows, { header: true });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cargo-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}