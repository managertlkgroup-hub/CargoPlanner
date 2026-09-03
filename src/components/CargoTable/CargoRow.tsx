import { Search, ClipboardList } from 'lucide-react';
// ============================================================================
// Строка таблицы грузов
// ============================================================================

import { useState, useRef } from 'react';
import type { Cargo } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { toUnit, fromUnit, toWeightUnit, fromWeightUnit, nameOf } from '../../utils/helpers';
import { tr } from '../../i18n';

// Диапазоны в базовых единицах (мм/кг), как в форме добавления груза
const LIMITS = {
  length: { min: 50, max: 20000 },
  width: { min: 50, max: 5000 },
  height: { min: 50, max: 5000 },
  diameter: { min: 50, max: 5000 },
  weight: { min: 0.1, max: 50000 },
} as const;

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
      <td className="cargo-td-shape">{tr(lang, cargo.shape === 'cylinder' ? 'shape.cylinder' : 'shape.rect')}</td>
      <td className="cargo-td-method">
        {tr(lang, cargo.stackable ? 'pd.stackingShort' : 'pd.sideBySideShort')}
        {isCylinder && (
          <span style={{ color: 'var(--text-muted, #64748b)' }}>
            {' · '}{tr(lang, cargo.cylinderOrientation === 'vertical' ? 'form.vertical' : 'form.horizontal')}
          </span>
        )}
      </td>
      <td className="cargo-td-num">
        <input
          type="number"
          step="any"
          min={toUnit(LIMITS.length.min, unit)}
          max={toUnit(LIMITS.length.max, unit)}
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
              step="any"
              min={toUnit(LIMITS.diameter.min, unit)}
              max={toUnit(LIMITS.diameter.max, unit)}
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
              step="any"
              min={toUnit(LIMITS.width.min, unit)}
              max={toUnit(LIMITS.width.max, unit)}
              value={Math.round(toUnit(cargo.width ?? 0, unit) * 100) / 100}
              className="cargo-num-input"
              onChange={(e) => updateCargo(cargo.id, { width: fromUnit(Number(e.target.value), unit) })}
            />
          </td>
          <td className="cargo-td-num">
            <input
              type="number"
              step="any"
              min={toUnit(LIMITS.height.min, unit)}
              max={toUnit(LIMITS.height.max, unit)}
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
          min={toWeightUnit(LIMITS.weight.min, weightUnit)}
          max={toWeightUnit(LIMITS.weight.max, weightUnit)}
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