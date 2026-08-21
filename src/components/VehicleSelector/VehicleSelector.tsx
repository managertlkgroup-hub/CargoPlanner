// ============================================================================
// Выбор автомобиля (пресет или пользовательский)
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentVehicle, useAllVehicles } from '../../store/useAppStore';
import CustomVehicleForm from './CustomVehicleForm';

export default function VehicleSelector() {
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const vehicles = useAllVehicles();

  const [showCustom, setShowCustom] = useState(false);
  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);

  return (
    <div className="panel">
      <div className="section-title">
        <span>🚚 Автомобиль</span>
        <button className="btn btn-sm" onClick={() => setShowCustom((v) => !v)}>
          {showCustom ? 'Закрыть' : '+ Свой авто'}
        </button>
      </div>

      <label>Модель кузова</label>
      <select
        style={{ width: '100%', marginBottom: 10 }}
        value={selectedVehicleId}
        onChange={(e) => selectVehicle(e.target.value)}
      >
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} {v.isCustom ? '(пользовательский)' : ''}
          </option>
        ))}
      </select>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="metric-card">
          <div className="metric-value">{vehicle.length}×{vehicle.width}×{vehicle.height}</div>
          <div className="metric-label">Размеры, мм</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{vehicle.maxWeight}</div>
          <div className="metric-label">Грузоподъёмность, кг</div>
        </div>
      </div>

      {showCustom && <CustomVehicleForm onDone={() => setShowCustom(false)} />}
    </div>
  );
}