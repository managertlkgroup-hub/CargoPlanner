// ============================================================================
// Нижний колонтитул приложения
// ============================================================================

import { useAppStore } from '../../store/useAppStore';
import { tr } from '../../i18n';

export default function Footer() {
  const lang = useAppStore((s) => s.lang);
  return (
    <footer className="app-footer">
      {tr(lang, 'footer.text')}
    </footer>
  );
}