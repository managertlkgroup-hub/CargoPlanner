// ============================================================================
// Импорт грузов из CSV
// Формат: название, форма, длина, ширина, высота, диаметр, вес, количество, stackable
// ============================================================================

import Papa from 'papaparse';
import type { Cargo } from '../../types';

/** Результат импорта CSV */
export interface CsvImportResult {
  cargo: Cargo[];
  errors: string[];
}

/**
 * Разбирает CSV-файл и возвращает список грузов.
 * Колонки: название, форма (shape), длина, ширина, высота, диаметр, вес, количество, stackable.
 * Допускается header на русском или английском языке.
 */
export async function importCsv(file: File): Promise<CsvImportResult> {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const errors: string[] = [];
  const cargo: Cargo[] = [];

  parsed.data.forEach((row, idx) => {
    const rowNum = idx + 2; // с учётом заголовка
    try {
      const name = row['название'] ?? row['name'] ?? '';
      const shapeRaw = (row['форма'] ?? row['shape'] ?? 'box').trim().toLowerCase();
      const shape = shapeRaw === 'cylinder' ? 'cylinder' : 'box';

      const length = parseFloat(row['длина'] ?? row['length'] ?? '');
      const width = parseFloat(row['ширина'] ?? row['width'] ?? '');
      const height = parseFloat(row['высота'] ?? row['height'] ?? '');
      const diameter = parseFloat(row['диаметр'] ?? row['diameter'] ?? '');
      const weight = parseFloat(row['вес'] ?? row['weight'] ?? '');
      const quantity = parseFloat(row['количество'] ?? row['quantity'] ?? '1');
      const stackable = (row['stackable'] ?? '').toLowerCase() === 'true' || row['stackable'] === '1';

      if (!name) throw new Error('нет названия');
      if (isNaN(length) || isNaN(weight)) throw new Error('неверные числовые значения');

      if (shape === 'cylinder') {
        if (isNaN(diameter) || diameter <= 0) throw new Error('для цилиндра нужен диаметр');
        cargo.push({
          id: `csv-${Date.now()}-${idx}`,
          name,
          shape: 'cylinder',
          length,
          diameter,
          weight,
          quantity: isNaN(quantity) ? 1 : Math.max(1, Math.floor(quantity)),
          stackable,
          width: undefined,
          height: undefined,
        });
      } else {
        if (isNaN(width) || isNaN(height)) throw new Error('неверные ширина/высота');
        cargo.push({
          id: `csv-${Date.now()}-${idx}`,
          name,
          shape: 'box',
          length,
          width,
          height,
          weight,
          quantity: isNaN(quantity) ? 1 : Math.max(1, Math.floor(quantity)),
          stackable,
          diameter: undefined,
        });
      }
    } catch (e) {
      errors.push(`Строка ${rowNum}: ${e instanceof Error ? e.message : 'ошибка разбора'}`);
    }
  });

  return { cargo, errors };
}