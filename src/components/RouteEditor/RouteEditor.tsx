// ============================================================================
// Редактор маршрута: управление точками загрузки и выгрузки
// ============================================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { LoadingPoint, UnloadingPoint } from '../../types';
import { uid } from '../../utils/helpers';

export default function RouteEditor() {
  const loadingPoints = useAppStore((s) => s.loadingPoints);
  const unloadingPoints = useAppStore((s) => s.unloadingPoints);
  const addLoadingPoint = useAppStore((s) => s.addLoadingPoint);
  const removeLoadingPoint = useAppStore((s) => s.removeLoadingPoint);
  const addUnloadingPoint = useAppStore((s) => s.addUnloadingPoint);
  const removeUnloadingPoint = useAppStore((s) => s.removeUnloadingPoint);

  const [tab, setTab] = useState<'loading' | 'unloading'>('loading');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  /** Сортировка точек по order */
  const sortedLoading = [...loadingPoints].sort((a, b) => a.order - b.order);
  const sortedUnloading = [...unloadingPoints].sort((a, b) => a.order - b.order);

  const nextOrder = (list: { order: number }[]): number =>
    list.length === 0 ? 1 : Math.max(...list.map((p) => p.order)) + 1;

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Укажите название точки.');
      return;
    }
    if (tab === 'loading') {
      const p: LoadingPoint = {
        id: uid(),
        name: name.trim(),
        address: address.trim() || undefined,
        order: nextOrder(loadingPoints),
      };
      addLoadingPoint(p);
    } else {
      const p: UnloadingPoint = {
        id: uid(),
        name: name.trim(),
        address: address.trim() || undefined,
        order: nextOrder(unloadingPoints),
      };
      addUnloadingPoint(p);
    }
    setName('');
    setAddress('');
    setError('');
  };

  /** Изменение порядка (move up/down) */
  const moveLoading = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sortedLoading.length) return;
    const updated = [...sortedLoading];
    const a = updated[index];
    const b = updated[target];
    updated[index] = { ...b, order: a.order };
    updated[target] = { ...a, order: b.order };
    updated.forEach((p, i) => {
      const existing = loadingPoints.find((x) => x.id === p.id);
      if (existing) {
        addLoadingPoint({ ...existing, order: i + 1 });
      }
    });
  };

  const moveUnloading = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sortedUnloading.length) return;
    const updated = [...sortedUnloading];
    const a = updated[index];
    const b = updated[target];
    updated[index] = { ...b, order: a.order };
    updated[target] = { ...a, order: b.order };
    updated.forEach((p, i) => {
      const existing = unloadingPoints.find((x) => x.id === p.id);
      if (existing) {
        addUnloadingPoint({ ...existing, order: i + 1 });
      }
    });
  };

  return (
    <div className="panel">
      <div className="section-title">
        <span>🗺 Маршрут</span>
      </div>

      <div className="variant-tabs mb-1">
        <button
          type="button"
          className={`variant-tab ${tab === 'loading' ? 'active' : ''}`}
          onClick={() => setTab('loading')}
        >
          📦 Точки загрузки ({loadingPoints.length})
        </button>
        <button
          type="button"
          className={`variant-tab ${tab === 'unloading' ? 'active' : ''}`}
          onClick={() => setTab('unloading')}
        >
          📤 Точки выгрузки ({unloadingPoints.length})
        </button>
      </div>

      {/* Форма добавления */}
      <form className="form-grid" onSubmit={handleAdd}>
        <div className="form-group full">
          <label>Название точки</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tab === 'loading' ? 'Например, Склад №1' : 'Например, Магазин на Ленина'}
          />
        </div>
        <div className="form-group full">
          <label>Адрес (необязательно)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="г. Москва, ул. …" />
        </div>
        {error && <div className="form-group full text-muted text-danger">{error}</div>}
        <div className="form-group full">
          <button type="submit" className="btn btn-primary w-full">
            + Добавить
          </button>
        </div>
      </form>

      {/* Списки точек */}
      {tab === 'loading' ? (
        <PointList
          points={sortedLoading}
          onRemove={removeLoadingPoint}
          onMoveUp={(i) => moveLoading(i, -1)}
          onMoveDown={(i) => moveLoading(i, 1)}
        />
      ) : (
        <PointList
          points={sortedUnloading}
          onRemove={removeUnloadingPoint}
          onMoveUp={(i) => moveUnloading(i, -1)}
          onMoveDown={(i) => moveUnloading(i, 1)}
        />
      )}
    </div>
  );
}

interface PointListProps {
  points: (LoadingPoint | UnloadingPoint)[];
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

/** Список точек с кнопками удаления и изменения порядка */
function PointList({ points, onRemove, onMoveUp, onMoveDown }: PointListProps) {
  if (points.length === 0) {
    return <div className="text-muted mt-1">Точек пока нет. Добавьте первую.</div>;
  }
  return (
    <div className="point-list">
      {points.map((p, i) => (
        <div key={p.id} className="route-point">
          <div className="route-point-info">
            <div className="route-point-name">{i + 1}. {p.name}</div>
            {p.address && (
              <div className="text-muted route-point-addr">{p.address}</div>
            )}
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={() => onMoveUp(i)} title="Выше" disabled={i === 0}>↑</button>
            <button className="btn btn-sm" onClick={() => onMoveDown(i)} title="Ниже" disabled={i === points.length - 1}>↓</button>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(p.id)} title="Удалить">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}