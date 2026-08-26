import React, { useEffect, useRef } from 'react';
import { useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';

interface Scene2DProps {
  width?: number;
  height?: number;
}

const Scene2D: React.FC<Scene2DProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const variant = useActiveVariant();
  const vehicle = useSelectedVehicle();

  // Адаптивный размер: если не заданы явно, используем размеры контейнера
  const [dimensions, setDimensions] = React.useState({ w: 600, h: 400 });

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vehicle || !variant) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка
    ctx.clearRect(0, 0, dimensions.w, dimensions.h);
    
    // Фон
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    // Размеры кузова в пикселях (масштабируем чтобы весь кузов помещался)
    const padding = 50;
    const availableW = dimensions.w - padding * 2;
    const availableH = dimensions.h - padding * 2;
    
    const containerL = vehicle.length; // длина по X
    const containerW = vehicle.width;  // ширина по Z
    
    // Вычисляем масштаб чтобы кузов поместился полностью
    const scale = Math.min(availableW / containerL, availableH / containerW);
    
    const containerPxL = containerL * scale;
    const containerPxW = containerW * scale;

    // Центрирование
    const offsetX = (dimensions.w - containerPxL) / 2;
    const offsetY = (dimensions.h - containerPxW) / 2;

    // Рисуем кузов (вид сверху: X - горизонтально, Z - вертикально)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, containerPxL, containerPxW);
    
    // Подпись размеров кузова
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Кузов: ${vehicle.length}×${vehicle.width}×${vehicle.height} мм`, offsetX + 5, offsetY - 10);
    
    // Оси координат
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + containerPxW + 15);
    ctx.lineTo(offsetX + containerPxL + 20, offsetY + containerPxW + 15);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.fillText('Длина (X)', offsetX + containerPxL / 2 - 25, offsetY + containerPxW + 28);

    // Рисуем грузы
    variant.items.forEach((item) => {
      // Размеры груза с учётом масштаба и поворота
      let itemL = item.dimensions.length * scale;
      let itemW = item.dimensions.width * scale;
      
      // Если груз повёрнут на 90°, меняем местами длину и ширину для отображения
      const rotY = item.rotationY ?? item.rotation?.y ?? 0;
      if (Math.abs(rotY % 180) === 90) {
        [itemL, itemW] = [itemW, itemL];
      }
      
      // Позиция груза (преобразуем из координат пакера в canvas)
      const itemX = offsetX + item.position.x * scale;
      const itemY = offsetY + item.position.z * scale;

      // Фон груза
      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(itemX, itemY, itemL, itemW);
      ctx.globalAlpha = 1.0;

      // Обводка
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, itemY, itemL, itemW);

      // Подпись (название + размеры) в две строки
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const fontSize = Math.min(11, Math.max(7, Math.min(itemL, itemW) / 5));
      ctx.font = `bold ${fontSize}px system-ui`;
      
      const line1 = item.name;
      const line2 = `${Math.round(item.dimensions.length)}×${Math.round(item.dimensions.width)} мм`;
      
      const textY = itemY + itemW / 2;
      
      // Обрезаем если не помещается
      let t1 = line1;
      while (t1.length > 0 && ctx.measureText(t1).width > itemL - 6) t1 = t1.slice(0, -1);
      let t2 = line2;
      while (t2.length > 0 && ctx.measureText(t2).width > itemL - 6) t2 = t2.slice(0, -1);
      
      if (itemW > 30) {
        ctx.fillText(t1, itemX + itemL / 2, textY - fontSize / 2 - 1);
        ctx.font = `${fontSize - 1}px system-ui`;
        ctx.fillText(t2, itemX + itemL / 2, textY + fontSize / 2 + 1);
      } else {
        ctx.fillText(t1, itemX + itemL / 2, textY);
      }
    });

  }, [variant, vehicle, dimensions]);

  if (!vehicle || !variant) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ minHeight: 0 }}>
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
};

export default Scene2D;
