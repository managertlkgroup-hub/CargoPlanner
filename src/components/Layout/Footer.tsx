// ============================================================================
// Нижний колонтитул приложения
// ============================================================================

export default function Footer() {
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '10px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      3D Планировщик загрузки · React + Three.js · Данные хранятся локально в вашем браузере
    </footer>
  );
}