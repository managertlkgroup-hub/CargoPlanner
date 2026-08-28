import React from 'react';
import { Home, Package, ArrowRight, ArrowLeft, Square } from 'lucide-react';
// ============================================================================
// Управление видимостью частей кузова (чекбоксы)
// ============================================================================


import { useAppStore, getCurrentVehicle } from '../../store/useAppStore';

interface Props {
  vehicleId: string;
}

const PARTS: { key: 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor'; label: string; icon: React.ReactNode }[] = [
  { key: 'showRoof', label: 'Крыша', icon: <Home size={12} /> },
  { key: 'showSides', label: 'Борта', icon: <Package size={12} /> },
  { key: 'showFront', label: 'Перед', icon: <ArrowRight size={12} /> },
  { key: 'showRear', label: 'Зад', icon: <ArrowLeft size={12} /> },
  { key: 'showFloor', label: 'Пол', icon: <Square size={12} /> },
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
  const visMap = useAppStore((s) => s.vehicleVisibilityMap);
  const visOverrides = visMap[vehicleId] || {};

  const currentValues: Record<string, boolean> = {
    showRoof: visOverrides.showRoof ?? defaults.showRoof,
    showSides: visOverrides.showSides ?? defaults.showSides,
    showFront: visOverrides.showFront ?? defaults.showFront,
    showRear: visOverrides.showRear ?? defaults.showRear,
    showFloor: visOverrides.showFloor ?? defaults.showFloor,
  };

  const updateVisibility = useAppStore((s) => s.setVehicleVisibility);

  const handleChange = (key: 'showRoof' | 'showSides' | 'showFront' | 'showRear' | 'showFloor', val: boolean) => {
    updateVisibility(vehicleId, { [key]: val });
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
