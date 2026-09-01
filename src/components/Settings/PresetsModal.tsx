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
import { tr, trf } from '../../i18n';

interface Props {
  onClose: () => void;
}

type Tab = 'vehicles' | 'cargo';

export default function PresetsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('vehicles');
  const lang = useAppStore((s) => s.lang);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3><Package size={18} /> {tr(lang, 'presets.title')}</h3>

        {/* Tabs */}
        <div className="variant-tabs mb-2">
          <button
            type="button"
            className={`variant-tab ${tab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setTab('vehicles')}
          >
            <Truck size={14} /> {tr(lang, 'presets.vehicles')}
          </button>
          <button
            type="button"
            className={`variant-tab ${tab === 'cargo' ? 'active' : ''}`}
            onClick={() => setTab('cargo')}
          >
            <Package size={14} /> {tr(lang, 'presets.cargo')}
          </button>
        </div>

        {tab === 'vehicles' ? <VehiclesTab /> : <CargoTab />}

        <div className="row row-end mt-2">
          <button className="btn" onClick={onClose}>{tr(lang, 'presets.close')}</button>
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
  const lang = useAppStore((s) => s.lang);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [hiddenBuiltIn, setHiddenBuiltIn] = useState<Set<string>>(new Set());

  const builtIn = getDefaultVehicles();

  const handleDeleteBuiltIn = (id: string) => {
    if (window.confirm(tr(lang, 'form.confirmHidePreset'))) {
      setHiddenBuiltIn((prev) => new Set(prev).add(id));
    }
  };

  const handleDeleteCustom = (id: string) => {
    if (window.confirm(tr(lang, 'form.confirmDeleteVehicle'))) {
      removeCustomVehicle(id);
    }
  };

  return (
    <div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* Standard presets */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          {tr(lang, 'presets.standard')}
        </div>
        {builtIn.filter((v) => !hiddenBuiltIn.has(v.id)).map((v) => (
          <div
            key={v.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
            }}
          >
            <span>{v.name} — {toUnit(v.length, unit)}×{toUnit(v.width, unit)}×{toUnit(v.height, unit)} {UNIT_LABEL[unit]}, {trf(lang, 'form.maxWeightKgFmt', { weight: v.maxWeight })}</span>
            <button
              type="button"
              onClick={() => handleDeleteBuiltIn(v.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
              }}
              title={tr(lang, 'presets.hide')}
              >
               <X size={14} />
             </button>
           </div>
         ))}

         {/* Custom presets */}
         {customVehicles.length > 0 && (
           <>
             <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>
               {tr(lang, 'presets.custom')}
             </div>
             {customVehicles.map((v) => (
               <div key={v.id}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
                  }}
                >
            <span>{v.name} — {toUnit(v.length, unit)}×{toUnit(v.width, unit)}×{toUnit(v.height, unit)} {UNIT_LABEL[unit]}, {trf(lang, 'form.maxWeightKgFmt', { weight: v.maxWeight })}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setEditId(editId === v.id ? null : v.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, padding: '0 4px' }}
                      title={tr(lang, 'presets.edit')}
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
                      title={tr(lang, 'presets.delete')}
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
          {showAdd ? tr(lang, 'form.hideForm') : tr(lang, 'form.addOwnVehicle')}
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
  const lang = useAppStore((s) => s.lang);
  const [name, setName] = useState(vehicle.name);
  const [length, setLength] = useState(Math.round(toUnit(vehicle.length, unit) * 100) / 100);
  const [width, setWidth] = useState(Math.round(toUnit(vehicle.width, unit) * 100) / 100);
  const [height, setHeight] = useState(Math.round(toUnit(vehicle.height, unit) * 100) / 100);
  const [weight, setWeight] = useState(vehicle.maxWeight);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name) { setError(tr(lang, 'form.nameRequired')); return; }
    if (!length || !width || !height || !weight) { setError(tr(lang, 'form.fillAll')); return; }
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
        <label>{tr(lang, 'form.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>{trf(lang, 'form.dimLength', { unit: UNIT_LABEL[unit] })}</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>{trf(lang, 'form.dimWidth', { unit: UNIT_LABEL[unit] })}</label>
        <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>{trf(lang, 'form.dimHeight', { unit: UNIT_LABEL[unit] })}</label>
        <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>{tr(lang, 'form.maxWeightKg')}</label>
        <input type="number" min={1} value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} />
      </div>
      {error && <div className="form-group full text-danger" style={{ fontSize: 12 }}>{error}</div>}
      <div className="form-group full" style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave}><Save size={14} /> {tr(lang, 'btn.save')}</button>
        <button type="button" className="btn" onClick={onCancel}>{tr(lang, 'btn.cancel')}</button>
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
  const lang = useAppStore((s) => s.lang);
  const builtInPresets = CARGO_PRESETS;
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [hiddenBuiltIn, setHiddenBuiltIn] = useState<Set<number>>(new Set());

  return (
    <div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* Standard presets */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          {tr(lang, 'presets.standard')}
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
              <span>{p.name} — {toUnit(p.length, unit)}×{toUnit(p.width, unit)}×{toUnit(p.height, unit)} {UNIT_LABEL[unit]}, {trf(lang, 'form.maxWeightKgFmt', { weight: p.weight })}</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(tr(lang, 'form.confirmHideVehicle'))) {
                    setHiddenBuiltIn((prev) => new Set(prev).add(idx));
                  }
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
                }}
                title={tr(lang, 'presets.hide')}
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
              {tr(lang, 'presets.custom')}
            </div>
            {customCargoPresets.map((p, idx) => (
              <div key={p.name + idx}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
                  }}
                >
                  <span>{p.name} — {toUnit(p.length, unit)}×{toUnit(p.width, unit)}×{toUnit(p.height, unit)} {UNIT_LABEL[unit]}, {trf(lang, 'form.maxWeightKgFmt', { weight: p.weight })}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setEditIdx(editIdx === idx ? null : idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, padding: '0 4px' }}
                      title={tr(lang, 'presets.edit')}
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
                      title={tr(lang, 'presets.delete')}
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
          {showAdd ? tr(lang, 'form.hideForm') : tr(lang, 'form.addOwnPreset')}
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
  const lang = useAppStore((s) => s.lang);
  const [name, setName] = useState('');
  const [shape, setShape] = useState<CargoShape>('box');
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [weight, setWeight] = useState(0);
  const [diameter, setDiameter] = useState(0);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name) { setError(tr(lang, 'form.nameRequired')); return; }
    if (!length || !weight) { setError(tr(lang, 'form.lenWeightRequired')); return; }
    if (shape === 'box' && (!width || !height)) { setError(tr(lang, 'form.whRequired')); return; }
    if (shape === 'cylinder' && !diameter) { setError(tr(lang, 'form.diameterRequired')); return; }

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
        <label>{tr(lang, 'form.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr(lang, 'form.myPreset')} />
      </div>
      <div className="form-group">
        <label>{tr(lang, 'pd.form')}</label>
        <select value={shape} onChange={(e) => setShape(e.target.value as CargoShape)}>
          <option value="box">{tr(lang, 'shape.rect')}</option>
          <option value="cylinder">{tr(lang, 'shape.cylinder')}</option>
        </select>
      </div>
      <div className="form-group">
        <label>{trf(lang, 'form.dimLength', { unit: UNIT_LABEL[unit] })}</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>{trf(lang, 'form.dimWidth', { unit: UNIT_LABEL[unit] })}</label>
            <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{trf(lang, 'form.dimHeight', { unit: UNIT_LABEL[unit] })}</label>
            <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>{trf(lang, 'form.dimDiameter', { unit: UNIT_LABEL[unit] })}</label>
          <input type="number" min={1} value={diameter || ''} onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
      )}
      <div className="form-group">
        <label>{tr(lang, 'form.weightKg')}</label>
        <input type="number" min={1} value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} />
      </div>
      {error && <div className="form-group full text-danger" style={{ fontSize: 12 }}>{error}</div>}
      <div className="form-group full">
        <button type="button" className="btn btn-primary w-full" onClick={handleSave}>
          <Save size={14} /> {tr(lang, 'form.savePreset')}
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
  const lang = useAppStore((s) => s.lang);
  const [shape, setShape] = useState<CargoShape>(preset.shape ?? 'box');
  const [name, setName] = useState(preset.name);
  const [length, setLength] = useState(Math.round(toUnit(preset.length, unit) * 100) / 100);
  const [width, setWidth] = useState(preset.width ? Math.round(toUnit(preset.width, unit) * 100) / 100 : 0);
  const [height, setHeight] = useState(preset.height ? Math.round(toUnit(preset.height, unit) * 100) / 100 : 0);
  const [diameter, setDiameter] = useState(preset.diameter ? Math.round(toUnit(preset.diameter, unit) * 100) / 100 : 0);
  const [weight, setWeight] = useState(preset.weight);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name) { setError(tr(lang, 'form.nameRequired')); return; }
    if (!length || !weight) { setError(tr(lang, 'form.lenWeightRequired')); return; }
    if (shape === 'box' && (!width || !height)) { setError(tr(lang, 'form.whRequired')); return; }
    if (shape === 'cylinder' && !diameter) { setError(tr(lang, 'form.diameterRequired')); return; }
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
        <label>{tr(lang, 'form.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>{tr(lang, 'pd.form')}</label>
        <select value={shape} onChange={(e) => setShape(e.target.value as CargoShape)}>
          <option value="box">{tr(lang, 'shape.rect')}</option>
          <option value="cylinder">{tr(lang, 'shape.cylinder')}</option>
        </select>
      </div>
      <div className="form-group">
        <label>{trf(lang, 'form.dimLength', { unit: UNIT_LABEL[unit] })}</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>{trf(lang, 'form.dimWidth', { unit: UNIT_LABEL[unit] })}</label>
            <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{trf(lang, 'form.dimHeight', { unit: UNIT_LABEL[unit] })}</label>
            <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>{trf(lang, 'form.dimDiameter', { unit: UNIT_LABEL[unit] })}</label>
          <input type="number" min={1} value={diameter || ''} onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
      )}
      <div className="form-group">
        <label>{tr(lang, 'form.weightKg')}</label>
        <input type="number" min={1} value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} />
      </div>
      {error && <div className="form-group full text-danger" style={{ fontSize: 12 }}>{error}</div>}
      <div className="form-group full" style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave}><Save size={14} /> {tr(lang, 'btn.save')}</button>
        <button type="button" className="btn" onClick={onCancel}>{tr(lang, 'btn.cancel')}</button>
      </div>
    </div>
  );
}


