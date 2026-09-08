import { useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { volumeToM3, unitLabel, formatDimension, formatWeight, weightUnitLabel, nameOf } from '../../utils/helpers';
import { calculateCOG } from '../../lib/physics/cog';
import { canFitAll, canStackAll } from '../../lib/packer/packer';
import { tr, trf } from '../../i18n';

// id размещённого предмета имеет формат `${cargoId}-${x}-${y}-${z}` (см. packer.ts),
// поэтому базовый id груза восстанавливаем, отбрасывая 3 хвостовых сегмента позиции.
function baseIdOf(itemId: string): string {
  const seg = itemId.split('-');
  return seg.length > 3 ? seg.slice(0, seg.length - 3).join('-') : itemId;
}

export default function MetricsPanel() {
  // Все хуки ДО любого раннего возврата
  const variant = useActiveVariant();
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const cargoList = useAppStore((s) => s.cargo);
  const settings = useAppStore((s) => s.settings);
  const [showMissing, setShowMissing] = useState(false);

  // Количество неразмещённых грузов и остаток объёма/веса
  const unplaced = useMemo(() => {
    // Габариты одного груза в выбранной единице (формат «1.7×1×2.07 м»)
    const dimStr = (c: (typeof cargoList)[number]): string => {
      const suffix = ` ${unitLabel(lang, unit)}`;
      if (c.shape === 'cylinder') {
        const d = c.diameter ?? c.width ?? 0;
        return c.cylinderOrientation === 'vertical'
          ? `⌀${formatDimension(d, unit)} × ${formatDimension(c.length, unit)}${suffix}`
          : `${formatDimension(c.length, unit)} × ⌀${formatDimension(d, unit)}${suffix}`;
      }
      return `${formatDimension(c.length, unit)}×${formatDimension(c.width ?? 0, unit)}×${formatDimension(c.height ?? 0, unit)}${suffix}`;
    };
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
    const placedById: Record<string, number> = {};
    variant?.items.forEach((it) => {
      const base = baseIdOf(it.id);
      placedById[base] = (placedById[base] ?? 0) + 1;
    });
    const missing: {
      id: string; name: string; qty: number; weight: number; volume: number; dims: string;
    }[] = [];
    for (const c of cargoList) {
      const q = Math.max(1, c.quantity || 1);
      const placed = placedById[c.id] ?? 0;
      const missingQty = Math.max(0, q - placed);
      if (missingQty > 0) {
        let vol = 0;
        if (c.shape === 'cylinder') {
          const d = c.diameter ?? c.width ?? 0;
          vol = Math.PI * (d / 2) ** 2 * c.length * missingQty;
        } else {
          vol = c.length * (c.width ?? 0) * (c.height ?? 0) * missingQty;
        }
        missing.push({
          id: c.id, name: nameOf(c, lang), qty: missingQty,
          weight: c.weight * missingQty, volume: vol, dims: dimStr(c),
        });
      }
    }
    return {
      restQty,
      restWeight: Math.max(0, totalWeight - (variant?.totalWeight ?? 0)),
      restVolume: Math.max(0, totalVolume - (variant?.totalVolume ?? 0)),
      placedQty,
      totalQty,
      missing,
    };
  }, [cargoList, variant, unit, lang]);

  const layerCount = useMemo(() => {
    if (!variant || variant.items.length === 0) return 0;
    const layers = new Set<number>();
    variant.items.forEach((item) => {
      const layer = Math.round(item.position.y / Math.max(1, item.dimensions.height));
      layers.add(layer);
    });
    return layers.size;
  }, [variant]);

  // Зазоры считаются включёнными, если чекбокс включён и хотя бы один тип > 0 —
  // тогда дополнительно показываем строку «Габариты с зазорами».
  const gapsOn =
    settings.gapsEnabled &&
    ((settings.gapWalls ?? 0) > 0 || (settings.gapWidth ?? 0) > 0 || (settings.gapLength ?? 0) > 0);

  // Форматирование линейных габаритов в выбранной единице
  const dimValue = (d?: { length: number; width: number; height: number }) =>
    d
      ? `${formatDimension(d.length, unit)}×${formatDimension(d.width, unit)}×${formatDimension(d.height, unit)}`
      : '';

  // Объём груза = сумма реальных объёмов размещённых предметов (не bounding box)
  const cargoVolumeMm3 = useMemo(() => {
    if (!variant) return 0;
    return variant.items.reduce((sum, item) => {
      const { length: L, width: W, height: H } = item.dimensions;
      if (item.shape === 'cylinder') {
        const d = Math.min(L, W);
        const axis = item.cylinderOrientation === 'vertical' ? H : L;
        return sum + Math.PI * (d / 2) ** 2 * axis;
      }
      return sum + L * W * H;
    }, 0);
  }, [variant]);

  // COG
  const vehicle = useSelectedVehicle();
  const cog = useMemo(() => {
    if (!variant || variant.items.length === 0) return null;
    return calculateCOG(variant.items, vehicle);
  }, [variant, vehicle]);

  // Подсказка canFitAll: можно ли вообще разместить весь груз в этом кузове
  const fitHint = useMemo(() => {
    if (!vehicle || unplaced.restQty === 0) return null;
    return canFitAll(vehicle, cargoList, {
      walls: settings.gapsEnabled ? (settings.gapWalls ?? 0) : 0,
      width: settings.gapsEnabled ? (settings.gapWidth ?? 0) : 0,
      length: settings.gapsEnabled ? (settings.gapLength ?? 0) : 0,
    }, true);
  }, [vehicle, cargoList, settings, unplaced.restQty]);

  // Реально ли штабелирование — если нет, не предлагаем его и в баннере
  const stackOk = vehicle && cargoList.length > 0 ? canStackAll(vehicle, cargoList).ok : true;


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
            background: 'rgba(245, 158, 11, 0.10)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            color: 'var(--color-warning)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {trf(lang, 'metric.unplaced', { placed: unplaced.placedQty, total: unplaced.totalQty, rest: unplaced.restQty })}
              </div>
              <div style={{ fontSize: 12 }}>
                {trf(lang, stackOk ? 'metric.unplacedBody' : 'metric.unplacedBodyNoStack', {
                  w: `${formatWeight(unplaced.restWeight, weightUnit)} ${weightUnitLabel(lang, weightUnit)}`,
                  v: volumeToM3(unplaced.restVolume, lang),
                })}
              </div>
              {unplaced.missing.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {unplaced.missing.map((m) => (
                    <div key={m.id} style={{ fontSize: 12, marginTop: 2 }}>
                      {trf(lang, 'metric.unplacedDetail', {
                        name: m.name,
                        n: m.qty,
                        dims: m.dims,
                        w: formatWeight(m.weight, weightUnit),
                        wu: weightUnitLabel(lang, weightUnit),
                        v: volumeToM3(m.volume, lang),
                      })}
                    </div>
                  ))}
                </div>
              )}
              {fitHint && !fitHint.ok && (
                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>
                  {fitHint.reason}
                  <div style={{ fontWeight: 400, opacity: 0.85 }}>
                    {tr(lang, 'metric.fitHint')}
                  </div>
                </div>
              )}
              {settings.gapsEnabled && unplaced.restQty > 0 && (
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                  {trf(lang, 'metric.gapsPartial', { placed: unplaced.placedQty, total: unplaced.totalQty })}
                </div>
              )}
            </div>
            <button
              className="btn btn-sm"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => setShowMissing((v) => !v)}
            >
              {showMissing ? tr(lang, 'metric.unplacedHide') : tr(lang, 'metric.unplacedShow')}
            </button>
          </div>
          {showMissing && unplaced.missing.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, borderTop: '1px solid rgba(245,158,11,0.25)', paddingTop: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tr(lang, 'metric.unplacedList')}</div>
              {unplaced.missing.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                  <span style={{ flex: 1, color: 'var(--color-ink, #1e293b)' }}>
                    {m.name} <span style={{ color: 'var(--color-warning)' }}>{trf(lang, 'metric.unplacedItem', { n: m.qty })}</span>
                    <span style={{ opacity: 0.75, marginLeft: 6 }}>{m.dims}</span>
                  </span>
                  <span>{formatWeight(m.weight, weightUnit)} {weightUnitLabel(lang, weightUnit)}</span>
                  <span>{volumeToM3(m.volume, lang)}</span>
                </div>
              ))}
            </div>
          )}
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
      {variant.dimensions && (
        <>
          {gapsOn ? (
            <>
              <div className="metric-card" title={tr(lang, 'metric.dimWithoutGapsHint')}>
                <div className="metric-value" style={{ fontSize: '14px' }}>
                  {dimValue(variant.dimensionsWithoutGaps)}
                </div>
                <div className="metric-label">{tr(lang, 'metric.dimWithoutGaps')}, {unitLabel(lang, unit)}</div>
              </div>
              <div className="metric-card" title={tr(lang, 'metric.dimWithGapsHint')}>
                <div className="metric-value" style={{ fontSize: '14px' }}>
                  {dimValue(variant.dimensions)}
                </div>
                <div className="metric-label">{tr(lang, 'metric.dimWithGaps')}, {unitLabel(lang, unit)}</div>
              </div>
            </>
          ) : (
            <div className="metric-card" title={tr(lang, 'metric.dimensionsHint')}>
              <div className="metric-value" style={{ fontSize: '14px' }}>
                {dimValue(variant.dimensions)}
              </div>
              <div className="metric-label">{tr(lang, 'metric.dimensions')}, {unitLabel(lang, unit)}</div>
            </div>
          )}
          <div className="metric-card">
            <div className="metric-value">{volumeToM3(cargoVolumeMm3, lang)}</div>
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
