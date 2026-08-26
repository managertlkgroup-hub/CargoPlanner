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
  Vehicle,
} from '../types';
import { getDefaultVehicles } from '../lib/packer/presets';
import { loadFromStorage, saveToStorage, uid } from '../utils/helpers';

/** Ключи localStorage */
const KEYS = {
  vehicles: 'mlp:custom-vehicles',
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

  // Автомобили
  customVehicles: Vehicle[];
  selectedVehicleId: string;
  addCustomVehicle: (v: Vehicle) => void;
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
          const prevRot = item.rotationY ?? 0;
          // Определяем, нужно ли менять местами длину и ширину
          const prevOdd = Math.round(prevRot / 90) % 2 === 1;
          const nextOdd = Math.round(norm / 90) % 2 === 1;
          const shouldSwap = prevOdd !== nextOdd;
          return {
            ...item,
            rotationY: norm,
            rotation: { y: norm },
            dimensions: shouldSwap
              ? { length: item.dimensions.width, width: item.dimensions.length, height: item.dimensions.height }
              : item.dimensions,
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

      // --- Ошибки ---
      error: null,
      setError: (e) => set({ error: e }),
    }),
    {
      name: 'mlp-store',
      partialize: (s) => ({
        theme: s.theme,
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