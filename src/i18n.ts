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
  'units.dim': 'Размеры',
  'units.weight': 'Вес',
  'units.lang': 'Язык',
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

  // App / общее
  'btn.details': 'Детали',
  'btn.findVehicle': 'Подобрать авто',
  'view.2d': '2D Вид',
  'view.3d': '3D Вид',
  'aria.close': 'Закрыть',
  'suggestions.title': 'Подсказки',
  'err.calculateEmpty': 'Добавьте хотя бы один груз перед расчётом.',
  'err.calculate': 'Ошибка при расчёте раскладки',
  'err.calcFirst': 'Раскладка не рассчитана, рассчитайте сначала.',
  'err.pdf': 'Ошибка формирования PDF',
  'err.png': 'Ошибка экспорта PNG',
  'err.excel': 'Ошибка экспорта в Excel',
  'err.importCsv': 'Ошибка импорта CSV',

  // Метрики
  'metric.volumeFill': 'Заполнение объёма',
  'metric.weightFill': 'Заполнение по весу',
  'metric.weight': 'Вес',
  'metric.freeVolume': 'Свободный объём',
  'metric.freeWeight': 'Свободный вес',
  'metric.placed': 'Размещено, шт',
  'metric.layers': 'Слоёв штабеля',
  'metric.dimensions': 'Габариты',
  'metric.cargoVolume': 'Объём груза',
  'metric.balance': 'Баланс загрузки',
  'metric.balanceWarn': 'Сильный перевес влево/вправо ({d} {u}). Распределите грузы равномернее!',
  'metric.balanceShift': 'Грузы смещены от центра по ширине на {d} {u} — рекомендуется выровнять',
  'metric.balanceOk': 'Грузы распределены равномерно (смещение {d} {u})',
  'metric.balanceFooter': 'Неравномерная загрузка влияет на устойчивость автомобиля при движении и торможении.',
  'metric.oversize': 'Негабарит',
  'metric.cargoCount': 'Грузов',

  // Режимы раскладки
  'mode.along': 'Вдоль',
  'mode.across': 'Поперёк',
  'mode.mixed': 'Смешанный',

  // Scene2D
  's2d.weight': 'Вес',
  's2d.oversize': 'Негабаритный',
  's2d.nodata': 'Нет данных для отображения',
  's2d.layer': 'Слой',
  's2d.footer': 'Перетаскивайте · R — поворот · W/↑/S/↓ — слои',
  's2d.nosupport': 'Нет груза для опоры под этим предметом',
  's2d.toohigh': 'Нельзя поднять выше высоты кузова',
  's2d.collide': 'Препятствие — предмет нельзя поставить',
  's2d.onfloor': 'Груз уже стоит на полу',
  's2d.notstackable': 'Этот груз нельзя штабелировать',

  // Кнопки отчётов
  'rb.pdf': 'Отчёт PDF',
  'rb.excel': 'Экспорт в Excel',

  // Видимость кузова
  'vis.title': 'Видимость кузова',
  'vis.roof': 'Крыша',
  'vis.sides': 'Борта',
  'vis.front': 'Перед',
  'vis.rear': 'Зад',
  'vis.floor': 'Пол',

  // Вибратор/автомобиль
  'veh.custom': 'свой',
  'vm.fits': 'Подходит',
  'vm.noFit': 'Мало места',

  // Формы
  'form.length': 'Длина',
  'form.width': 'Ширина',
  'form.height': 'Высота',
  'form.diameter': 'Диаметр',
  'form.weight': 'Вес',
  'form.maxWeight': 'Грузоподъёмность',
  'form.maxWeightRequired': 'Грузоподъёмность обязательна',
  'form.nameRequired': 'Укажите название',
  'form.nameRequiredCargo': 'Укажите название груза.',
  'form.fillAll': 'Заполните все поля.',
  'form.lenWeightRequired': 'Длина и вес обязательны.',
  'form.whRequired': 'Укажите ширину и высоту.',
  'form.diameterRequired': 'Укажите диаметр.',
  'form.fieldRequired': '{label} обязательно',
  'form.fieldRange': '{label} должна быть от {min} до {max}',
  'form.optgroupStandard': 'Стандартные',
  'form.optgroupMine': 'Мои пресеты',
  'form.placeholderPallet': 'Например, Европаллета',
  'form.placeholderOwnVan': 'Например, Собственный фургон',
  'form.addOwnVehicle': '+ Добавить свой автомобиль',
  'form.hideForm': '− Скрыть форму',
  'form.addOwnPreset': '+ Добавить свой пресет',
  'form.myPreset': 'Мой пресет',
  'form.qty': 'Кол-во, шт',
  'form.oversize': 'Негабаритный',
  'form.submitAdd': '+ Добавить груз',
  'form.confirmHidePreset': 'Скрыть стандартный пресет? (можно восстановить перезагрузкой)',
  'form.confirmHideVehicle': 'Скрыть стандартный пресет?',
  'form.confirmDeleteVehicle': 'Удалить пользовательский автомобиль?',

  // Таблица грузов
  'th.stack': 'Штаб',
  'th.name': 'Название',
  'th.shape': 'Форма',
  'th.length': 'Длина',
  'th.width': 'Ширина',
  'th.height': 'Выс.',
  'th.weight': 'Вес, {u}',
  'th.qty': 'Кол-во',
  'th.actions': 'Действия',
  'cargo.confirmClear': 'Удалить все грузы?',
  'cargo.empty': 'Грузов пока нет. Нажмите «+ Добавить» или импортируйте CSV.',
  'cargo.stackTitle': 'Можно ставить сверху',
  'cargo.3dTitle': 'Показать в 3D',
  'cargo.rotateTitle': 'Повернуть на 90° (поменять длину и ширину)',
  'cargo.detailsTitle': 'Детали груза',

  // Форма/фигура
  'shape.box': 'Ящик',
  'shape.cylinder': 'Цилиндр',
  'shape.rect': 'Прямоугольный',
  'shape.rectShort': 'Прямоуг.',

  // Пресеты / детали
  'pd.form': 'Форма',
  'pd.stackable': 'Штабелируемый',
  'pd.yes': 'Да',
  'pd.no': 'Нет',
  'pd.copy': 'копия',

  // 3D сцена
  's3d.glue': 'Склеить',
  's3d.spread': 'Разнести',

  // Тема
  'theme.dark': 'Включить тёмную тему',
  'theme.light': 'Включить светлую тему',

  // Сессии
  'session.namePlaceholder': 'Имя сессии',

  // PDF
  'pdf.layer': 'Слой',
  'pdf.floor': 'пол',
  'pdf.body.tent': 'Тентованный',
  'pdf.body.van': 'Фургон',
  'pdf.body.isothermal': 'Изотерм',
  'pdf.body.refrigerator': 'Рефрижератор',
  'pdf.body.side': 'Бортовой',
  'pdf.body.platform': 'Платформа',
  'pdf.body.low_loader': 'Низкорамный',
  'pdf.body.dump': 'Самосвал',
  'pdf.body.tanker': 'Цистерна',
  'pdf.body.container': 'Контейнеровоз',

  // Футер
  'footer.text': '3D Планировщик загрузки · React + Three.js · Данные хранятся локально в вашем браузере',

  // Подсказки
  'sg.lowFill': 'Заполнение {p} — попробуйте добавить больше грузов или увеличить количество.',
  'sg.unplaced': 'Некоторые грузы не поместились. Попробуйте другой режим или включите штабелирование.',
  'sg.weightLimit': 'Вес загрузки {p} — близко к пределу. Распределите вес равномерно.',
  'sg.enableStacking': '{n} штабелируемых грузов на полу. Включите штабелирование для экономии места.',
  'sg.secondLayer': 'Высота загрузки {a} из {b}. Добавьте второй слой.',
  'sg.front': 'передней',
  'sg.rear': 'задней',
  'sg.left': 'левой',
  'sg.right': 'правой',
  'sg.balanceLong': 'Грузы смещены к {side} части кузова ({d}). Распределите тяжёлые грузы равномернее.',
  'sg.balanceWidth': 'Грузы смещены к {side} стороне кузова ({d}). Распределите грузы равномернее по ширине.',
};

const en: Dict = {
  'app.title': '3D Load Planner',
  'units.title': 'Units',
  'units.dim': 'Length',
  'units.weight': 'Weight',
  'units.lang': 'Language',
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

  'btn.details': 'Details',
  'btn.findVehicle': 'Find vehicle',
  'view.2d': '2D View',
  'view.3d': '3D View',
  'aria.close': 'Close',
  'suggestions.title': 'Suggestions',
  'err.calculateEmpty': 'Add at least one cargo item before calculating.',
  'err.calculate': 'Error calculating layout',
  'err.calcFirst': 'No layout calculated yet. Calculate first.',
  'err.pdf': 'Error generating PDF',
  'err.png': 'Error exporting PNG',
  'err.excel': 'Error exporting to Excel',
  'err.importCsv': 'CSV import error',

  'metric.volumeFill': 'Volume fill',
  'metric.weightFill': 'Weight fill',
  'metric.weight': 'Weight',
  'metric.freeVolume': 'Free volume',
  'metric.freeWeight': 'Free weight',
  'metric.placed': 'Placed, pcs',
  'metric.layers': 'Stack layers',
  'metric.dimensions': 'Dimensions',
  'metric.cargoVolume': 'Cargo volume',
  'metric.balance': 'Load balance',
  'metric.balanceWarn': 'Strong left/right imbalance ({d} {u}). Distribute cargo more evenly!',
  'metric.balanceShift': 'Cargo shifted from center by width by {d} {u} — recommend realignment',
  'metric.balanceOk': 'Cargo distributed evenly (offset {d} {u})',
  'metric.balanceFooter': 'Uneven loading affects vehicle stability during movement and braking.',
  'metric.oversize': 'Oversize',
  'metric.cargoCount': 'Items',

  'mode.along': 'Along',
  'mode.across': 'Across',
  'mode.mixed': 'Mixed',

  's2d.weight': 'Weight',
  's2d.oversize': 'Oversize',
  's2d.nodata': 'No data to display',
  's2d.layer': 'Layer',
  's2d.footer': 'Drag · R — rotate · W/↑/S/↓ — layers',
  's2d.nosupport': 'No support under this item',
  's2d.toohigh': 'Cannot raise above truck height',
  's2d.collide': 'Obstacle — cannot place item',
  's2d.onfloor': 'Item is already on the floor',
  's2d.notstackable': 'This item cannot be stacked',

  'rb.pdf': 'PDF Report',
  'rb.excel': 'Export Excel',

  'vis.title': 'Body visibility',
  'vis.roof': 'Roof',
  'vis.sides': 'Sides',
  'vis.front': 'Front',
  'vis.rear': 'Rear',
  'vis.floor': 'Floor',

  'veh.custom': 'custom',
  'vm.fits': 'Fits',
  'vm.noFit': 'Not enough space',

  'form.length': 'Length',
  'form.width': 'Width',
  'form.height': 'Height',
  'form.diameter': 'Diameter',
  'form.weight': 'Weight',
  'form.maxWeight': 'Max weight',
  'form.maxWeightRequired': 'Max weight is required',
  'form.nameRequired': 'Enter a name',
  'form.nameRequiredCargo': 'Enter a cargo name.',
  'form.fillAll': 'Fill in all fields.',
  'form.lenWeightRequired': 'Length and weight are required.',
  'form.whRequired': 'Enter width and height.',
  'form.diameterRequired': 'Enter diameter.',
  'form.fieldRequired': '{label} is required',
  'form.fieldRange': '{label} must be between {min} and {max}',
  'form.optgroupStandard': 'Standard',
  'form.optgroupMine': 'My presets',
  'form.placeholderPallet': 'e.g. Euro pallet',
  'form.placeholderOwnVan': 'e.g. My van',
  'form.addOwnVehicle': '+ Add my vehicle',
  'form.hideForm': '− Hide form',
  'form.addOwnPreset': '+ Add my preset',
  'form.myPreset': 'My preset',
  'form.qty': 'Qty, pcs',
  'form.oversize': 'Oversize',
  'form.submitAdd': '+ Add cargo',
  'form.confirmHidePreset': 'Hide standard preset? (can be restored on reload)',
  'form.confirmHideVehicle': 'Hide standard preset?',
  'form.confirmDeleteVehicle': 'Delete custom vehicle?',

  'th.stack': 'Stack',
  'th.name': 'Name',
  'th.shape': 'Shape',
  'th.length': 'Length',
  'th.width': 'Width',
  'th.height': 'H',
  'th.weight': 'Weight, {u}',
  'th.qty': 'Qty',
  'th.actions': 'Actions',
  'cargo.confirmClear': 'Delete all cargo?',
  'cargo.empty': 'No cargo yet. Click «+ Add» or import CSV.',
  'cargo.stackTitle': 'Can be stacked on top',
  'cargo.3dTitle': 'Show in 3D',
  'cargo.rotateTitle': 'Rotate 90° (swap length and width)',
  'cargo.detailsTitle': 'Item details',

  'shape.box': 'Box',
  'shape.cylinder': 'Cylinder',
  'shape.rect': 'Rectangular',
  'shape.rectShort': 'Rect.',

  'pd.form': 'Shape',
  'pd.stackable': 'Stackable',
  'pd.yes': 'Yes',
  'pd.no': 'No',
  'pd.copy': 'copy',

  's3d.glue': 'Glue',
  's3d.spread': 'Spread',

  'theme.dark': 'Enable dark theme',
  'theme.light': 'Enable light theme',

  'session.namePlaceholder': 'Session name',

  'pdf.layer': 'Layer',
  'pdf.floor': 'floor',
  'pdf.body.tent': 'Tented',
  'pdf.body.van': 'Van',
  'pdf.body.isothermal': 'Isothermal',
  'pdf.body.refrigerator': 'Refrigerated',
  'pdf.body.side': 'Side',
  'pdf.body.platform': 'Platform',
  'pdf.body.low_loader': 'Low loader',
  'pdf.body.dump': 'Dump',
  'pdf.body.tanker': 'Tanker',
  'pdf.body.container': 'Container carrier',

  'footer.text': '3D Load Planner · React + Three.js · Data is stored locally in your browser',

  // Подсказки
  'sg.lowFill': 'Fill {p} — try adding more cargo or increasing the quantity.',
  'sg.unplaced': 'Some cargo did not fit. Try another layout mode or enable stacking.',
  'sg.weightLimit': 'Load weight {p} — close to the limit. Distribute weight evenly.',
  'sg.enableStacking': '{n} stackable items on the floor. Enable stacking to save space.',
  'sg.secondLayer': 'Load height {a} of {b}. Add a second layer.',
  'sg.front': 'front',
  'sg.rear': 'rear',
  'sg.left': 'left',
  'sg.right': 'right',
  'sg.balanceLong': 'Cargo shifted toward the {side} part of the body ({d}). Distribute heavy cargo more evenly.',
  'sg.balanceWidth': 'Cargo shifted toward the {side} side of the body ({d}). Distribute cargo more evenly by width.',
};

const DICTS: Record<Lang, Dict> = { ru, en };

/** Возвращает строку перевода по ключу и языку */
export function tr(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? ru[key] ?? key;
}

/** Простая интерполяция плейсхолдеров вида {name} */
export function trf(lang: Lang, key: string, vars: Record<string, string | number>): string {
  let s = tr(lang, key);
  for (const k of Object.keys(vars)) {
    s = s.split(`{${k}}`).join(String(vars[k]));
  }
  return s;
}
