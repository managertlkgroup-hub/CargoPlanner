// ============================================================================
// Управление видимостью частей кузова (чекбоксы)
// ============================================================================


import { useEffect } from 'react';
import { useAppStore, getCurrentVehicle } from '../../store/useAppStore';

const VIS_KEY = 'cargoPlanner_visibility';

function loadVisibility(): Record<string, Partial<Record<string, boolean>>> {
  try {
    return JSON.parse(localStorage.getItem(VIS_KEY) || '{}');
  } catch { return {}; }
}

function saveVisibility(data: Record<string, Partial<Record<string, boolean>>>) {
  localStorage.setItem(VIS_KEY, JSON.stringify(data));
}

interface Props {
  vehicleId: string;
}

const PARTS: { key: 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor'; label: string; icon: string }[] = [
  { key: 'showRoof', label: 'Крыша', icon: '🏠' },
  { key: 'showSides', label: 'Борта', icon: '📦' },
  { key: 'showFront', label: 'Перед', icon: '➡️' },
  { key: 'showRear', label: 'Зад', icon: '⬅️' },
  { key: 'showFloor', label: 'Пол', icon: '⬜' },
];

export default function VehicleVisibilityControls({ vehicleId }: Props) {
  const customVehicles = useAppStore((s) => s.customVehicles);
  const vehicle = getCurrentVehicle(vehicleId, customVehicles);

  // Visibility defaults based on bodyType
  const getDefaults = () => {
    const bt = vehicle.bodyType || 'tent';
    switch (bt) {
      case 'platform':
      case 'flatbed':
      case 'open_container':
      case 'low_loader':
      case 'trailer':
      case 'low_platform':
      case 'telescopic':
        return { showRoof: false, showSides: false, showFront: false, showRear: false, showFloor: true };
      case 'dump':
        return { showRoof: false, showSides: true, showFront: true, showRear: true, showFloor: true };
      case 'tanker':
      case 'container':
        return { showRoof: true, showSides: true, showFront: true, showRear: true, showFloor: true };
      default:
        return { showRoof: true, showSides: true, showFront: true, showRear: true, showFloor: true };
    }
  };

  const defaults = getDefaults();

  const currentValues: Record<string, boolean> = {
    showRoof: vehicle.showRoof ?? defaults.showRoof,
    showSides: vehicle.showSides ?? defaults.showSides,
    showFront: vehicle.showFront ?? defaults.showFront,
    showRear: vehicle.showRear ?? defaults.showRear,
    showFloor: vehicle.showFloor ?? defaults.showFloor,
  };

  // We store visibility in a global state through store
  const updateVisibility = useAppStore((s) => s.setVehicleVisibility);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadVisibility();
    if (saved[vehicleId]) {
      const patch = saved[vehicleId];
      updateVisibility(vehicleId, patch as any);
    }
  }, [vehicleId]);

  const handleChange = (key: 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor', val: boolean) => {
    updateVisibility(vehicleId, { [key]: val });
    // Save to localStorage
    const saved = loadVisibility();
    saved[vehicleId] = { ...(saved[vehicleId] || {}), [key]: val };
    saveVisibility(saved);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
        Видимость кузова:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PARTS.map(({ key, label, icon }) => (
          <label
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 10, cursor: 'pointer',
              padding: '2px 6px', borderRadius: 4,
              background: currentValues[key] ? 'var(--bg-input)' : 'transparent',
              border: '1px solid var(--border)',
            }}
          >
            <input
              type="checkbox"
              checked={currentValues[key]}
              onChange={(e) => handleChange(key, e.target.checked)}
              style={{ width: 12, height: 12 }}
            />
            {icon} {label}
          </label>
        ))}
      </div>
    </div>
  );
}
