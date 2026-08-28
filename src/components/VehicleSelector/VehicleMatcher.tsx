import { Search, Package } from 'lucide-react';
// ============================================================================
// Модальное окно автоподбора автомобиля под грузы
// ============================================================================

import { useMemo } from 'react';
import { useAppStore, useAllVehicles } from '../../store/useAppStore';
import { matchVehicles, type VehicleMatch } from '../../lib/vehicleMatcher';

interface Props {
  onClose: () => void;
}

export default function VehicleMatcher({ onClose }: Props) {
  const cargo = useAppStore((s) => s.cargo);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const vehicles = useAllVehicles();

  const matches = useMemo(() => matchVehicles(cargo, vehicles), [cargo, vehicles]);

  const totalWeight = cargo.reduce((sum, c) => sum + c.weight * c.quantity, 0);

  const handleSelect = (v: VehicleMatch) => {
    selectVehicle(v.vehicle.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}><Search size={18} /> Подбор автомобиля</h3>
          <button onClick={onClose} className="btn btn-sm">✕</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Грузов: {cargo.length} шт, общий вес: {Math.round(totalWeight)} кг
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {matches.map((m, idx) => {
            const fits = m.effectiveFill <= 100 && m.weightFill <= 100;
            return (
              <div
                key={m.vehicle.id + idx}
                onClick={() => handleSelect(m)}
                style={{
                  padding: '10px 12px',
                  marginBottom: 6,
                  border: `1px solid ${fits ? 'var(--color-success)' : 'var(--border)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: fits ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-body)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = fits ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-panel)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = fits ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-body)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>
                      {fits ? '✅' : '⚠️'} {m.vehicle.name}
                    </strong>
                    {m.vehicle.bodyType && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                        {m.vehicle.bodyType}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: fits ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {fits ? 'Подходит' : 'Мало места'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {m.vehicle.length}×{m.vehicle.width}×{m.vehicle.height} мм • {m.vehicle.maxWeight} кг
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11 }}>
                  <span><Package size={12} /> {m.volumeFill}% объёма</span>
                  <span>⚖️ {m.weightFill}% веса</span>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div className="empty-state">Нет доступных автомобилей</div>
          )}
        </div>
      </div>
    </div>
  );
}
