import React, { useState } from 'react';
import { useAppStore, getCurrentVehicle } from './store/useAppStore';
import { packItems } from './lib/packer/packer';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import VehicleSelector from './components/VehicleSelector/VehicleSelector';
import CargoTable from './components/CargoTable/CargoTable';
import RouteEditor from './components/RouteEditor/RouteEditor';
import Scene3D from './components/Scene3D/Scene3D';
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
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<'cargo' | 'route'>('cargo');

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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="app-layout flex-1">
        <div className="left-panel">
          <VehicleSelector />
          <div className="section-divider" />
          <div className="variant-tabs" style={{ marginBottom: 4 }}>
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
            >
              🗺 Маршрут
            </button>
          </div>
          {leftTab === 'cargo' ? <CargoTable /> : <RouteEditor />}
          <div className="section-divider" />
          <button
            onClick={handleCalculate}
            disabled={isCalculating || cargo.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700 }}
          >
            {isCalculating ? '⏳ Расчёт…' : '🧮 Рассчитать раскладку'}
          </button>
        </div>

        <div className="right-panel">
          <VariantTabs />
          <MetricsPanel />
          <div className="scene-container">
            <Scene3D />
          </div>
          <ReportButton />
          <CoordinatesEditor />
        </div>
      </main>

      {error && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1200,
            maxWidth: 360,
            background: 'var(--danger)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            whiteSpace: 'pre-line',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}
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