import { useMemo } from 'react';
import { useActiveVariant } from '../../store/useAppStore';
import { formatNumber, volumeToM3 } from '../../utils/helpers';

export default function MetricsPanel() {
  const variant = useActiveVariant();
  if (!variant) return null;

  // Подсчёт количества слоёв
  const layerCount = useMemo(() => {
    if (!variant || variant.items.length === 0) return 0;
    const layers = new Set<number>();
    variant.items.forEach((item) => {
      const layer = Math.round(item.position.y / Math.max(1, item.dimensions.height));
      layers.add(layer);
    });
    return layers.size;
  }, [variant]);

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
    </div>
  );
}