import { Truck, Package, Pencil, ClipboardList, X, Save, AlertTriangle } from 'lucide-react';
// ============================================================================
// Выдвижная панель с деталями пресета (автомобиль или груз)
// ============================================================================

import { useState } from 'react';
import type { Cargo, Vehicle } from '../../types';
import { getDefaultMethodsForBodyType } from '../../lib/packer/presets';
import { useAppStore, getCurrentVehicle } from '../../store/useAppStore';
import { uid, UNIT_LABEL, toUnit, fromUnit, formatWeight, WEIGHT_UNIT_LABEL, fromWeightUnit, toWeightUnit, nameOf } from '../../utils/helpers';
import { tr, trf } from '../../i18n';

interface VehiclePanelProps {
  vehicleId: string;
  onClose: () => void;
}

export function VehicleDetailsPanel({ vehicleId, onClose }: VehiclePanelProps) {
  const customVehicles = useAppStore((s) => s.customVehicles);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const [editId, setEditId] = useState(vehicleId);
  const vehicle = getCurrentVehicle(editId, customVehicles);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(nameOf(vehicle, lang));
  const [editWeight, setEditWeight] = useState(String(weightUnit === 'ton' ? Math.round(toWeightUnit(vehicle.maxWeight, weightUnit) * 100) / 100 : vehicle.maxWeight));
  const addCustomVehicle = useAppStore((s) => s.addCustomVehicle);
  const updateCustomVehicle = useAppStore((s) => s.updateCustomVehicle);

  const handleSave = () => {
    if (vehicle.isCustom) {
      updateCustomVehicle(vehicle.id, {
        name: editName,
        nameKey: undefined,
        maxWeight: Math.round(fromWeightUnit(Number(editWeight) || 0, weightUnit) * 100) / 100,
      });
    } else {
      addCustomVehicle({
        ...vehicle,
        id: `custom-${Date.now()}`,
        name: editName,
        nameKey: undefined,
        maxWeight: Math.round(fromWeightUnit(Number(editWeight) || 0, weightUnit) * 100) / 100,
        isCustom: true,
      });
    }
    setEditing(false);
    onClose();
  };

  const handleCreateCopy = () => {
    const copyId = `copy-${Date.now()}`;
    const copy: Vehicle = {
      ...vehicle,
      id: copyId,
      name: nameOf(vehicle, lang) + ` (${tr(lang, 'pd.copy')})`,
      nameKey: undefined,
      isCustom: true,
    };
    addCustomVehicle(copy);
    // Переключаемся на копию и открываем редактирование
    setEditId(copyId);
    setEditName(copy.name);
    setEditWeight(String(weightUnit === 'ton' ? Math.round(toWeightUnit(copy.maxWeight, weightUnit) * 100) / 100 : copy.maxWeight));
    setEditing(true);
  };

  const isStandard = !vehicle.isCustom;

  // Фильтруем способы загрузки/выгрузки по типу кузова
  const bodyTypeMethods = vehicle.bodyType ? getDefaultMethodsForBodyType(vehicle.bodyType) : null;
  const filteredLoadingMethods = vehicle.loadingMethods?.filter(m => 
    bodyTypeMethods ? bodyTypeMethods.loadingMethods.includes(m) : true
  ) || [];
  const filteredUnloadingMethods = vehicle.unloadingMethods?.filter(m => 
    bodyTypeMethods ? bodyTypeMethods.unloadingMethods.includes(m) : true
  ) || [];

  return (
    <div className="slide-panel">
      <div className="slide-panel-header">
        <strong><Truck size={14} /> {nameOf(vehicle, lang)}</strong>
        <button onClick={onClose} className="btn btn-sm"><X size={14} /></button>
      </div>
      <div className="slide-panel-body">
        {vehicle.bodyType && (
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            {tr(lang, 'pd.typeLabel')}: <strong>{tr(lang, `bt.${vehicle.bodyType}`) || vehicle.bodyType}</strong>
          </div>
        )}
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          {tr(lang, 'pd.dimensions')}: <strong>{toUnit(vehicle.length, unit)}×{toUnit(vehicle.width, unit)}×{toUnit(vehicle.height, unit)} {UNIT_LABEL[unit]}</strong>
        </div>
        {editing ? (
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tr(lang, 'form.name')}</label>
            <input className="input-compact" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trf(lang, 'veh.payload', { u: WEIGHT_UNIT_LABEL[weightUnit] })}</label>
            <input className="input-compact" type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>{tr(lang, 'btn.save')}</button>
              <button className="btn btn-sm" onClick={() => setEditing(false)}>{tr(lang, 'btn.cancel')}</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            {tr(lang, 'pd.payload')}: <strong>{formatWeight(vehicle.maxWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</strong>
          </div>
        )}
        {filteredLoadingMethods.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{tr(lang, 'pd.loading')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {filteredLoadingMethods.map((m) => (
                <span key={m} className="method-tag loading-tag">{tr(lang, `lm.${m}`)}</span>
              ))}
            </div>
          </div>
        )}
        {filteredUnloadingMethods.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{tr(lang, 'pd.unloading')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {filteredUnloadingMethods.map((m) => (
                <span key={m} className="method-tag unloading-tag">{tr(lang, `lm.${m}`)}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setEditing(true)}><Pencil size={12} /> {tr(lang, 'pd.edit')}</button>
          {isStandard && (
            <button className="btn btn-sm btn-primary" onClick={handleCreateCopy}>
              <ClipboardList size={12} /> {tr(lang, 'pd.createCopy')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CargoPanelProps {
  cargoId: string;
  onClose: () => void;
}

export function CargoDetailsPanel({ cargoId, onClose }: CargoPanelProps) {
  const cargo = useAppStore((s) => s.cargo);
  const updateCargo = useAppStore((s) => s.updateCargo);
  const updateCustomCargo = useAppStore((s) => s.updateCustomCargo);
  const addCargo = useAppStore((s) => s.addCargo);
  const unit = useAppStore((s) => s.unit);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const lang = useAppStore((s) => s.lang);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(cargoId);
  const item = cargo.find(c => c.id === editId);
  const [editName, setEditName] = useState(item ? nameOf(item, lang) : '');
  const [editLength, setEditLength] = useState(item ? String(Math.round(toUnit(item.length, unit) * 100) / 100) : '0');
  const [editWidth, setEditWidth] = useState(item ? String(Math.round(toUnit(item.width ?? 0, unit) * 100) / 100) : '0');
  const [editHeight, setEditHeight] = useState(item ? String(Math.round(toUnit(item.height ?? 0, unit) * 100) / 100) : '0');
  const [editWeight, setEditWeight] = useState(item ? String(weightUnit === 'ton' ? Math.round(toWeightUnit(item.weight, weightUnit) * 100) / 100 : item.weight) : '0');
  const [editQuantity, setEditQuantity] = useState(String(item?.quantity ?? 1));
  const [editShape, setEditShape] = useState(item?.shape ?? 'box');
  const [editStackable, setEditStackable] = useState(item?.stackable ?? true);
  const [editOversize, setEditOversize] = useState(item?.isOversize ?? false);
  const [editDiameter, setEditDiameter] = useState(item ? String(Math.round(toUnit(item.diameter ?? 0, unit) * 100) / 100) : '0');

  if (!item) return null;

  const isCustom = item.isCustom ?? false;

  const handleSave = () => {
    const patch: Partial<Cargo> = {
      name: editName,
      nameKey: undefined,
      length: fromUnit(Number(editLength) || 0, unit),
      width: fromUnit(Number(editWidth) || 0, unit),
      height: fromUnit(Number(editHeight) || 0, unit),
      weight: Math.round(fromWeightUnit(Number(editWeight) || 0, weightUnit) * 100) / 100,
      quantity: Number(editQuantity) || 1,
      shape: editShape as 'box' | 'cylinder',
      stackable: editStackable,
      isOversize: editOversize,
      diameter: editShape === 'cylinder' ? fromUnit(Number(editDiameter) || 0, unit) : undefined,
    };
    if (isCustom) {
      updateCustomCargo(editId, patch);
    } else {
      updateCargo(editId, patch);
    }
    setEditing(false);
    onClose();
  };

  const handleCreateCopy = () => {
    const copyId = uid();
    const copy: Cargo = {
      ...item,
      id: copyId,
      name: nameOf(item, lang) + ` (${tr(lang, 'pd.copy')})`,
      nameKey: undefined,
      isCustom: true,
    };
    addCargo(copy);
    // Переключаемся на копию и открываем редактирование
    setEditId(copyId);
    setEditName(copy.name);
    setEditLength(String(Math.round(toUnit(copy.length, unit) * 100) / 100));
    setEditWidth(String(Math.round(toUnit(copy.width ?? 0, unit) * 100) / 100));
    setEditHeight(String(Math.round(toUnit(copy.height ?? 0, unit) * 100) / 100));
    setEditWeight(String(weightUnit === 'ton' ? Math.round(toWeightUnit(copy.weight, weightUnit) * 100) / 100 : copy.weight));
    setEditQuantity(String(copy.quantity));
    setEditShape(copy.shape || 'box');
    setEditStackable(copy.stackable ?? true);
    setEditOversize(copy.isOversize ?? false);
    setEditDiameter(String(Math.round(toUnit(copy.diameter ?? 0, unit) * 100) / 100));
    setEditing(true);
  };

  return (
    <div className="slide-panel">
      <div className="slide-panel-header">
        <strong><Package size={14} /> {nameOf(item, lang)}</strong>
        <button onClick={onClose} className="btn btn-sm"><X size={14} /></button>
      </div>
      <div className="slide-panel-body">
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="form-group">
              <label>{tr(lang, 'form.name')}</label>
              <input className="input-compact" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{tr(lang, 'pd.form')}</label>
              <select className="select-compact" value={editShape} onChange={(e) => setEditShape(e.target.value as 'box' | 'cylinder')}>
                <option value="box">{tr(lang, 'shape.rect')}</option>
                <option value="cylinder">{tr(lang, 'shape.cylinder')}</option>
              </select>
            </div>
            {editShape === 'cylinder' ? (
              <>
                <div className="form-group">
                  <label>{tr(lang, 'form.diameter')}, {UNIT_LABEL[unit]}</label>
                  <input className="input-compact" type="number" value={editDiameter} onChange={(e) => setEditDiameter(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{tr(lang, 'form.length')}, {UNIT_LABEL[unit]}</label>
                  <input className="input-compact" type="number" value={editLength} onChange={(e) => setEditLength(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>{tr(lang, 'form.length')}, {UNIT_LABEL[unit]}</label>
                  <input className="input-compact" type="number" value={editLength} onChange={(e) => setEditLength(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{tr(lang, 'form.width')}, {UNIT_LABEL[unit]}</label>
                  <input className="input-compact" type="number" value={editWidth} onChange={(e) => setEditWidth(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{tr(lang, 'form.height')}, {UNIT_LABEL[unit]}</label>
                  <input className="input-compact" type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>{tr(lang, 'form.weight')}, {WEIGHT_UNIT_LABEL[weightUnit]}</label>
              <input className="input-compact" type="number" step="any" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{tr(lang, 'form.qty')}</label>
              <input className="input-compact" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={editStackable} onChange={(e) => setEditStackable(e.target.checked)} style={{ width: 14, height: 14 }} />
                {tr(lang, 'pd.stackable')}
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={editOversize} onChange={(e) => setEditOversize(e.target.checked)} style={{ width: 14, height: 14 }} />
                {tr(lang, 'form.oversize')}
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={12} /> {tr(lang, 'btn.save')}</button>
              <button className="btn btn-sm" onClick={() => setEditing(false)}>{tr(lang, 'btn.cancel')}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              {tr(lang, 'pd.form')}: <strong>{item.shape === 'cylinder' ? tr(lang, 'shape.cylinder') : tr(lang, 'shape.rect')}</strong>
            </div>
            {item.shape === 'cylinder' ? (
              <div style={{ fontSize: 12, marginBottom: 4 }}>
              {tr(lang, 'form.diameter')}: <strong>{toUnit(item.diameter ?? 0, unit)} {UNIT_LABEL[unit]}</strong>, {tr(lang, 'form.length')}: <strong>{toUnit(item.length, unit)} {UNIT_LABEL[unit]}</strong>
            </div>
            ) : (
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                {tr(lang, 'pd.dimensions')}: <strong>{toUnit(item.length, unit)}×{toUnit(item.width ?? 0, unit)}×{toUnit(item.height ?? 0, unit)} {UNIT_LABEL[unit]}</strong>
              </div>
            )}
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              {tr(lang, 'form.weight')}: <strong>{formatWeight(item.weight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</strong>, {tr(lang, 'form.qty')}: <strong>{item.quantity} {tr(lang, 'pd.pcs')}</strong>
            </div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              {tr(lang, 'pd.stackable')}: <strong>{item.stackable ? tr(lang, 'pd.yes') : tr(lang, 'pd.no')}</strong>
            </div>
            {item.isOversize && (
              <div style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 4 }}>
                <AlertTriangle size={12} /> {tr(lang, 'pd.oversizeItem')}
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setEditing(true)}><Pencil size={12} /> {tr(lang, 'pd.edit')}</button>
              {!isCustom && (
                <button className="btn btn-sm btn-primary" onClick={handleCreateCopy}>
                  <ClipboardList size={12} /> {tr(lang, 'pd.createCopy')}
                </button>
              )}
              <button className="btn btn-sm" onClick={onClose}>{tr(lang, 'aria.close')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
