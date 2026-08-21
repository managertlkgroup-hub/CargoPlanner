// ============================================================================
// Корневой компонент приложения
// ============================================================================

import { useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import VehicleSelector from './components/VehicleSelector/VehicleSelector';
import CargoTable from './components/CargoTable/CargoTable';
import VariantTabs from './components/VariantTabs/VariantTabs';
import MetricsPanel from './components/MetricsPanel/MetricsPanel';
import Scene3D from './components/Scene3D/Scene3D';
import CoordinatesEditor from './components/Scene3D/CoordinatesEditor';
import SettingsModal from './components/Settings/SettingsModal';
import { useAppStore, getCurrentVehicle } from './store/useAppStore';
import { packCargo } from './lib/packer/packer';

export default function App() {
  const cargo = useAppStore((s) => s.cargo);
  const settings = useAppStore((s) => s.settings);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const setResult = useAppStore((s) => s.setResult);
  const setActiveVariant = useAppStore((s) => s.setActiveVariant);
  const isCalculating = useAppStore((s) => s.isCalculating);
  const setCalculating = useAppStore((s) => s.setCalculating);
  const setError = useAppStore((s) => s.setError);
  const error = useAppStore((s) => s.error);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);

  // Применяем тему из store при первом рендере
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /** Запуск расчёта */
  const handleCalculate = () => {
    setError(null);
    if (cargo.length === 0) {
      setError('Добавьте хотя бы один груз перед расчётом.');
      return;
    }

    // Имитация небольшой задержки для отображения спиннера
    setCalculating(true);
    setTimeout(() => {
      const result = packCargo({
        bin: {
          length: vehicle.length,
          width: vehicle.width,
          height: vehicle.height,
        },
        maxWeight: vehicle.maxWeight,
        cargo,
        settings,
      });

      if (result.error) {
        setError(result.error);
        setResult(null);
        setActiveVariant(null);
      } else {
        setResult(result);
        // По умолчанию выбираем вариант с лучшим заполнением (первый после сортировки)
        const best = result.variants[0];
        setActiveVariant(best.id);
      }
      setCalculating(false);
    }, 600);
  };

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="app-layout">
        {/* Левая панель управления */}
        <aside className="left-panel">
          <VehicleSelector />
          <CargoTable />

          <div className="panel">
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? 'Расчёт...' : '🧮 Рассчитать'}
            </button>
          </div>
        </aside>

        {/* Правая панель: 3D-сцена и метрики */}
        <section className="right-panel">
          <Scene3D />
          <VariantTabs />
          <MetricsPanel />
          <CoordinatesEditor />
        </section>
      </main>

      <Footer />

      {/* Модальное окно ошибки */}
      {error && (
        <div className="modal-overlay" onClick={() => setError(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Не удалось выполнить расчёт</h3>
            <div style={{ whiteSpace: 'pre-line' }} className="mb-2">{error}</div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setError(null)}>Понятно</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно настроек */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}