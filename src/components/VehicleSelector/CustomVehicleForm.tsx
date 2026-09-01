// ============================================================================
// Форма создания пользовательского автомобиля
// ============================================================================

import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { uid, fromUnit, toUnit, UNIT_LABEL } from '../../utils/helpers';
import { LOADING_METHOD_LABELS, BODY_TYPE_LABELS } from '../../types';
import type { LoadingMethod, BodyType } from '../../types';
import { getDefaultMethodsForBodyType } from '../../lib/packer/presets';
import { tr, trf, type Lang } from '../../i18n';

const ALL_METHODS: LoadingMethod[] = [
  'rear', 'side', 'top', 'side_both', 'full_tent_removal',
  'crossbar_removal', 'post_removal', 'no_gate',
  'hydraulic_tail', 'ramps', 'lathing', 'with_sides',
];

const BODY_TYPES: BodyType[] = [
  'tent', 'curtain', 'van', 'isothermal', 'refrigerator',
  'side', 'platform', 'flatbed', 'low_loader', 'trailer',
  'dump', 'tanker', 'container', 'car_transporter',
  'concrete_mixer', 'grain_truck', 'log_truck', 'crane',
  'manipulator', 'evacuator', 'minibus', 'pickup',
  'horse_carrier', 'garbage_truck', 'jumbo', 'mega',
  'cement_truck', 'flour_truck', 'tractor', 'other',
];

interface Props {
  onDone: () => void;
}

/** Валидация числового поля */
function validateField(
  value: number,
  min: number,
  max: number,
  label: string,
  lang: Lang,
): string | null {
  if (!value || value <= 0) return trf(lang, 'form.fieldRequired', { label });
  if (value < min) return trf(lang, 'form.fieldRange', { label, min: min / 1000, max: max / 1000 });
  if (value > max) return trf(lang, 'form.fieldRange', { label, min: min / 1000, max: max / 1000 });
  return null;
}

function validateWeight(value: number, min: number, max: number, lang: Lang): string | null {
  if (!value || value <= 0) return tr(lang, 'form.maxWeightRequired');
  if (value < min) return tr(lang, 'form.maxWeightRequired');
  if (value > max) return tr(lang, 'form.maxWeightRequired');
  return null;
}

const FIELDS = {
  length: { min: 2000, max: 53500, labelKey: 'form.length' },
  width: { min: 1200, max: 10000, labelKey: 'form.width' },
  height: { min: 1000, max: 8500, labelKey: 'form.height' },
  maxWeight: { min: 50, max: 200000, labelKey: 'form.maxWeight' },
} as const;

export default function CustomVehicleForm({ onDone }: Props) {
  const addCustomVehicle = useAppStore((s) => s.addCustomVehicle);
  const unit = useAppStore((s) => s.unit);
  const lang = useAppStore((s) => s.lang);
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedBodyType, setSelectedBodyType] = useState<BodyType>('tent');
  const [loadingMethods, setLoadingMethods] = useState<LoadingMethod[]>(['rear']);
  const [unloadingMethods, setUnloadingMethods] = useState<LoadingMethod[]>(['rear']);

  const handleBodyTypeChange = (bt: BodyType) => {
    setSelectedBodyType(bt);
    const methods = getDefaultMethodsForBodyType(bt);
    setLoadingMethods(methods.loadingMethods);
    setUnloadingMethods(methods.unloadingMethods);
  };

  const toggleMethod = (list: LoadingMethod[], setList: (v: LoadingMethod[]) => void, m: LoadingMethod) => {
    setList(list.includes(m) ? list.filter(x => x !== m) : [...list, m]);
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(FIELDS)) {
      const numRaw = Number(values[key] || 0);
      const num = key === 'maxWeight' ? numRaw : fromUnit(numRaw, unit);
      const label = tr(lang, cfg.labelKey);
      const err = key === 'maxWeight'
        ? validateWeight(num, cfg.min, cfg.max, lang)
        : validateField(num, cfg.min, cfg.max, label, lang);
      if (err) e[key] = err;
    }
    return e;
  }, [values, unit, lang]);

  const hasErrors = !values.name?.trim();
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
    const length = fromUnit(Number(fd.get('length')), unit);
    const width = fromUnit(Number(fd.get('width')), unit);
    const height = fromUnit(Number(fd.get('height')), unit);
    const maxWeight = Number(fd.get('maxWeight'));

    if (!name) return setError(tr(lang, 'form.nameRequired'));

    // Mark all fields as touched to show errors
    setTouched({ name: true, length: true, width: true, height: true, maxWeight: true });

    // Validate all fields
    const allErrors: string[] = [];
    for (const [key, cfg] of Object.entries(FIELDS)) {
      const numRaw = Number(fd.get(key));
      const num = key === 'maxWeight' ? numRaw : fromUnit(numRaw, unit);
      const label = tr(lang, cfg.labelKey);
      const err = key === 'maxWeight'
        ? validateWeight(num, cfg.min, cfg.max, lang)
        : validateField(num, cfg.min, cfg.max, label, lang);
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
      bodyType: selectedBodyType,
      loadingMethods: loadingMethods.length > 0 ? loadingMethods : ['rear'],
      unloadingMethods: unloadingMethods.length > 0 ? unloadingMethods : ['rear'],
      defaultLoadingMethod: loadingMethods[0] ?? 'rear',
      defaultUnloadingMethod: unloadingMethods[0] ?? 'rear',
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
          placeholder={tr(lang, 'form.placeholderOwnVan')}
          value={values.name ?? ''}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          style={touched.name && !values.name?.trim() ? { borderColor: '#ef4444' } : {}}
        />
        {touched.name && !values.name?.trim() && (
          <div className="text-danger" style={{ fontSize: 11 }}>{tr(lang, 'form.nameRequired')}</div>
        )}
      </div>
      <div className="form-group">
        <label>{tr(lang, 'form.length')}, {UNIT_LABEL[unit]}</label>
        <input
          name="length"
          type="number"
          min={toUnit(FIELDS.length.min, unit)}
          max={toUnit(FIELDS.length.max, unit)}
          placeholder={String(Math.round(toUnit(5000, unit)))}
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
        <label>{tr(lang, 'form.width')}, {UNIT_LABEL[unit]}</label>
        <input
          name="width"
          type="number"
          min={toUnit(FIELDS.width.min, unit)}
          max={toUnit(FIELDS.width.max, unit)}
          placeholder={String(Math.round(toUnit(2400, unit)))}
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
          min={toUnit(FIELDS.height.min, unit)}
          max={toUnit(FIELDS.height.max, unit)}
          placeholder={String(Math.round(toUnit(2600, unit)))}
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
        <label>{tr(lang, 'form.maxWeight')}, кг</label>
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
      {/* Тип кузова */}
      <div className="form-group full">
        <label>Тип кузова</label>
        <select
          value={selectedBodyType}
          onChange={(e) => handleBodyTypeChange(e.target.value as BodyType)}
        >
          {BODY_TYPES.map(bt => (
            <option key={bt} value={bt}>{BODY_TYPE_LABELS[bt]}</option>
          ))}
        </select>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          Способы загрузки/выгрузки предустановлены для выбранного типа. Можно изменить вручную.
        </div>
      </div>
      {/* Способы загрузки */}
      <div className="form-group full">
        <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>Способы загрузки</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_METHODS.map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={loadingMethods.includes(m)}
                onChange={() => toggleMethod(loadingMethods, setLoadingMethods, m)}
              />
              {LOADING_METHOD_LABELS[m]}
            </label>
          ))}
        </div>
      </div>
      {/* Способы выгрузки */}
      <div className="form-group full">
        <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>Способы выгрузки</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_METHODS.map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={unloadingMethods.includes(m)}
                onChange={() => toggleMethod(unloadingMethods, setUnloadingMethods, m)}
              />
              {LOADING_METHOD_LABELS[m]}
            </label>
          ))}
        </div>
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