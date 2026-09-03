// ============================================================================
// Таблица грузов
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { WEIGHT_UNIT_LABEL } from '../../utils/helpers';
import { tr, trf } from '../../i18n';
import CargoRow from './CargoRow';
import AddCargoForm from './AddCargoForm';
import { exportCsv } from '../../lib/csv/exportCsv';
import { importCsv } from '../../lib/csv/importCsv';

interface CargoTableProps {
  onCargoDetails?: (id: string) => void;
}

export default function CargoTable({ onCargoDetails }: CargoTableProps) {
  const cargo = useAppStore((s) => s.cargo);
  const setCargo = useAppStore((s) => s.setCargo);
  const removeCargo = useAppStore((s) => s.removeCargo);
  const clearCargo = useAppStore((s) => s.clearCargo);
  const setError = useAppStore((s) => s.setError);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === cargo.length && cargo.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cargo.map((c) => c.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    removeCargo([...selectedIds]);
    setSelectedIds(new Set());
  };

  const handleClear = () => {
    if (cargo.length === 0) return;
    if (window.confirm(tr(lang, 'cargo.confirmClear'))) {
      clearCargo();
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    if (cargo.length === 0) return;
    exportCsv(cargo);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { cargo: imported, errors } = await importCsv(file);
      if (imported.length > 0) {
        setCargo([...cargo, ...imported]);
      }
      if (errors.length > 0) {
        const details = errors
          .map((e) => `${tr(lang, 'csv.row')} ${e.row}: ${tr(lang, e.code)}`)
          .join('\n');
        setError(`${tr(lang, 'csv.partialImport')}\n${details}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tr(lang, 'err.importCsv'));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="panel">
      {/* Панель действий */}
      <div className="table-actions">
        <button className="btn btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? tr(lang, 'cargo.hide') : tr(lang, 'cargo.add')}
        </button>
        <button className="btn btn-sm" onClick={selectAll} disabled={cargo.length === 0}>
          {selectedIds.size === cargo.length && cargo.length > 0 ? tr(lang, 'cargo.deselectAll') : tr(lang, 'cargo.selectAll')}
        </button>
        <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={selectedIds.size === 0}>
          {tr(lang, 'cargo.delete')} ({selectedIds.size})
        </button>
        <button className="btn btn-sm" onClick={handleClear} disabled={cargo.length === 0}>
          {tr(lang, 'cargo.clear')}
        </button>
        <button className="btn btn-sm" onClick={handleExport} disabled={cargo.length === 0}>
          {tr(lang, 'cargo.export')}
        </button>
        <label className="btn btn-sm btn-file">
          {tr(lang, 'cargo.import')}
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden-input"
          />
        </label>
      </div>

      {/* Форма добавления */}
      {showAdd && <AddCargoForm />}

      {/* Таблица с sticky-заголовком */}
      <div className="cargo-table-wrap">
        <table className="cargo-html-table">
          <thead>
            <tr>
              <th className="cargo-th-check">✓</th>
              <th className="cargo-th-stack" title={tr(lang, 'cargo.stackTitle')}>{tr(lang, 'th.stack')}</th>
              <th className="cargo-th-name">{tr(lang, 'th.name')}</th>
              <th className="cargo-th-shape">{tr(lang, 'th.shape')}</th>
              <th className="cargo-th-method">{tr(lang, 'th.method')}</th>
              <th className="cargo-th-num">{tr(lang, 'th.length')}</th>
              <th className="cargo-th-num">{tr(lang, 'th.width')}</th>
              <th className="cargo-th-num">{tr(lang, 'th.height')}</th>
              <th className="cargo-th-num">{trf(lang, 'th.weight', { u: WEIGHT_UNIT_LABEL[weightUnit] })}</th>
              <th className="cargo-th-num">{tr(lang, 'th.qty')}</th>
              <th style={{ width: 52, textAlign: 'center' }}>{tr(lang, 'th.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {cargo.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-state text-muted">
                  {tr(lang, 'cargo.empty')}
                </td>
              </tr>
            ) : (
              cargo.map((c) => (
                <CargoRow
                  key={c.id}
                  cargo={c}
                  selected={selectedIds.has(c.id)}
                  onToggleSelect={toggleSelect}
                  onDetailsClick={onCargoDetails}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}