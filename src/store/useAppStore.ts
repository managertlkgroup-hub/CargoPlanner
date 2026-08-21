// ============================================================================
// Глобальное состояние приложения (Zustand)
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Cargo,
  PackResult,
  PackSettings,
  SavedSession,
  Theme,
  Vehicle,
} from '../types';
import { VEHICLE_PRESETS } from '../lib/packer/presets';
import { loadFromStorage, saveToStorage, uid } from '../utils/helpers';

/** Ключи localStorage */
const KEYS = {
  vehicles: 'mlp:custom-vehicles',
  cargo: 'mlp:cargo',
  vehicleId: 'mlp:vehicle-id',
  result: 'mlp:result',
  activeVariant: 'mlp:active-variant',
  settings: 'mlp:settings',
  sessions: 'mlp:sessions',
  theme: 'mlp:theme',
};

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

  // Настройки расчёта
  settings: PackSettings;
  setSettings: (s: PackSettings) => void;

  // Результат
  result: PackResult | null;
  setResult: (r: PackResult | null) => void;
  activeVariant: string | null;
  setActiveVariant: (id: string | null) => void;
  isCalculating: boolean;
  setCalculating: (b: boolean) => void;

  // Сессии
  sessions: SavedSession[];
  saveSession: (name: string) => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Ошибки
  error: string | null;
  setError: (e: string | null) => void;
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
      selectedVehicleId: loadFromStorage<string>(KEYS.vehicleId, VEHICLE_PRESETS[0].id),
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
      activeVariant: loadFromStorage<string | null>(KEYS.activeVariant, null),
      setActiveVariant: (id) => {
        saveToStorage(KEYS.activeVariant, id);
        set({ activeVariant: id });
      },
      isCalculating: false,
      setCalculating: (b) => set({ isCalculating: b }),

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
        // Если авто из сессии не является стандартным — добавим в пользовательские
        const hasVehicle = [...VEHICLE_PRESETS, ...get().customVehicles].some(
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
        activeVariant: s.activeVariant,
        sessions: s.sessions,
      }),
    },
  ),
);

/** Возвращает автомобиль по id (стандартный или пользовательский) */
export function getCurrentVehicle(id: string, custom: Vehicle[]): Vehicle {
  const found = [...VEHICLE_PRESETS, ...custom].find((v) => v.id === id);
  return found ?? VEHICLE_PRESETS[0];
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
  return [...VEHICLE_PRESETS, ...customVehicles];
}

/** Возвращает активный вариант раскладки */
export function useActiveVariant() {
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  if (!result || !activeVariant) return null;
  return result.variants.find((v) => v.id === activeVariant) ?? null;
}