// ============================================================================
// Кнопки формирования отчётов (PDF и Excel)
// ============================================================================

import { getCurrentVehicle, useActiveVariant } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { generatePdfWithReactPdf } from './PDFReport';
import { exportToXLSX } from '../../lib/export/xlsxExport';

export default function ReportButton() {
  const cargo = useAppStore((s) => s.cargo);
  const result = useAppStore((s) => s.result);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const setError = useAppStore((s) => s.setError);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
  const variant = useActiveVariant();

  const handlePdf = async () => {
    if (!result || !variant) {
      setError('Раскладка не рассчитана, рассчитайте сначала.');
      return;
    }
    try {
      await generatePdfWithReactPdf(vehicle, cargo, variant);
    } catch (e) {

      setError(e instanceof Error ? e.message : 'Ошибка формирования PDF');
    }
  };

  const handleXlsx = () => {
    if (!result || result.variants.length === 0) {
      setError('Сначала выполните расчёт.');
      return;
    }
    try {
      exportToXLSX(vehicle, cargo, result.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка экспорта в Excel');
    }
  };

  return (
    <div className="row">
      <button className="btn btn-primary" onClick={handlePdf}>
        📄 Отчёт PDF
      </button>
      <button className="btn btn-success" onClick={handleXlsx}>
        📊 Экспорт в Excel
      </button>
    </div>
  );
}