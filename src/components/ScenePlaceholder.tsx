import React from 'react';
import { Calculator } from 'lucide-react';
import { tr, type Lang } from '../i18n';

interface ScenePlaceholderProps {
  lang: Lang;
  /** Иконка (lucide-react), уже заданного размера */
  icon: React.ReactNode;
  /** Крупный заголовок на текущем языке */
  title: string;
  /** Показывать кнопку «Рассчитать» */
  showCalculate?: boolean;
  onCalculate?: () => void;
}

/** Общий красивый placeholder для 2D и 3D сцен до выполнения расчёта */
const ScenePlaceholder: React.FC<ScenePlaceholderProps> = ({ lang, icon, title, showCalculate, onCalculate }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 260,
        background: 'var(--bg-input)',
        borderRadius: 8,
        border: '1px dashed var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ color: 'var(--color-accent)' }}>{icon}</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{title}</div>
        {showCalculate && (
          <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onCalculate}>
            <Calculator size={16} /> {tr(lang, 'btn.calculate')}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScenePlaceholder;