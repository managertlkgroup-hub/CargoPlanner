// ============================================================================
// Общие типы приложения "3D Планировщик загрузки автомобиля"
// ============================================================================

/** Размеры (в миллиметрах) */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

/** Тип кузова */
export type BodyType =
  | 'tent' | 'curtain' | 'van' | 'isothermal'
  | 'refrigerator' | 'refrigerator_partition' | 'refrigerator_multi'
  | 'side' | 'platform' | 'flatbed' | 'open_container'
  | 'low_loader' | 'trailer' | 'low_platform' | 'telescopic'
  | 'dump' | 'tanker' | 'container'
  | 'car_transporter' | 'concrete_mixer' | 'grain_truck'
  | 'log_truck' | 'pipe_truck' | 'crane' | 'manipulator'
  | 'evacuator' | 'minibus' | 'pickup' | 'combi'
  | 'horse_carrier' | 'cattle_carrier' | 'feed_truck'
  | 'glass_truck' | 'panel_truck' | 'garbage_truck'
  | 'jumbo' | 'mega' | 'tank_container'
  | 'cement_truck' | 'flour_truck' | 'tractor' | 'other';

/** Человекочитаемые названия типов кузовов */
export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  tent: 'Тентованный', curtain: 'Тент (шторка)', van: 'Фургон',
  isothermal: 'Изотермический', refrigerator: 'Рефрижератор',
  refrigerator_partition: 'Рефр. с перегородкой', refrigerator_multi: 'Рефр. мультизональный',
  side: 'Бортовой', platform: 'Платформа', flatbed: 'Ровная платформа',
  open_container: 'Открытый контейнер', low_loader: 'Низкорамный',
  trailer: 'Прицеп', low_platform: 'Низкая платформа', telescopic: 'Телескопический',
  dump: 'Самосвал', tanker: 'Цистерна', container: 'Контейнеровоз',
  car_transporter: 'Автовоз', concrete_mixer: 'Бетономешалка',
  grain_truck: 'Зерновоз', log_truck: 'Лесовоз', pipe_truck: 'Трубовоз',
  crane: 'Кран', manipulator: 'Манипулятор', evacuator: 'Эвакуатор',
  minibus: 'Микроавтобус', pickup: 'Пикап', combi: 'Комби',
  horse_carrier: 'Коневоз', cattle_carrier: 'Скотовоз', feed_truck: 'Кормовоз',
  glass_truck: 'Стекловоз', panel_truck: 'Панелевоз', garbage_truck: 'Мусоровоз',
  jumbo: 'Джамбо', mega: 'Мега-фура', tank_container: 'Танк-контейнер',
  cement_truck: 'Цементовоз', flour_truck: 'Муковоз', tractor: 'Тягач', other: 'Другой',
};

/** Способ загрузки/выгрузки */
export type LoadingMethod =
  | 'rear'              // Задняя (через ворота/двери)
  | 'side'              // Боковая (через шторку/борт)
  | 'top'               // Верхняя (краном, через открытый верх)
  | 'side_both'         // Боковая с 2-х сторон
  | 'full_tent_removal' // С полной растентовкой
  | 'crossbar_removal'  // Со снятием поперечных перекладин
  | 'post_removal'      // Со снятием стоек
  | 'no_gate'           // Без ворот
  | 'hydraulic_tail'    // Гидроборт
  | 'ramps'             // Аппарели
  | 'lathing'           // С обрешёткой
  | 'with_sides';       // С бортами

/** Человекочитаемые названия способов загрузки */
export const LOADING_METHOD_LABELS: Record<LoadingMethod, string> = {
  rear: 'Задняя',
  side: 'Боковая',
  top: 'Верхняя',
  side_both: 'Боковая (2 стороны)',
  full_tent_removal: 'Полная растентовка',
  crossbar_removal: 'Снятие перекладин',
  post_removal: 'Снятие стоек',
  no_gate: 'Без ворот',
  hydraulic_tail: 'Гидроборт',
  ramps: 'Аппарели',
  lathing: 'С обрешёткой',
  with_sides: 'С бортами',
};

/** Автомобиль / кузов */
export interface Vehicle extends Dimensions {
  id: string;
  name: string;
  /** Грузоподъёмность в кг */
  maxWeight: number;
  /** true — пользовательский пресет, false — стандартный */
  isCustom?: boolean;
  /** Тип кузова */
  bodyType?: BodyType;
  /** Доступные способы загрузки */
  loadingMethods?: LoadingMethod[];
  /** Доступные способы выгрузки */
  unloadingMethods?: LoadingMethod[];
  /** Способ загрузки по умолчанию */
  defaultLoadingMethod?: LoadingMethod;
  /** Способ выгрузки по умолчанию */
  defaultUnloadingMethod?: LoadingMethod;
  /** Видимость элементов кузова */
  showRoof?: boolean;
  showSides?: boolean;
  showFront?: boolean;
  showRear?: boolean;
  showFloor?: boolean;
}

/** Точка загрузки груза */
export interface LoadingPoint {
  id: string;
  name: string;
  /** Необязательный адрес */
  address?: string;
  /** Порядок следования по маршруту (по возрастанию) */
  order: number;
}

/** Точка выгрузки груза */
export interface UnloadingPoint {
  id: string;
  name: string;
  /** Необязательный адрес */
  address?: string;
  /** Порядок следования по маршруту (по возрастанию) */
  order: number;
}

/** Форма груза */
export type CargoShape = 'box' | 'cylinder';

/** Ориентация цилиндра */
export type CylinderOrientation = 'horizontal' | 'vertical';

/**
 * Отдельная позиция груза в списке грузов (до расчёта).
 * Для прямоугольного груза (shape='box') используются width и height,
 * для цилиндрического (shape='cylinder') — diameter (ширина и высота равны диаметру).
 */
export interface Cargo {
  id: string;
  name: string;
  shape: CargoShape;
  /** Длина груза (для цилиндра — длина трубы/бочки), мм */
  length: number;
  /** Ширина (только для прямоугольных грузов), мм */
  width?: number;
  /** Высота (только для прямоугольных грузов), мм */
  height?: number;
  /** Диаметр (только для цилиндров), мм */
  diameter?: number;
  weight: number;
  quantity: number;
  stackable: boolean;
  /** Негабаритный груз (может выступать за пределы кузова) */
  isOversize?: boolean;
  /** Ориентация цилиндра (по умолчанию 'horizontal') */
  cylinderOrientation?: CylinderOrientation;
  /** Точка загрузки (опционально) */
  loadingPointId?: string;
  /** Точка выгрузки (опционально) */
  unloadingPointId?: string;
  /** Пользовательский груз (создан копированием) */
  isCustom?: boolean;
}

/** Точка/координаты в пространстве кузова */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Поворот груза по осям (градусы) — сохранено для обратной совместимости */
export interface Rotation {
  /** Вращение вокруг оси Y (град) */
  y: number;
}

/**
 * Размещённый груз в результате расчёта.
 * position — это координаты левого нижнего угла груза в мм (в системе кузова,
 * где x вдоль длины, y вверх, z вдоль ширины).
 */
export interface PackedItem {
  id: string;
  name: string;
  shape: CargoShape;
  /** Диаметр для цилиндров (мм) */
  diameter?: number;
  /** Фактические габариты с учётом поворота (для цилиндра — bounding box) */
  dimensions: Dimensions;
  weight: number;
  position: Point3D;
  /** Угол поворота вокруг вертикальной оси Y (град) */
  rotationY?: number;
  /** Сохранено для обратной совместимости со старыми сохранёнными данными */
  rotation?: Rotation;
  color: string;
  stackable: boolean;
  /** Негабаритный груз */
  isOversize?: boolean;
  /** Индекс слоя (0-based) */
  layer?: number;
}

/** Вариант раскладки */
export interface LayoutVariant {
  /** 'along' | 'across' | 'mixed' */
  id: string;
  label: string;
  items: PackedItem[];
  /** Заполнение по объёму, % (0..100) */
  volumeFill: number;
  /** Заполнение по весу, % (0..100) */
  weightFill: number;
  /** Суммарный вес размещённых грузов, кг */
  totalWeight: number;
  /** Суммарный объём размещённых грузов, мм^3 */
  totalVolume: number;
  /** Оставшийся свободный объём, мм^3 */
  freeVolume: number;
  /** Оставшийся свободный вес, кг */
  freeWeight: number;
}

/** Результат полного расчёта */
export interface PackResult {
  /** Имеются ли ошибки при расчёте */
  error: string | null;
  /** Сгенерированные варианты раскладки */
  variants: LayoutVariant[];
}

/** Настройки алгоритма */
export interface PackSettings {
  /** Максимальная высота штабеля (мм). 0 — без ограничений */
  maxStackHeight: number;
  /** Разрешить вращение грузов (повороты) */
  allowRotation: boolean;
}

/** Сохранённая сессия */
export interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  vehicle: Vehicle;
  cargo: Cargo[];
  result: PackResult | null;
  activeVariant: string | null;
  settings: PackSettings;
}

/** Тема оформления */
export type Theme = 'light' | 'dark';

/**
 * Вспомогательная функция: возвращает "эффективные" габариты груза для упаковки.
 * Для цилиндра ширина и высота равны диаметру.
 */
export function getCargoSize(cargo: Cargo): Dimensions {
  if (cargo.shape === 'cylinder') {
    const d = cargo.diameter ?? 0;
    return { length: cargo.length, width: d, height: d };
  }
  return {
    length: cargo.length,
    width: cargo.width ?? 0,
    height: cargo.height ?? 0,
  };
}

/**
 * Вспомогательная функция: реальный объём груза (мм^3).
 * Для цилиндра используется формула объёма цилиндра, для прямоугольника — V = L*W*H.
 */
export function getCargoVolume(cargo: Cargo): number {
  if (cargo.shape === 'cylinder') {
    const d = cargo.diameter ?? 0;
    return Math.PI * (d / 2) ** 2 * cargo.length;
  }
  return (cargo.width ?? 0) * (cargo.height ?? 0) * cargo.length;
}

/** Человекочитаемое название формы */
export function shapeLabel(shape: CargoShape): string {
  return shape === 'cylinder' ? 'Цилиндр' : 'Прямоугольный';
}