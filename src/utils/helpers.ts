// ============================================================================
// Утилитарные функции-помощники
// ============================================================================

/** Генерирует уникальный идентификатор */
export function uid(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Переводит объём из мм^3 в м^3 */
export function volumeToM3(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
}

/** Форматирует число с разделителями тысяч */
export function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}

/** Безопасное чтение JSON из localStorage */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Сохранение значения в localStorage */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // молча игнорируем ошибки квоты
  }
}

export type Unit = 'mm' | 'cm' | 'm';

/** Множитель: сколько единиц в 1 мм */
const UNIT_FACTOR: Record<Unit, number> = { mm: 1, cm: 0.1, m: 0.001 };

/** Метка единицы измерения */
export const UNIT_LABEL: Record<Unit, string> = { mm: 'мм', cm: 'см', m: 'м' };

/** Переводит значение в мм в выбранную единицу */
export function toUnit(mm: number, unit: Unit): number {
  return mm * UNIT_FACTOR[unit];
}

/** Переводит значение из выбранной единицы в мм */
export function fromUnit(value: number, unit: Unit): number {
  if (unit === 'm') return value * 1000;
  if (unit === 'cm') return value * 10;
  return value;
}

/** Форматирует размер в мм с учётом единицы (до 2 знаков, без хвостовых нулей) */
export function formatDimension(mm: number, unit: Unit): string {
  const raw = toUnit(mm, unit);
  return (Math.round(raw * 100) / 100).toString();
}

// --- Весовые единицы (кг/т) ---

export type WeightUnit = 'kg' | 'ton';

/** Метка весовой единицы */
export const WEIGHT_UNIT_LABEL: Record<WeightUnit, string> = { kg: 'кг', ton: 'т' };

/** Переводит вес в кг в выбранную единицу */
export function toWeightUnit(kg: number, unit: WeightUnit): number {
  return unit === 'ton' ? kg / 1000 : kg;
}

/** Переводит вес из выбранной единицы в кг */
export function fromWeightUnit(value: number, unit: WeightUnit): number {
  return unit === 'ton' ? value * 1000 : value;
}

/** Форматирует вес с учётом единицы (т — до 2 знаков, кг — целое) */
export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'ton') return (Math.round(kg / 10) / 100).toString();
  return Math.round(kg).toString();
}