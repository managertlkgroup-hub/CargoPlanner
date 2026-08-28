// ============================================================================
// Выдвижная панель с деталями пресета (автомобиль или груз)
// ============================================================================

import { useState } from 'react';
import type { Vehicle } from '../../types';
import { BODY_TYPE_LABELS, LOADING_METHOD_LABELS } from '../../types';
import { useAppStore, getCurrentVehicle } from '../../store/useAppStore';

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

  return (
    <div className="slide-panel">
      <div className="slide-panel-header">
        <strong>🚚 {vehicle.name}</strong>
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
        {vehicle.loadingMethods && vehicle.loadingMethods.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Загрузка:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {vehicle.loadingMethods.map((m) => (
                <span key={m} className="method-tag loading-tag">{LOADING_METHOD_LABELS[m]}</span>
              ))}
            </div>
          </div>
        )}
        {vehicle.unloadingMethods && vehicle.unloadingMethods.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Выгрузка:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {vehicle.unloadingMethods.map((m) => (
                <span key={m} className="method-tag unloading-tag">{LOADING_METHOD_LABELS[m]}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setEditing(true)}>✏️ Редактировать</button>
          {isStandard && (
            <button className="btn btn-sm btn-primary" onClick={handleCreateCopy}>
              📋 Создать копию
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
  if (!item) return null;

  return (
    <div className="slide-panel">
      <div className="slide-panel-header">
        <strong>📦 {item.name}</strong>
        <button onClick={onClose} className="btn btn-sm">✕</button>
      </div>
      <div className="slide-panel-body">
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
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-sm" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
