// ============================================================================
// Шапка приложения: логотип, кнопки тем/сессий/отчётов
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generatePdfReport } from '../../lib/export/pdfExport';
import { exportSceneToPng } from '../../lib/export/pngExport';
import { getCurrentVehicle } from '../../store/useAppStore';
import { useActiveVariant } from '../../store/useAppStore';
import ThemeToggle from '../Settings/ThemeToggle';
import SessionModal from '../Settings/SessionModal';

interface HeaderProps {
  onOpenSettings: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const cargo = useAppStore((s) => s.cargo);
  const result = useAppStore((s) => s.result);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const setError = useAppStore((s) => s.setError);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
  const activeVariant = useActiveVariant();

  const [sessionOpen, setSessionOpen] = useState(false);

  const handlePdf = () => {
    if (!result || !activeVariant) {
      setError('Сначала выполните расчёт и выберите вариант раскладки.');
      return;
    }
    try {
      generatePdfReport(vehicle, cargo, activeVariant);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка формирования PDF');
    }
  };

  const handlePng = async () => {
    try {
      await exportSceneToPng('scene-3d', `load-scheme-${Date.now()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка экспорта PNG');
    }
  };

  return (
    <header className="app-header">
      <div className="app-logo">
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
          <rect x="4" y="16" width="56" height="32" rx="6" fill="#3b82f6" />
          <rect x="12" y="24" width="14" height="10" rx="2" fill="#ffffff" opacity="0.9" />
          <rect x="30" y="24" width="14" height="10" rx="2" fill="#ffffff" opacity="0.9" />
          <circle cx="20" cy="48" r="6" fill="#1f2937" />
          <circle cx="44" cy="48" r="6" fill="#1f2937" />
        </svg>
        <span>3D Планировщик загрузки</span>
      </div>

      <div className="header-actions">
        <button className="btn btn-sm" onClick={() => setSessionOpen(true)}>
          💾 Сессии
        </button>
        <button className="btn btn-sm" onClick={handlePng}>
          🖼 Экспорт PNG
        </button>
        <button className="btn btn-sm btn-primary" onClick={handlePdf}>
          📄 Отчёт PDF
        </button>
        <button className="btn btn-sm" onClick={onOpenSettings}>
          ⚙️ Настройки
        </button>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {sessionOpen && <SessionModal onClose={() => setSessionOpen(false)} />}
    </header>
  );
}