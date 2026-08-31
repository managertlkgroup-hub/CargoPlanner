// ============================================================================
// Кнопки формирования отчётов (PDF и Excel)
// ============================================================================

import { FileText, Table } from 'lucide-react';
import { getCurrentVehicle, useActiveVariant } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';

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
      const { generatePdfWithReactPdf } = await import('./PDFReport');
      await generatePdfWithReactPdf(vehicle, cargo, variant);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка формирования PDF');
    }
  };

  const handleXlsx = async () => {
    if (!result || result.variants.length === 0) {
      setError('Сначала выполните расчёт.');
      return;
    }
    try {
      const { exportToXLSX } = await import('../../lib/export/xlsxExport');
      exportToXLSX(vehicle, cargo, result.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка экспорта в Excel');
    }
  };

  return (
    <div className="row">
      <button className="btn btn-primary" onClick={handlePdf}>
        <FileText size={14} /> Отчёт PDF
      </button>
      <button className="btn btn-success" onClick={handleXlsx}>
        <Table size={14} /> Экспорт в Excel
      </button>
    </div>
  );
}