// ============================================================================
// Панель метрик текущего варианта раскладки
// ============================================================================

import { useActiveVariant } from '../../store/useAppStore';
import { volumeToM3, formatNumber } from '../../utils/helpers';

export default function MetricsPanel() {
  const variant = useActiveVariant();
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
        <div className="metric-label">Суммарный вес, кг</div>
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
        <div className="metric-label">Размещено грузов</div>
      </div>
    </div>
  );
}