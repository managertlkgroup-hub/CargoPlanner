// ============================================================================
// Модальное окно управления сохранёнными сессиями
// ============================================================================

import { useState } from 'react';
import { Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { tr } from '../../i18n';

interface Props {
  onClose: () => void;
}

export default function SessionModal({ onClose }: Props) {
  const sessions = useAppStore((s) => s.sessions);
  const saveSession = useAppStore((s) => s.saveSession);
  const loadSession = useAppStore((s) => s.loadSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const lang = useAppStore((s) => s.lang);

  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    saveSession(name.trim());
    setName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3><Save size={16} /> {tr(lang, 'session.title')}</h3>
        <div className="row mb-2">
          <input
            type="text"
            value={name}
            placeholder={tr(lang, 'session.namePlaceholder')}
            className="input-flex"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
          <button className="btn btn-primary" onClick={handleSave}>{tr(lang, 'session.save')}</button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-muted">{tr(lang, 'session.empty')}</div>
        ) : (
          <div className="sessions-list">
            {sessions.map((s) => (
              <div key={s.id} className="session-item">
                <div>
                  <div className="session-name">{s.name}</div>
                  <div className="text-muted">
                    {s.vehicle.name} · {new Date(s.createdAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                  </div>
                </div>
                <div className="row">
                  <button className="btn btn-sm btn-primary" onClick={() => { loadSession(s.id); onClose(); }}>
                    {tr(lang, 'session.load')}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteSession(s.id)}>
                    {tr(lang, 'session.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}