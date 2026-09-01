import { useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { volumeToM3, UNIT_LABEL, formatDimension, formatWeight, WEIGHT_UNIT_LABEL } from '../../utils/helpers';
import { calculateCOG } from '../../lib/physics/cog';
import { tr, trf } from '../../i18n';

export default function MetricsPanel() {
  // Все хуки ДО любого раннего возврата
  const variant = useActiveVariant();
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);

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
      volume: (maxX * maxZ * maxY / 1e9).toFixed(2),
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
  const balUnit = UNIT_LABEL[unit];

  return (
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
        <div className="metric-label">{trf(lang, 'th.weight', { u: WEIGHT_UNIT_LABEL[weightUnit] })}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{volumeToM3(variant.freeVolume)}</div>
        <div className="metric-label">{tr(lang, 'metric.freeVolume')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{formatWeight(variant.freeWeight, weightUnit)}</div>
        <div className="metric-label">{tr(lang, 'metric.freeWeight')}, {WEIGHT_UNIT_LABEL[weightUnit]}</div>
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
            <div className="metric-label">{tr(lang, 'metric.dimensions')}, {UNIT_LABEL[unit]}</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{cargoDimensions.volume} м³</div>
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
  );
}
