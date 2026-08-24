// ============================================================================
// Общие типы приложения "3D Планировщик загрузки автомобиля"
// ============================================================================

/** Размеры (в миллиметрах) */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

/** Автомобиль / кузов */
export interface Vehicle extends Dimensions {
  id: string;
  name: string;
  /** Грузоподъёмность в кг */
  maxWeight: number;
  /** true — пользовательский пресет, false — стандартный */
  isCustom?: boolean;
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
  /** Точка загрузки (опционально) */
  loadingPointId?: string;
  /** Точка выгрузки (опционально) */
  unloadingPointId?: string;
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