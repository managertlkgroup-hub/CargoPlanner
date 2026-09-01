// ============================================================================
// Шапка приложения: логотип, компактные dropdown (ед. измерения, вес, язык),
// кнопки тем/сессий/отчётов
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { exportSceneToPng } from '../../lib/export/pngExport';
import { getCurrentVehicle } from '../../store/useAppStore';
import { useActiveVariant } from '../../store/useAppStore';
import { Package, Save, Image, FileText, Settings, ChevronDown, Globe } from 'lucide-react';
import ThemeToggle from '../Settings/ThemeToggle';
import SessionModal from '../Settings/SessionModal';
import PresetsModal from '../Settings/PresetsModal';
import type { Unit } from '../../types';
import { unitLabel, weightUnitLabel, type WeightUnit } from '../../utils/helpers';
import { LANGS, tr, type Lang } from '../../i18n';

const UNITS: Unit[] = ['mm', 'cm', 'm'];
const WEIGHT_UNITS: WeightUnit[] = ['kg', 'ton'];
const FLAGS: Record<Lang, string> = { ru: '🇷🇺', en: '🇺🇸' };
const LANG_FULL: Record<Lang, string> = { ru: 'Русский', en: 'English' };

interface MenuOption<T extends string> {
  value: T;
  label: string;
}

interface MenuProps<T extends string> {
  title: string;
  current: T;
  options: MenuOption<T>[];
  onSelect: (v: T) => void;
}

function Menu<T extends string>({ title, current, options, onSelect }: MenuProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const curOption = options.find((o) => o.value === current);

  return (
    <div className="settings-menu" ref={ref}>
      <button
        type="button"
        className="settings-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        title={title}
      >
        <span className="settings-menu-title">{title}</span>
        <span className="settings-menu-current">{curOption?.label}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="settings-menu-panel">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`settings-menu-item ${o.value === current ? 'active' : ''}`}
              onClick={() => { onSelect(o.value); setOpen(false); }}
            >
              <span>{o.label}</span>
              {o.value === current && <span className="settings-menu-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const unit = useAppStore((s) => s.unit);
  const setUnit = useAppStore((s) => s.setUnit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const setWeightUnit = useAppStore((s) => s.setWeightUnit);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
  const activeVariant = useActiveVariant();

  const [sessionOpen, setSessionOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const handlePdf = async () => {
    if (!result || !activeVariant) {
      setError(tr(lang, 'err.calcFirst'));
      return;
    }
    try {
      const { generatePdfWithReactPdf } = await import('../Report/PDFReport');
      await generatePdfWithReactPdf(vehicle, cargo, activeVariant, weightUnit, lang);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr(lang, 'err.pdf'));
    }
  };

  const handlePng = async () => {
    try {
      await exportSceneToPng('scene-3d', `load-scheme-${Date.now()}`, vehicle, activeVariant ?? undefined, weightUnit, lang);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr(lang, 'err.png'));
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
        <span>{tr(lang, 'app.title')}</span>
      </div>

      <div className="header-actions">
        <div className="settings-menus">
          <Menu<Unit>
            title={tr(lang, 'units.dim')}
            current={unit}
            options={UNITS.map((u) => ({ value: u, label: unitLabel(lang, u) }))}
            onSelect={setUnit}
          />
          <Menu<WeightUnit>
            title={tr(lang, 'units.weight')}
            current={weightUnit}
            options={WEIGHT_UNITS.map((u) => ({ value: u, label: weightUnitLabel(lang, u) }))}
            onSelect={setWeightUnit}
          />
          <Menu<Lang>
            title={tr(lang, 'units.lang')}
            current={lang}
            options={LANGS.map((l) => ({ value: l, label: `${FLAGS[l]} ${LANG_FULL[l]}` }))}
            onSelect={setLang}
          />
          <span className="settings-menu-globe" title={tr(lang, 'units.title')}>
            <Globe size={14} />
          </span>
        </div>
        <button className="btn btn-sm" onClick={() => setPresetsOpen(true)}>
          <Package size={14} /> {tr(lang, 'btn.presets')}
        </button>
        <button className="btn btn-sm" onClick={() => setSessionOpen(true)}>
          <Save size={14} /> {tr(lang, 'btn.sessions')}
        </button>
        <button className="btn btn-sm" onClick={handlePng}>
          <Image size={14} /> {tr(lang, 'btn.png')}
        </button>
        <button className="btn btn-sm btn-primary" onClick={handlePdf}>
          <FileText size={14} /> {tr(lang, 'btn.pdf')}
        </button>
        <button className="btn btn-sm" onClick={onOpenSettings}>
          <Settings size={14} /> {tr(lang, 'btn.settings')}
        </button>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {sessionOpen && <SessionModal onClose={() => setSessionOpen(false)} />}
      {presetsOpen && <PresetsModal onClose={() => setPresetsOpen(false)} />}
    </header>
  );
}
