// ============================================================================
// Вкладки для переключения вариантов раскладки (максимум 3)
// ============================================================================

import { useAppStore } from '../../store/useAppStore';
import { tr } from '../../i18n';

/** Ключи i18n для названий вариантов (по id) */
const LABEL_KEYS: Record<string, string> = {
  along: 'mode.along',
  across: 'mode.across',
  mixed: 'mode.mixed',
};

export default function VariantTabs() {
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const setActiveVariant = useAppStore((s) => s.setActiveVariant);
  const lang = useAppStore((s) => s.lang);

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
          {tr(lang, LABEL_KEYS[v.id] ?? 'mode.along')} · {v.volumeFill}%
        </button>
      ))}
    </div>
  );
}
