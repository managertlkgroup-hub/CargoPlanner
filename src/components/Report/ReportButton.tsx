// ============================================================================
// Кнопки формирования отчётов (PDF и Excel)
// ============================================================================

import { FileText, Table } from 'lucide-react';
import { getCurrentVehicle, useActiveVariant } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { tr } from '../../i18n';

export default function ReportButton() {
  const cargo = useAppStore((s) => s.cargo);
  const result = useAppStore((s) => s.result);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const setError = useAppStore((s) => s.setError);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);

  const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
  const variant = useActiveVariant();

  const handlePdf = async () => {
    if (!result || !variant) {
      setError(tr(lang, 'err.calcFirst'));
      return;
    }
    try {
      const { generatePdfWithReactPdf } = await import('./PDFReport');
      await generatePdfWithReactPdf(vehicle, cargo, variant, weightUnit, lang);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr(lang, 'err.pdf'));
    }
  };

  const handleXlsx = async () => {
    if (!result || result.variants.length === 0) {
      setError(tr(lang, 'err.calcFirst'));
      return;
    }
    try {
      const { exportToXLSX } = await import('../../lib/export/xlsxExport');
      exportToXLSX(vehicle, cargo, result.variants, weightUnit);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr(lang, 'err.excel'));
    }
  };

  return (
    <div className="row">
      <button className="btn btn-primary" onClick={handlePdf}>
        <FileText size={14} /> {tr(lang, 'rb.pdf')}
      </button>
      <button className="btn btn-success" onClick={handleXlsx}>
        <Table size={14} /> {tr(lang, 'rb.excel')}
      </button>
    </div>
  );
}