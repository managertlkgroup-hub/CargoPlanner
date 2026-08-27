// ============================================================================
// Форма добавления нового груза
// ============================================================================

import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Cargo, CargoShape } from '../../types';
import { uid } from '../../utils/helpers';
import { getCargoPresets } from '../../lib/packer/presets';

/** Валидация числового поля */
function validateField(
  value: number,
  min: number,
  max: number,
  label: string,
): string | null {
  if (!value || value <= 0) return `${label} обязательно`;
  if (value < min) return `${label} должна быть от ${min} до ${max}`;
  if (value > max) return `${label} должна быть от ${min} до ${max}`;
  return null;
}

const FIELDS = {
  length: { min: 50, max: 20000, label: 'Длина' },
  width: { min: 50, max: 5000, label: 'Ширина' },
  height: { min: 50, max: 5000, label: 'Высота' },
  diameter: { min: 50, max: 5000, label: 'Диаметр' },
  weight: { min: 0.1, max: 50000, label: 'Вес' },
} as const;

export default function AddCargoForm() {
  const addCargo = useAppStore((s) => s.addCargo);
  const customCargoPresets = useAppStore((s) => s.customCargoPresets);
  const [error, setError] = useState('');
  const builtInPresets = getCargoPresets();
  const cargoPresets = [...builtInPresets, ...customCargoPresets];

  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(FIELDS)) {
      const num = Number(values[key] || 0);
      const err = validateField(num, cfg.min, cfg.max, cfg.label);
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
    const shape = (fd.get('shape') as CargoShape) || 'box';
    const length = Number(fd.get('length'));
    const width = Number(fd.get('width'));
    const height = Number(fd.get('height'));
    const diameter = Number(fd.get('diameter'));
    const weight = Number(fd.get('weight'));
    const quantity = Math.max(1, Math.floor(Number(fd.get('quantity')) || 1));

    if (!name) return setError('Укажите название груза.');

    // Mark all fields as touched to show errors
    setTouched({
      name: true, length: true, width: true,
      height: true, diameter: true, weight: true,
    });

    // Validate all fields
    const allErrors: string[] = [];
    const lengthErr = validateField(length, FIELDS.length.min, FIELDS.length.max, 'Длина');
    if (lengthErr) allErrors.push(lengthErr);
    const weightErr = validateField(weight, FIELDS.weight.min, FIELDS.weight.max, 'Вес');
    if (weightErr) allErrors.push(weightErr);
    if (shape === 'box') {
      const widthErr = validateField(width, FIELDS.width.min, FIELDS.width.max, 'Ширина');
      if (widthErr) allErrors.push(widthErr);
      const heightErr = validateField(height, FIELDS.height.min, FIELDS.height.max, 'Высота');
      if (heightErr) allErrors.push(heightErr);
    } else {
      const diameterErr = validateField(diameter, FIELDS.diameter.min, FIELDS.diameter.max, 'Диаметр');
      if (diameterErr) allErrors.push(diameterErr);
    }
    if (allErrors.length > 0) {
      setError(allErrors[0]);
      return;
    }

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
    setValues({});
    setTouched({});
    setError('');
    const form = e.currentTarget;
    form.reset();
  };

  const [shape, setShape] = useState<CargoShape>('box');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetIndex = Number(e.target.value);
    if (presetIndex < 0) return;
    const preset = cargoPresets[presetIndex];
    setValues({
      name: preset.name,
      length: String(preset.length),
      width: String(preset.width),
      height: String(preset.height),
      diameter: String(preset.diameter || preset.width),
      weight: String(preset.weight),
    });
    setTouched({});
    setShape(preset.shape);
    // Also update native form fields for FormData
    const form = e.currentTarget.closest('form');
    if (!form) return;
    (form.querySelector('[name="name"]') as HTMLInputElement).value = preset.name;
    (form.querySelector('[name="shape"]') as HTMLSelectElement).value = preset.shape;
    setShape(preset.shape);
    (form.querySelector('[name="length"]') as HTMLInputElement).value = String(preset.length);
    if (preset.shape === 'box') {
      (form.querySelector('[name="width"]') as HTMLInputElement).value = String(preset.width);
      (form.querySelector('[name="height"]') as HTMLInputElement).value = String(preset.height);
    } else {
      (form.querySelector('[name="diameter"]') as HTMLInputElement).value = String(preset.diameter || preset.width);
    }
    (form.querySelector('[name="weight"]') as HTMLInputElement).value = String(preset.weight);
  };

  const inputStyle = (key: string) =>
    isInvalid(key)
      ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' }
      : {};

  return (
    <form className="form-grid mt-2" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>Быстрый выбор груза</label>
        <select onChange={handlePresetChange} defaultValue="">
          <option value="" disabled>-- Выберите пресет --</option>
          <optgroup label="Стандартные">
            {builtInPresets.map((preset, idx) => (
              <option key={preset.name} value={idx}>
                {preset.name} ({preset.length}×{preset.width}×{preset.height} мм, {preset.weight} кг)
              </option>
            ))}
          </optgroup>
          {customCargoPresets.length > 0 && (
            <optgroup label="Мои пресеты">
              {customCargoPresets.map((preset, idx) => (
                <option key={preset.name + idx} value={builtInPresets.length + idx}>
                  {preset.name} ({preset.length}×{preset.width}×{preset.height} мм, {preset.weight} кг)
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <div className="form-group full">
        <label>Название</label>
        <input
          name="name"
          placeholder="Например, Европаллета"
          value={values.name ?? ''}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          style={touched.name && !values.name?.trim() ? { borderColor: '#ef4444' } : {}}
        />
        {touched.name && !values.name?.trim() && (
          <div className="text-danger" style={{ fontSize: 11 }}>Укажите название груза</div>
        )}
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
        <input
          name="length"
          type="number"
          min={FIELDS.length.min}
          max={FIELDS.length.max}
          placeholder="1200"
          value={values.length ?? ''}
          onChange={(e) => handleChange('length', e.target.value)}
          onBlur={() => handleBlur('length')}
          style={inputStyle('length')}
        />
        {isInvalid('length') && (
          <div className="text-danger" style={{ fontSize: 11 }}>{errors.length}</div>
        )}
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>Ширина, мм</label>
            <input
              name="width"
              type="number"
              min={FIELDS.width.min}
              max={FIELDS.width.max}
              placeholder="800"
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
              placeholder="150"
              value={values.height ?? ''}
              onChange={(e) => handleChange('height', e.target.value)}
              onBlur={() => handleBlur('height')}
              style={inputStyle('height')}
            />
            {isInvalid('height') && (
              <div className="text-danger" style={{ fontSize: 11 }}>{errors.height}</div>
            )}
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Диаметр, мм</label>
          <input
            name="diameter"
            type="number"
            min={FIELDS.diameter.min}
            max={FIELDS.diameter.max}
            placeholder="200"
            value={values.diameter ?? ''}
            onChange={(e) => handleChange('diameter', e.target.value)}
            onBlur={() => handleBlur('diameter')}
            style={inputStyle('diameter')}
          />
          {isInvalid('diameter') && (
            <div className="text-danger" style={{ fontSize: 11 }}>{errors.diameter}</div>
          )}
        </div>
      )}
      <div className="form-group">
        <label>Вес, кг</label>
        <input
          name="weight"
          type="number"
          min={FIELDS.weight.min}
          max={FIELDS.weight.max}
          placeholder="20"
          value={values.weight ?? ''}
          onChange={(e) => handleChange('weight', e.target.value)}
          onBlur={() => handleBlur('weight')}
          style={inputStyle('weight')}
        />
        {isInvalid('weight') && (
          <div className="text-danger" style={{ fontSize: 11 }}>{errors.weight}</div>
        )}
      </div>
      <div className="form-group">
        <label>Кол-во, шт</label>
        <input name="quantity" type="number" min={1} defaultValue={1} />
      </div>
      {error && <div className="form-group full text-muted text-danger">{error}</div>}
      <div className="form-group full">
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={hasErrors}
        >
          + Добавить груз
        </button>
      </div>
    </form>
  );
}