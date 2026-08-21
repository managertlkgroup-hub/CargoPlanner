// ============================================================================
// Кнопка формирования PDF-отчёта
// ============================================================================

import { getCurrentVehicle, useActiveVariant } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { generatePdfReport } from '../../lib/export/pdfExport';

export default function ReportButton() {
  const cargo = useAppStore((s) => s.cargo);
  const result = useAppStore((s) => s.result);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const setError = useAppStore((s) => s.setError);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
  const variant = useActiveVariant();

  const handleClick = () => {
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

  return (
    <button className="btn btn-primary" onClick={handleClick}>
      📄 Сформировать отчёт
    </button>
  );
}