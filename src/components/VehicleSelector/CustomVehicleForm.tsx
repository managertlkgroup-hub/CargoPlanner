// ============================================================================
// Форма создания пользовательского автомобиля
// ============================================================================

import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { uid } from '../../utils/helpers';

interface Props {
  onDone: () => void;
}

/** Валидация числового поля */
function validateField(
  value: number,
  min: number,
  max: number,
  label: string,
): string | null {
  if (!value || value <= 0) return `${label} обязательно`;
  if (value < min) return `${label} должна быть от ${min / 1000} до ${max / 1000} метров`;
  if (value > max) return `${label} должна быть от ${min / 1000} до ${max / 1000} метров`;
  return null;
}

function validateWeight(value: number, min: number, max: number): string | null {
  if (!value || value <= 0) return 'Грузоподъёмность обязательна';
  if (value < min) return `Грузоподъёмность должна быть от ${min} кг до ${max / 1000} тонн`;
  if (value > max) return `Грузоподъёмность должна быть от ${min} кг до ${max / 1000} тонн`;
  return null;
}

const FIELDS = {
  length: { min: 2000, max: 53500, label: 'Длина' },
  width: { min: 1200, max: 10000, label: 'Ширина' },
  height: { min: 1000, max: 8500, label: 'Высота' },
  maxWeight: { min: 50, max: 200000, label: 'Грузоподъёмность' },
} as const;

export default function CustomVehicleForm({ onDone }: Props) {
  const addCustomVehicle = useAppStore((s) => s.addCustomVehicle);
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(FIELDS)) {
      const num = Number(values[key] || 0);
      const err = key === 'maxWeight'
        ? validateWeight(num, cfg.min, cfg.max)
        : validateField(num, cfg.min, cfg.max, cfg.label);
      if (err) e[key] = err;
    }
    return e;
  }, [values]);

  const hasErrors = Object.keys(errors).length > 0 || !values.name?.trim();
  const isInvalid = (key: string) => touched[key] && errors[key];

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleBlur = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const length = Number(fd.get('length'));
    const width = Number(fd.get('width'));
    const height = Number(fd.get('height'));
    const maxWeight = Number(fd.get('maxWeight'));

    if (!name) return setError('Укажите название');

    // Mark all fields as touched to show errors
    setTouched({ name: true, length: true, width: true, height: true, maxWeight: true });

    // Validate all fields
    const allErrors: string[] = [];
    for (const [key, cfg] of Object.entries(FIELDS)) {
      const num = Number(fd.get(key));
      const err = key === 'maxWeight'
        ? validateWeight(num, cfg.min, cfg.max)
        : validateField(num, cfg.min, cfg.max, cfg.label);
      if (err) allErrors.push(err);
    }
    if (allErrors.length > 0) {
      setError(allErrors[0]);
      return;
    }

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

  const inputStyle = (key: string) =>
    isInvalid(key)
      ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' }
      : {};

  return (
    <form className="form-grid mt-2" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>Название</label>
        <input
          name="name"
          placeholder="Например, Собственный фургон"
          value={values.name ?? ''}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          style={touched.name && !values.name?.trim() ? { borderColor: '#ef4444' } : {}}
        />
        {touched.name && !values.name?.trim() && (
          <div className="text-danger" style={{ fontSize: 11 }}>Укажите название</div>
        )}
      </div>
      <div className="form-group">
        <label>Длина, мм</label>
        <input
          name="length"
          type="number"
          min={FIELDS.length.min}
          max={FIELDS.length.max}
          placeholder="5000"
          value={values.length ?? ''}
          onChange={(e) => handleChange('length', e.target.value)}
          onBlur={() => handleBlur('length')}
          style={inputStyle('length')}
        />
        {isInvalid('length') && (
          <div className="text-danger" style={{ fontSize: 11 }}>{errors.length}</div>
        )}
      </div>
      <div className="form-group">
        <label>Ширина, мм</label>
        <input
          name="width"
          type="number"
          min={FIELDS.width.min}
          max={FIELDS.width.max}
          placeholder="2400"
          value={values.width ?? ''}
          onChange={(e) => handleChange('width', e.target.value)}
          onBlur={() => handleBlur('width')}
          style={inputStyle('width')}
        />
        {isInvalid('width') && (
          <div className="text-danger" style={{ fontSize: 11 }}>{errors.width}</div>
        )}
      </div>
      <div className="form-group">
        <label>Высота, мм</label>
        <input
          name="height"
          type="number"
          min={FIELDS.height.min}
          max={FIELDS.height.max}
          placeholder="2600"
          value={values.height ?? ''}
          onChange={(e) => handleChange('height', e.target.value)}
          onBlur={() => handleBlur('height')}
          style={inputStyle('height')}
        />
        {isInvalid('height') && (
          <div className="text-danger" style={{ fontSize: 11 }}>{errors.height}</div>
        )}
      </div>
      <div className="form-group">
        <label>Грузоподъёмность, кг</label>
        <input
          name="maxWeight"
          type="number"
          min={FIELDS.maxWeight.min}
          max={FIELDS.maxWeight.max}
          placeholder="15000"
          value={values.maxWeight ?? ''}
          onChange={(e) => handleChange('maxWeight', e.target.value)}
          onBlur={() => handleBlur('maxWeight')}
          style={inputStyle('maxWeight')}
        />
        {isInvalid('maxWeight') && (
          <div className="text-danger" style={{ fontSize: 11 }}>{errors.maxWeight}</div>
        )}
      </div>
      {error && <div className="form-group full text-danger">{error}</div>}
      <div className="form-group full">
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={hasErrors}
        >
          Добавить автомобиль
        </button>
      </div>
    </form>
  );
}