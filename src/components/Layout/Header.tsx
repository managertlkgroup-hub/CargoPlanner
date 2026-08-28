// ============================================================================
// Шапка приложения: логотип, кнопки тем/сессий/отчётов
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generatePdfWithReactPdf } from '../Report/PDFReport';
import { exportSceneToPng } from '../../lib/export/pngExport';
import { getCurrentVehicle } from '../../store/useAppStore';
import { useActiveVariant } from '../../store/useAppStore';
import { Package, Save, Image, FileText, Settings } from 'lucide-react';
import ThemeToggle from '../Settings/ThemeToggle';
import SessionModal from '../Settings/SessionModal';
import PresetsModal from '../Settings/PresetsModal';

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
  const [presetsOpen, setPresetsOpen] = useState(false);

  const handlePdf = async () => {
    if (!result || !activeVariant) {
      setError('Раскладка не рассчитана, рассчитайте сначала.');
      return;
    }
    try {
      await generatePdfWithReactPdf(vehicle, cargo, activeVariant);
    } catch (e) {

      setError(e instanceof Error ? e.message : 'Ошибка формирования PDF');
    }
  };

  const handlePng = async () => {
    try {
      await exportSceneToPng('scene-3d', `load-scheme-${Date.now()}`, vehicle, activeVariant ?? undefined);
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
        <button className="btn btn-sm" onClick={() => setPresetsOpen(true)}>
          <Package size={14} /> Пресеты
        </button>
        <button className="btn btn-sm" onClick={() => setSessionOpen(true)}>
          <Save size={14} /> Сессии
        </button>
        <button className="btn btn-sm" onClick={handlePng}>
          <Image size={14} /> Экспорт PNG
        </button>
        <button className="btn btn-sm btn-primary" onClick={handlePdf}>
          <FileText size={14} /> Отчёт PDF
        </button>
        <button className="btn btn-sm" onClick={onOpenSettings}>
          <Settings size={14} /> Настройки
        </button>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {sessionOpen && <SessionModal onClose={() => setSessionOpen(false)} />}
      {presetsOpen && <PresetsModal onClose={() => setPresetsOpen(false)} />}
    </header>
  );
}