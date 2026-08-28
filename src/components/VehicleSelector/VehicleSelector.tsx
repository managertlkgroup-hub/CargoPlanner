// ============================================================================
// Выбор автомобиля (пресет или пользовательский)
// ============================================================================

import { useAppStore } from '../../store/useAppStore';
import { getCurrentVehicle, useAllVehicles } from '../../store/useAppStore';
import { LOADING_METHOD_LABELS, BODY_TYPE_LABELS } from '../../types';

export default function VehicleSelector() {
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const vehicles = useAllVehicles();

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);

  return (
    <div className="panel">

      <div className="form-group mb-1">
        <label htmlFor="vehicle-select">Модель кузова</label>
        <select
          id="vehicle-select"
          value={selectedVehicleId}
          onChange={(e) => selectVehicle(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} {v.isCustom ? '(свой)' : ''}
            </option>
          ))}
        </select>
      </div>

      {vehicle.bodyType && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          Тип: <strong>{BODY_TYPE_LABELS[vehicle.bodyType] || vehicle.bodyType}</strong>
        </div>
      )}

      <div className="metrics-grid vehicle-metrics">
        <div className="metric-card">
          <div className="metric-value">{vehicle.length}×{vehicle.width}×{vehicle.height}</div>
          <div className="metric-label">Размеры, мм</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{vehicle.maxWeight}</div>
          <div className="metric-label">Грузоподъёмность, кг</div>
        </div>
      </div>

      {/* Способы загрузки/выгрузки */}
      {vehicle.loadingMethods && vehicle.loadingMethods.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Способы загрузки:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {vehicle.loadingMethods.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: m === vehicle.defaultLoadingMethod ? 'var(--color-accent)' : 'var(--bg-input)',
                  color: m === vehicle.defaultLoadingMethod ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
                title={LOADING_METHOD_LABELS[m]}
              >
                {LOADING_METHOD_LABELS[m]}
              </span>
            ))}
          </div>
        </div>
      )}
      {vehicle.unloadingMethods && vehicle.unloadingMethods.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Способы выгрузки:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {vehicle.unloadingMethods.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: m === vehicle.defaultUnloadingMethod ? 'var(--color-success)' : 'var(--bg-input)',
                  color: m === vehicle.defaultUnloadingMethod ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
                title={LOADING_METHOD_LABELS[m]}
              >
                {LOADING_METHOD_LABELS[m]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}