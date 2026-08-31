import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveVariant, useSelectedVehicle, useAppStore } from '../../store/useAppStore';

// Scene2D supports keyboard shortcuts:
// R — rotate hovered/selected item by 90°
// ↑/↓ — move item up/down layers
// S — smart stack (auto-find best position on upper layer)

interface Scene2DProps {
  width?: number;
  height?: number;
}

const Scene2D: React.FC<Scene2DProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const variant = useActiveVariant();
  const vehicle = useSelectedVehicle();
  const updateCargoPosition = useAppStore((s) => s.updateCargoPosition);
  const rotateCargo = useAppStore((s) => s.rotateCargo);
  const moveCargoUp = useAppStore((s) => s.moveCargoUp);
  const moveCargoDown = useAppStore((s) => s.moveCargoDown);
  const smartStack = useAppStore((s) => s.smartStack);

  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });
  // Текущий выбранный слой для перетаскивания (null = все)
  const [selectedDragLayer, setSelectedDragLayer] = useState<number | null>(null);

  const dragRef = useRef<{
    itemId: string;
    offsetX: number;
    offsetZ: number;
  } | null>(null);

  // Состояние перетаскивания для визуальной обратной связи (подсветка + координаты)
  const [dragState, setDragState] = useState<{ itemId: string } | null>(null);

  // Track last hovered item for R key rotation
  const lastHoveredIdRef = useRef<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (width && height) {
        setDimensions({ w: width, h: height });
      } else {
        const parent = canvasRef.current?.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          setDimensions({
            w: Math.max(400, Math.floor(rect.width) || 600),
            h: Math.max(300, Math.floor(rect.height) || 400),
          });
        }
      }
    };
    updateSize();
    // Use ResizeObserver for accurate container size tracking
    const parent = canvasRef.current?.parentElement;
    let observer: ResizeObserver | null = null;
    if (parent) {
      observer = new ResizeObserver(updateSize);
      observer.observe(parent);
    } else {
      window.addEventListener('resize', updateSize);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateSize);
    };
  }, [width, height, variant]);

  const layoutRef = useRef<{ scale: number; offsetX: number; offsetY: number }>({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vehicle || !variant) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, dimensions.w, dimensions.h);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    const padding = 50;
    const availableW = dimensions.w - padding * 2;
    const availableH = dimensions.h - padding * 2;
    const containerL = vehicle.length;
    const containerW = vehicle.width;
    const scale = Math.min(availableW / containerL, availableH / containerW);
    const containerPxL = containerL * scale;
    const containerPxW = containerW * scale;
    const offsetX = (dimensions.w - containerPxL) / 2;
    const offsetY = (dimensions.h - containerPxW) / 2;

    layoutRef.current = { scale, offsetX, offsetY };

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, containerPxL, containerPxW);
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(
      'Body: ' + vehicle.length + 'x' + vehicle.width + 'x' + vehicle.height + ' mm',
      offsetX + 5,
      offsetY - 10,
    );

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + containerPxW + 15);
    ctx.lineTo(offsetX + containerPxL + 20, offsetY + containerPxW + 15);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.fillText('X (length)', offsetX + containerPxL / 2 - 25, offsetY + containerPxW + 28);

    variant.items.forEach((item, idx) => {
      let itemL = item.dimensions.length * scale;
      let itemW = item.dimensions.width * scale;
      const rotY = item.rotationY ?? item.rotation?.y ?? 0;
      if (Math.abs(rotY % 180) === 90) {
        [itemL, itemW] = [itemW, itemL];
      }

      const itemX = offsetX + item.position.x * scale;
      const itemY = offsetY + item.position.z * scale;

      // Compute layer index for stacking visualization
      const layerIndex = Math.round(item.position.y / Math.max(1, item.dimensions.height));
      // Dim items on non-selected layers
      const isSelectedLayer = selectedDragLayer === null || selectedDragLayer === layerIndex;
      const layerAlpha = isSelectedLayer ? (layerIndex === 0 ? 0.75 : 0.55) : 0.2;

      // Определяем негабаритность
      const isOversize = (item as any).isOversize;
      if (isOversize) {
        // Рисуем штриховку за пределами кузова
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(itemX, itemY, itemL, itemW);
        ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.fillStyle = isOversize ? '#ef4444' : item.color;
      ctx.globalAlpha = layerAlpha;
      // Для вертикальных цилиндров рисуем круг
      const isVertCyl = (item as any).shape === 'cylinder' && (item as any).cylinderOrientation === 'vertical';
      if (isVertCyl) {
        const radius = Math.min(itemL, itemW) / 2;
        ctx.beginPath();
        ctx.arc(itemX + itemL / 2, itemY + itemW / 2, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(itemX, itemY, itemL, itemW);
      }
      ctx.globalAlpha = 1.0;
      // Selection highlight for hovered item
      const isHovered = lastHoveredIdRef.current === item.id;
      ctx.strokeStyle = isHovered ? '#f59e0b' : isOversize ? '#ef4444' : '#1e293b';
      ctx.lineWidth = isHovered ? 3 : isOversize ? 2 : 1;
      if (isVertCyl) {
        const rad2 = Math.min(itemL, itemW) / 2;
        ctx.beginPath();
        ctx.arc(itemX + itemL / 2, itemY + itemW / 2, rad2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(itemX, itemY, itemL, itemW);
      }

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.min(11, Math.max(7, Math.min(itemL, itemW) / 5));
      ctx.font = 'bold ' + fontSize + 'px system-ui';

      const isDragging = dragRef.current?.itemId === item.id;
      // Подсветка перетаскиваемого груза
      if (isDragging) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        if (isVertCyl) {
          const rad3 = Math.min(itemL, itemW) / 2;
          ctx.beginPath();
          ctx.arc(itemX + itemL / 2, itemY + itemW / 2, rad3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(itemX, itemY, itemL, itemW);
        }
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        if (isVertCyl) {
          const rad4 = Math.min(itemL, itemW) / 2;
          ctx.beginPath();
          ctx.arc(itemX + itemL / 2, itemY + itemW / 2, rad4, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(itemX, itemY, itemL, itemW);
        }
      }

      // Layer badge in top-right corner (if stacking is active)
      const maxLayer = Math.max(...variant.items.map(it => Math.round(it.position.y / Math.max(1, it.dimensions.height))));
      if (maxLayer > 0) {
        const badgeSize = Math.min(14, Math.max(10, fontSize));
        const bx = itemX + itemL - badgeSize - 1;
        const by = itemY + 1;
        ctx.fillStyle = layerIndex === 0 ? 'rgba(0,0,0,0.6)' : 'rgba(59,130,246,0.8)';
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeSize, badgeSize, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + (badgeSize - 3) + 'px system-ui';
        ctx.fillText(String(layerIndex + 1), bx + badgeSize / 2, by + badgeSize / 2);
      }

      // Draw index number only (not full text — tooltip handles that)
      const textY = itemY + itemW / 2;
      if (itemW > 14 && itemL > 14) {
        ctx.fillText(String(idx + 1), itemX + itemL / 2, textY);
      }
    });
  }, [variant, vehicle, dimensions, selectedDragLayer]);

  const hitTest = useCallback(
    (mx: number, my: number) => {
      if (!variant || !vehicle) return null;
      const { scale, offsetX, offsetY } = layoutRef.current;
      const containerPxL = vehicle.length * scale;
      const containerPxW = vehicle.width * scale;
      if (
        mx < offsetX ||
        mx > offsetX + containerPxL ||
        my < offsetY ||
        my > offsetY + containerPxW
      )
        return null;

      for (const item of variant.items) {
        // Фильтрация по слою: если selectedDragLayer задан, ищем только на этом слое
        if (selectedDragLayer !== null) {
          const itemLayer = Math.round(item.position.y / Math.max(1, item.dimensions.height));
          if (itemLayer !== selectedDragLayer) continue;
        }
        let itemL = item.dimensions.length * scale;
        let itemW = item.dimensions.width * scale;
        const rotY = item.rotationY ?? item.rotation?.y ?? 0;
        if (Math.abs(rotY % 180) === 90) {
          [itemL, itemW] = [itemW, itemL];
        }
        const itemX = offsetX + item.position.x * scale;
        const itemY = offsetY + item.position.z * scale;
        if (mx >= itemX && mx <= itemX + itemL && my >= itemY && my <= itemY + itemW) return item;
      }
      return null;
    },
    [variant, vehicle, selectedDragLayer],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !vehicle || !variant) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const item = hitTest(mx, my);
      if (item) {
        const { scale, offsetX, offsetY } = layoutRef.current;
        let itemL = item.dimensions.length * scale;
        let itemW = item.dimensions.width * scale;
        const rotY = item.rotationY ?? item.rotation?.y ?? 0;
        if (Math.abs(rotY % 180) === 90) {
          [itemL, itemW] = [itemW, itemL];
        }
        const itemX = offsetX + item.position.x * scale;
        const itemY = offsetY + item.position.z * scale;
        dragRef.current = {
          itemId: item.id,
          offsetX: mx - itemX,
          offsetZ: my - itemY,
        };
        setDragState({ itemId: item.id });
        canvas.style.cursor = 'grabbing';
      }
    },
    [hitTest, vehicle, variant],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !vehicle || !variant) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      if (dragRef.current) {
        const { scale, offsetX, offsetY } = layoutRef.current;
        const drag = dragRef.current;
        const item = variant.items.find((it) => it.id === drag.itemId);
        if (!item) return;
        let itemL = item.dimensions.length;
        let itemW = item.dimensions.width;
        const rotY = item.rotationY ?? item.rotation?.y ?? 0;
        if (Math.abs(rotY % 180) === 90) {
          [itemL, itemW] = [itemW, itemL];
        }
        const rawPackX = (mx - drag.offsetX - offsetX) / scale;
        const rawPackZ = (my - drag.offsetZ - offsetY) / scale;
        const clampedX = Math.max(0, Math.min(vehicle.length - itemL, rawPackX));
        const clampedZ = Math.max(0, Math.min(vehicle.width - itemW, rawPackZ));
        
        // Проверка коллизий AABB в 2D
        const checkCollision2D = (cx: number, cz: number) => {
          return variant.items.some((other) => {
            if (other.id === item.id) return false;
            let oL = other.dimensions.length;
            let oW = other.dimensions.width;
            const oRot = other.rotationY ?? other.rotation?.y ?? 0;
            if (Math.abs(oRot % 180) === 90) { [oL, oW] = [oW, oL]; }
            return (
              cx < other.position.x + oL &&
              cx + itemL > other.position.x &&
              cz < other.position.z + oW &&
              cz + itemW > other.position.z
            );
          });
        };
        
        // Snap to 10mm grid
        const snap = (v: number) => Math.round(v / 10) * 10;
        const snappedX = snap(clampedX);
        const snappedZ = snap(clampedZ);
        
        // Try full move first, then slide along axes
        if (!checkCollision2D(snappedX, snappedZ)) {
          updateCargoPosition(drag.itemId, { x: snappedX, y: item.position.y, z: snappedZ });
        } else if (!checkCollision2D(snappedX, item.position.z)) {
          updateCargoPosition(drag.itemId, { x: snappedX, y: item.position.y, z: item.position.z });
        } else if (!checkCollision2D(item.position.x, snappedZ)) {
          updateCargoPosition(drag.itemId, { x: item.position.x, y: item.position.y, z: snappedZ });
        }
        // else: both axes blocked, do nothing
      } else {
        const item = hitTest(mx, my);
        canvas.style.cursor = item ? 'grab' : 'default';
        updateHoveredId(mx, my);
      }
    },
    [hitTest, vehicle, variant, updateCargoPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    dragRef.current = null;
    setDragState(null);
  }, []);

  // Keyboard shortcuts: R (rotate), ↑ (up layer), ↓ (down layer), S (smart stack)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      const targetId = lastHoveredIdRef.current;
      if (!targetId || !variant) return;

      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        const item = variant.items.find((it) => it.id === targetId);
        if (item) {
          const current = item.rotationY ?? item.rotation?.y ?? 0;
          rotateCargo(item.id, current + 90);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveCargoUp(targetId);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveCargoDown(targetId);
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
        smartStack(targetId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant, rotateCargo, moveCargoUp, moveCargoDown, smartStack]);

  // Track hovered item for R key and tooltip
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; item: typeof variant extends null ? null : NonNullable<typeof variant>['items'][number] } | null>(null);

  const updateHoveredId = useCallback((mx: number, my: number) => {
    const item = hitTest(mx, my);
    lastHoveredIdRef.current = item?.id ?? null;
    if (item) {
      setTooltipData({ x: mx, y: my, item });
    } else {
      setTooltipData(null);
    }
  }, [hitTest]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !vehicle || !variant) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const item = hitTest(mx, my);
      if (item) {
        const current = item.rotationY ?? item.rotation?.y ?? 0;
        rotateCargo(item.id, current + 90);
      }
    },
    [hitTest, vehicle, variant, rotateCargo],
  );

  if (!vehicle || !variant) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No data to display</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        style={{ width: '100%', flex: 1, minHeight: 0, display: 'block', cursor: 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      {/* Тултип при наведении в 2D */}
      {tooltipData && tooltipData.item && (
        <div
          style={{
            position: 'absolute',
            left: tooltipData.x + 12,
            top: tooltipData.y - 40,
            background: 'rgba(30,41,59,0.95)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            whiteSpace: 'pre-line',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <strong>{tooltipData.item.name}</strong>
          {`\n${Math.round(tooltipData.item.dimensions.length)}×${Math.round(tooltipData.item.dimensions.width)}×${Math.round(tooltipData.item.dimensions.height)} мм`}
          {`\nВес: ${tooltipData.item.weight} кг`}
          {tooltipData.item.isOversize ? '\n⚠ Негабаритный' : ''}
        </div>
      )}

      {/* Оверлей координат при перетаскивании */}
      {dragState && variant && (() => {
        const dragged = variant.items.find((it) => it.id === dragState.itemId);
        if (!dragged) return null;
        const { scale, offsetX, offsetY } = layoutRef.current;
        const rotY = dragged.rotationY ?? dragged.rotation?.y ?? 0;
        let dL = dragged.dimensions.length;
        let dW = dragged.dimensions.width;
        if (Math.abs(rotY % 180) === 90) { [dL, dW] = [dW, dL]; }
        const cx = offsetX + (dragged.position.x + dL / 2) * scale;
        const cy = offsetY + (dragged.position.z + dW / 2) * scale;
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.max(0, Math.min(cx - 80, dimensions.w - 160)),
              top: Math.max(0, cy - 30),
              background: 'rgba(245,158,11,0.95)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              pointerEvents: 'none',
              zIndex: 21,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            X: {Math.round(dragged.position.x)} · Z: {Math.round(dragged.position.z)}
          </div>
        );
      })()}

      {/* Легенда по слоям + выбор слоя для перетаскивания */}
      {variant && variant.items.length > 0 && (() => {
        const layers = new Map<number, { name: string; count: number }[]>();
        variant.items.forEach((item) => {
          const layer = Math.round(item.position.y / Math.max(1, item.dimensions.height));
          if (!layers.has(layer)) layers.set(layer, []);
          const existing = layers.get(layer)!.find(l => l.name === item.name);
          if (existing) existing.count++;
          else layers.get(layer)!.push({ name: item.name, count: 1 });
        });
        const sortedEntries = [...layers.entries()].sort((a, b) => a[0] - b[0]);
        const LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
        return (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 8px', borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              <strong>Слои:</strong>
              <button
                onClick={() => setSelectedDragLayer(null)}
                style={{
                  padding: '1px 6px', fontSize: 9, borderRadius: 3,
                  border: '1px solid', borderColor: selectedDragLayer === null ? '#3b82f6' : 'var(--border)',
                  background: selectedDragLayer === null ? '#3b82f6' : 'transparent',
                  color: selectedDragLayer === null ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >Все</button>
              {sortedEntries.map(([layer, items]) => (
                <button
                  key={layer}
                  onClick={() => setSelectedDragLayer(selectedDragLayer === layer ? null : layer)}
                  style={{
                    padding: '1px 6px', fontSize: 9, borderRadius: 3,
                    border: '1px solid', borderColor: selectedDragLayer === layer ? LAYER_COLORS[layer] : 'var(--border)',
                    background: selectedDragLayer === layer ? LAYER_COLORS[layer] : 'transparent',
                    color: selectedDragLayer === layer ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: LAYER_COLORS[layer], marginRight: 2, verticalAlign: 'middle' }} />
                  {layer}: {items.map(it => `${it.name} ×${it.count}`).join(', ')}
                </button>
              ))}
            </div>
            {selectedDragLayer !== null && (
              <div style={{ fontSize: 9, color: LAYER_COLORS[selectedDragLayer], marginTop: 2 }}>
                Перетаскивание на слое {selectedDragLayer}
              </div>
            )}
            {/* Текстовая легенда по слоям */}
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sortedEntries.map(([layer, items]) => (
                <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: LAYER_COLORS[layer], flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>
                    <strong>Слой {layer}:</strong> {items.map(it => `${it.name} ×${it.count}`).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', padding: 2 }}>
        Перетаскивайте · R — поворот · ↑↓ — слои · S — автостак
      </div>
    </div>
  );
};

export default Scene2D;
