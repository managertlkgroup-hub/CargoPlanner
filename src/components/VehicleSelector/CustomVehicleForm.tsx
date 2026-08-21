// ============================================================================
// Форма создания пользовательского автомобиля
// ============================================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { uid } from '../../utils/helpers';

interface Props {
  onDone: () => void;
}

export default function CustomVehicleForm({ onDone }: Props) {
  const addCustomVehicle = useAppStore((s) => s.addCustomVehicle);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const length = Number(fd.get('length'));
    const width = Number(fd.get('width'));
    const height = Number(fd.get('height'));
    const maxWeight = Number(fd.get('maxWeight'));

    if (!name) return setError('Укажите название');
    if (!length || !width || !height || !maxWeight) return setError('Все размеры и грузоподъёмность должны быть больше нуля');

    addCustomVehicle({
      id: `custom-${uid()}`,
      name,
      length,
      width,
      height,
      maxWeight,
      isCustom: true,
    });
    onDone();
  };

  return (
    <form className="form-grid mt-2" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>Название</label>
        <input name="name" placeholder="Например, Собственный фургон" />
      </div>
      <div className="form-group">
        <label>Длина, мм</label>
        <input name="length" type="number" min={1} placeholder="5000" />
      </div>
      <div className="form-group">
        <label>Ширина, мм</label>
        <input name="width" type="number" min={1} placeholder="2400" />
      </div>
      <div className="form-group">
        <label>Высота, мм</label>
        <input name="height" type="number" min={1} placeholder="2600" />
      </div>
      <div className="form-group">
        <label>Грузоподъёмность, кг</label>
        <input name="maxWeight" type="number" min={1} placeholder="15000" />
      </div>
      {error && <div className="form-group full text-muted" style={{ color: 'var(--danger)' }}>{error}</div>}
      <div className="form-group full">
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Добавить автомобиль
        </button>
      </div>
    </form>
  );
}