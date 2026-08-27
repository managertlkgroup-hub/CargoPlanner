// ============================================================================
// Таблица грузов (react-window virtual list)
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import CargoRow from './CargoRow';
import AddCargoForm from './AddCargoForm';
import { exportCsv } from '../../lib/csv/exportCsv';
import { importCsv } from '../../lib/csv/importCsv';

export default function CargoTable() {
  const cargo = useAppStore((s) => s.cargo);
  const setCargo = useAppStore((s) => s.setCargo);
  const removeCargo = useAppStore((s) => s.removeCargo);
  const clearCargo = useAppStore((s) => s.clearCargo);
  const setError = useAppStore((s) => s.setError);

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
    if (window.confirm('Удалить все грузы?')) {
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
        setError(`Некоторые строки CSV не импортированы:\n${errors.join('\n')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта CSV');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="panel">
      <div className="section-title">
        <span>📦 Грузы ({cargo.length})</span>
      </div>

      {/* Панель действий */}
      <div className="table-actions">
        <button className="btn btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? '− Скрыть форму' : '+ Добавить'}
        </button>
        <button className="btn btn-sm" onClick={selectAll} disabled={cargo.length === 0}>
          {selectedIds.size === cargo.length && cargo.length > 0 ? 'Снять всё' : 'Выбрать всё'}
        </button>
        <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={selectedIds.size === 0}>
          Удалить ({selectedIds.size})
        </button>
        <button className="btn btn-sm" onClick={handleClear} disabled={cargo.length === 0}>
          Очистить
        </button>
        <button className="btn btn-sm" onClick={handleExport} disabled={cargo.length === 0}>
          Экспорт CSV
        </button>
        <label className="btn btn-sm btn-file">
          Импорт CSV
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
      <div className="cargo-table-container">
        <div className="cargo-table-sticky-header">
          <div className="cargo-table-header-row">
            <div className="cargo-table-header-cell">✓</div>
            <div className="cargo-table-header-cell" title="Можно ставить сверху">Штаб</div>
            <div className="cargo-table-header-cell">Название</div>
            <div className="cargo-table-header-cell">Форма</div>
            <div className="cargo-table-header-cell">Длина</div>
            <div className="cargo-table-header-cell">Ширина</div>
            <div className="cargo-table-header-cell">Выс.</div>
            <div className="cargo-table-header-cell">Вес</div>
            <div className="cargo-table-header-cell">Кол-во</div>
          </div>
        </div>
        {cargo.length === 0 ? (
          <div className="empty-state text-muted">
            Грузов пока нет. Нажмите «+ Добавить» или импортируйте CSV.
          </div>
        ) : (
          cargo.map((c) => (
            <CargoRow
              key={c.id}
              cargo={c}
              selected={selectedIds.has(c.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}