// ============================================================================
// Строка таблицы грузов
// ============================================================================

import type { Cargo } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  cargo: Cargo;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export default function CargoRow({ cargo, selected, onToggleSelect }: Props) {
  const updateCargo = useAppStore((s) => s.updateCargo);

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(cargo.id)}
        />
      </td>
      <td>
        <input
          type="text"
          value={cargo.name}
          style={{ width: '100%', minWidth: 120 }}
          onChange={(e) => updateCargo(cargo.id, { name: e.target.value })}
        />
      </td>
      <td>
        <input
          type="number"
          value={cargo.length}
          onChange={(e) => updateCargo(cargo.id, { length: Number(e.target.value) })}
        />
      </td>
      <td>
        <input
          type="number"
          value={cargo.width}
          onChange={(e) => updateCargo(cargo.id, { width: Number(e.target.value) })}
        />
      </td>
      <td>
        <input
          type="number"
          value={cargo.height}
          onChange={(e) => updateCargo(cargo.id, { height: Number(e.target.value) })}
        />
      </td>
      <td>
        <input
          type="number"
          value={cargo.weight}
          onChange={(e) => updateCargo(cargo.id, { weight: Number(e.target.value) })}
        />
      </td>
      <td>
        <input
          type="number"
          min={1}
          value={cargo.quantity}
          onChange={(e) => updateCargo(cargo.id, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={cargo.stackable}
          onChange={(e) => updateCargo(cargo.id, { stackable: e.target.checked })}
        />
      </td>
    </tr>
  );
}