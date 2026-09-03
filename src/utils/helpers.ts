// ============================================================================
// Утилитарные функции-помощники
// ============================================================================

/** Генерирует уникальный идентификатор */
export function uid(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Переводит объём из мм^3 в м^3 */
export function volumeToM3(mm3: number, lang: Lang = 'ru'): string {
  return `${(mm3 / 1e9).toFixed(2)} ${m3Label(lang)}`;
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

import type { Lang } from '../i18n';
import { tr } from '../i18n';

/** Локализованное название объекта (Vehicle/Cargo/PackedItem/CargoPreset) по nameKey, иначе name */
export function nameOf(x: { name?: string; nameKey?: string } | null | undefined, lang: Lang): string {
  if (!x) return '';
  if (x.nameKey) return tr(lang, x.nameKey);
  return x.name ?? '';
}

/** Текущий язык для лейблов единиц (синхронизируется со стором) */
let currentLang: Lang = 'ru';
export function setCurrentLang(lang: Lang): void {
  currentLang = lang;
}

/** Метка единицы измерения (backward-compat, default ru) */
export const UNIT_LABEL: Record<Unit, string> = new Proxy<Record<Unit, string>>(
  { mm: 'мм', cm: 'см', m: 'м' },
  {
    get(target, prop) {
      const u = prop as Unit;
      if (currentLang === 'en') return u;
      return target[u];
    },
  },
);
/** Языко-зависимая метка единицы измерения */
export function unitLabel(lang: Lang, unit: Unit): string {
  if (lang === 'en') return unit;
  return UNIT_LABEL[unit];
}

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

/** Форматирует размер в мм с учётом единицы (метры — до 2 знаков, см — до 1, мм — целое, без хвостовых нулей) */
export function formatDimension(mm: number | null | undefined, unit: Unit): string {
  const v = typeof mm === 'number' && Number.isFinite(mm) ? mm : 0;
  const raw = toUnit(v, unit);
  let rounded: number;
  if (unit === 'm') rounded = Math.round(raw * 100) / 100;
  else if (unit === 'cm') rounded = Math.round(raw * 10) / 10;
  else rounded = Math.round(raw);
  return rounded.toString();
}

// --- Весовые единицы (кг/т) ---

export type WeightUnit = 'kg' | 'ton';

/** Метка весовой единицы */
export const WEIGHT_UNIT_LABEL: Record<WeightUnit, string> = new Proxy<Record<WeightUnit, string>>(
  { kg: 'кг', ton: 'т' },
  {
    get(target, prop) {
      const wu = prop as WeightUnit;
      if (currentLang === 'en') return wu === 'ton' ? 'tons' : wu;
      return target[wu];
    },
  },
);
/** Языко-зависимая метка весовой единицы */
export function weightUnitLabel(lang: Lang, wu: WeightUnit): string {
  if (lang === 'en') return wu === 'ton' ? 'tons' : wu;
  return WEIGHT_UNIT_LABEL[wu];
}
/** Языко-зависимая метка «м³» */
export function m3Label(lang: Lang): string {
  return lang === 'en' ? 'm³' : 'м³';
}

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