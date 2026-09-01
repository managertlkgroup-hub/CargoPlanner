// ============================================================================
// Выбор автомобиля (пресет или пользовательский)
// ============================================================================

import { useAppStore } from '../../store/useAppStore';
import { getCurrentVehicle, useAllVehicles } from '../../store/useAppStore';
import { getDefaultMethodsForBodyType } from '../../lib/packer/presets';
import { UNIT_LABEL, formatDimension, WEIGHT_UNIT_LABEL, formatWeight, nameOf } from '../../utils/helpers';
import { tr, trf } from '../../i18n';

export default function VehicleSelector() {
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const vehicles = useAllVehicles();

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);

  const bodyTypeMethods = vehicle.bodyType ? getDefaultMethodsForBodyType(vehicle.bodyType) : null;

  // Показываем только способы, реально добавленные для авто.
  // Если у авто нет добавленных — показываем значение по умолчанию для типа кузова.
  const loadingMethodsToShow = (vehicle.loadingMethods && vehicle.loadingMethods.length > 0
    ? vehicle.loadingMethods
    : bodyTypeMethods
      ? [bodyTypeMethods.defaultLoadingMethod]
      : []) || [];
  const unloadingMethodsToShow = (vehicle.unloadingMethods && vehicle.unloadingMethods.length > 0
    ? vehicle.unloadingMethods
    : bodyTypeMethods
      ? [bodyTypeMethods.defaultUnloadingMethod]
      : []) || [];

  // Подсветка: добавленные способы — цветные, остальные — нет
  const loadingSet = new Set(vehicle.loadingMethods || []);
  const unloadingSet = new Set(vehicle.unloadingMethods || []);

  return (
    <div className="panel">

      <div className="form-group mb-1">
        <label htmlFor="vehicle-select">{tr(lang, 'veh.model')}</label>
        <select
          id="vehicle-select"
          value={selectedVehicleId}
          onChange={(e) => selectVehicle(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {nameOf(v, lang)} {v.isCustom ? `(${tr(lang, 'veh.custom')})` : ''}
            </option>
          ))}
        </select>
      </div>

      {vehicle.bodyType && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {tr(lang, 'veh.type')}: <strong>{tr(lang, `bt.${vehicle.bodyType}`) || vehicle.bodyType}</strong>
        </div>
      )}

      <div className="metrics-grid vehicle-metrics">
        <div className="metric-card">
          <div className="metric-value">{formatDimension(vehicle.length, unit)}×{formatDimension(vehicle.width, unit)}×{formatDimension(vehicle.height, unit)}</div>
          <div className="metric-label">{trf(lang, 'veh.dimensions', { u: UNIT_LABEL[unit] })}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{formatWeight(vehicle.maxWeight, weightUnit)}</div>
          <div className="metric-label">{trf(lang, 'veh.payload', { u: WEIGHT_UNIT_LABEL[weightUnit] })}</div>
        </div>
      </div>

      {/* Способы загрузки/выгрузки */}
      {loadingMethodsToShow.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            {tr(lang, 'veh.loading')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {loadingMethodsToShow.map((m) => {
              const added = loadingSet.has(m);
              const isDefault = m === vehicle.defaultLoadingMethod;
              return (
                <span
                  key={m}
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: added || isDefault ? 'var(--color-accent)' : 'var(--bg-input)',
                    color: added || isDefault ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    opacity: added ? 1 : 0.85,
                  }}
                  title={tr(lang, `lm.${m}`)}
                >
                  {tr(lang, `lm.${m}`)}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {unloadingMethodsToShow.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            {tr(lang, 'veh.unloading')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {unloadingMethodsToShow.map((m) => {
              const added = unloadingSet.has(m);
              const isDefault = m === vehicle.defaultUnloadingMethod;
              return (
                <span
                  key={m}
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: added || isDefault ? 'var(--color-success)' : 'var(--bg-input)',
                    color: added || isDefault ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    opacity: added ? 1 : 0.85,
                  }}
                  title={tr(lang, `lm.${m}`)}
                >
                  {tr(lang, `lm.${m}`)}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}