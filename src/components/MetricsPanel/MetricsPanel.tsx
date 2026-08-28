import { useMemo } from 'react';
import { useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import { formatNumber, volumeToM3 } from '../../utils/helpers';
import { calculateCOG } from '../../lib/physics/cog';

export default function MetricsPanel() {
  // Все хуки ДО любого раннего возврата
  const variant = useActiveVariant();

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

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-value">{variant.volumeFill}%</div>
        <div className="metric-label">Заполнение объёма</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{variant.weightFill}%</div>
        <div className="metric-label">Заполнение по весу</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{formatNumber(variant.totalWeight)}</div>
        <div className="metric-label">Вес, кг</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{volumeToM3(variant.freeVolume)}</div>
        <div className="metric-label">Свободный объём</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{formatNumber(variant.freeWeight)}</div>
        <div className="metric-label">Свободный вес, кг</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{variant.items.length}</div>
        <div className="metric-label">Размещено, шт</div>
      </div>
      {layerCount > 1 && (
        <div className="metric-card">
          <div className="metric-value">{layerCount}</div>
          <div className="metric-label">Слоёв штабеля</div>
        </div>
      )}
      {cargoDimensions && (
        <>
          <div className="metric-card">
            <div className="metric-value" style={{ fontSize: '14px' }}>
              {cargoDimensions.length}×{cargoDimensions.width}×{cargoDimensions.height}
            </div>
            <div className="metric-label">Габариты, мм</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{cargoDimensions.volume} м³</div>
            <div className="metric-label">Объём груза</div>
          </div>
        </>
      )}
      {cog && (
        <div className="metric-card" style={{ gridColumn: 'span 3' }}>
          <div className={`metric-value ${cog.status === 'ok' ? 'cog-status-ok' : cog.status === 'warning' ? 'cog-status-warning' : 'cog-status-danger'}`} style={{ fontSize: 14 }}>
            {cog.status === 'ok' ? '✅' : cog.status === 'warning' ? '⚠️' : '❌'} Баланс загрузки
          </div>
          <div className="metric-label">
            {cog.status === 'danger'
              ? `Сильный перевес влево/вправо (${Math.abs(Math.round(cog.z - vehicle.width / 2))} мм). Распределите грузы равномернее!`
              : cog.status === 'warning'
                ? `Грузы смещены от центра по ширине на ${Math.abs(Math.round(cog.z - vehicle.width / 2))} мм — рекомендуется выровнять`
                : `Грузы распределены равномерно (смещение ${Math.abs(Math.round(cog.z - vehicle.width / 2))} мм)`
            }
          </div>
          <div className="metric-label" style={{ fontSize: 10, marginTop: 2 }}>
            Неравномерная загрузка влияет на устойчивость автомобиля при движении и торможении.
          </div>
        </div>
      )}
      {oversizeCount > 0 && (
        <div className="metric-card">
          <div className="metric-value" style={{ color: 'var(--color-danger)', fontSize: 14 }}>⚠️ Негабарит</div>
          <div className="metric-label">Грузов: {oversizeCount}</div>
        </div>
      )}
    </div>
  );
}