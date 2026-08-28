import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore, getCurrentVehicle } from './store/useAppStore';
import { packItems } from './lib/packer/packer';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import VehicleSelector from './components/VehicleSelector/VehicleSelector';
import CargoTable from './components/CargoTable/CargoTable';
import Scene3D from './components/Scene3D/Scene3D';
import Scene2D from './components/Scene2D/Scene2D';
import VariantTabs from './components/VariantTabs/VariantTabs';
import MetricsPanel from './components/MetricsPanel/MetricsPanel';
import SettingsModal from './components/Settings/SettingsModal';
import ReportButton from './components/Report/ReportButton';
import VehicleVisibilityControls from './components/VehicleSelector/VehicleVisibilityControls';
import VehicleMatcher from './components/VehicleSelector/VehicleMatcher';
import { VehicleDetailsPanel, CargoDetailsPanel } from './components/PresetDetails/PresetDetailsPanel';
import { generateSuggestions, type PackingSuggestion } from './lib/packer/suggestions';

const App: React.FC = () => {
  const cargo = useAppStore((s) => s.cargo);
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const settings = useAppStore((s) => s.settings);
  const isCalculating = useAppStore((s) => s.isCalculating);

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
  const [vehicleSectionOpen, setVehicleSectionOpen] = useState(true);
  const [cargoSectionOpen, setCargoSectionOpen] = useState(true);
  const [controlSectionOpen, setControlSectionOpen] = useState(true);
  const [detailsCargoId, setDetailsCargoId] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<'3d' | '2d'>('3d');
  const [stacking, setStacking] = useState(settings.maxStackHeight > 0);

  // Синхронизация чекбокса с настройками
  useEffect(() => {
    setStacking(settings.maxStackHeight > 0);
  }, [settings.maxStackHeight]);

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
    console.log(`[Calculate] maxStackHeight=${settings.maxStackHeight}`);
    setCalculating(true);
    try {
      const result = packItems(vehicle, cargo, settings, loadingPoints);
      console.log('[App] Результат расчёта:', {
        variants: result.variants.length,
        error: result.error,
      });
      if (result.error) {
        setError(result.error);
        setResult(null);
        setActiveVariant(null);
        return;
      }
      setResult(result);
      // Сохраняем эталонные позиции для кнопки «Сбросить позиции»
      const pristineMap: Record<string, typeof result.variants[number]['items']> = {};
      result.variants.forEach((v) => {
        pristineMap[v.id] = v.items;
      });
      setPristine(pristineMap);
      // По умолчанию выбираем вариант с лучшим заполнением (первый после сортировки)
      const best = result.variants[0];
      setActiveVariant(best.id);
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
          {/* Секция «Автомобиль» — сворачиваемый аккордеон */}
          <div className="accordion-section">
            <button className="accordion-toggle" onClick={() => setVehicleSectionOpen(!vehicleSectionOpen)}>
              <span>🚚 Автомобиль</span>
              <span>{vehicleSectionOpen ? '▼' : '▶'}</span>
            </button>
            {vehicleSectionOpen && (
              <div className="accordion-content">
                <VehicleSelector />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn btn-sm" onClick={() => setMatcherOpen(true)}>🔍 Подобрать авто</button>
                  <button className="btn btn-sm" onClick={() => setDetailsVehicleId(selectedVehicleId)}>📋 Детали</button>
                </div>
              </div>
            )}
          </div>

          {/* Секция «Грузы» — сворачиваемый аккордеон */}
          <div className="accordion-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <button className="accordion-toggle" onClick={() => setCargoSectionOpen(!cargoSectionOpen)}>
              <span>📦 Грузы ({cargo.length})</span>
              <span>{cargoSectionOpen ? '▼' : '▶'}</span>
            </button>
            {cargoSectionOpen && (
              <div className="cargo-section">
                <CargoTable onCargoDetails={setDetailsCargoId} />
              </div>
            )}
          </div>
          {/* Секция «Управление» — сворачиваемый аккордеон */}
          <div className="accordion-section">
            <button className="accordion-toggle" onClick={() => setControlSectionOpen(!controlSectionOpen)}>
              <span>⚙️ Управление</span>
              <span>{controlSectionOpen ? '▼' : '▶'}</span>
            </button>
            {controlSectionOpen && (
              <div className="accordion-content">
                <button
                  onClick={handleCalculate}
                  disabled={isCalculating || cargo.length === 0}
                  className="btn btn-primary btn-calculate"
                >
                  {isCalculating ? '⏳ Расчёт…' : '🧮 Рассчитать раскладку'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    id="stacking-toggle"
                    checked={stacking}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setStacking(checked);
                      const newMaxH = checked ? (settings.maxStackHeight > 0 ? settings.maxStackHeight : 2000) : 0;
                      const newSettings = { ...settings, maxStackHeight: newMaxH };
                      setSettings(newSettings);
                      if (cargo.length > 0) {
                        const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
                        setCalculating(true);
                        try {
                          const result = packItems(vehicle, cargo, newSettings, loadingPoints);
                          if (!result.error) {
                            setResult(result);
                            const pristineMap: Record<string, typeof result.variants[number]['items']> = {};
                            result.variants.forEach((v) => { pristineMap[v.id] = v.items; });
                            setPristine(pristineMap);
                            setActiveVariant(result.variants[0].id);
                          }
                        } catch (err) { console.error('[Stacking] recalc error:', err); }
                        finally { setCalculating(false); }
                      }
                    }}
                  />
                  <label htmlFor="stacking-toggle" style={{ fontSize: 13, color: 'var(--text)' }}>
                    📦 Штабелирование
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
              className={`view-tab ${activeView === '3d' ? 'active' : ''}`}
              onClick={() => setActiveView('3d')}
            >
              🧊 3D Вид
            </button>
            <button
              type="button"
              className={`view-tab ${activeView === '2d' ? 'active' : ''}`}
              onClick={() => setActiveView('2d')}
            >
              📐 2D Вид (сверху)
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
              ✕
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

  const suggestions: PackingSuggestion[] = useMemo(() => {
    if (!result) return [];
    return generateSuggestions(result, vehicle);
  }, [result, vehicle]); // eslint-disable-line

  if (suggestions.length === 0) return null;

  return (
    <div style={{ flexShrink: 0 }}>
      <button className="btn btn-sm w-full" onClick={onToggle} style={{ marginBottom: 4 }}>
        💡 Подсказки ({suggestions.length}) {show ? '▲' : '▼'}
      </button>
      {show && (
        <div className="suggestions-list">
          {suggestions.map((s) => (
            <div key={s.id} className="suggestion-item">
              <span className="suggestion-icon">{s.icon}</span>
              <span>{s.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;