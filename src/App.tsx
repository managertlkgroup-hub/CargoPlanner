import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore, getCurrentVehicle } from './store/useAppStore';
import { packItems } from './lib/packer/packer';
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
import { formatDimension } from './utils/helpers';
import type { Unit } from './types';

const toUnitDisplay = (mm: number, unit: Unit) => formatDimension(mm, unit);

const App: React.FC = () => {
  const cargo = useAppStore((s) => s.cargo);
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const settings = useAppStore((s) => s.settings);
  const isCalculating = useAppStore((s) => s.isCalculating);
  const unit = useAppStore((s) => s.unit);
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

  const [activeView, setActiveView] = useState<'3d' | '2d'>('2d');
  const [stacking, setStacking] = useState(settings.maxStackHeight > 0);

  // Синхронизация чекбокса с настройками
  useEffect(() => {
    setStacking(settings.maxStackHeight > 0);
  }, [settings.maxStackHeight]);

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
      setError('Добавьте хотя бы один груз перед расчётом.');
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
      setPristine(pristineMap);
      // Preserve active variant if it still exists in new results
      const currentActive = useAppStore.getState().activeVariant;
      const preserved = currentActive && result.variants.some(v => v.id === currentActive)
        ? currentActive
        : result.variants[0].id;
      setActiveVariant(preserved);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при расчёте раскладки');
    } finally {
      setCalculating(false);
    }
  };

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
                <Truck size={14} /> Автомобиль
                {!vehicleSectionOpen && vehicle && (
                  <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                    — {vehicle.name} ({toUnitDisplay(vehicle.length, unit)}×{toUnitDisplay(vehicle.width, unit)}×{toUnitDisplay(vehicle.height, unit)})
                  </span>
                )}
              </span>
              <span>{vehicleSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            </button>
            {vehicleSectionOpen && (
              <div className="accordion-content">
                <VehicleSelector />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => setDetailsVehicleId(selectedVehicleId)}><ClipboardList size={14} /> Детали</button>
                </div>
              </div>
            )}
          </div>

          {/* Секция «Грузы» */}
          <div className="accordion-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <button className="accordion-toggle" onClick={() => {
              const next = !cargoSectionOpen;
              setCargoSectionOpen(next);
              if (next) setVehicleSectionOpen(false);
            }}>
              <span><Package size={14} /> Грузы ({cargo.length})</span>
              <span>{cargoSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            </button>
            {cargoSectionOpen && (
              <div className="cargo-section">
                <CargoTable onCargoDetails={setDetailsCargoId} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => setMatcherOpen(true)}><Search size={14} /> Подобрать авто</button>
                </div>
              </div>
            )}
          </div>

          {/* Секция «Управление» */}
          <div className="accordion-section">
            <button className="accordion-toggle" onClick={() => setControlSectionOpen(!controlSectionOpen)}>
              <span><Settings size={14} /> Управление</span>
              <span>{controlSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            </button>
            {controlSectionOpen && (
              <div className="accordion-content">
                <button
                  onClick={handleCalculate}
                  disabled={isCalculating || cargo.length === 0}
                  className="btn btn-primary btn-calculate"
                >
                  {isCalculating ? 'Расчёт…' : 'Расчёт'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    id="stacking-toggle"
                    checked={stacking}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setStacking(checked);
                      const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
                      // maxStackHeight = полная высота кузова — физический потолок,
                      // чтобы груз любой высоты (напр. 1200мм) мог штабелироваться
                      // до тех пор, пока суммарная высота не превышает высоту кузова.
                      const newMaxH = checked ? vehicle.height : 0;
                      const newSettings = { ...settings, maxStackHeight: newMaxH };
                      setSettings(newSettings);
                      if (cargo.length > 0) {
                        setCalculating(true);
                        try {
                          const result = packItems(vehicle, cargo, newSettings, loadingPoints);
                          if (!result.error) {
                            setResult(result);
                            const pristineMap: Record<string, typeof result.variants[number]['items']> = {};
                            result.variants.forEach((v) => { pristineMap[v.id] = v.items; });
                            setPristine(pristineMap);
                            const cur = useAppStore.getState().activeVariant;
                            const keep = cur && result.variants.some(v => v.id === cur) ? cur : result.variants[0].id;
                            setActiveVariant(keep);
                          }
                        } catch (err) { /* stacking recalc error */ }
                        finally { setCalculating(false); }
                      }
                    }}
                  />
                  <label htmlFor="stacking-toggle" style={{ fontSize: 13, color: 'var(--text)' }}>
                    <Box size={14} /> Штабелирование
                  </label>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    (для всех грузов)
                  </span>
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
              <Grid3x3 size={14} /> 2D Вид
            </button>
            <button
              type="button"
              className={`view-tab ${activeView === '3d' ? 'active' : ''}`}
              onClick={() => setActiveView('3d')}
            >
              <Box size={14} /> 3D Вид
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
        <div className="error-toast">
          <div className="error-toast-content">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="error-toast-close"
              aria-label="Закрыть"
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
  const vehicle = getCurrentVehicle(useAppStore.getState().selectedVehicleId, useAppStore.getState().customVehicles);
  const result = useAppStore.getState().result;
  const activeVariant = useAppStore((s) => s.activeVariant);
  const unit = useAppStore((s) => s.unit);

  const suggestions: PackingSuggestion[] = useMemo(() => {
    if (!result) return [];
    return generateSuggestions(result, vehicle, activeVariant, unit);
  }, [result, vehicle, activeVariant, unit]);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ flexShrink: 0 }}>
      <button className="btn btn-sm w-full" onClick={onToggle} style={{ marginBottom: 4 }}>
        <Lightbulb size={14} /> Подсказки ({suggestions.length}) {show ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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