import { Truck, Package, Pencil, ClipboardList } from 'lucide-react';
// ============================================================================
// Выдвижная панель с деталями пресета (автомобиль или груз)
// ============================================================================

import { useState } from 'react';
import type { Vehicle } from '../../types';
import { BODY_TYPE_LABELS, LOADING_METHOD_LABELS } from '../../types';
import { getDefaultMethodsForBodyType } from '../../lib/packer/presets';
import { useAppStore, getCurrentVehicle } from '../../store/useAppStore';
import { uid } from '../../utils/helpers';

interface VehiclePanelProps {
  vehicleId: string;
  onClose: () => void;
}

export function VehicleDetailsPanel({ vehicleId, onClose }: VehiclePanelProps) {
  const customVehicles = useAppStore((s) => s.customVehicles);
  const vehicle = getCurrentVehicle(vehicleId, customVehicles);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(vehicle.name);
  const [editWeight, setEditWeight] = useState(String(vehicle.maxWeight));
  const addCustomVehicle = useAppStore((s) => s.addCustomVehicle);

  const handleSave = () => {
    addCustomVehicle({
      ...vehicle,
      id: `custom-${Date.now()}`,
      name: editName,
      maxWeight: Number(editWeight) || vehicle.maxWeight,
      isCustom: true,
    });
    setEditing(false);
    onClose();
  };

  const handleCreateCopy = () => {
    const copy: Vehicle = {
      ...vehicle,
      id: `copy-${Date.now()}`,
      name: vehicle.name + ' (копия)',
      isCustom: true,
    };
    addCustomVehicle(copy);
    onClose();
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
        <strong><Truck size={14} /> {vehicle.name}</strong>
        <button onClick={onClose} className="btn btn-sm">✕</button>
      </div>
      <div className="slide-panel-body">
        {vehicle.bodyType && (
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            Тип: <strong>{BODY_TYPE_LABELS[vehicle.bodyType] || vehicle.bodyType}</strong>
          </div>
        )}
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          Размеры: <strong>{vehicle.length}×{vehicle.width}×{vehicle.height} мм</strong>
        </div>
        {editing ? (
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Название</label>
            <input className="input-compact" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Грузоподъёмность, кг</label>
            <input className="input-compact" type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Сохранить</button>
              <button className="btn btn-sm" onClick={() => setEditing(false)}>Отмена</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            Грузоподъёмность: <strong>{vehicle.maxWeight} кг</strong>
          </div>
        )}
        {filteredLoadingMethods.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Загрузка:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {filteredLoadingMethods.map((m) => (
                <span key={m} className="method-tag loading-tag">{LOADING_METHOD_LABELS[m]}</span>
              ))}
            </div>
          </div>
        )}
        {filteredUnloadingMethods.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Выгрузка:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {filteredUnloadingMethods.map((m) => (
                <span key={m} className="method-tag unloading-tag">{LOADING_METHOD_LABELS[m]}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setEditing(true)}><Pencil size={12} /> Редактировать</button>
          {isStandard && (
            <button className="btn btn-sm btn-primary" onClick={handleCreateCopy}>
              <ClipboardList size={12} /> Создать копию
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
  const item = cargo.find(c => c.id === cargoId);
  const updateCargo = useAppStore((s) => s.updateCargo);
  const addCargo = useAppStore((s) => s.addCargo);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item?.name ?? '');
  const [editLength, setEditLength] = useState(String(item?.length ?? 0));
  const [editWidth, setEditWidth] = useState(String(item?.width ?? 0));
  const [editHeight, setEditHeight] = useState(String(item?.height ?? 0));
  const [editWeight, setEditWeight] = useState(String(item?.weight ?? 0));
  const [editQuantity, setEditQuantity] = useState(String(item?.quantity ?? 1));
  const [editShape, setEditShape] = useState(item?.shape ?? 'box');
  const [editStackable, setEditStackable] = useState(item?.stackable ?? true);
  const [editOversize, setEditOversize] = useState(item?.isOversize ?? false);
  const [editDiameter, setEditDiameter] = useState(String(item?.diameter ?? 0));

  if (!item) return null;

  const isCustom = item.isCustom ?? false;

  const handleSave = () => {
    updateCargo(item.id, {
      name: editName,
      length: Number(editLength) || 0,
      width: Number(editWidth) || 0,
      height: Number(editHeight) || 0,
      weight: Number(editWeight) || 0,
      quantity: Number(editQuantity) || 1,
      shape: editShape as 'box' | 'cylinder',
      stackable: editStackable,
      isOversize: editOversize,
      diameter: editShape === 'cylinder' ? Number(editDiameter) : undefined,
    });
    setEditing(false);
    onClose();
  };

  const handleCreateCopy = () => {
    addCargo({
      ...item,
      id: uid(),
      name: item.name + ' (копия)',
      isCustom: true,
    });
    onClose();
  };

  return (
    <div className="slide-panel">
      <div className="slide-panel-header">
        <strong><Package size={14} /> {item.name}</strong>
        <button onClick={onClose} className="btn btn-sm">✕</button>
      </div>
      <div className="slide-panel-body">
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="form-group">
              <label>Название</label>
              <input className="input-compact" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Форма</label>
              <select className="select-compact" value={editShape} onChange={(e) => setEditShape(e.target.value as 'box' | 'cylinder')}>
                <option value="box">Прямоугольный</option>
                <option value="cylinder">Цилиндр</option>
              </select>
            </div>
            {editShape === 'cylinder' ? (
              <>
                <div className="form-group">
                  <label>Диаметр, мм</label>
                  <input className="input-compact" type="number" value={editDiameter} onChange={(e) => setEditDiameter(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Длина, мм</label>
                  <input className="input-compact" type="number" value={editLength} onChange={(e) => setEditLength(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Длина, мм</label>
                  <input className="input-compact" type="number" value={editLength} onChange={(e) => setEditLength(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ширина, мм</label>
                  <input className="input-compact" type="number" value={editWidth} onChange={(e) => setEditWidth(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Высота, мм</label>
                  <input className="input-compact" type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Вес, кг</label>
              <input className="input-compact" type="number" step="any" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Количество</label>
              <input className="input-compact" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={editStackable} onChange={(e) => setEditStackable(e.target.checked)} style={{ width: 14, height: 14 }} />
                Штабелируемый
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={editOversize} onChange={(e) => setEditOversize(e.target.checked)} style={{ width: 14, height: 14 }} />
                Негабаритный
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>💾 Сохранить</button>
              <button className="btn btn-sm" onClick={() => setEditing(false)}>Отмена</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Форма: <strong>{item.shape === 'cylinder' ? 'Цилиндр' : 'Прямоугольный'}</strong>
            </div>
            {item.shape === 'cylinder' ? (
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                Диаметр: <strong>{item.diameter} мм</strong>, Длина: <strong>{item.length} мм</strong>
              </div>
            ) : (
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                Размеры: <strong>{item.length}×{item.width}×{item.height} мм</strong>
              </div>
            )}
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Вес: <strong>{item.weight} кг</strong>, Кол-во: <strong>{item.quantity} шт</strong>
            </div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Штабелируемый: <strong>{item.stackable ? 'Да' : 'Нет'}</strong>
            </div>
            {item.isOversize && (
              <div style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 4 }}>
                ⚠️ Негабаритный груз
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setEditing(true)}><Pencil size={12} /> Редактировать</button>
              {!isCustom && (
                <button className="btn btn-sm btn-primary" onClick={handleCreateCopy}>
                  <ClipboardList size={12} /> Создать копию
                </button>
              )}
              <button className="btn btn-sm" onClick={onClose}>Закрыть</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
