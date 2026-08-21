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

/** Отдельная позиция груза в списке грузов (до расчёта) */
export interface Cargo extends Dimensions {
  id: string;
  name: string;
  weight: number;
  quantity: number;
  stackable: boolean;
}

/** Точка/координаты в пространстве кузова */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Поворот груза по осям (градусы) */
export interface Rotation {
  /** Вращение вокруг оси Y (град) */
  y: number;
}

/** Размещённый груз в результате расчёта */
export interface PackedItem {
  id: string;
  name: string;
  /** Фактические габариты с учётом поворота */
  dimensions: Dimensions;
  weight: number;
  position: Point3D;
  rotation: Rotation;
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