// ============================================================================
// Форма добавления нового груза
// ============================================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Cargo, CargoShape } from '../../types';
import { uid } from '../../utils/helpers';

export default function AddCargoForm() {
  const addCargo = useAppStore((s) => s.addCargo);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const shape = (fd.get('shape') as CargoShape) || 'box';
    const length = Number(fd.get('length'));
    const width = Number(fd.get('width'));
    const height = Number(fd.get('height'));
    const diameter = Number(fd.get('diameter'));
    const weight = Number(fd.get('weight'));
    const quantity = Math.max(1, Math.floor(Number(fd.get('quantity')) || 1));

    if (!name) return setError('Укажите название груза.');
    if (!length || !weight) return setError('Длина и вес должны быть больше нуля.');
    if (shape === 'cylinder' && !diameter) return setError('Укажите диаметр цилиндра.');
    if (shape === 'box' && (!width || !height)) return setError('Укажите ширину и высоту.');

    const cargo: Cargo = {
      id: uid(),
      name,
      shape,
      length,
      width: shape === 'box' ? width : undefined,
      height: shape === 'box' ? height : undefined,
      diameter: shape === 'cylinder' ? diameter : undefined,
      weight,
      quantity,
      stackable: true,
    };
    addCargo(cargo);
    // Сбрасываем форму
    const form = e.currentTarget;
    form.reset();
    setError('');
  };

  const [shape, setShape] = useState<CargoShape>('box');

  return (
    <form className="form-grid mt-2" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>Название</label>
        <input name="name" placeholder="Например, Европаллета" />
      </div>
      <div className="form-group">
        <label>Форма</label>
        <select
          name="shape"
          value={shape}
          onChange={(e) => setShape(e.target.value as CargoShape)}
        >
          <option value="box">Прямоугольный</option>
          <option value="cylinder">Цилиндр</option>
        </select>
      </div>
      <div className="form-group">
        <label>Длина, мм</label>
        <input name="length" type="number" min={1} placeholder="1200" />
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>Ширина, мм</label>
            <input name="width" type="number" min={1} placeholder="800" />
          </div>
          <div className="form-group">
            <label>Высота, мм</label>
            <input name="height" type="number" min={1} placeholder="150" />
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Диаметр, мм</label>
          <input name="diameter" type="number" min={1} placeholder="200" />
        </div>
      )}
      <div className="form-group">
        <label>Вес, кг</label>
        <input name="weight" type="number" min={1} placeholder="20" />
      </div>
      <div className="form-group">
        <label>Кол-во, шт</label>
        <input name="quantity" type="number" min={1} defaultValue={1} />
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