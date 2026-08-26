// ============================================================================
// Модальное окно управления пресетами (автомобили + грузы)
// ============================================================================

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getDefaultVehicles, CARGO_PRESETS, type CargoPreset } from '../../lib/packer/presets';
import type { CargoShape } from '../../types';
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
        <h3>📦 Управление пресетами</h3>

        {/* Tabs */}
        <div className="variant-tabs mb-2">
          <button
            type="button"
            className={`variant-tab ${tab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setTab('vehicles')}
          >
            🚚 Автомобили
          </button>
          <button
            type="button"
            className={`variant-tab ${tab === 'cargo' ? 'active' : ''}`}
            onClick={() => setTab('cargo')}
          >
            📦 Грузы
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
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const [showAdd, setShowAdd] = useState(false);

  const builtIn = getDefaultVehicles();

  const handleDelete = (id: string) => {
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
        {builtIn.map((v) => (
          <div
            key={v.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 6, marginBottom: 2,
              background: selectedVehicleId === v.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              cursor: 'pointer', fontSize: 13,
            }}
            onClick={() => selectVehicle(v.id)}
          >
            <span>{v.name} — {v.length}×{v.width}×{v.height} мм, {v.maxWeight} кг</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>✓</span>
          </div>
        ))}

        {/* Custom presets */}
        {customVehicles.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>
              Пользовательские
            </div>
            {customVehicles.map((v) => (
              <div
                key={v.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', borderRadius: 6, marginBottom: 2,
                  background: selectedVehicleId === v.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                  cursor: 'pointer', fontSize: 13,
                }}
                onClick={() => selectVehicle(v.id)}
              >
                <span>{v.name} — {v.length}×{v.width}×{v.height} мм, {v.maxWeight} кг</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
                  }}
                  title="Удалить"
                >
                  ✕
                </button>
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

// ─── Cargo Tab ───────────────────────────────────────────────────────────────

function CargoTab() {
  const customCargoPresets = useAppStore((s) => s.customCargoPresets);
  const removeCustomCargoPreset = useAppStore((s) => s.removeCustomCargoPreset);
  const builtInPresets = CARGO_PRESETS;
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* Standard presets */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          Стандартные
        </div>
        {builtInPresets.map((p, idx) => (
          <PresetRow key={p.name + idx} preset={p} />
        ))}

        {/* Custom presets */}
        {customCargoPresets.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>
              Пользовательские
            </div>
            {customCargoPresets.map((p, idx) => (
              <div
                key={p.name + idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
                }}
              >
                <span>{p.name} — {p.length}×{p.width}×{p.height} мм, {p.weight} кг</span>
                <button
                  type="button"
                  onClick={() => removeCustomCargoPreset(idx)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, padding: '0 4px',
                  }}
                  title="Удалить"
                >
                  ✕
                </button>
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

function PresetRow({ preset }: { preset: CargoPreset }) {
  return (
    <div
      style={{
        padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 13,
      }}
    >
      {preset.name} — {preset.length}×{preset.width}×{preset.height} мм, {preset.weight} кг
    </div>
  );
}

function AddCargoPresetForm({ onDone }: { onDone: () => void }) {
  const addCustomCargoPreset = useAppStore((s) => s.addCustomCargoPreset);
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
      name, shape, length, width, height, weight,
      diameter: shape === 'cylinder' ? diameter : undefined,
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
        <label>Длина, мм</label>
        <input type="number" min={1} value={length || ''} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      {shape === 'box' ? (
        <>
          <div className="form-group">
            <label>Ширина, мм</label>
            <input type="number" min={1} value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Высота, мм</label>
            <input type="number" min={1} value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Диаметр, мм</label>
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
          💾 Сохранить пресет
        </button>
      </div>
    </div>
  );
}


