// ============================================================================
// Форма добавления груза (прямоугольный или цилиндр)
// ============================================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CargoShape } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { uid } from '../../utils/helpers';

export default function AddCargoForm() {
  const addCargo = useAppStore((s) => s.addCargo);
  const [error, setError] = useState('');
  const [stackable, setStackable] = useState(false);
  const [shape, setShape] = useState<CargoShape>('box');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const length = Number(fd.get('length'));
    const weight = Number(fd.get('weight'));
    const quantity = Number(fd.get('quantity') || 1);

    if (!name) return setError('Укажите название');
    if (!length || !weight) return setError('Длина и вес должны быть больше нуля');
    if (quantity < 1) return setError('Количество должно быть ≥ 1');

    if (shape === 'cylinder') {
      const diameter = Number(fd.get('diameter'));
      if (!diameter) return setError('Диаметр должен быть больше нуля');
      addCargo({
        id: uid(),
        name,
        shape: 'cylinder',
        length,
        diameter,
        weight,
        quantity: Math.floor(quantity),
        stackable,
        // width/height для цилиндра не используются
        width: undefined,
        height: undefined,
      });
    } else {
      const width = Number(fd.get('width'));
      const height = Number(fd.get('height'));
      if (!width || !height) return setError('Ширина и высота должны быть больше нуля');
      addCargo({
        id: uid(),
        name,
        shape: 'box',
        length,
        width,
        height,
        weight,
        quantity: Math.floor(quantity),
        stackable,
        diameter: undefined,
      });
    }

    e.currentTarget.reset();
    setStackable(false);
    setError('');
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>Форма груза</label>
        <div className="variant-tabs">
          <button
            type="button"
            className={`variant-tab ${shape === 'box' ? 'active' : ''}`}
            onClick={() => setShape('box')}
          >
            📦 Прямоугольный
          </button>
          <button
            type="button"
            className={`variant-tab ${shape === 'cylinder' ? 'active' : ''}`}
            onClick={() => setShape('cylinder')}
          >
            🛢 Цилиндр
          </button>
        </div>
      </div>

      <div className="form-group full">
        <label>Название груза</label>
        <input name="name" placeholder={shape === 'cylinder' ? 'Например, Труба 2м' : 'Например, Ящик с запчастями'} />
      </div>

      {shape === 'cylinder' ? (
        <>
          <div className="form-group">
            <label>Длина, мм</label>
            <input name="length" type="number" min={1} placeholder="2000" />
          </div>
          <div className="form-group">
            <label>Диаметр, мм</label>
            <input name="diameter" type="number" min={1} placeholder="500" />
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label>Длина, мм</label>
            <input name="length" type="number" min={1} placeholder="600" />
          </div>
          <div className="form-group">
            <label>Ширина, мм</label>
            <input name="width" type="number" min={1} placeholder="400" />
          </div>
          <div className="form-group">
            <label>Высота, мм</label>
            <input name="height" type="number" min={1} placeholder="300" />
          </div>
        </>
      )}

      <div className="form-group">
        <label>Вес, кг</label>
        <input name="weight" type="number" min={1} placeholder="20" />
      </div>
      <div className="form-group">
        <label>Количество</label>
        <input name="quantity" type="number" min={1} defaultValue={1} />
      </div>

      <div className="form-group full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={stackable}
          onChange={(e) => setStackable(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontSize: 13 }}>Штабелируемый (можно ставить сверху)</span>
      </div>

      {error && <div className="form-group full text-muted" style={{ color: 'var(--danger)' }}>{error}</div>}
      <div className="form-group full">
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          + Добавить груз
        </button>
      </div>
    </form>
  );
}