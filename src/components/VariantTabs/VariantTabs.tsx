// ============================================================================
// Вкладки для переключения вариантов раскладки
// ============================================================================

import { useAppStore } from '../../store/useAppStore';

export default function VariantTabs() {
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const setActiveVariant = useAppStore((s) => s.setActiveVariant);

  if (!result || result.variants.length === 0) return null;

  return (
    <div className="variant-tabs">
      {result.variants.map((v) => (
        <button
          key={v.id}
          className={`variant-tab ${v.id === activeVariant ? 'active' : ''}`}
          onClick={() => setActiveVariant(v.id)}
        >
          {v.label} · {v.volumeFill}%
        </button>
      ))}
    </div>
  );
}