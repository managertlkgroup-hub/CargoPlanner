import { Settings } from 'lucide-react';
// ============================================================================
// Модальное окно настроек расчёта
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { tr } from '../../i18n';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const lang = useAppStore((s) => s.lang);

  const [allowRotation, setAllowRotation] = useState(settings.allowRotation);

  const handleSave = () => {
    setSettings({ maxStackHeight: settings.maxStackHeight, allowRotation, gap: settings.gap ?? 0 });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3><Settings size={18} /> {tr(lang, 'settings.title')}</h3>
        <div className="form-row mb-2">
          <input
            type="checkbox"
            id="allow-rotation"
            checked={allowRotation}
            onChange={(e) => setAllowRotation(e.target.checked)}
          />
          <label htmlFor="allow-rotation" className="checkbox-label">{tr(lang, 'settings.allowRotation')}</label>
        </div>
        <div className="row row-end mt-2">
          <button className="btn" onClick={onClose}>{tr(lang, 'btn.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave}>{tr(lang, 'btn.save')}</button>
        </div>
      </div>
    </div>
  );
}