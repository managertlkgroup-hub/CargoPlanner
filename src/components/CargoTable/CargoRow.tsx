// ============================================================================
// Строка таблицы грузов (react-window)
//
// Используются <div> с display: table-row / table-cell вместо <tr>/<td>,
// чтобы react-window корректно рендерил строки внутри виртуального списка
// (без ошибки "tr cannot appear as a child of div").
// ============================================================================

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

  return (
    <div className={`cargo-row ${selected ? 'cargo-row-selected' : ''}`}>
      <div className="cargo-row-cell">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(cargo.id)}
        />
      </div>
      <div className="cargo-row-cell">
        <input
          type="checkbox"
          checked={cargo.stackable}
          onChange={(e) => updateCargo(cargo.id, { stackable: e.target.checked })}
          title="Можно ставить сверху"
        />
      </div>
      <div className="cargo-row-cell cargo-name-cell">
        <input
          type="text"
          value={cargo.name}
          className="input-block"
          onChange={(e) => updateCargo(cargo.id, { name: e.target.value })}
        />
      </div>
      <div className="cargo-row-cell">{shapeLabel(cargo.shape)}</div>
      <div className="cargo-row-cell">
        <input
          type="number"
          value={cargo.length}
          className="input-compact"
          onChange={(e) => updateCargo(cargo.id, { length: Number(e.target.value) })}
        />
      </div>
      {isCylinder ? (
        <>
          <div className="cargo-row-cell">—</div>
          <div className="cargo-row-cell">
            <input
              type="number"
              value={cargo.diameter ?? 0}
              className="input-compact"
              onChange={(e) => updateCargo(cargo.id, { diameter: Number(e.target.value) })}
            />
          </div>
        </>
      ) : (
        <>
          <div className="cargo-row-cell">
            <input
              type="number"
              value={cargo.width}
              className="input-compact"
              onChange={(e) => updateCargo(cargo.id, { width: Number(e.target.value) })}
            />
          </div>
          <div className="cargo-row-cell">
            <input
              type="number"
              value={cargo.height}
              className="input-compact"
              onChange={(e) => updateCargo(cargo.id, { height: Number(e.target.value) })}
            />
          </div>
        </>
      )}
      <div className="cargo-row-cell">
        <input
          type="number"
          value={cargo.weight}
          className="input-compact"
          onChange={(e) => updateCargo(cargo.id, { weight: Number(e.target.value) })}
        />
      </div>
      <div className="cargo-row-cell">
        <input
          type="number"
          min={1}
          value={cargo.quantity}
          className="input-compact"
          onChange={(e) => updateCargo(cargo.id, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
        />
      </div>
    </div>
  );
}