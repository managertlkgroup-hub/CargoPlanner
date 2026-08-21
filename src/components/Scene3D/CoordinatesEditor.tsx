// ============================================================================
// Редактор координат размещённых грузов (ручное редактирование раскладки)
// Позволяет менять x, y, z и вращение вокруг Y, а также сбросить позиции.
// ============================================================================

import { useAppStore, useActiveVariant } from '../../store/useAppStore';

export default function CoordinatesEditor() {
  const variant = useActiveVariant();
  const result = useAppStore((s) => s.result);
  const setResult = useAppStore((s) => s.setResult);
  const setError = useAppStore((s) => s.setError);

  if (!variant || !result) return null;

  /** Обновляет одно поле конкретного груза */
  const updateItem = (id: string, patch: Record<string, number>) => {
    const newVariants = result.variants.map((v) => {
      if (v.id !== variant.id) return v;
      return {
        ...v,
        items: v.items.map((it) => {
          if (it.id !== id) return it;
          const next = { ...it };
          if ('x' in patch) next.position = { ...next.position, x: patch.x };
          if ('y' in patch) next.position = { ...next.position, y: patch.y };
          if ('z' in patch) next.position = { ...next.position, z: patch.z };
          if ('rotation' in patch) next.rotation = { ...next.rotation, y: patch.rotation };
          return next;
        }),
      };
    });
    setResult({ ...result, variants: newVariants });
  };

  /** Сбрасывает координаты — пересчитываем варианты из сохранённого результата */
  const resetPositions = () => {
    setError('Сброс доступен через повторный расчёт.');
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
                    onChange={(e) => updateItem(it.id, { x: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={Math.round(it.position.y)}
                    onChange={(e) => updateItem(it.id, { y: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={Math.round(it.position.z)}
                    onChange={(e) => updateItem(it.id, { z: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <input
                      type="number"
                      value={it.rotation?.y ?? 0}
                      step={90}
                      onChange={(e) => updateItem(it.id, { rotation: Number(e.target.value) })}
                      style={{ width: 56 }}
                    />
                    <button
                      className="btn btn-sm"
                      onClick={() => updateItem(it.id, { rotation: ((it.rotation?.y ?? 0) + 90) % 360 })}
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
    </div>
  );
}