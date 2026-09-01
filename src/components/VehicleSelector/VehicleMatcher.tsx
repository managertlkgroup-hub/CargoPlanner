import { Search, Package, X, Check, AlertTriangle, Scale } from 'lucide-react';
// ============================================================================
// Модальное окно автоподбора автомобиля под грузы
// ============================================================================

import { useMemo } from 'react';
import { useAppStore, useAllVehicles } from '../../store/useAppStore';
import { matchVehicles, type VehicleMatch } from '../../lib/vehicleMatcher';
import { UNIT_LABEL, toUnit, WEIGHT_UNIT_LABEL, formatWeight, nameOf } from '../../utils/helpers';
import { tr, trf } from '../../i18n';

interface Props {
  onClose: () => void;
}

export default function VehicleMatcher({ onClose }: Props) {
  const cargo = useAppStore((s) => s.cargo);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
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
          <h3 style={{ margin: 0 }}><Search size={18} /> {tr(lang, 'vm.title')}</h3>
          <button onClick={onClose} className="btn btn-sm"><X size={14} /></button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {trf(lang, 'vm.cargoSummary', { n: cargo.length, w: `${formatWeight(totalWeight, weightUnit)} ${WEIGHT_UNIT_LABEL[weightUnit]}` })}
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
                      {fits ? <Check size={14} /> : <AlertTriangle size={14} />} {nameOf(m.vehicle, lang)}
                    </strong>
                    {m.vehicle.bodyType && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                        {tr(lang, `bt.${m.vehicle.bodyType}`)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: fits ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {fits ? tr(lang, 'vm.fits') : tr(lang, 'vm.noFit')}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {Math.round(toUnit(m.vehicle.length, unit))}×{Math.round(toUnit(m.vehicle.width, unit))}×{Math.round(toUnit(m.vehicle.height, unit))} {UNIT_LABEL[unit]} • {formatWeight(m.vehicle.maxWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11 }}>
                  <span><Package size={12} /> {trf(lang, 'vm.volumeFill', { p: m.volumeFill })}</span>
                  <span><Scale size={12} /> {trf(lang, 'vm.weightFill', { p: m.weightFill })}</span>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div className="empty-state">{tr(lang, 'vm.empty')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
