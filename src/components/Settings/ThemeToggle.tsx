// ============================================================================
// Переключатель тёмной/светлой темы
// ============================================================================

import type { Theme } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { tr } from '../../i18n';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  const lang = useAppStore((s) => s.lang);
  const title = theme === 'light' ? tr(lang, 'theme.dark') : tr(lang, 'theme.light');
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      title={title}
      aria-label={title}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}