import { Settings } from 'lucide-react';
// ============================================================================
// Модальное окно настроек расчёта
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Unit } from '../../types';
import { UNIT_LABEL } from '../../utils/helpers';

interface Props {
  onClose: () => void;
}

const UNITS: Unit[] = ['mm', 'cm', 'm'];

export default function SettingsModal({ onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const unit = useAppStore((s) => s.unit);
  const setUnit = useAppStore((s) => s.setUnit);

  const [allowRotation, setAllowRotation] = useState(settings.allowRotation);

  const handleSave = () => {
    setSettings({ maxStackHeight: settings.maxStackHeight, allowRotation });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3><Settings size={18} /> Настройки</h3>
        <div className="form-row mb-2">
          <input
            type="checkbox"
            id="allow-rotation"
            checked={allowRotation}
            onChange={(e) => setAllowRotation(e.target.checked)}
          />
          <label htmlFor="allow-rotation" className="checkbox-label">Разрешить вращение грузов при упаковке</label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Единицы измерения:</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                className={`btn btn-sm ${unit === u ? 'btn-primary' : ''}`}
                onClick={() => setUnit(u)}
              >
                {UNIT_LABEL[u]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Единицы влияют на отображение и ввод размеров. Расчёты всегда выполняются в мм.
          </div>
        </div>
        <div className="row row-end mt-2">
          <button className="btn" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}