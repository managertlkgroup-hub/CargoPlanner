import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveVariant, useSelectedVehicle, useAppStore } from '../../store/useAppStore';

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

  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });

  const dragRef = useRef<{
    itemId: string;
    offsetX: number;
    offsetZ: number;
  } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (width && height) {
        setDimensions({ w: width, h: height });
      } else {
        const parent = canvasRef.current?.parentElement;
        if (parent) {
          setDimensions({
            w: Math.max(400, parent.clientWidth || 600),
            h: Math.max(300, parent.clientHeight - 50 || 400),
          });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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

    variant.items.forEach((item) => {
      let itemL = item.dimensions.length * scale;
      let itemW = item.dimensions.width * scale;
      const rotY = item.rotationY ?? item.rotation?.y ?? 0;
      if (Math.abs(rotY % 180) === 90) {
        [itemL, itemW] = [itemW, itemL];
      }

      const itemX = offsetX + item.position.x * scale;
      const itemY = offsetY + item.position.z * scale;

      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(itemX, itemY, itemL, itemW);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, itemY, itemL, itemW);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.min(11, Math.max(7, Math.min(itemL, itemW) / 5));
      ctx.font = 'bold ' + fontSize + 'px system-ui';

      const line1 = item.name;
      const line2 =
        Math.round(item.dimensions.length) + 'x' + Math.round(item.dimensions.width) + ' mm';
      const textY = itemY + itemW / 2;

      let t1 = line1;
      while (t1.length > 0 && ctx.measureText(t1).width > itemL - 6) t1 = t1.slice(0, -1);
      let t2 = line2;
      while (t2.length > 0 && ctx.measureText(t2).width > itemL - 6) t2 = t2.slice(0, -1);

      if (itemW > 30) {
        ctx.fillText(t1, itemX + itemL / 2, textY - fontSize / 2 - 1);
        ctx.font = fontSize - 1 + 'px system-ui';
        ctx.fillText(t2, itemX + itemL / 2, textY + fontSize / 2 + 1);
      } else {
        ctx.fillText(t1, itemX + itemL / 2, textY);
      }
    });
  }, [variant, vehicle, dimensions]);

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
    [variant, vehicle],
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
        const hasCollision = variant.items.some((other) => {
          if (other.id === item.id) return false;
          let oL = other.dimensions.length;
          let oW = other.dimensions.width;
          const oRot = other.rotationY ?? other.rotation?.y ?? 0;
          if (Math.abs(oRot % 180) === 90) { [oL, oW] = [oW, oL]; }
          return (
            clampedX < other.position.x + oL &&
            clampedX + itemL > other.position.x &&
            clampedZ < other.position.z + oW &&
            clampedZ + itemW > other.position.z
          );
        });
        
        if (!hasCollision) {
          updateCargoPosition(drag.itemId, {
            x: Math.round(clampedX),
            y: item.position.y,
            z: Math.round(clampedZ),
          });
        }
      } else {
        const item = hitTest(mx, my);
        canvas.style.cursor = item ? 'grab' : 'default';
      }
    },
    [hitTest, vehicle, variant, updateCargoPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    dragRef.current = null;
  }, []);

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
    <div className="w-full h-full flex flex-col" style={{ minHeight: 0 }}>
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', padding: 2 }}>
        Drag to move | Double-click to rotate
      </div>
    </div>
  );
};

export default Scene2D;
