import { Search, Package, X, Check, AlertTriangle, Scale, Layers, Boxes } from 'lucide-react';
// ============================================================================
// Модальное окно автоподбора автомобиля под грузы
// ============================================================================

import { useMemo } from 'react';
import { useAppStore, useAllVehicles } from '../../store/useAppStore';
import { matchVehicles, type VehicleMatch, type StackOption } from '../../lib/vehicleMatcher';
import { UNIT_LABEL, toUnit, WEIGHT_UNIT_LABEL, formatWeight, nameOf, volumeToM3, formatDimension } from '../../utils/helpers';
import { tr, trf } from '../../i18n';

interface Props {
  onClose: () => void;
}

/** Строка одного варианта упаковки: «Без штабелирования: 10 шт. · Объём 57.1% · Вес 43% · 1200×800×1450 мм · Вдоль» */
function OptionLine({ lang, opt, stacking, fitsBadge, unit }: {
  lang: ReturnType<typeof useAppStore.getState>['lang'];
  opt: StackOption;
  stacking: boolean;
  fitsBadge: boolean;
  unit: ReturnType<typeof useAppStore.getState>['unit'];
}) {
  const zero = opt.placed === 0;
  const label = tr(lang, stacking ? 'vm.withStacking' : 'vm.withoutStacking');
  const cnt = trf(lang, 'vm.placedUnits', { n: opt.placed });
  const layout = tr(lang, `mode.${opt.mode}`);
  const vol = trf(lang, 'vm.vol', { p: opt.volumeFill });
  const wt = trf(lang, 'vm.wt', { p: opt.weightFill });
  const dims = zero
    ? '—'
    : `${Math.round(toUnit(opt.bBox.l, unit))}×${Math.round(toUnit(opt.bBox.w, unit))}×${Math.round(toUnit(opt.bBox.h, unit))} ${UNIT_LABEL[unit]}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 3, flexWrap: 'wrap', color: zero ? 'var(--text-muted)' : 'var(--text)' }}>
      {stacking ? <Layers size={13} /> : <Boxes size={13} />}
      <span>{label}:</span>
      <strong>{cnt}</strong>
      {fitsBadge && <Check size={13} color="var(--color-success)" />}
      <span style={{ color: zero ? 'var(--text-muted)' : 'var(--text-muted)' }}>· {vol} · {wt}</span>
      <span style={{ color: zero ? 'var(--text-muted)' : 'var(--text)', fontWeight: 500 }}>{trf(lang, 'vm.gabariti', { d: dims })}</span>
      <span>· {layout}</span>
    </div>
  );
}

export default function VehicleMatcher({ onClose }: Props) {
  const cargo = useAppStore((s) => s.cargo);
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const settings = useAppStore((s) => s.settings);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const vehicles = useAllVehicles();

  const matches = useMemo(() => matchVehicles(cargo, vehicles, settings, loadingPoints), [cargo, vehicles, settings, loadingPoints]);

  const totalWeight = cargo.reduce((sum, c) => sum + c.weight * c.quantity, 0);

  const stats = useMemo(() => {
    let qty = 0;
    let totalVolume = 0;
    let minL = Infinity;
    let minW = Infinity;
    let minH = Infinity;
    for (const c of cargo) {
      const q = Math.max(1, c.quantity || 1);
      qty += q;
      if (c.shape === 'cylinder') {
        const d = c.diameter ?? c.width ?? 0;
        totalVolume += Math.PI * (d / 2) ** 2 * c.length * q;
        minL = Math.min(minL, c.length);
        minW = Math.min(minW, d);
        minH = Math.min(minH, c.length);
      } else {
        const w = c.width ?? 0;
        const h = c.height ?? 0;
        totalVolume += c.length * (w || 1) * (h || 1) * q;
        minL = Math.min(minL, c.length);
        minW = Math.min(minW, w);
        minH = Math.min(minH, h);
      }
    }
    const layers =
      (settings.maxStackHeight ?? 0) > 0 && minH > 0 && minH !== Infinity
        ? Math.max(1, Math.floor((settings.maxStackHeight ?? 0) / minH))
        : 0;
    return {
      qty,
      totalVolume,
      minL: minL === Infinity ? 0 : minL,
      minW: minW === Infinity ? 0 : minW,
      minH: minH === Infinity ? 0 : minH,
      layers,
    };
  }, [cargo, settings.maxStackHeight]);

  const handleSelect = (v: VehicleMatch) => {
    selectVehicle(v.vehicle.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}><Search size={18} /> {tr(lang, 'vm.title')}</h3>
          <button onClick={onClose} className="btn btn-sm"><X size={14} /></button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {trf(lang, 'vm.cargoSummary', { n: cargo.length, w: `${formatWeight(totalWeight, weightUnit)} ${WEIGHT_UNIT_LABEL[weightUnit]}` })}
        </div>

        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12,
            color: 'var(--text-muted)', background: 'var(--bg-input)',
            padding: '8px 10px', borderRadius: 8, marginBottom: 12,
          }}
        >
          <span><Package size={12} /> {trf(lang, 'vm.statsItems', { n: cargo.length, q: stats.qty })}</span>
          <span><Scale size={12} /> {trf(lang, 'vm.statsWeight', { w: `${formatWeight(totalWeight, weightUnit)} ${WEIGHT_UNIT_LABEL[weightUnit]}` })}</span>
          <span>{trf(lang, 'vm.statsVolume', { v: volumeToM3(stats.totalVolume, lang) })}</span>
          {stats.minL > 0 && <span>{trf(lang, 'vm.statsMinDim', { l: formatDimension(stats.minL, unit), w: formatDimension(stats.minW, unit), h: formatDimension(stats.minH, unit), u: UNIT_LABEL[unit] })}</span>}
          {stats.layers > 0 && <span>{trf(lang, 'vm.statsLayers', { n: stats.layers })}</span>}
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {matches.map((m, idx) => {
            const fits = m.fits;
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

                <OptionLine lang={lang} opt={m.withoutStacking} stacking={false} fitsBadge={m.withoutStacking.fits} unit={unit} />
                <OptionLine lang={lang} opt={m.withStacking} stacking={true} fitsBadge={m.withStacking.fits} unit={unit} />

                {!fits && (
                  <div style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 4, fontWeight: 600 }}>
                    {trf(lang, 'vm.leftOut', { n: m.overflow, p: m.overflowPct })}
                  </div>
                )}
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