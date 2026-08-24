// ============================================================================
// Вкладки для переключения вариантов раскладки (максимум 3)
// ============================================================================

import { useAppStore } from '../../store/useAppStore';

/** Отображаемые названия вариантов (по id) */
const LABELS: Record<string, string> = {
  along: 'Вдоль',
  across: 'Поперёк',
  mixed: 'Смешанный',
};

export default function VariantTabs() {
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const setActiveVariant = useAppStore((s) => s.setActiveVariant);

  if (!result || result.variants.length === 0) return null;

  // Показываем только первые три варианта
  const variants = result.variants.slice(0, 3);

  return (
    <div className="variant-tabs">
      {variants.map((v) => (
        <button
          key={v.id}
          className={`variant-tab ${v.id === activeVariant ? 'active' : ''}`}
          onClick={() => setActiveVariant(v.id)}
        >
          {LABELS[v.id] ?? v.label} · {v.volumeFill}%
        </button>
      ))}
    </div>
  );
}