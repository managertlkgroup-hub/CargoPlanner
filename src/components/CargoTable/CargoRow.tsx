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
import { getCurrentVehicle } from '../../store/useAppStore';
import { packItems } from '../../lib/packer/packer';

interface Props {
  cargo: Cargo;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDetailsClick?: (id: string) => void;
}

export default function CargoRow({ cargo, selected, onToggleSelect, onDetailsClick }: Props) {
  const updateCargo = useAppStore((s) => s.updateCargo);
  const setFocusItemId = useAppStore((s) => s.setFocusItemId);
  const setHighlightItemId = useAppStore((s) => s.setHighlightItemId);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const customVehicles = useAppStore((s) => s.customVehicles);
  const settings = useAppStore((s) => s.settings);
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const allCargo = useAppStore((s) => s.cargo);
  const setResult = useAppStore((s) => s.setResult);
  const setActiveVariant = useAppStore((s) => s.setActiveVariant);
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
      <td style={{ padding: '2px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        {/* Кнопка «Показать в 3D» */}
        <button
          className="btn btn-sm"
          style={{ padding: '1px 4px', fontSize: 10 }}
          title="Показать в 3D"
          onClick={() => {
            setFocusItemId(cargo.id);
            setHighlightItemId(cargo.id);
            setTimeout(() => setHighlightItemId(null), 2000);
          }}
        >
          🔍
        </button>
        {/* Кнопка «Повернуть на 90°» */}
        <button
          className="btn btn-sm"
          style={{ padding: '1px 4px', fontSize: 10 }}
          title="Повернуть на 90° (поменять длину и ширину)"
          onClick={() => {
            if (isCylinder) return; // Цилиндры не вращаем так
            const newLength = cargo.width ?? cargo.length;
            const newWidth = cargo.length;
            updateCargo(cargo.id, { length: newLength, width: newWidth });
            // Автопересчёт
            const vehicle = getCurrentVehicle(selectedVehicleId, customVehicles);
            try {
              const result = packItems(vehicle, allCargo, settings, loadingPoints);
              if (!result.error) {
                setResult(result);
                const pristineMap: Record<string, typeof result.variants[number]['items']> = {};
                result.variants.forEach((v) => { pristineMap[v.id] = v.items; });
                useAppStore.getState().setPristine(pristineMap);
                setActiveVariant(result.variants[0].id);
              }
            } catch (e) { /* recalc error */ }
          }}
        >
          ↻
        </button>
        {/* Кнопка «Детали» */}
        {onDetailsClick && (
          <button
            className="btn btn-sm"
            style={{ padding: '1px 4px', fontSize: 10 }}
            title="Детали груза"
            onClick={() => onDetailsClick(cargo.id)}
          >
            📋
          </button>
        )}
      </td>
    </tr>
  );
}