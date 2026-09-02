import { useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { volumeToM3, unitLabel, formatDimension, formatWeight, weightUnitLabel } from '../../utils/helpers';
import { calculateCOG } from '../../lib/physics/cog';
import { tr, trf } from '../../i18n';

export default function MetricsPanel() {
  // Все хуки ДО любого раннего возврата
  const variant = useActiveVariant();
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const cargoList = useAppStore((s) => s.cargo);

  // Количество неразмещённых грузов и остаток объёма/веса
  const unplaced = useMemo(() => {
    let totalQty = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    for (const c of cargoList) {
      const q = Math.max(1, c.quantity || 1);
      totalQty += q;
      totalWeight += c.weight * q;
      if (c.shape === 'cylinder') {
        const d = c.diameter ?? c.width ?? 0;
        totalVolume += Math.PI * (d / 2) ** 2 * c.length * q;
      } else {
        totalVolume += c.length * (c.width ?? 0) * (c.height ?? 0) * q;
      }
    }
    const placedQty = variant ? variant.items.length : 0;
    const restQty = Math.max(0, totalQty - placedQty);
    return {
      restQty,
      restWeight: Math.max(0, totalWeight - (variant?.totalWeight ?? 0)),
      restVolume: Math.max(0, totalVolume - (variant?.totalVolume ?? 0)),
      placedQty,
      totalQty,
    };
  }, [cargoList, variant]);

  const layerCount = useMemo(() => {
    if (!variant || variant.items.length === 0) return 0;
    const layers = new Set<number>();
    variant.items.forEach((item) => {
      const layer = Math.round(item.position.y / Math.max(1, item.dimensions.height));
      layers.add(layer);
    });
    return layers.size;
  }, [variant]);

  // Габариты размещённого груза
  const cargoDimensions = useMemo(() => {
    if (!variant || variant.items.length === 0) return null;
    let maxX = 0, maxZ = 0, maxY = 0;
    variant.items.forEach((item) => {
      const rotY = item.rotationY ?? 0;
      const isOdd90 = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
      const effL = isOdd90 ? item.dimensions.width : item.dimensions.length;
      const effW = isOdd90 ? item.dimensions.length : item.dimensions.width;
      maxX = Math.max(maxX, item.position.x + effL);
      maxZ = Math.max(maxZ, item.position.z + effW);
      maxY = Math.max(maxY, item.position.y + item.dimensions.height);
    });
    return {
      length: Math.round(maxX),
      width: Math.round(maxZ),
      height: Math.round(maxY),
      volumeMm3: maxX * maxZ * maxY,
    };
  }, [variant]);

  // COG
  const vehicle = useSelectedVehicle();
  const cog = useMemo(() => {
    if (!variant || variant.items.length === 0) return null;
    return calculateCOG(variant.items, vehicle);
  }, [variant, vehicle]);

  // Количество негабаритных
  const oversizeCount = useMemo(() => {
    if (!variant) return 0;
    return variant.items.filter(it => it.isOversize).length;
  }, [variant]);

  // Ранний возврат — после всех хуков
  if (!variant) return null;

  const balVal = cog ? formatDimension(Math.abs(cog.z - vehicle.width / 2), unit) : '';
  const balUnit = unitLabel(lang, unit);

  return (
    <>
      {unplaced.restQty > 0 && (
        <div
          className="unplaced-banner"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: 'var(--color-warning)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13,
          }}
        >
          <AlertTriangle size={16} />
          <div>
            <div style={{ fontWeight: 600 }}>
              {trf(lang, 'metric.unplaced', { placed: unplaced.placedQty, total: unplaced.totalQty, rest: unplaced.restQty })}
            </div>
            <div style={{ fontSize: 12 }}>
              {trf(lang, 'metric.unplacedBody', {
                w: `${formatWeight(unplaced.restWeight, weightUnit)} ${weightUnitLabel(lang, weightUnit)}`,
                v: volumeToM3(unplaced.restVolume, lang),
              })}
            </div>
          </div>
        </div>
      )}
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-value">{variant.volumeFill}%</div>
        <div className="metric-label">{tr(lang, 'metric.volumeFill')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{variant.weightFill}%</div>
        <div className="metric-label">{tr(lang, 'metric.weightFill')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{formatWeight(variant.totalWeight, weightUnit)}</div>
        <div className="metric-label">{trf(lang, 'th.weight', { u: weightUnitLabel(lang, weightUnit) })}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{volumeToM3(variant.freeVolume, lang)}</div>
        <div className="metric-label">{tr(lang, 'metric.freeVolume')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{formatWeight(variant.freeWeight, weightUnit)}</div>
        <div className="metric-label">{tr(lang, 'metric.freeWeight')}, {weightUnitLabel(lang, weightUnit)}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{variant.items.length}</div>
        <div className="metric-label">{tr(lang, 'metric.placed')}</div>
      </div>
      {layerCount > 1 && (
        <div className="metric-card">
          <div className="metric-value">{layerCount}</div>
          <div className="metric-label">{tr(lang, 'metric.layers')}</div>
        </div>
      )}
      {cargoDimensions && (
        <>
          <div className="metric-card">
            <div className="metric-value" style={{ fontSize: '14px' }}>
              {formatDimension(cargoDimensions.length, unit)}×{formatDimension(cargoDimensions.width, unit)}×{formatDimension(cargoDimensions.height, unit)}
            </div>
            <div className="metric-label">{tr(lang, 'metric.dimensions')}, {unitLabel(lang, unit)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{volumeToM3(cargoDimensions.volumeMm3, lang)}</div>
            <div className="metric-label">{tr(lang, 'metric.cargoVolume')}</div>
          </div>
        </>
      )}
      {cog && (
        <div className="metric-card" style={{ gridColumn: 'span 3' }}>
          <div className={`metric-value ${cog.status === 'ok' ? 'cog-status-ok' : cog.status === 'warning' ? 'cog-status-warning' : 'cog-status-danger'}`} style={{ fontSize: 14 }}>
            {cog.status === 'ok' ? <CheckCircle size={14} /> : cog.status === 'warning' ? <AlertTriangle size={14} /> : <XCircle size={14} />} {tr(lang, 'metric.balance')}
          </div>
          <div className="metric-label">
            {cog.status === 'danger'
              ? trf(lang, 'metric.balanceWarn', { d: balVal, u: balUnit })
              : cog.status === 'warning'
                ? trf(lang, 'metric.balanceShift', { d: balVal, u: balUnit })
                : trf(lang, 'metric.balanceOk', { d: balVal, u: balUnit })
            }
          </div>
          <div className="metric-label" style={{ fontSize: 10, marginTop: 2 }}>
            {tr(lang, 'metric.balanceFooter')}
          </div>
        </div>
      )}
      {oversizeCount > 0 && (
        <div className="metric-card">
          <div className="metric-value" style={{ color: 'var(--color-danger)', fontSize: 14 }}><AlertTriangle size={14} /> {tr(lang, 'metric.oversize')}</div>
          <div className="metric-label">{tr(lang, 'metric.cargoCount')}: {oversizeCount}</div>
        </div>
      )}
    </div>
    </>
  );
}
