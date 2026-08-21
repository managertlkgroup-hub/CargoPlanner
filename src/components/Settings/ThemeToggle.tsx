// ============================================================================
// Переключатель тёмной/светлой темы
// ============================================================================

import type { Theme } from '../../types';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      className="btn btn-sm"
      onClick={onToggle}
      title={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}