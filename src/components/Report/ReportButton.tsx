// ============================================================================
// Кнопки формирования отчётов (PDF и Excel)
// ============================================================================

import { getCurrentVehicle, useActiveVariant } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { generatePdfReport } from '../../lib/export/pdfExport';
import { exportToXLSX } from '../../lib/export/xlsxExport';

export default function ReportButton() {
  const cargo = useAppStore((s) => s.cargo);
  const result = useAppStore((s) => s.result);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const setError = useAppStore((s) => s.setError);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
  const variant = useActiveVariant();

  const handlePdf = () => {
    if (!result || !variant) {
      setError('Сначала выполните расчёт и выберите вариант раскладки.');
      return;
    }
    try {
      generatePdfReport(vehicle, cargo, variant);
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
    <div className="row" style={{ gap: 8 }}>
      <button className="btn btn-primary" onClick={handlePdf}>
        📄 Отчёт PDF
      </button>
      <button className="btn btn-success" onClick={handleXlsx}>
        📊 Экспорт в Excel
      </button>
    </div>
  );
}