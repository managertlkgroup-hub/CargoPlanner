// ============================================================================
// Форма добавления нового груза
// ============================================================================

import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Cargo, CargoShape } from '../../types';
import { uid, fromUnit, toUnit, UNIT_LABEL, WEIGHT_UNIT_LABEL, formatWeight, toWeightUnit, fromWeightUnit, nameOf, formatDimension } from '../../utils/helpers';
import { getCargoPresets } from '../../lib/packer/presets';
import { tr, trf, type Lang } from '../../i18n';

/** Валидация числового поля. min/max — в базовых единицах (мм/кг), fmtMin/fmtMax — для показа в текущих единицах. */
function validateField(
  value: number,
  min: number,
  max: number,
  label: string,
  lang: Lang,
  fmtMin: string,
  fmtMax: string,
  unitName: string,
): string | null {
  if (!value || value <= 0) return trf(lang, 'form.fieldRequired', { label });
  if (value < min || value > max) return trf(lang, 'form.fieldRange', { label, min: fmtMin, max: fmtMax, u: unitName });
  return null;
}

const FIELDS = {
  length: { min: 50, max: 20000, labelKey: 'form.length' },
  width: { min: 50, max: 5000, labelKey: 'form.width' },
  height: { min: 50, max: 5000, labelKey: 'form.height' },
  diameter: { min: 50, max: 5000, labelKey: 'form.diameter' },
  weight: { min: 0.1, max: 50000, labelKey: 'form.weight' },
} as const;

export default function AddCargoForm() {
  const addCargo = useAppStore((s) => s.addCargo);
  const customCargoPresets = useAppStore((s) => s.customCargoPresets);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const [error, setError] = useState('');
  const builtInPresets = getCargoPresets();
  const cargoPresets = [...builtInPresets, ...customCargoPresets];

  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(FIELDS)) {
      const num = Number(values[key] || 0);
      const isWeight = key === 'weight';
      // Приводим введённое значение к базовым единицам (мм/кг) для сравнения
      const value = isWeight ? fromWeightUnit(num, weightUnit) : fromUnit(num, unit);
      const label = tr(lang, cfg.labelKey);
      const fmt = (mmKg: number) =>
        isWeight
          ? (Math.round(toWeightUnit(mmKg, weightUnit) * 10000) / 10000).toString()
          : formatDimension(mmKg, unit);
      const u = isWeight ? WEIGHT_UNIT_LABEL[weightUnit] : UNIT_LABEL[unit];
      const err = validateField(value, cfg.min, cfg.max, label, lang, fmt(cfg.min), fmt(cfg.max), u);
      if (err) e[key] = err;
    }
    return e;
  }, [values, lang, unit, weightUnit]);

  const hasErrors = !values.name?.trim();
  const isInvalid = (key: string) => touched[key] && errors[key];

  // Validate on submit (not on every keystroke, since DOM may have values not in React state)
  const validateOnSubmit = (fd: FormData) => {
    const allErrors: string[] = [];
    const name = String(fd.get('name') || '').trim();
    if (!name) { allErrors.push(tr(lang, 'form.nameRequired')); }
    const length = fromUnit(Number(fd.get('length')), unit);
    const width = fromUnit(Number(fd.get('width')), unit);
    const height = fromUnit(Number(fd.get('height')), unit);
    const diameter = fromUnit(Number(fd.get('diameter')), unit);
    const weight = fromWeightUnit(Number(fd.get('weight')), weightUnit);
    const shape = fd.get('shape') as CargoShape;
    const fmtDim = (mm: number) => formatDimension(mm, unit);
    const fmtW = (kg: number) => (Math.round(toWeightUnit(kg, weightUnit) * 10000) / 10000).toString();
    const lengthErr = validateField(length, FIELDS.length.min, FIELDS.length.max, tr(lang, FIELDS.length.labelKey), lang, fmtDim(FIELDS.length.min), fmtDim(FIELDS.length.max), UNIT_LABEL[unit]);
    if (lengthErr) allErrors.push(lengthErr);
    const weightErr = validateField(weight, FIELDS.weight.min, FIELDS.weight.max, tr(lang, FIELDS.weight.labelKey), lang, fmtW(FIELDS.weight.min), fmtW(FIELDS.weight.max), WEIGHT_UNIT_LABEL[weightUnit]);
    if (weightErr) allErrors.push(weightErr);
    if (shape === 'box') {
      const wErr = validateField(width, FIELDS.width.min, FIELDS.width.max, tr(lang, FIELDS.width.labelKey), lang, fmtDim(FIELDS.width.min), fmtDim(FIELDS.width.max), UNIT_LABEL[unit]);
      if (wErr) allErrors.push(wErr);
      const hErr = validateField(height, FIELDS.height.min, FIELDS.height.max, tr(lang, FIELDS.height.labelKey), lang, fmtDim(FIELDS.height.min), fmtDim(FIELDS.height.max), UNIT_LABEL[unit]);
      if (hErr) allErrors.push(hErr);
    } else {
      const dErr = validateField(diameter, FIELDS.diameter.min, FIELDS.diameter.max, tr(lang, FIELDS.diameter.labelKey), lang, fmtDim(FIELDS.diameter.min), fmtDim(FIELDS.diameter.max), UNIT_LABEL[unit]);
      if (dErr) allErrors.push(dErr);
    }
    return allErrors;
  };

  const handleChange = (key: string, val: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: val };
      // Ручное редактирование имени отвязывает от пресета
      if (key === 'name') delete next.nameKey;
      return next;
    });
  };

  const handleBlur = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const shape = (fd.get('shape') as CargoShape) || 'box';
    const length = fromUnit(Number(fd.get('length')), unit);
    const width = fromUnit(Number(fd.get('width')), unit);
    const height = fromUnit(Number(fd.get('height')), unit);
    const diameter = fromUnit(Number(fd.get('diameter')), unit);
    const weight = fromWeightUnit(Number(fd.get('weight')), weightUnit);
    const quantity = Math.max(1, Math.floor(Number(fd.get('quantity')) || 1));

    if (!name) return setError(tr(lang, 'form.nameRequiredCargo'));

    // Validate all fields on submit
    const allErrors = validateOnSubmit(fd);
    if (allErrors.length > 0) {
      setError(allErrors[0]);
      setTouched({
        name: true, length: true, width: true,
        height: true, diameter: true, weight: true,
      });
      return;
    }

    const cargo: Cargo = {
      id: uid(),
      name,
      nameKey: values.nameKey as string | undefined,
      shape,
      length,
      width: shape === 'box' ? width : undefined,
      height: shape === 'box' ? height : undefined,
      diameter: shape === 'cylinder' ? diameter : undefined,
      weight,
      quantity,
      stackable: shape !== 'cylinder' ? true : fd.get('stackMode') === 'stack',
      isOversize: (fd.get('isOversize') === 'on'),
      cylinderOrientation: shape === 'cylinder' ? ((fd.get('cylinderOrientation') as any) || 'horizontal') : undefined,
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
    const conv = (mm: number) => Math.round(toUnit(mm, unit) * 100) / 100;
    const pName = nameOf(preset, lang);
    setValues({
      name: pName,
      ...(preset.nameKey ? { nameKey: preset.nameKey } : {}),
      length: String(conv(preset.length)),
      width: String(conv(preset.width)),
      height: String(conv(preset.height)),
      diameter: String(conv(preset.diameter || preset.width)),
      weight: String(weightUnit === 'ton' ? Math.round(toWeightUnit(preset.weight, weightUnit) * 100) / 100 : preset.weight),
    });
    setTouched({});
    setShape(preset.shape);
    // Also update native form fields for FormData
    const form = e.currentTarget.closest('form');
    if (!form) return;
    const q = (n: string) => form.querySelector(n) as HTMLInputElement | HTMLSelectElement | null;
    const setVal = (n: string, v: string) => { const el = q(n); if (el) el.value = v; };
    setVal('name', pName);
    setVal('shape', preset.shape);
    setShape(preset.shape);
    setVal('length', String(conv(preset.length)));
    if (preset.shape === 'box') {
      setVal('width', String(conv(preset.width)));
      setVal('height', String(conv(preset.height)));
    } else {
      setVal('diameter', String(conv(preset.diameter || preset.width)));
    }
    setVal('weight', String(weightUnit === 'ton' ? Math.round(toWeightUnit(preset.weight, weightUnit) * 100) / 100 : preset.weight));
  };

  const inputStyle = (key: string) =>
    isInvalid(key)
      ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' }
      : {};

  return (
    <form className="form-grid mt-2 add-cargo-form" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>{tr(lang, 'form.quickPick')}</label>
        <select onChange={handlePresetChange} defaultValue="">
          <option value="" disabled>{tr(lang, 'form.selectPreset')}</option>
          <optgroup label={tr(lang, 'form.optgroupStandard')}>
            {builtInPresets.map((preset, idx) => (
              <option key={preset.nameKey} value={idx}>
                {nameOf(preset, lang)} ({formatDimension(preset.length, unit)}×{formatDimension(preset.width, unit)}×{formatDimension(preset.height, unit)} {UNIT_LABEL[unit]}, {formatWeight(preset.weight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]})
              </option>
            ))}
          </optgroup>
          {customCargoPresets.length > 0 && (
            <optgroup label={tr(lang, 'form.optgroupMine')}>
              {customCargoPresets.map((preset, idx) => (
                <option key={preset.name + idx} value={builtInPresets.length + idx}>
                  {preset.name} ({formatDimension(preset.length, unit)}×{formatDimension(preset.width, unit)}×{formatDimension(preset.height, unit)} {UNIT_LABEL[unit]}, {formatWeight(preset.weight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <div className="form-group full">
        <label>{tr(lang, 'form.name')}</label>
        <input
          name="name"
          placeholder={tr(lang, 'form.placeholderPallet')}
          maxLength={100}
          value={values.name ?? ''}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          style={touched.name && !values.name?.trim() ? { borderColor: '#ef4444' } : {}}
        />
        {touched.name && !values.name?.trim() && (
          <div className="text-danger" style={{ fontSize: 11 }}>{tr(lang, 'form.nameRequiredCargo')}</div>
        )}
      </div>
      <div className="form-group">
        <label>{tr(lang, 'pd.form')}</label>
        <select
          name="shape"
          value={shape}
          onChange={(e) => setShape(e.target.value as CargoShape)}
        >
          <option value="box">{tr(lang, 'shape.rect')}</option>
          <option value="cylinder">{tr(lang, 'shape.cylinder')}</option>
        </select>
      </div>
      {shape === 'cylinder' && (
        <>
          <div className="form-group">
            <label>{tr(lang, 'form.orientation')}</label>
            <select name="cylinderOrientation" defaultValue="horizontal">
              <option value="horizontal">{tr(lang, 'form.horizontal')}</option>
              <option value="vertical">{tr(lang, 'form.vertical')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{tr(lang, 'pd.stackingMethod')}</label>
            <select name="stackMode" defaultValue="stack">
              <option value="stack">{tr(lang, 'pd.stacking')}</option>
              <option value="side">{tr(lang, 'pd.sideBySide')}</option>
            </select>
          </div>
        </>
      )}
      <div className="form-group">
        <label>{tr(lang, 'form.length')}, {UNIT_LABEL[unit]}</label>
        <input
          name="length"
          type="number"
          step="any"
          min={toUnit(FIELDS.length.min, unit)}
          max={toUnit(FIELDS.length.max, unit)}
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
            <label>{tr(lang, 'form.width')}, {UNIT_LABEL[unit]}</label>
            <input
              name="width"
              type="number"
              step="any"
              min={toUnit(FIELDS.width.min, unit)}
              max={toUnit(FIELDS.width.max, unit)}
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
            <label>{tr(lang, 'form.height')}, {UNIT_LABEL[unit]}</label>
            <input
              name="height"
              type="number"
              step="any"
              min={toUnit(FIELDS.height.min, unit)}
              max={toUnit(FIELDS.height.max, unit)}
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
          <label>{tr(lang, 'form.diameter')}, {UNIT_LABEL[unit]}</label>
          <input
            name="diameter"
            type="number"
            step="any"
            min={toUnit(FIELDS.diameter.min, unit)}
            max={toUnit(FIELDS.diameter.max, unit)}
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
        <label>{tr(lang, 'form.weight')}, {WEIGHT_UNIT_LABEL[weightUnit]}</label>
        <input
          name="weight"
          type="number"
          step="any"
          min={toWeightUnit(FIELDS.weight.min, weightUnit)}
          max={toWeightUnit(FIELDS.weight.max, weightUnit)}
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
        <label>{tr(lang, 'form.qty')}</label>
        <input name="quantity" type="number" min={1} defaultValue={1} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" name="isOversize" style={{ width: 14, height: 14 }} />
          {tr(lang, 'form.oversize')}
        </label>
      </div>
      {error && <div className="form-group full text-muted text-danger">{error}</div>}
      <div className="form-group full">
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={hasErrors}
        >
          {tr(lang, 'form.submitAdd')}
        </button>
      </div>
    </form>
  );
}