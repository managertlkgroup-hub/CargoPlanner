import { useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Cargo } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { uid } from '../../utils/helpers';
import { PALLET_PRESETS } from '../../lib/packer/presets';
import { importCsv } from '../../lib/csv/importCsv';
import { exportCsv } from '../../lib/csv/exportCsv';
import AddCargoForm from './AddCargoForm';
import CargoRow from './CargoRow';

/** Пример тестовых грузов */
function sampleCargo(): Cargo[] {
  return [
    { id: uid(), name: 'Ящик с инструментом', shape: 'box', length: 600, width: 400, height: 300, weight: 25, quantity: 4, stackable: true },
    { id: uid(), name: 'Европаллет', shape: 'box', length: 1200, width: 800, height: 144, weight: 250, quantity: 3, stackable: true },
    { id: uid(), name: 'Коробка хрупкая', shape: 'box', length: 500, width: 500, height: 400, weight: 40, quantity: 2, stackable: false },
    { id: uid(), name: 'Мешок цемента', shape: 'box', length: 700, width: 400, height: 200, weight: 50, quantity: 10, stackable: true },
    { id: uid(), name: 'Труба стальная', shape: 'cylinder', length: 3000, diameter: 220, weight: 80, quantity: 3, stackable: true },
    { id: uid(), name: 'Бочка металлическая', shape: 'cylinder', length: 880, diameter: 580, weight: 60, quantity: 2, stackable: true },
  ];
}

const ROW_HEIGHT = 42;

export default function CargoTable() {
  const cargo = useAppStore((s) => s.cargo);
  const addCargoBulk = useAppStore((s) => s.addCargoBulk);
  const removeCargo = useAppStore((s) => s.removeCargo);
  const clearCargo = useAppStore((s) => s.clearCargo);
  const setError = useAppStore((s) => s.setError);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    removeCargo([...selected]);
    setSelected(new Set());
  };

  const handleAddPallet = (key: 'euro' | 'fin') => {
    const p = PALLET_PRESETS[key];
    addCargoBulk([
      { id: uid(), name: p.name, shape: 'box', length: p.length, width: p.width, height: p.height, weight: p.weight, quantity: 1, stackable: true },
    ]);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importCsv(file);
    if (result.errors.length) {
      setError(`Ошибки импорта:\n${result.errors.join('\n')}`);
    }
    if (result.cargo.length) {
      addCargoBulk(result.cargo);
    }
    e.target.value = '';
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = cargo[index];
    return (
      <div style={style}>
        <CargoRow cargo={item} selected={selected.has(item.id)} onToggleSelect={toggleSelect} />
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="section-title">
        <span>📦 Грузы ({cargo.length})</span>
        <button className="btn btn-sm" onClick={() => { addCargoBulk(sampleCargo()); }}>
          Загрузить пример
        </button>
      </div>

      <AddCargoForm />

      <div className="row mt-2 mb-1">
        <button className="btn btn-sm btn-success" onClick={() => handleAddPallet('euro')}>+ Европаллет</button>
        <button className="btn btn-sm btn-success" onClick={() => handleAddPallet('fin')}>+ Финпаллет</button>
      </div>
      <div className="row mb-1">
        <button className="btn btn-sm" onClick={() => fileInput.current?.click()}>⬆ Импорт CSV</button>
        <button className="btn btn-sm" onClick={() => exportCsv(cargo)}>⬇ Экспорт CSV</button>
        <button className="btn btn-sm btn-danger" onClick={handleDeleteSelected} disabled={selected.size === 0}>
          Удалить выбранные ({selected.size})
        </button>
        <button className="btn btn-sm btn-danger" onClick={clearCargo} disabled={cargo.length === 0}>
          Очистить все
        </button>
      </div>
      <input ref={fileInput} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />

      {cargo.length === 0 ? (
        <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>
          Список грузов пуст. Добавьте грузы вручную, импортируйте из CSV или нажмите «Загрузить пример».
        </div>
      ) : (
        <div className="cargo-table-wrap">
          <table className="cargo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Название</th>
                <th>Форма</th>
                <th>Дл.</th>
                <th>Шир.</th>
                <th>Выс./Диам.</th>
                <th>Вес</th>
                <th>Кол-во</th>
                <th style={{ width: 80 }}>Штаб.</th>
              </tr>
            </thead>
          </table>
          <div style={{ height: Math.min(cargo.length * ROW_HEIGHT, 300) }}>
            <List
              height={Math.min(cargo.length * ROW_HEIGHT, 300)}
              itemCount={cargo.length}
              itemSize={ROW_HEIGHT}
              width="100%"
            >
              {Row}
            </List>
          </div>
        </div>
      )}
    </div>
  );
}