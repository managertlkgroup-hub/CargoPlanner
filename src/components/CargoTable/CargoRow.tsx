import { Search, ClipboardList } from 'lucide-react';
// ============================================================================
// Строка таблицы грузов
// ============================================================================

import { useState, useRef } from 'react';
import type { Cargo } from '../../types';
import { shapeLabel } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { toUnit, fromUnit, toWeightUnit, fromWeightUnit, nameOf } from '../../utils/helpers';
import { tr } from '../../i18n';

interface Props {
  cargo: Cargo;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDetailsClick?: (id: string) => void;
}

export default function CargoRow({ cargo, selected, onToggleSelect, onDetailsClick }: Props) {
  const updateCargo = useAppStore((s) => s.updateCargo);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const setFocusItemId = useAppStore((s) => s.setFocusItemId);
  const setHighlightItemId = useAppStore((s) => s.setHighlightItemId);
  const lang = useAppStore((s) => s.lang);
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
      updateCargo(cargo.id, { name: trimmed, nameKey: undefined });
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
          title={tr(lang, 'cargo.stackTitle')}
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
            {nameOf(cargo, lang)}
          </div>
        )}
      </td>
      <td className="cargo-td-shape">{shapeLabel(cargo.shape)}</td>
      <td className="cargo-td-num">
        <input
          type="number"
          value={Math.round(toUnit(cargo.length, unit) * 100) / 100}
          className="cargo-num-input"
          onChange={(e) => updateCargo(cargo.id, { length: fromUnit(Number(e.target.value), unit) })}
        />
      </td>
      {isCylinder ? (
        <>
          <td className="cargo-td-num">—</td>
          <td className="cargo-td-num">
            <input
              type="number"
              value={Math.round(toUnit(cargo.diameter ?? 0, unit) * 100) / 100}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { diameter: fromUnit(Number(e.target.value), unit) })}
            />
          </td>
        </>
      ) : (
        <>
          <td className="cargo-td-num">
            <input
              type="number"
              value={Math.round(toUnit(cargo.width ?? 0, unit) * 100) / 100}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { width: fromUnit(Number(e.target.value), unit) })}
            />
          </td>
          <td className="cargo-td-num">
            <input
              type="number"
              value={Math.round(toUnit(cargo.height ?? 0, unit) * 100) / 100}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { height: fromUnit(Number(e.target.value), unit) })}
            />
          </td>
        </>
      )}
      <td className="cargo-td-num">
        <input
          type="number"
          step="any"
          value={weightUnit === 'ton' ? Math.round(toWeightUnit(cargo.weight, weightUnit) * 100) / 100 : cargo.weight}
          className="cargo-num-input"
          onChange={(e) => updateCargo(cargo.id, { weight: fromWeightUnit(Number(e.target.value), weightUnit) })}
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
          title={tr(lang, 'cargo.3dTitle')}
          onClick={() => {
            setFocusItemId(cargo.id);
            setHighlightItemId(cargo.id);
            setTimeout(() => setHighlightItemId(null), 2000);
          }}
        >
          <Search size={12} />
        </button>
        {/* Кнопка «Детали» */}
        {onDetailsClick && (
          <button
            className="btn btn-sm"
            style={{ padding: '1px 4px', fontSize: 10 }}
            title={tr(lang, 'cargo.detailsTitle')}
            onClick={() => onDetailsClick(cargo.id)}
          >
            <ClipboardList size={12} />
          </button>
        )}
      </td>
    </tr>
  );
}