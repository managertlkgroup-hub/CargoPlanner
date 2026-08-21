// ============================================================================
// Модальное окно управления сохранёнными сессиями
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  onClose: () => void;
}

export default function SessionModal({ onClose }: Props) {
  const sessions = useAppStore((s) => s.sessions);
  const saveSession = useAppStore((s) => s.saveSession);
  const loadSession = useAppStore((s) => s.loadSession);
  const deleteSession = useAppStore((s) => s.deleteSession);

  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    saveSession(name.trim());
    setName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>💾 Сессии</h3>
        <div className="row mb-2">
          <input
            type="text"
            value={name}
            placeholder="Имя сессии"
            style={{ flex: 1 }}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
          <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-muted">Сохранённых сессий нет.</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderBottom: '1px solid var(--border)',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="text-muted">
                    {s.vehicle.name} · {new Date(s.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <div className="row">
                  <button className="btn btn-sm btn-primary" onClick={() => { loadSession(s.id); onClose(); }}>
                    Загрузить
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteSession(s.id)}>
                    Удалить
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