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
import { loadFromStorage, saveToStorage, uid } from '../utils/helpers';

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
};

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
  /** Поднять груз на слой выше (↑) */
  moveCargoUp: (cargoId: string) => boolean;
  /** Опустить груз на слой ниже (↓) */
  moveCargoDown: (cargoId: string) => boolean;
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
      settings: loadFromStorage<PackSettings>(KEYS.settings, {
        maxStackHeight: 0,
        allowRotation: true,
      }),
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
        if (!result || !activeVariant) return false;
        const variant = result.variants.find((v) => v.id === activeVariant);
        if (!variant) return false;
        const item = variant.items.find((it) => it.id === cargoId);
        const vehicle = getCurrentVehicle(get().selectedVehicleId, get().customVehicles);
        if (!item || item.position.y > 0) return false; // Already stacked or not found
        
        // Find support: another item at y=0 that overlaps in XZ
        const itemL = item.rotationY === 90 || item.rotationY === 270 ? item.dimensions.width : item.dimensions.length;
        const itemW = item.rotationY === 90 || item.rotationY === 270 ? item.dimensions.length : item.dimensions.width;
        
        const support = variant.items.find((other) => {
          if (other.id === item.id) return false;
          if (other.position.y !== 0) return false;
          const otherL = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.width : other.dimensions.length;
          const otherW = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.length : other.dimensions.width;
          // Check XZ overlap
          return (
            item.position.x < other.position.x + otherL &&
            item.position.x + itemL > other.position.x &&
            item.position.z < other.position.z + otherW &&
            item.position.z + itemW > other.position.z
          );
        });
        if (!support) return false; // No support below
        
        const newY = support.position.y + support.dimensions.height;
        // Enforce height limit
        if (newY + item.dimensions.height > vehicle.height) return false;
        
        // Center on support's XZ
        const supportL = support.rotationY === 90 || support.rotationY === 270 ? support.dimensions.width : support.dimensions.length;
        const supportW = support.rotationY === 90 || support.rotationY === 270 ? support.dimensions.length : support.dimensions.width;
        const newX = support.position.x + (supportL - itemL) / 2;
        const newZ = support.position.z + (supportW - itemW) / 2;
        
        // Check collision with other items at the target position
        const candidate = { x: newX, y: newY, z: newZ };
        const collides = variant.items.some((other) => {
          if (other.id === item.id) return false;
          const otherL = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.width : other.dimensions.length;
          const otherW = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.length : other.dimensions.width;
          return (
            candidate.x < other.position.x + otherL &&
            candidate.x + itemL > other.position.x &&
            candidate.y < other.position.y + other.dimensions.height &&
            candidate.y + item.dimensions.height > other.position.y &&
            candidate.z < other.position.z + otherW &&
            candidate.z + itemW > other.position.z
          );
        });
        if (collides) return false;
        
        const newResult = patchActiveVariantItems(result, activeVariant, (it) =>
          it.id === cargoId ? { ...it, position: candidate } : it
        );
        saveToStorage(KEYS.result, newResult);
        set({ result: newResult });
        return true;
      },

      moveCargoDown: (cargoId) => {
        const result = get().result;
        const activeVariant = get().activeVariant;
        if (!result || !activeVariant) return false;
        const variant = result.variants.find((v) => v.id === activeVariant);
        if (!variant) return false;
        const item = variant.items.find((it) => it.id === cargoId);
        if (!item || item.position.y === 0) return false; // Already on floor
        
        const newY = 0;
        
        // Check collision at floor position
        const itemL = item.rotationY === 90 || item.rotationY === 270 ? item.dimensions.width : item.dimensions.length;
        const itemW = item.rotationY === 90 || item.rotationY === 270 ? item.dimensions.length : item.dimensions.width;
        const collides = variant.items.some((other) => {
          if (other.id === item.id) return false;
          const otherL = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.width : other.dimensions.length;
          const otherW = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.length : other.dimensions.width;
          return (
            item.position.x < other.position.x + otherL &&
            item.position.x + itemL > other.position.x &&
            newY < other.position.y + other.dimensions.height &&
            newY + item.dimensions.height > other.position.y &&
            item.position.z < other.position.z + otherW &&
            item.position.z + itemW > other.position.z
          );
        });
        if (collides) return false;
        
        const newResult = patchActiveVariantItems(result, activeVariant, (it) =>
          it.id === cargoId ? { ...it, position: { ...it.position, y: newY } } : it
        );
        saveToStorage(KEYS.result, newResult);
        set({ result: newResult });
        return true;
      },

      smartStack: (cargoId) => {
        const result = get().result;
        const activeVariant = get().activeVariant;
        if (!result || !activeVariant) return false;
        const variant = result.variants.find((v) => v.id === activeVariant);
        if (!variant) return false;
        const item = variant.items.find((it) => it.id === cargoId);
        if (!item) return false;
        
        // First, try to lift it up from current position
        if (item.position.y === 0) {
          const lifted = get().moveCargoUp(cargoId);
          if (lifted) return true;
        }
        
        // If already on a layer, try to find a better position on a higher layer
        const itemL = item.rotationY === 90 || item.rotationY === 270 ? item.dimensions.width : item.dimensions.length;
        const itemW = item.rotationY === 90 || item.rotationY === 270 ? item.dimensions.length : item.dimensions.width;
        
        // Try all other items as potential supports
        for (const other of variant.items) {
          if (other.id === item.id) continue;
          const otherL = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.width : other.dimensions.length;
          const otherW = other.rotationY === 90 || other.rotationY === 270 ? other.dimensions.length : other.dimensions.width;
          // Support must be wide enough
          if (otherL < itemL || otherW < itemW) continue;
          
          const newY = other.position.y + other.dimensions.height;
          const newX = other.position.x + (otherL - itemL) / 2;
          const newZ = other.position.z + (otherW - itemW) / 2;
          
          // Check collision
          const collides = variant.items.some((third) => {
            if (third.id === item.id || third.id === other.id) return false;
            const tL = third.rotationY === 90 || third.rotationY === 270 ? third.dimensions.width : third.dimensions.length;
            const tW = third.rotationY === 90 || third.rotationY === 270 ? third.dimensions.length : third.dimensions.width;
            return (
              newX < third.position.x + tL &&
              newX + itemL > third.position.x &&
              newY < third.position.y + third.dimensions.height &&
              newY + item.dimensions.height > third.position.y &&
              newZ < third.position.z + tW &&
              newZ + itemW > third.position.z
            );
          });
          if (collides) continue;
          
          const newResult = patchActiveVariantItems(result, activeVariant, (it) =>
            it.id === cargoId ? { ...it, position: { x: newX, y: newY, z: newZ } } : it
          );
          saveToStorage(KEYS.result, newResult);
          set({ result: newResult });
          return true;
        }
        return false; // No suitable position found
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