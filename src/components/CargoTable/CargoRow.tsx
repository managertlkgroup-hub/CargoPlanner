// ============================================================================
// Строка таблицы грузов (react-window)
//
// Используются <div> с display: table-row / table-cell вместо <tr>/<td>,
// чтобы react-window корректно рендерил строки внутри виртуального списка
// (без ошибки "tr cannot appear as a child of div").
// ============================================================================

import type { CSSProperties } from 'react';
import type { Cargo } from '../../types';
import { shapeLabel } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  cargo: Cargo;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

/** Базовый стиль ячейки таблицы */
const cellStyle: CSSProperties = {
  display: 'table-cell',
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

/** Стиль компактного инпута для числовых полей */
const inputStyle: CSSProperties = {
  width: 64,
  padding: '4px 6px',
};

export default function CargoRow({ cargo, selected, onToggleSelect }: Props) {
  const updateCargo = useAppStore((s) => s.updateCargo);
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const unloadingPoints = useAppStore((s) => s.unloadingPoints);
  const isCylinder = cargo.shape === 'cylinder';

  return (
    <div
      style={{
        display: 'table-row',
        background: selected ? 'var(--bg-card)' : 'transparent',
      }}
    >
      <div style={cellStyle}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(cargo.id)}
        />
      </div>
      <div style={{ ...cellStyle, width: 130 }}>
        <input
          type="text"
          value={cargo.name}
          style={{ width: '100%', minWidth: 110 }}
          onChange={(e) => updateCargo(cargo.id, { name: e.target.value })}
        />
      </div>
      <div style={cellStyle}>{shapeLabel(cargo.shape)}</div>
      <div style={cellStyle}>
        <input
          type="number"
          value={cargo.length}
          style={inputStyle}
          onChange={(e) => updateCargo(cargo.id, { length: Number(e.target.value) })}
        />
      </div>
      {isCylinder ? (
        <>
          <div style={cellStyle}>—</div>
          <div style={cellStyle}>
            <input
              type="number"
              value={cargo.diameter ?? 0}
              style={inputStyle}
              onChange={(e) => updateCargo(cargo.id, { diameter: Number(e.target.value) })}
            />
          </div>
        </>
      ) : (
        <>
          <div style={cellStyle}>
            <input
              type="number"
              value={cargo.width}
              style={inputStyle}
              onChange={(e) => updateCargo(cargo.id, { width: Number(e.target.value) })}
            />
          </div>
          <div style={cellStyle}>
            <input
              type="number"
              value={cargo.height}
              style={inputStyle}
              onChange={(e) => updateCargo(cargo.id, { height: Number(e.target.value) })}
            />
          </div>
        </>
      )}
      <div style={cellStyle}>
        <input
          type="number"
          value={cargo.weight}
          style={inputStyle}
          onChange={(e) => updateCargo(cargo.id, { weight: Number(e.target.value) })}
        />
      </div>
      <div style={cellStyle}>
        <input
          type="number"
          min={1}
          value={cargo.quantity}
          style={inputStyle}
          onChange={(e) => updateCargo(cargo.id, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
        />
      </div>
      <div style={cellStyle}>
        <input
          type="checkbox"
          checked={cargo.stackable}
          onChange={(e) => updateCargo(cargo.id, { stackable: e.target.checked })}
        />
      </div>
      <div style={cellStyle}>
        <select
          value={cargo.loadingPointId ?? ''}
          style={{ maxWidth: 120, padding: '4px 6px' }}
          onChange={(e) => updateCargo(cargo.id, { loadingPointId: e.target.value || undefined })}
        >
          <option value="">—</option>
          {[...loadingPoints]
            .sort((a, b) => a.order - b.order)
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
      </div>
      <div style={cellStyle}>
        <select
          value={cargo.unloadingPointId ?? ''}
          style={{ maxWidth: 120, padding: '4px 6px' }}
          onChange={(e) => updateCargo(cargo.id, { unloadingPointId: e.target.value || undefined })}
        >
          <option value="">—</option>
          {[...unloadingPoints]
            .sort((a, b) => a.order - b.order)
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
      </div>
    </div>
  );
}