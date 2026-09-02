// ============================================================================
// Глобальное состояние приложения (Zustand)
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Cargo,
  LoadingPoint,
  PackResult,
  PackSettings,
  Point3D,
  SavedSession,
  Theme,
  UnloadingPoint,
  Unit,
  Vehicle,
} from '../types';
import { getDefaultVehicles, type CargoPreset } from '../lib/packer/presets';
import { loadFromStorage, saveToStorage, uid, setCurrentLang, type WeightUnit } from '../utils/helpers';
import { tr, type Lang } from '../i18n';

/** Ключи localStorage */
const KEYS = {
  vehicles: 'mlp:custom-vehicles',
  customCargoPresets: 'mlp:custom-cargo-presets',
  cargo: 'mlp:cargo',
  vehicleId: 'mlp:vehicle-id',
  result: 'mlp:result',
  pristine: 'mlp:pristine-items',
  activeVariant: 'mlp:active-variant',
  settings: 'mlp:settings',
  sessions: 'mlp:sessions',
  theme: 'mlp:theme',
  loadingPoints: 'mlp:loading-points',
  unloadingPoints: 'mlp:unloading-points',
  unit: 'mlp:unit',
  weightUnit: 'mlp:weight-unit',
  lang: 'mlp:lang',
};

/** Настройки по умолчанию (все зазоры выключены) */
const DEFAULT_SETTINGS: PackSettings = {
  maxStackHeight: 0,
  allowRotation: true,
  gapsEnabled: false,
  gap: 0,
  gapWalls: 0,
  gapWidth: 0,
  gapLength: 0,
};

function loadSettings(): PackSettings {
  const stored = loadFromStorage<Partial<PackSettings>>(KEYS.settings, {});
  // Миграция старого единого зазора в три независимых
  const legacy = stored.gap ?? 0;
  const hasNew = stored.gapWalls !== undefined || stored.gapWidth !== undefined || stored.gapLength !== undefined;
  const anyGap = (stored.gapWalls ?? 0) > 0 || (stored.gapWidth ?? 0) > 0 || (stored.gapLength ?? 0) > 0;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    gapsEnabled: stored.gapsEnabled ?? (hasNew && anyGap),
    gap: 0,
    gapWalls: hasNew ? (stored.gapWalls ?? 0) : legacy,
    gapWidth: hasNew ? (stored.gapWidth ?? 0) : legacy,
    gapLength: hasNew ? (stored.gapLength ?? 0) : legacy,
  };
}

/**
 * Карта "эталонных" (автоматически рассчитанных) грузов по вариантам.
 * Используется для кнопки «Сбросить позиции».
 */
export type PristineMap = Record<string, PackResult['variants'][number]['items']>;

/** Интерфейс глобального состояния */
interface AppState {
  // Тема
  theme: Theme;
  toggleTheme: () => void;

  // Пользовательские пресеты грузов
  customCargoPresets: CargoPreset[];
  addCustomCargoPreset: (p: CargoPreset) => void;
  removeCustomCargoPreset: (idx: number) => void;
  updateCustomCargoPreset: (idx: number, patch: Partial<CargoPreset>) => void;

  // Автомобили
  customVehicles: Vehicle[];
  selectedVehicleId: string;
  addCustomVehicle: (v: Vehicle) => void;
  removeCustomVehicle: (id: string) => void;
  updateCustomVehicle: (id: string, patch: Partial<Vehicle>) => void;
  selectVehicle: (id: string) => void;

  // Грузы
  cargo: Cargo[];
  setCargo: (cargo: Cargo[]) => void;
  addCargo: (c: Cargo) => void;
  addCargoBulk: (items: Cargo[]) => void;
  removeCargo: (ids: string[]) => void;
  clearCargo: () => void;
  updateCargo: (id: string, patch: Partial<Cargo>) => void;
  updateCustomCargo: (id: string, patch: Partial<Cargo>) => void;

  // Точки загрузки/выгрузки
  loadingPoints: LoadingPoint[];
  unloadingPoints: UnloadingPoint[];
  addLoadingPoint: (p: LoadingPoint) => void;
  removeLoadingPoint: (id: string) => void;
  addUnloadingPoint: (p: UnloadingPoint) => void;
  removeUnloadingPoint: (id: string) => void;

  // Настройки расчёта
  settings: PackSettings;
  setSettings: (s: PackSettings) => void;

  // Глобальные единицы измерения (отображение/ввод)
  unit: Unit;
  setUnit: (u: Unit) => void;
  weightUnit: WeightUnit;
  setWeightUnit: (u: WeightUnit) => void;
  lang: Lang;
  setLang: (l: Lang) => void;

  // Результат
  result: PackResult | null;
  setResult: (r: PackResult | null) => void;
  /** Эталонные позиции для сброса (устанавливаются вместе с result) */
  pristine: PristineMap;
  setPristine: (p: PristineMap) => void;
  activeVariant: string | null;
  setActiveVariant: (id: string | null) => void;
  isCalculating: boolean;
  setCalculating: (b: boolean) => void;

  // --- Ручное редактирование раскладки ---
  /** Обновляет позицию конкретного груза в текущем варианте */
  updateCargoPosition: (cargoId: string, position: Point3D) => void;
  /** Поворачивает груз вокруг вертикальной оси Y на указанный угол (град) */
  rotateCargo: (cargoId: string, angle: number) => void;
  /** Возвращает все позиции варианта к автоматически рассчитанным */
  resetPositions: () => void;
  /** Поднять груз на слой выше (↑). Возвращает null при успехе или код причины отказа */
  moveCargoUp: (cargoId: string) => string | null;
  /** Опустить груз на слой ниже (↓). Возвращает null при успехе или код причины отказа */
  moveCargoDown: (cargoId: string) => string | null;
  /** Автоматически найти место на верхнем слое (S) */
  smartStack: (cargoId: string) => boolean;

  // --- Подсветка и фокус в 3D ---
  /** ID груза, на который нужно навести камеру в 3D */
  focusItemId: string | null;
  setFocusItemId: (id: string | null) => void;
  /** ID груза для временной подсветки (2 сек) */
  highlightItemId: string | null;
  setHighlightItemId: (id: string | null) => void;
  /** Режим "разнесённый вид" — грузы разъезжаются для наглядности */
  spreadMode: boolean;
  toggleSpreadMode: () => void;
  /** Карта видимости частей кузова по ID автомобиля */
  vehicleVisibilityMap: Record<string, Partial<Pick<Vehicle, 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor'>>>;
  setVehicleVisibility: (id: string, patch: Partial<Pick<Vehicle, 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor'>>) => void;

  // Сессии
  sessions: SavedSession[];
  saveSession: (name: string) => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Ошибки
  error: string | null;
  setError: (e: string | null) => void;
}

/**
 * Обновляет items активного варианта результата.
 * Возвращает новый result или тот же, если данных недостаточно.
 */
function patchActiveVariantItems(
  result: PackResult | null,
  activeVariant: string | null,
  updater: (item: PackResult['variants'][number]['items'][number]) =>
    PackResult['variants'][number]['items'][number],
): PackResult | null {
  if (!result || !activeVariant) return result;
  const variants = result.variants.map((v) => {
    if (v.id !== activeVariant) return v;
    return { ...v, items: v.items.map(updater) };
  });
  return { ...result, variants };
}

/** Размеры основания (L×W) предмета с учётом поворота */
function rotDims(item: { rotationY?: number; rotation?: { y?: number }; dimensions: { length: number; width: number } }) {
  const rot = item.rotationY ?? item.rotation?.y ?? 0;
  return Math.abs(rot % 180) === 90
    ? { L: item.dimensions.width, W: item.dimensions.length }
    : { L: item.dimensions.length, W: item.dimensions.width };
}

/** 3D-пересечение AABB (candidate против other) */
function xyzCollide(
  c: Point3D,
  cL: number,
  cW: number,
  cH: number,
  other: {
    position: Point3D;
    rotationY?: number;
    rotation?: { y?: number };
    dimensions: { length: number; width: number; height: number };
  },
): boolean {
  const o = rotDims(other);
  return (
    c.x < other.position.x + o.L &&
    c.x + cL > other.position.x &&
    c.y < other.position.y + other.dimensions.height &&
    c.y + cH > other.position.y &&
    c.z < other.position.z + o.W &&
    c.z + cW > other.position.z
  );
}

setCurrentLang(loadFromStorage<Lang>(KEYS.lang, 'ru'));

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Тема ---
      theme: loadFromStorage<Theme>(KEYS.theme, 'light'),
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: next });
        saveToStorage(KEYS.theme, next);
        document.documentElement.setAttribute('data-theme', next);
      },

      // --- Пользовательские пресеты грузов ---
      customCargoPresets: loadFromStorage<CargoPreset[]>(KEYS.customCargoPresets, []),
      addCustomCargoPreset: (p) => {
        const list = [...get().customCargoPresets, p];
        saveToStorage(KEYS.customCargoPresets, list);
        set({ customCargoPresets: list });
      },
      removeCustomCargoPreset: (idx) => {
        const list = get().customCargoPresets.filter((_, i) => i !== idx);
        saveToStorage(KEYS.customCargoPresets, list);
        set({ customCargoPresets: list });
      },
      updateCustomCargoPreset: (idx, patch) => {
        const list = get().customCargoPresets.map((p, i) => (i === idx ? { ...p, ...patch } : p));
        saveToStorage(KEYS.customCargoPresets, list);
        set({ customCargoPresets: list });
      },

      // --- Автомобили ---
      customVehicles: loadFromStorage<Vehicle[]>(KEYS.vehicles, []),
      selectedVehicleId: loadFromStorage<string>(KEYS.vehicleId, getDefaultVehicles()[0].id),
      addCustomVehicle: (v) => {
        const list = [...get().customVehicles, v];
        saveToStorage(KEYS.vehicles, list);
        saveToStorage(KEYS.vehicleId, v.id);
        set({ customVehicles: list, selectedVehicleId: v.id });
        get().setResult(null);
        get().setActiveVariant(null);
      },
      removeCustomVehicle: (id) => {
        const list = get().customVehicles.filter((v) => v.id !== id);
        saveToStorage(KEYS.vehicles, list);
        // Если удалили текущий — переключаемся на первый стандартный
        if (get().selectedVehicleId === id) {
          const firstId = getDefaultVehicles()[0].id;
          saveToStorage(KEYS.vehicleId, firstId);
          set({ customVehicles: list, selectedVehicleId: firstId });
        } else {
          set({ customVehicles: list });
        }
        get().setResult(null);
        get().setActiveVariant(null);
      },
      updateCustomVehicle: (id, patch) => {
        const list = get().customVehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
        saveToStorage(KEYS.vehicles, list);
        set({ customVehicles: list });
        get().setResult(null);
        get().setActiveVariant(null);
      },
      selectVehicle: (id) => {
        saveToStorage(KEYS.vehicleId, id);
        set({ selectedVehicleId: id });
        get().setResult(null);
        get().setActiveVariant(null);
      },

      // --- Грузы ---
      cargo: loadFromStorage<Cargo[]>(KEYS.cargo, []),
      setCargo: (cargo) => {
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },
      addCargo: (c) => {
        const cargo = [...get().cargo, c];
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },
      addCargoBulk: (items) => {
        const cargo = [...get().cargo, ...items];
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },
      removeCargo: (ids) => {
        const set_ = new Set(ids);
        const cargo = get().cargo.filter((c) => !set_.has(c.id));
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },
      clearCargo: () => {
        saveToStorage(KEYS.cargo, []);
        set({ cargo: [] });
      },
      updateCargo: (id, patch) => {
        const cargo = get().cargo.map((c) => (c.id === id ? { ...c, ...patch } : c));
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },
      updateCustomCargo: (id, patch) => {
        const item = get().cargo.find((c) => c.id === id);
        if (!item || !item.isCustom) {
          get().setError(tr(get().lang, 'err.editCustomOnly'));
          return;
        }
        const cargo = get().cargo.map((c) => (c.id === id ? { ...c, ...patch } : c));
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },

      // --- Точки загрузки/выгрузки ---
      loadingPoints: loadFromStorage<LoadingPoint[]>(KEYS.loadingPoints, []),
      unloadingPoints: loadFromStorage<UnloadingPoint[]>(KEYS.unloadingPoints, []),
      addLoadingPoint: (p) => {
        const loadingPoints = [...get().loadingPoints, p];
        saveToStorage(KEYS.loadingPoints, loadingPoints);
        set({ loadingPoints });
      },
      removeLoadingPoint: (id) => {
        const loadingPoints = get().loadingPoints.filter((p) => p.id !== id);
        saveToStorage(KEYS.loadingPoints, loadingPoints);
        set({ loadingPoints });
        // Очищаем ссылки на удалённую точку у грузов
        const cargo = get().cargo.map((c) =>
          c.loadingPointId === id ? { ...c, loadingPointId: undefined } : c,
        );
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },
      addUnloadingPoint: (p) => {
        const unloadingPoints = [...get().unloadingPoints, p];
        saveToStorage(KEYS.unloadingPoints, unloadingPoints);
        set({ unloadingPoints });
      },
      removeUnloadingPoint: (id) => {
        const unloadingPoints = get().unloadingPoints.filter((p) => p.id !== id);
        saveToStorage(KEYS.unloadingPoints, unloadingPoints);
        set({ unloadingPoints });
        // Очищаем ссылки на удалённую точку у грузов
        const cargo = get().cargo.map((c) =>
          c.unloadingPointId === id ? { ...c, unloadingPointId: undefined } : c,
        );
        saveToStorage(KEYS.cargo, cargo);
        set({ cargo });
      },

      // --- Настройки ---
      settings: loadSettings(),
      setSettings: (s) => {
        saveToStorage(KEYS.settings, s);
        set({ settings: s });
      },

      // --- Единицы измерения ---
      unit: loadFromStorage<Unit>(KEYS.unit, 'mm'),
      setUnit: (u) => {
        saveToStorage(KEYS.unit, u);
        set({ unit: u });
      },
      weightUnit: loadFromStorage<WeightUnit>(KEYS.weightUnit, 'kg'),
      setWeightUnit: (u) => {
        saveToStorage(KEYS.weightUnit, u);
        set({ weightUnit: u });
      },

      // --- Язык ---
      lang: loadFromStorage<Lang>(KEYS.lang, 'ru'),
      setLang: (l) => {
        saveToStorage(KEYS.lang, l);
        setCurrentLang(l);
        set({ lang: l });
      },

      // --- Результат ---
      result: loadFromStorage<PackResult | null>(KEYS.result, null),
      setResult: (r) => {
        saveToStorage(KEYS.result, r);
        set({ result: r });
      },
      pristine: loadFromStorage<PristineMap>(KEYS.pristine, {}),
      setPristine: (p) => {
        saveToStorage(KEYS.pristine, p);
        set({ pristine: p });
      },
      activeVariant: loadFromStorage<string | null>(KEYS.activeVariant, null),
      setActiveVariant: (id) => {
        saveToStorage(KEYS.activeVariant, id);
        set({ activeVariant: id });
      },
      isCalculating: false,
      setCalculating: (b) => set({ isCalculating: b }),

      // --- Ручное редактирование ---
      updateCargoPosition: (cargoId, position) => {
        const result = patchActiveVariantItems(get().result, get().activeVariant, (item) =>
          item.id === cargoId ? { ...item, position } : item,
        );
        saveToStorage(KEYS.result, result);
        set({ result });
      },
      rotateCargo: (cargoId, angle) => {
        const result = patchActiveVariantItems(get().result, get().activeVariant, (item) => {
          if (item.id !== cargoId) return item;
          const norm = ((angle % 360) + 360) % 360;
          // НЕ меняем dimensions — packer уже установил оригинальные размеры,
          // rotationY определяет визуальную ориентацию через группу вращения в 3D
          // и проверку Math.abs(rotY % 180) === 90 в Scene2D.
          return {
            ...item,
            rotationY: norm,
            rotation: { y: norm },
          };
        });
        saveToStorage(KEYS.result, result);
        set({ result });
      },
      resetPositions: () => {
        const pristine = get().pristine;
        const activeVariant = get().activeVariant;
        const result = get().result;
        if (!pristine || !activeVariant || !result) return;
        const targetItems = pristine[activeVariant];
        if (!targetItems) return;
        // Восстанавливаем эталонные позиции и повороты для активного варианта
        const itemsById = new Map(targetItems.map((it) => [it.id, it]));
        const variants = result.variants.map((v) => {
          if (v.id !== activeVariant) return v;
          return {
            ...v,
            items: v.items.map((it) => {
              const pristineItem = itemsById.get(it.id);
              if (!pristineItem) return it;
              return {
                ...it,
                position: { ...pristineItem.position },
                rotationY: pristineItem.rotationY,
                rotation: pristineItem.rotation
                  ? { ...pristineItem.rotation }
                  : undefined,
              };
            }),
          };
        });
        const newResult = { ...result, variants };
        saveToStorage(KEYS.result, newResult);
        set({ result: newResult });
      },

      // --- Ручное штабелирование ---
      moveCargoUp: (cargoId) => {
        const result = get().result;
        const activeVariant = get().activeVariant;
        if (!result || !activeVariant) return 'noresult';
        const variant = result.variants.find((v) => v.id === activeVariant);
        if (!variant) return 'noresult';
        const item = variant.items.find((it) => it.id === cargoId);
        const vehicle = getCurrentVehicle(get().selectedVehicleId, get().customVehicles);
        if (!item) return 'noresult';

        // Штабелирование должно быть включено для перемещения по слоям
        if ((get().settings.maxStackHeight ?? 0) <= 0) return 'stackingoff';

        // Подъём на один слой вверх (тот же XZ). Опора не требуется —
        // груз может зависнуть в воздухе, важно лишь свободное место.
        const newY = item.position.y + item.dimensions.height;
        if (newY + item.dimensions.height > vehicle.height + 0.01) return 'toohigh';

        const iD = rotDims(item);
        const iL = iD.L, iW = iD.W;
        const candidate = { x: item.position.x, y: newY, z: item.position.z };

        // На новом месте (тот же XZ) не должно быть другого груза
        const collides = variant.items.some((o) => o.id !== item.id && xyzCollide(candidate, iL, iW, item.dimensions.height, o));
        if (collides) return 'collide';

        const newResult = patchActiveVariantItems(result, activeVariant, (it) =>
          it.id === cargoId ? { ...it, position: candidate } : it,
        );
        saveToStorage(KEYS.result, newResult);
        set({ result: newResult });
        return null;
      },

      moveCargoDown: (cargoId) => {
        const result = get().result;
        const activeVariant = get().activeVariant;
        if (!result || !activeVariant) return 'noresult';
        const variant = result.variants.find((v) => v.id === activeVariant);
        if (!variant) return 'noresult';
        const item = variant.items.find((it) => it.id === cargoId);

        // Штабелирование должно быть включено для перемещения по слоям
        if ((get().settings.maxStackHeight ?? 0) <= 0) return 'stackingoff';

        if (!item || item.position.y === 0) return 'onfloor'; // Already on floor

        const iD = rotDims(item);
        const iL = iD.L, iW = iD.W;

        // Опускаем на один слой вниз (тот же XZ)
        const newY = Math.max(0, item.position.y - item.dimensions.height);
        const candidate = { x: item.position.x, y: newY, z: item.position.z };

        // Check collision at target position
        const collides = variant.items.some((other) =>
          other.id !== item.id && xyzCollide(candidate, iL, iW, item.dimensions.height, other),
        );
        if (!collides) {
          const newResult = patchActiveVariantItems(result, activeVariant, (it) =>
            it.id === cargoId ? { ...it, position: { ...it.position, y: newY } } : it
          );
          saveToStorage(KEYS.result, newResult);
          set({ result: newResult });
          return null;
        }

        // Текущий XZ занят — ищем свободное место на полу в радиусе 2000 мм
        const vehicle = getCurrentVehicle(get().selectedVehicleId, get().customVehicles);
        const RANGE = 2000;
        const STEP = 50;
        let best: { x: number; z: number; d2: number } | null = null;
        const canPlace = (x: number, z: number): boolean => {
          if (!vehicle) return false;
          if (x < -0.01 || z < -0.01 || x + iL > vehicle.length + 0.01 || z + iW > vehicle.width + 0.01) return false;
          const c = { x, y: 0, z };
          return !variant.items.some((other) =>
            other.id !== item.id && xyzCollide(c, iL, iW, item.dimensions.height, other),
          );
        };
        for (let dx = -RANGE; dx <= RANGE; dx += STEP) {
          for (let dz = -RANGE; dz <= RANGE; dz += STEP) {
            const d2 = dx * dx + dz * dz;
            if (d2 > RANGE * RANGE) continue;
            const x = item.position.x + dx;
            const z = item.position.z + dz;
            if (!canPlace(x, z)) continue;
            if (!best || d2 < best.d2) best = { x, z, d2 };
          }
        }
        if (!best) return 'nofloor';
        const spot = best;

        const newResult = patchActiveVariantItems(result, activeVariant, (it) =>
          it.id === cargoId ? { ...it, position: { ...it.position, y: 0, x: spot.x, z: spot.z } } : it
        );
        saveToStorage(KEYS.result, newResult);
        set({ result: newResult });
        return null;
      },

      smartStack: (cargoId) => {
        // Попытка поднять груз на один слой (без требований к опоре)
        const lifted = get().moveCargoUp(cargoId);
        return lifted === null;
      },

      // --- Сессии ---
      sessions: loadFromStorage<SavedSession[]>(KEYS.sessions, []),
      saveSession: (name) => {
        const vehicle = getCurrentVehicle(get().selectedVehicleId, get().customVehicles);
        const s: SavedSession = {
          id: uid(),
          name,
          createdAt: Date.now(),
          vehicle,
          cargo: get().cargo,
          result: get().result,
          activeVariant: get().activeVariant,
          settings: get().settings,
        };
        const sessions = [...get().sessions, s];
        saveToStorage(KEYS.sessions, sessions);
        set({ sessions });
      },
      loadSession: (id) => {
        const s = get().sessions.find((x) => x.id === id);
        if (!s) return;
        saveToStorage(KEYS.vehicleId, s.vehicle.id);
        saveToStorage(KEYS.cargo, s.cargo);
        saveToStorage(KEYS.result, s.result);
        saveToStorage(KEYS.activeVariant, s.activeVariant);
        saveToStorage(KEYS.settings, s.settings);
        set({
          selectedVehicleId: s.vehicle.id,
          cargo: s.cargo,
          result: s.result,
          activeVariant: s.activeVariant,
          settings: s.settings,
        });
        const hasVehicle = [...getDefaultVehicles(), ...get().customVehicles].some(
          (v) => v.id === s.vehicle.id,
        );
        if (!hasVehicle) {
          get().addCustomVehicle(s.vehicle);
        }
      },
      deleteSession: (id) => {
        const sessions = get().sessions.filter((x) => x.id !== id);
        saveToStorage(KEYS.sessions, sessions);
        set({ sessions });
      },

      // --- Видимость кузова (отдельно от vehicle, чтобы не создавать копии) ---
      vehicleVisibilityMap: loadFromStorage<Record<string, Partial<Pick<Vehicle, 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor'>>>>('mlp:visibility-map', {}),
      setVehicleVisibility: (id, patch) => {
        const map = { ...get().vehicleVisibilityMap, [id]: { ...(get().vehicleVisibilityMap[id] || {}), ...patch } };
        saveToStorage('mlp:visibility-map', map);
        set({ vehicleVisibilityMap: map });
      },

      // --- Подсветка и фокус ---
      focusItemId: null,
      setFocusItemId: (id) => set({ focusItemId: id }),
      highlightItemId: null,
      setHighlightItemId: (id) => set({ highlightItemId: id }),
      spreadMode: false,
      toggleSpreadMode: () => set((s) => ({ spreadMode: !s.spreadMode })),

      // --- Ошибки ---
      error: null,
      setError: (e) => set({ error: e }),
    }),
    {
      name: 'mlp-store',
      partialize: (s) => ({
        theme: s.theme,
        customCargoPresets: s.customCargoPresets,
        customVehicles: s.customVehicles,
        selectedVehicleId: s.selectedVehicleId,
        cargo: s.cargo,
        settings: s.settings,
        result: s.result,
        pristine: s.pristine,
        activeVariant: s.activeVariant,
        sessions: s.sessions,
        loadingPoints: s.loadingPoints,
        unloadingPoints: s.unloadingPoints,
        vehicleVisibilityMap: s.vehicleVisibilityMap,
        unit: s.unit,
        lang: s.lang,
      }),
    },
  ),
);

/** Возвращает автомобиль по id (стандартный или пользовательский) */
export function getCurrentVehicle(id: string, custom: Vehicle[]): Vehicle {
  const found = [...getDefaultVehicles(), ...custom].find((v) => v.id === id);
  return found ?? getDefaultVehicles()[0];
}

/** Возвращает текущий выбранный автомобиль из store */
export function useSelectedVehicle(): Vehicle {
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  return getCurrentVehicle(selectedVehicleId, customVehicles);
}

/** Возвращает список всех доступных автомобилей (пресеты + пользовательские) */
export function useAllVehicles(): Vehicle[] {
  const customVehicles = useAppStore((s) => s.customVehicles);
  return [...getDefaultVehicles(), ...customVehicles];
}

/** Возвращает активный вариант раскладки */
export function useActiveVariant() {
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  if (!result || !activeVariant) return null;
  return result.variants.find((v) => v.id === activeVariant) ?? null;
}