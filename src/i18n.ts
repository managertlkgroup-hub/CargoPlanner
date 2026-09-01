// ============================================================================
// Интернационализация (РУС / ENG)
// ============================================================================

export type Lang = 'ru' | 'en';

export const LANGS: Lang[] = ['ru', 'en'];
export const LANG_LABEL: Record<Lang, string> = { ru: 'РУС', en: 'ENG' };

type Dict = Record<string, string>;

const ru: Dict = {
  'app.title': '3D Планировщик загрузки',
  'units.title': 'Единицы измерения',
  'units.dim': 'Размеры:',
  'units.weight': 'Вес:',
  'btn.presets': 'Пресеты',
  'btn.sessions': 'Сессии',
  'btn.png': 'Экспорт PNG',
  'btn.pdf': 'Отчёт PDF',
  'btn.settings': 'Настройки',
  'section.vehicle': 'Автомобиль',
  'section.cargo': 'Грузы',
  'section.control': 'Управление',
  'btn.calculate': 'Расчёт',
  'btn.calculating': 'Расчёт…',
  'stacking': 'Штабелирование',
  'stacking.hint': '(для всех грузов)',
  'gap': 'Зазоры',
  'visibility.body': 'Видимость кузова',
  'btn.add': '+ Добавить',
  'logout': 'Выход',
  'cargo.add': '+ Добавить',
  'cargo.hide': '− Скрыть форму',
  'cargo.selectAll': 'Выбрать всё',
  'cargo.deselectAll': 'Снять всё',
  'cargo.delete': 'Удалить',
  'cargo.clear': 'Очистить',
  'cargo.export': 'Экспорт CSV',
  'cargo.import': 'Импорт CSV',
};

const en: Dict = {
  'app.title': '3D Load Planner',
  'units.title': 'Units',
  'units.dim': 'Length:',
  'units.weight': 'Weight:',
  'btn.presets': 'Presets',
  'btn.sessions': 'Sessions',
  'btn.png': 'Export PNG',
  'btn.pdf': 'PDF Report',
  'btn.settings': 'Settings',
  'section.vehicle': 'Vehicle',
  'section.cargo': 'Cargo',
  'section.control': 'Controls',
  'btn.calculate': 'Calculate',
  'btn.calculating': 'Calculating…',
  'stacking': 'Stacking',
  'stacking.hint': '(for all cargo)',
  'gap': 'Gaps',
  'visibility.body': 'Body visibility',
  'btn.add': '+ Add',
  'logout': 'Logout',
  'cargo.add': '+ Add',
  'cargo.hide': '− Hide form',
  'cargo.selectAll': 'Select all',
  'cargo.deselectAll': 'Deselect',
  'cargo.delete': 'Delete',
  'cargo.clear': 'Clear',
  'cargo.export': 'Export CSV',
  'cargo.import': 'Import CSV',
};

const DICTS: Record<Lang, Dict> = { ru, en };

/** Возвращает строку перевода по ключу и языку */
export function tr(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? ru[key] ?? key;
}
