// ============================================================================
// Редактор координат размещённых грузов (ручное редактирование раскладки)
// Позволяет менять x, y, z и вращение вокруг Y, а также сбросить позиции.
// Изменения синхронизированы с 3D-сценой через Zustand.
// ============================================================================

import { useAppStore, useActiveVariant } from '../../store/useAppStore';

export default function CoordinatesEditor() {
  const variant = useActiveVariant();
  const updateCargoPosition = useAppStore((s) => s.updateCargoPosition);
  const rotateCargo = useAppStore((s) => s.rotateCargo);
  const resetPositions = useAppStore((s) => s.resetPositions);

  if (!variant) return null;

  /** Обновляет позицию груза */
  const updatePosition = (id: string, patch: Partial<{ x: number; y: number; z: number }>) => {
    const item = variant.items.find((it) => it.id === id);
    if (!item) return;
    updateCargoPosition(id, {
      x: patch.x !== undefined ? patch.x : item.position.x,
      y: patch.y !== undefined ? patch.y : item.position.y,
      z: patch.z !== undefined ? patch.z : item.position.z,
    });
  };

  return (
    <div className="panel">
      <div className="section-title">
        <span>🖐 Ручное редактирование</span>
        <button className="btn btn-sm" onClick={resetPositions}>Сбросить позиции</button>
      </div>
      <div className="cargo-table-wrap" style={{ maxHeight: 220 }}>
        <table className="cargo-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>x</th>
              <th>y</th>
              <th>z</th>
              <th>Вращ. Y°</th>
            </tr>
          </thead>
          <tbody>
            {variant.items.map((it) => (
              <tr key={it.id}>
                <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.name}
                </td>
                <td>
                  <input
                    type="number"
                    value={Math.round(it.position.x)}
                    onChange={(e) => updatePosition(it.id, { x: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={Math.round(it.position.y)}
                    onChange={(e) => updatePosition(it.id, { y: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={Math.round(it.position.z)}
                    onChange={(e) => updatePosition(it.id, { z: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <input
                      type="number"
                      value={Math.round(it.rotationY ?? 0)}
                      step={90}
                      onChange={(e) => rotateCargo(it.id, Number(e.target.value))}
                      style={{ width: 56 }}
                    />
                    <button
                      className="btn btn-sm"
                      onClick={() => rotateCargo(it.id, (it.rotationY ?? 0) + 90)}
                      title="Повернуть на 90°"
                    >
                      ↻
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-muted mt-1">Совет: перетаскивайте грузы в 3D мышью или выберите груз и нажмите <strong>R</strong> для поворота.</div>
    </div>
  );
}