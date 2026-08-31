import { Package, Truck, X, Save, Pencil } from 'lucide-react';
// ============================================================================
// Модальное окно управления пресетами (автомобили + грузы)
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getDefaultVehicles, CARGO_PRESETS, type CargoPreset } from '../../lib/packer/presets';
import type { CargoShape, Vehicle } from '../../types';
import { UNIT_LABEL, toUnit, fromUnit } from '../../utils/helpers';
import CustomVehicleForm from '../VehicleSelector/CustomVehicleForm';

interface Props {
  onClose: () => void;
}

type Tab = 'vehicles' | 'cargo';

export default function PresetsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('vehicles');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3><Package size={18} /> Управление пресетами</h3>

        {/* Tabs */}
        <div className="variant-tabs mb-2">
          <button
            type="button"
            className={`variant-tab ${tab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setTab('vehicles')}
          >
            <Truck size={14} /> Автомобили
          </button>
          <button
            type="button"
            className={`variant-tab ${tab === 'cargo' ? 'active' : ''}`}
            onClick={() => setTab('cargo')}
          >
            <Package size={14} /> Грузы
          </button>
        </div>

        {tab === 'vehicles' ? <VehiclesTab /> : <CargoTab />}

        <div className="row row-end mt-2">
          <button className="btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicles Tab ────────────────────────────────────────────────────────────

function VehiclesTab() {
  const customVehicles = useAppStore((s) => s.customVehicles);
  const removeCustomVehicle = useAppStore((s) => s.removeCustomVehicle);
  const updateCustomVehicle = useAppStore((s) => s.updateCustomVehicle);
  const unit = useAppStore((s) => s.unit);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [hiddenBuiltIn, setHiddenBuiltIn] = useState<Set<string>>(new Set());

  const builtIn = getDefaultVehicles();

  const handleDeleteBuiltIn = (id: string) => {
    if (window.confirm('Скрыть стандартный пресет? (можно восстановить перезагрузкой)')) {
      setHiddenBuiltIn((prev) => new Set(prev).add(id));
    }
  };

  const handleDeleteCustom = (id: string) => {
    if (window.confirm('Удалить пользовательский автомобиль?')) {
      removeCustomVehicle(id);
    }
  };

  return (
    <div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* Standard presets */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          Стандартные
        </div>
        {builtIn.filter((v) => !hiddenBuiltIn.has(v.id)).map((v) => (
          <div
            key={v.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
            }}
          >
            <span>{v.name} — {toUnit(v.length, unit)}×{toUnit(v.width, unit)}×{toUnit(v.height, unit)} {UNIT_LABEL[unit]}, {v.maxWeight} кг</span>
            <button
              type="button"
              onClick={() => handleDeleteBuiltIn(v.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
              }}
              title="Скрыть"
              >
               <X size={14} />
             </button>
           </div>
         ))}

         {/* Custom presets */}
         {customVehicles.length > 0 && (
           <>
             <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>
               Пользовательские
             </div>
             {customVehicles.map((v) => (
               <div key={v.id}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
                  }}
                >
            <span>{v.name} — {toUnit(v.length, unit)}×{toUnit(v.width, unit)}×{toUnit(v.height, unit)} {UNIT_LABEL[unit]}, {v.maxWeight} кг</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setEditId(editId === v.id ? null : v.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, padding: '0 4px' }}
                      title="Изменить"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(v.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
                      }}
                      title="Удалить"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {editId === v.id && (
                  <EditVehicleForm
                    vehicle={v}
                    unit={unit}
                    onCancel={() => setEditId(null)}
                    onSave={(patch) => { updateCustomVehicle(v.id, patch); setEditId(null); }}
                  />
                )}
               </div>
             ))}
          </>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <button className="btn btn-sm w-full" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '− Скрыть форму' : '+ Добавить свой автомобиль'}
        </button>
        {showAdd && <CustomVehicleForm onDone={() => setShowAdd(false)} />}
      </div>
    </div>
  );
}

function EditVehicleForm({ vehicle, unit, onSave, onCancel }: {
  vehicle: Vehicle;
  unit: 'mm' | 'cm' | 'm';
  onSave: (patch: Partial<Vehicle>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(vehicle.name);
  const [length, setLength] = useState(Math.round(toUnit(vehicle.length, unit) * 100) / 100);
  const [width, setWidth] = useState(Math.round(toUnit(vehicle.width, unit) * 100) / 100);
  const [height, setHeight] = useState(Math.round(toUnit(vehicle.height, unit) * 100) / 100);
  const [weight, setWeight] = useState(vehicle.maxWeight);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name) { setError('Укажите название.'); return; }
    if (!length || !width || !height || !weight) { setError('Заполните все поля.'); return; }
    onSave({
      name,
      length: fromUnit(length, unit),
      width: fromUnit(width, unit),
      height: fromUnit(height, unit),
      maxWeight: weight,
    });
  };

  return (
    <div className="form-grid mt-2" style={{ gap: 8, background: 'var(--bg-input)', padding: 8, borderRadius: 6 }}>
      <div className="form-group full">
        <label>Название</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Длина, {UNIT_LABEL[unit]}</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>Ширина, {UNIT_LABEL[unit]}</label>
        <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>Высота, {UNIT_LABEL[unit]}</label>
        <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>Грузоподъёмность, кг</label>
        <input type="number" min={1} value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} />
      </div>
      {error && <div className="form-group full text-danger" style={{ fontSize: 12 }}>{error}</div>}
      <div className="form-group full" style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave}><Save size={14} /> Сохранить</button>
        <button type="button" className="btn" onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
}

// ─── Cargo Tab ───────────────────────────────────────────────────────────────

function CargoTab() {
  const customCargoPresets = useAppStore((s) => s.customCargoPresets);
  const removeCustomCargoPreset = useAppStore((s) => s.removeCustomCargoPreset);
  const updateCustomCargoPreset = useAppStore((s) => s.updateCustomCargoPreset);
  const unit = useAppStore((s) => s.unit);
  const builtInPresets = CARGO_PRESETS;
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [hiddenBuiltIn, setHiddenBuiltIn] = useState<Set<number>>(new Set());

  return (
    <div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* Standard presets */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          Стандартные
        </div>
        {builtInPresets.map((p, idx) => (
          hiddenBuiltIn.has(idx) ? null : (
            <div
              key={p.name + idx}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
              }}
            >
              <span>{p.name} — {toUnit(p.length, unit)}×{toUnit(p.width, unit)}×{toUnit(p.height, unit)} {UNIT_LABEL[unit]}, {p.weight} кг</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Скрыть стандартный пресет?')) {
                    setHiddenBuiltIn((prev) => new Set(prev).add(idx));
                  }
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
                }}
                title="Скрыть"
              >
                <X size={14} />
              </button>
            </div>
          )
        ))}

        {/* Custom presets */}
        {customCargoPresets.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>
              Пользовательские
            </div>
            {customCargoPresets.map((p, idx) => (
              <div key={p.name + idx}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
                  }}
                >
                  <span>{p.name} — {toUnit(p.length, unit)}×{toUnit(p.width, unit)}×{toUnit(p.height, unit)} {UNIT_LABEL[unit]}, {p.weight} кг</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setEditIdx(editIdx === idx ? null : idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, padding: '0 4px' }}
                      title="Изменить"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomCargoPreset(idx)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
                      }}
                      title="Удалить"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {editIdx === idx && (
                  <EditCargoPresetForm
                    preset={p}
                    onCancel={() => setEditIdx(null)}
                    onSave={(next) => {
                      updateCustomCargoPreset(idx, next);
                      setEditIdx(null);
                    }}
                  />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <button className="btn btn-sm w-full" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '− Скрыть форму' : '+ Добавить свой пресет'}
        </button>
        {showAdd && <AddCargoPresetForm onDone={() => setShowAdd(false)} />}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────



function AddCargoPresetForm({ onDone }: { onDone: () => void }) {
  const addCustomCargoPreset = useAppStore((s) => s.addCustomCargoPreset);
  const unit = useAppStore((s) => s.unit);
  const [name, setName] = useState('');
  const [shape, setShape] = useState<CargoShape>('box');
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [weight, setWeight] = useState(0);
  const [diameter, setDiameter] = useState(0);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name) { setError('Укажите название.'); return; }
    if (!length || !weight) { setError('Длина и вес обязательны.'); return; }
    if (shape === 'box' && (!width || !height)) { setError('Укажите ширину и высоту.'); return; }
    if (shape === 'cylinder' && !diameter) { setError('Укажите диаметр.'); return; }

    const preset: CargoPreset = {
      name, shape,
      length: fromUnit(length, unit),
      width: fromUnit(width, unit),
      height: fromUnit(height, unit),
      weight,
      diameter: shape === 'cylinder' ? fromUnit(diameter, unit) : undefined,
    };
    addCustomCargoPreset(preset);
    onDone();
  };

  return (
    <div className="form-grid mt-2" style={{ gap: 8 }}>
      <div className="form-group full">
        <label>Название</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Мой пресет" />
      </div>
      <div className="form-group">
        <label>Форма</label>
        <select value={shape} onChange={(e) => setShape(e.target.value as CargoShape)}>
          <option value="box">Прямоугольный</option>
          <option value="cylinder">Цилиндр</option>
        </select>
      </div>
      <div className="form-group">
        <label>Длина, {UNIT_LABEL[unit]}</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>Ширина, {UNIT_LABEL[unit]}</label>
            <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Высота, {UNIT_LABEL[unit]}</label>
            <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Диаметр, {UNIT_LABEL[unit]}</label>
          <input type="number" min={1} value={diameter || ''} onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
      )}
      <div className="form-group">
        <label>Вес, кг</label>
        <input type="number" min={1} value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} />
      </div>
      {error && <div className="form-group full text-danger" style={{ fontSize: 12 }}>{error}</div>}
      <div className="form-group full">
        <button type="button" className="btn btn-primary w-full" onClick={handleSave}>
          <Save size={14} /> Сохранить пресет
        </button>
      </div>
    </div>
  );
}

function EditCargoPresetForm({ preset, onSave, onCancel }: {
  preset: CargoPreset;
  onSave: (patch: Partial<CargoPreset>) => void;
  onCancel: () => void;
}) {
  const unit = useAppStore((s) => s.unit);
  const [shape, setShape] = useState<CargoShape>(preset.shape ?? 'box');
  const [name, setName] = useState(preset.name);
  const [length, setLength] = useState(Math.round(toUnit(preset.length, unit) * 100) / 100);
  const [width, setWidth] = useState(preset.width ? Math.round(toUnit(preset.width, unit) * 100) / 100 : 0);
  const [height, setHeight] = useState(preset.height ? Math.round(toUnit(preset.height, unit) * 100) / 100 : 0);
  const [diameter, setDiameter] = useState(preset.diameter ? Math.round(toUnit(preset.diameter, unit) * 100) / 100 : 0);
  const [weight, setWeight] = useState(preset.weight);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name) { setError('Укажите название.'); return; }
    if (!length || !weight) { setError('Длина и вес обязательны.'); return; }
    if (shape === 'box' && (!width || !height)) { setError('Укажите ширину и высоту.'); return; }
    if (shape === 'cylinder' && !diameter) { setError('Укажите диаметр.'); return; }
    onSave({
      name, shape,
      length: fromUnit(length, unit),
      width: fromUnit(width, unit),
      height: fromUnit(height, unit),
      weight,
      diameter: shape === 'cylinder' ? fromUnit(diameter, unit) : undefined,
    });
  };

  return (
    <div className="form-grid mt-2" style={{ gap: 8, background: 'var(--bg-input)', padding: 8, borderRadius: 6 }}>
      <div className="form-group full">
        <label>Название</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Форма</label>
        <select value={shape} onChange={(e) => setShape(e.target.value as CargoShape)}>
          <option value="box">Прямоугольный</option>
          <option value="cylinder">Цилиндр</option>
        </select>
      </div>
      <div className="form-group">
        <label>Длина, {UNIT_LABEL[unit]}</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>Ширина, {UNIT_LABEL[unit]}</label>
            <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Высота, {UNIT_LABEL[unit]}</label>
            <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Диаметр, {UNIT_LABEL[unit]}</label>
          <input type="number" min={1} value={diameter || ''} onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
      )}
      <div className="form-group">
        <label>Вес, кг</label>
        <input type="number" min={1} value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} />
      </div>
      {error && <div className="form-group full text-danger" style={{ fontSize: 12 }}>{error}</div>}
      <div className="form-group full" style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave}><Save size={14} /> Сохранить</button>
        <button type="button" className="btn" onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
}


