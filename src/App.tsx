import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore, getCurrentVehicle } from './store/useAppStore';
import { packItems, canFitAll } from './lib/packer/packer';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import VehicleSelector from './components/VehicleSelector/VehicleSelector';
import CargoTable from './components/CargoTable/CargoTable';
import Scene3D from './components/Scene3D/Scene3D';
import { Search, ClipboardList, Package, Box, Grid3x3, Lightbulb, Truck, Settings, ChevronDown, ChevronRight, X } from 'lucide-react';
import Scene2D from './components/Scene2D/Scene2D';
import VariantTabs from './components/VariantTabs/VariantTabs';
import MetricsPanel from './components/MetricsPanel/MetricsPanel';
import SettingsModal from './components/Settings/SettingsModal';
import ReportButton from './components/Report/ReportButton';
import VehicleVisibilityControls from './components/VehicleSelector/VehicleVisibilityControls';
import VehicleMatcher from './components/VehicleSelector/VehicleMatcher';
import { VehicleDetailsPanel, CargoDetailsPanel } from './components/PresetDetails/PresetDetailsPanel';
import { generateSuggestions, type PackingSuggestion } from './lib/packer/suggestions';
import { formatDimension, toUnit, fromUnit, UNIT_LABEL, nameOf } from './utils/helpers';
import type { Unit, PackSettings } from './types';
import { tr, trf } from './i18n';

const toUnitDisplay = (mm: number, unit: Unit) => formatDimension(mm, unit);

/** Строка настройки одного зазора: чекбокс включения + числовое поле с учётом единиц (на одной строке) */
const GapRow: React.FC<{
  id: string;
  lang: ReturnType<typeof useAppStore.getState>['lang'];
  unit: Unit;
  checked: boolean;
  label: string;
  valueMm: number;
  onChange: (mm: number) => void;
}> = ({ id, unit, checked, label, valueMm, onChange }) => {
  const step = unit === 'mm' ? 1 : unit === 'cm' ? 0.5 : 0.05;
  const value = Number(toUnit(valueMm || 50, unit).toFixed(unit === 'm' ? 2 : 1));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked ? (valueMm || 50) : 0)}
      />
      <label htmlFor={id} style={{ fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 0 }}>{label}</label>
      {checked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            min="0"
            step={step}
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v >= 0) onChange(fromUnit(v, unit));
            }}
            style={{ width: 70, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{UNIT_LABEL[unit]}</span>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const cargo = useAppStore((s) => s.cargo);
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const settings = useAppStore((s) => s.settings);
  const isCalculating = useAppStore((s) => s.isCalculating);
  const unit = useAppStore((s) => s.unit);
  const lang = useAppStore((s) => s.lang);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);

  const setResult = useAppStore((s) => s.setResult);
  const setPristine = useAppStore((s) => s.setPristine);
  const setActiveVariant = useAppStore((s) => s.setActiveVariant);
  const setCalculating = useAppStore((s) => s.setCalculating);
  const setSettings = useAppStore((s) => s.setSettings);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [matcherOpen, setMatcherOpen] = useState(false);
  const [detailsVehicleId, setDetailsVehicleId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vehicleSectionOpen, setVehicleSectionOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('cp.vehicleSectionOpen') === '1' ? true : false; } catch { return false; }
  });
  const [cargoSectionOpen, setCargoSectionOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('cp.cargoSectionOpen') === '1' ? true : false; } catch { return false; }
  });
  const [controlSectionOpen, setControlSectionOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('cp.controlSectionOpen') !== '0'; } catch { return true; }
  });
  const [detailsCargoId, setDetailsCargoId] = useState<string | null>(null);

  // Последнее «рабочее» состояние (все грузы помещаются) — нужно, чтобы
  // заблокировать увеличение зазора сверх допустимого (откат + тост).
  const prevGoodSettingsRef = useRef<PackSettings | null>(null);
  const prevGoodResultRef = useRef<ReturnType<typeof packItems> | null>(null);

  const [activeView, setActiveView] = useState<'3d' | '2d'>('2d');
  const [stacking, setStacking] = useState(settings.maxStackHeight > 0);

  // Синхронизация чекбокса с настройками
  useEffect(() => {
    setStacking(settings.maxStackHeight > 0);
  }, [settings.maxStackHeight]);

  // Пересчёт при смене активного режима раскладки (вдоль / поперёк / смешанный):
  // гарантирует, что зазоры и штабелирование корректно применяются для выбранного
  // режима. Режим не «откатывается» как при редактировании зазора — пользователь
  // должен видеть раскладку выбранного режима даже если в нём помещается меньше.
  const prevActiveVariantRef = useRef<string | null>(activeVariant);
  useEffect(() => {
    if (prevActiveVariantRef.current === activeVariant) return;
    prevActiveVariantRef.current = activeVariant;
    if (cargo.length > 0 && (settings.gapsEnabled || stacking)) {
      const veh = getCurrentVehicle(selectedVehicleId, customVehicles);
      recalcWithSettings(veh, settings, false);
    }
  }, [activeVariant]);

  // Одноразовая миграция старого единого зазора (gap) в три независимых
  const migratedGaps = useRef(false);
  useEffect(() => {
    if (migratedGaps.current) return;
    migratedGaps.current = true;
    const s = useAppStore.getState().settings;
    if ((s.gap ?? 0) > 0 && s.gapWalls === undefined && s.gapWidth === undefined && s.gapLength === undefined) {
      setSettings({ ...s, gap: 0, gapWalls: s.gap, gapWidth: s.gap, gapLength: s.gap });
    }
  }, [setSettings]);

  // Авто-скрытие всплывающей ошибки через 3 сек с плавным затуханием
  const [toastLeaving, setToastLeaving] = useState(false);
  useEffect(() => {
    if (!error) {
      setToastLeaving(false);
      return;
    }
    setToastLeaving(false);
    const t1 = setTimeout(() => setToastLeaving(true), 2800);
    const t2 = setTimeout(() => setError(null), 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [error]);

  // Общий пересчёт с заданными настройками (используется для штабелирования и зазора)
  const recalcWithSettings = (veh: ReturnType<typeof getCurrentVehicle>, nextSettings: PackSettings, isGapEdit = false) => {
    setSettings(nextSettings);
    if (cargo.length > 0 && veh) {
      setCalculating(true);
      try {
        const result = packItems(veh, cargo, nextSettings, loadingPoints);
        if (!result.error) {
          const totalQty = cargo.reduce((sum, c) => sum + Math.max(1, Math.floor(c.quantity || 1)), 0);
          // Оцениваем по режиму, который сейчас выбран пользователем (вдоль/поперёк/смешанный),
          // чтобы откат зазора не блокировал режим, в котором грузы реально помещаются.
          const activeMode = useAppStore.getState().activeVariant;
          const activeVariant = result.variants.find((v) => v.id === activeMode) ?? result.variants[0];
          const placedQty = activeVariant?.items?.length ?? 0;

          // Блокировка превышения применима ТОЛЬКО когда пользователь меняет значения зазора.
          // Если грузы не поместились по другой причине (напр. выключено штабелирование) —
          // откатывать настройку и показывать тост про зазор нельзя.
          if (isGapEdit && totalQty > 0 && placedQty < totalQty && prevGoodResultRef.current && prevGoodSettingsRef.current) {
            const goodSettings = prevGoodSettingsRef.current;
            const goodResult = prevGoodResultRef.current;
            setResult(goodResult);
            const pristineMap: Record<string, typeof goodResult.variants[number]['items']> = {};
            goodResult.variants.forEach((v) => { pristineMap[v.id] = v.items; });
            setPristine(pristineMap);
            setActiveVariant(useAppStore.getState().activeVariant && goodResult.variants.some(v => v.id === useAppStore.getState().activeVariant)
              ? useAppStore.getState().activeVariant : goodResult.variants[0].id);
            // Через setSettings откатываем именно то значение, которое превысило допустимое
            setSettings(goodSettings);
            const maxVal = Math.max(
              goodSettings.gapWalls ?? 0,
              goodSettings.gapWidth ?? 0,
              goodSettings.gapLength ?? 0,
            );
            const maxStr = formatDimension(maxVal, unit);
            setError(trf(lang, 'gaps.gapTooBig', { max: maxStr, u: UNIT_LABEL[unit] }));
            return;
          }

          setResult(result);
          const pristineMap: Record<string, typeof result.variants[number]['items']> = {};
          result.variants.forEach((v) => { pristineMap[v.id] = v.items; });
          setPristine(pristineMap);
          const cur = useAppStore.getState().activeVariant;
          const keep = cur && result.variants.some(v => v.id === cur) ? cur : result.variants[0].id;
          setActiveVariant(keep);

          // Запоминаем как рабочее состояние каждый раз, когда packer не вернул ошибку
          // (даже если не все грузы поместились — это лучше, чем состояние с ошибкой).
          prevGoodSettingsRef.current = nextSettings;
          prevGoodResultRef.current = result;
        } else if (isGapEdit && prevGoodResultRef.current && prevGoodSettingsRef.current) {
          // packItems вернул ошибку (напр. слишком большой зазор → отрицательное пространство)
          // при редактировании зазора — откатываем к последнему рабочему состоянию.
          const goodSettings = prevGoodSettingsRef.current;
          const goodResult = prevGoodResultRef.current;
          setResult(goodResult);
          const pristineMap: Record<string, typeof goodResult.variants[number]['items']> = {};
          goodResult.variants.forEach((v) => { pristineMap[v.id] = v.items; });
          setPristine(pristineMap);
          setActiveVariant(useAppStore.getState().activeVariant && goodResult.variants.some(v => v.id === useAppStore.getState().activeVariant)
            ? useAppStore.getState().activeVariant : goodResult.variants[0].id);
          setSettings(goodSettings);
          const maxVal = Math.max(
            goodSettings.gapWalls ?? 0,
            goodSettings.gapWidth ?? 0,
            goodSettings.gapLength ?? 0,
          );
          const maxStr = formatDimension(maxVal, unit);
          setError(trf(lang, 'gaps.gapTooBig', { max: maxStr, u: UNIT_LABEL[unit] }));
          return;
        }
      } catch (err) { /* пересчёт зазора */ }
      finally { setCalculating(false); }
    }
  };

  // Сохранение состояния секций левой панели в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cp.vehicleSectionOpen', vehicleSectionOpen ? '1' : '0');
    } catch { /* ignore */ }
  }, [vehicleSectionOpen]);
  useEffect(() => {
    try {
      localStorage.setItem('cp.cargoSectionOpen', cargoSectionOpen ? '1' : '0');
    } catch { /* ignore */ }
  }, [cargoSectionOpen]);
  useEffect(() => {
    try {
      localStorage.setItem('cp.controlSectionOpen', controlSectionOpen ? '1' : '0');
    } catch { /* ignore */ }
  }, [controlSectionOpen]);

  // Сброс результатов при смене автомобиля
  useEffect(() => {
    setResult(null);
    setActiveVariant(null);
  }, [selectedVehicleId, setResult, setActiveVariant]);

  const handleCalculate = () => {
    if (cargo.length === 0) {
      setError(tr(lang, 'err.calculateEmpty'));
      return;
    }
    const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
    setCalculating(true);
    try {
      const result = packItems(vehicle, cargo, settings, loadingPoints);
      if (result.error) {
        setError(result.error);
        setResult(null);
        setActiveVariant(null);
        return;
      }
      setResult(result);
      const pristineMap: Record<string, typeof result.variants[number]['items']> = {};
      result.variants.forEach((v) => {
        pristineMap[v.id] = v.items;
      });
      prevGoodSettingsRef.current = settings;
      prevGoodResultRef.current = result;
      setPristine(pristineMap);
      // Preserve active variant if it still exists in new results
      const currentActive = useAppStore.getState().activeVariant;
      const preserved = currentActive && result.variants.some(v => v.id === currentActive)
        ? currentActive
        : result.variants[0].id;
      setActiveVariant(preserved);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr(lang, 'err.calculate'));
    } finally {
      setCalculating(false);
    }
  };

  // Кнопка «Рассчитать» из placeholder сцен 2D/3D (событие cp:calculate)
  const handleCalculateRef = useRef<() => void>(() => {});
  handleCalculateRef.current = handleCalculate;
  useEffect(() => {
    const handler = () => handleCalculateRef.current();
    window.addEventListener('cp:calculate', handler);
    return () => window.removeEventListener('cp:calculate', handler);
  }, []);

  return (
    <div className="app-root">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="app-layout flex-1">
        <div className="left-panel">
          {/* Секция «Автомобиль» */}
          <div className="accordion-section">
            <button className="accordion-toggle" onClick={() => {
              const next = !vehicleSectionOpen;
              setVehicleSectionOpen(next);
              if (next) setCargoSectionOpen(false);
            }}>
              <span>
                <Truck size={14} /> {tr(lang, 'section.vehicle')}
                {!vehicleSectionOpen && vehicle && (
                  <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                    — {nameOf(vehicle, lang)} ({toUnitDisplay(vehicle.length, unit)}×{toUnitDisplay(vehicle.width, unit)}×{toUnitDisplay(vehicle.height, unit)})
                  </span>
                )}
              </span>
              <span>{vehicleSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            </button>
            {vehicleSectionOpen && (
              <div className="accordion-content">
                <VehicleSelector />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => setDetailsVehicleId(selectedVehicleId)}><ClipboardList size={14} /> {tr(lang, 'btn.details')}</button>
                </div>
              </div>
            )}
          </div>

          {/* Секция «Грузы» */}
          <div className="accordion-section">
            <button className="accordion-toggle" onClick={() => {
              const next = !cargoSectionOpen;
              setCargoSectionOpen(next);
              if (next) setVehicleSectionOpen(false);
            }}>
              <span><Package size={14} /> {tr(lang, 'section.cargo')} ({cargo.length})</span>
              <span>{cargoSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            </button>
            {cargoSectionOpen && (
              <div className="cargo-section">
                <CargoTable onCargoDetails={setDetailsCargoId} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => setMatcherOpen(true)}><Search size={14} /> {tr(lang, 'btn.findVehicle')}</button>
                </div>
              </div>
            )}
          </div>

          {/* Секция «Управление» */}
          <div className="accordion-section">
            <button className="accordion-toggle" onClick={() => setControlSectionOpen(!controlSectionOpen)}>
              <span><Settings size={14} /> {tr(lang, 'section.control')}</span>
              <span>{controlSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            </button>
            {controlSectionOpen && (
              <div className="accordion-content">
                <button
                  onClick={handleCalculate}
                  disabled={isCalculating || cargo.length === 0}
                  className="btn btn-primary btn-calculate"
                >
                  {isCalculating ? tr(lang, 'btn.calculating') : tr(lang, 'btn.calculate')}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    id="stacking-toggle"
                    checked={stacking}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const veh = getCurrentVehicle(selectedVehicleId, customVehicles);
                      if (checked && cargo.length > 0 && veh) {
                        const gaps = {
                          walls: settings.gapsEnabled ? (settings.gapWalls ?? 0) : 0,
                          width: settings.gapsEnabled ? (settings.gapWidth ?? 0) : 0,
                          length: settings.gapsEnabled ? (settings.gapLength ?? 0) : 0,
                        };
                        const check = canFitAll(veh, cargo, gaps, true);
                        if (!check.ok) {
                          setStacking(false);
                          setError(trf(lang, 'stacking.cannotEnable', { reason: check.reason }));
                          return;
                        }
                      }
                      setStacking(checked);
                      const newMaxH = checked ? veh.height : 0;
                      recalcWithSettings(veh, { ...settings, maxStackHeight: newMaxH });
                    }}
                  />
                  <label htmlFor="stacking-toggle" style={{ fontSize: 13, color: 'var(--text)' }}>
                    <Box size={14} /> {tr(lang, 'stacking')}
                  </label>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {tr(lang, 'stacking.hint')}
                  </span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      id="gaps-master-toggle"
                      checked={settings.gapsEnabled}
                      onChange={(e) => {
                        const next = e.target.checked;
                        const veh = getCurrentVehicle(selectedVehicleId, customVehicles);
                        if (next && cargo.length > 0 && veh) {
                          const testGaps = {
                            walls: settings.gapWalls || 50,
                            width: settings.gapWidth || 50,
                            length: settings.gapLength || 50,
                          };
                          const check = canFitAll(veh, cargo, testGaps, stacking);
                          if (!check.ok) {
                            setError(trf(lang, 'gaps.cannotEnable', { reason: check.reason }));
                            return;
                          }
                        }
                        const newSettings: PackSettings = next
                          ? { ...settings, gapsEnabled: true, gap: 0, gapWalls: settings.gapWalls || 50, gapWidth: settings.gapWidth || 50, gapLength: settings.gapLength || 50 }
                          : { ...settings, gapsEnabled: false, gap: 0, gapWalls: 0, gapWidth: 0, gapLength: 0 };
                        recalcWithSettings(veh, newSettings, true);
                      }}
                    />
                    <label htmlFor="gaps-master-toggle" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                      <Grid3x3 size={14} /> {tr(lang, 'gap')}
                    </label>
                  </div>
                  {settings.gapsEnabled && (
                    <>
                      <GapRow
                        id="gap-walls-toggle"
                        lang={lang}
                        unit={unit}
                        checked={(settings.gapWalls ?? 0) > 0}
                        label={tr(lang, 'gaps.walls')}
                        valueMm={settings.gapWalls ?? 0}
                        onChange={(v) => recalcWithSettings(getCurrentVehicle(selectedVehicleId, customVehicles), { ...settings, gap: 0, gapWalls: v }, true)}
                      />
                      <GapRow
                        id="gap-width-toggle"
                        lang={lang}
                        unit={unit}
                        checked={(settings.gapWidth ?? 0) > 0}
                        label={tr(lang, 'gaps.width')}
                        valueMm={settings.gapWidth ?? 0}
                        onChange={(v) => recalcWithSettings(getCurrentVehicle(selectedVehicleId, customVehicles), { ...settings, gap: 0, gapWidth: v }, true)}
                      />
                      <GapRow
                        id="gap-length-toggle"
                        lang={lang}
                        unit={unit}
                        checked={(settings.gapLength ?? 0) > 0}
                        label={tr(lang, 'gaps.length')}
                        valueMm={settings.gapLength ?? 0}
                        onChange={(v) => recalcWithSettings(getCurrentVehicle(selectedVehicleId, customVehicles), { ...settings, gap: 0, gapLength: v }, true)}
                      />
                    </>
                  )}
                </div>
                <VehicleVisibilityControls vehicleId={selectedVehicleId} />
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <VariantTabs />
          <MetricsPanel />
          <SuggestionsPanel show={showSuggestions} onToggle={() => setShowSuggestions(!showSuggestions)} />
          
          {/* Переключение между 3D и 2D видом */}
          <div className="view-tabs mb-2">
            <button
              type="button"
              className={`view-tab ${activeView === '2d' ? 'active' : ''}`}
              onClick={() => setActiveView('2d')}
            >
              <Grid3x3 size={14} /> {tr(lang, 'view.2d')}
            </button>
            <button
              type="button"
              className={`view-tab ${activeView === '3d' ? 'active' : ''}`}
              onClick={() => setActiveView('3d')}
            >
              <Box size={14} /> {tr(lang, 'view.3d')}
            </button>
          </div>
          
          <div className="scene-container" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, visibility: activeView === '3d' ? 'visible' : 'hidden', pointerEvents: activeView === '3d' ? 'auto' : 'none' }}>
              <Scene3D />
            </div>
            <div style={{ position: 'absolute', inset: 0, visibility: activeView === '2d' ? 'visible' : 'hidden', pointerEvents: activeView === '2d' ? 'auto' : 'none' }}>
              <Scene2D />
            </div>
          </div>
          
          <ReportButton />
        </div>
      </main>

      {error && (
        <div className={`error-toast ${toastLeaving ? 'error-toast-hiding' : ''}`}>
          <div className="error-toast-content">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="error-toast-close"
              aria-label={tr(lang, 'aria.close')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <Footer />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {matcherOpen && <VehicleMatcher onClose={() => setMatcherOpen(false)} />}
      {detailsVehicleId && <VehicleDetailsPanel vehicleId={detailsVehicleId} onClose={() => setDetailsVehicleId(null)} />}
      {detailsCargoId && <CargoDetailsPanel cargoId={detailsCargoId} onClose={() => setDetailsCargoId(null)} />}
    </div>
  );
};

/** Suggestions panel sub-component */
function SuggestionsPanel({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  const vehicle = useAppStore((s) => getCurrentVehicle(s.selectedVehicleId, s.customVehicles));
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const unit = useAppStore((s) => s.unit);
  const lang = useAppStore((s) => s.lang);

  const suggestions: PackingSuggestion[] = useMemo(() => {
    if (!result) return [];
    return generateSuggestions(result, vehicle, activeVariant, unit, lang);
  }, [result, vehicle, activeVariant, unit, lang]);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ flexShrink: 0 }}>
      <button className="btn btn-sm w-full" onClick={onToggle} style={{ marginBottom: 4 }}>
        <Lightbulb size={14} /> {tr(lang, 'suggestions.title')} ({suggestions.length}) {show ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {show && (
        <div className="suggestions-list">
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="suggestion-item">
                <span className="suggestion-icon"><Icon size={16} /></span>
                <span>{s.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;