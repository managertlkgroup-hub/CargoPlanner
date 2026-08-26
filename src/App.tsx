import React, { useState, useEffect } from 'react';
import { useAppStore, getCurrentVehicle } from './store/useAppStore';
import { packItems } from './lib/packer/packer';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import VehicleSelector from './components/VehicleSelector/VehicleSelector';
import CargoTable from './components/CargoTable/CargoTable';
import RouteEditor from './components/RouteEditor/RouteEditor';
import Scene3D from './components/Scene3D/Scene3D';
import Scene2D from './components/Scene2D/Scene2D';
import CoordinatesEditor from './components/Scene3D/CoordinatesEditor';
import VariantTabs from './components/VariantTabs/VariantTabs';
import MetricsPanel from './components/MetricsPanel/MetricsPanel';
import SettingsModal from './components/Settings/SettingsModal';
import ReportButton from './components/Report/ReportButton';

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
  const [leftTab, setLeftTab] = useState<'cargo' | 'route'>('cargo');
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
          <VehicleSelector />
          <div className="section-divider" />
          <div className="variant-tabs mb-1">
            <button
              type="button"
              className={`variant-tab ${leftTab === 'cargo' ? 'active' : ''}`}
              onClick={() => setLeftTab('cargo')}
            >
              📦 Грузы
            </button>
            <button
              type="button"
              className={`variant-tab ${leftTab === 'route' ? 'active' : ''}`}
              onClick={() => setLeftTab('route')}
              title="Настройте точки загрузки и выгрузки, чтобы грузы укладывались по порядку маршрута"
            >
              🗺 Маршрут
            </button>
          </div>
          {leftTab === 'cargo' ? <CargoTable /> : <RouteEditor />}
          <div className="section-divider" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input
              type="checkbox"
              id="stacking-toggle"
              checked={stacking}
              onChange={(e) => {
                const checked = e.target.checked;
                setStacking(checked);
                setSettings({ ...settings, maxStackHeight: checked ? settings.maxStackHeight || 2000 : 0 });
              }}
            />
            <label htmlFor="stacking-toggle" style={{ fontSize: 13, color: 'var(--text)' }}>
              📦 Штабелирование
            </label>
          </div>
          <button
            onClick={handleCalculate}
            disabled={isCalculating || cargo.length === 0}
            className="btn btn-primary btn-calculate"
          >
            {isCalculating ? '⏳ Расчёт…' : '🧮 Рассчитать раскладку'}
          </button>
        </div>

        <div className="right-panel">
          <VariantTabs />
          <MetricsPanel />
          
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
          <CoordinatesEditor />
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
    </div>
  );
};

export default App;