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