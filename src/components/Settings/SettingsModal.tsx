// ============================================================================
// Модальное окно настроек расчёта
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  const [allowRotation, setAllowRotation] = useState(settings.allowRotation);

  const handleSave = () => {
    setSettings({ maxStackHeight: settings.maxStackHeight, allowRotation });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>⚙️ Настройки расчёта</h3>
        <div className="form-row mb-2">
          <input
            type="checkbox"
            id="allow-rotation"
            checked={allowRotation}
            onChange={(e) => setAllowRotation(e.target.checked)}
          />
          <label htmlFor="allow-rotation" className="checkbox-label">Разрешить вращение грузов при упаковке</label>
        </div>
        <div className="row row-end mt-2">
          <button className="btn" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}