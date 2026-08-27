// ============================================================================
// Строка таблицы грузов (react-window)
//
// Используются <div> с display: table-row / table-cell вместо <tr>/<td>,
// чтобы react-window корректно рендерил строки внутри виртуального списка
// (без ошибки "tr cannot appear as a child of div").
// ============================================================================

import { useState, useRef } from 'react';
import type { Cargo } from '../../types';
import { shapeLabel } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  cargo: Cargo;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export default function CargoRow({ cargo, selected, onToggleSelect }: Props) {
  const updateCargo = useAppStore((s) => s.updateCargo);
  const isCylinder = cargo.shape === 'cylinder';
  const [editingName, setEditingName] = useState(false);
  const [editValue, setEditValue] = useState(cargo.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditName = () => {
    setEditValue(cargo.name);
    setEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitName = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== cargo.name) {
      updateCargo(cargo.id, { name: trimmed });
    }
    setEditingName(false);
  };

  return (
    <tr className={selected ? 'cargo-tr-selected' : ''}>
      <td className="cargo-td-check">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(cargo.id)}
        />
      </td>
      <td className="cargo-td-check">
        <input
          type="checkbox"
          checked={cargo.stackable}
          onChange={(e) => updateCargo(cargo.id, { stackable: e.target.checked })}
          title="Можно ставить сверху"
        />
      </td>
      <td className="cargo-td-name">
        {editingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            className="cargo-name-input"
            maxLength={100}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <div
            className="cargo-name-display"
            onDoubleClick={startEditName}
            title={cargo.name}
          >
            {cargo.name}
          </div>
        )}
      </td>
      <td className="cargo-td-shape">{shapeLabel(cargo.shape)}</td>
      <td className="cargo-td-num">
        <input
          type="number"
          value={cargo.length}
          className="cargo-num-input"
          onChange={(e) => updateCargo(cargo.id, { length: Number(e.target.value) })}
        />
      </td>
      {isCylinder ? (
        <>
          <td className="cargo-td-num">—</td>
          <td className="cargo-td-num">
            <input
              type="number"
              value={cargo.diameter ?? 0}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { diameter: Number(e.target.value) })}
            />
          </td>
        </>
      ) : (
        <>
          <td className="cargo-td-num">
            <input
              type="number"
              value={cargo.width}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { width: Number(e.target.value) })}
            />
          </td>
          <td className="cargo-td-num">
            <input
              type="number"
              value={cargo.height}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { height: Number(e.target.value) })}
            />
          </td>
        </>
      )}
      <td className="cargo-td-num">
        <input
          type="number"
          value={cargo.weight}
          className="cargo-num-input"
          onChange={(e) => updateCargo(cargo.id, { weight: Number(e.target.value) })}
        />
      </td>
      <td className="cargo-td-num">
        <input
          type="number"
          min={1}
          value={cargo.quantity}
          className="cargo-num-input"
          onChange={(e) => updateCargo(cargo.id, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
        />
      </td>
    </tr>
  );
}