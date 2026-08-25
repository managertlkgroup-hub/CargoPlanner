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
    if (width && height) {
      setDimensions({ w: width, h: height });
    } else {
      // Авто-размер от родителя
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        setDimensions({
          w: parent.clientWidth || 600,
          h: Math.max(300, parent.clientHeight - 50) || 400,
        });
      }
    }
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
    const padding = 40;
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

      // Подпись (название + размеры)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Формируем подпись
      const label = `${item.name}\n${item.dimensions.length}×${item.dimensions.width}`;
      const lines = label.split('\n');
      
      // Рисуем текст по центру с переносом
      lines.forEach((line, idx) => {
        // Обрезаем если не помещается
        let text = line;
        while (text.length > 0 && ctx.measureText(text).width > itemL - 8) {
          text = text.slice(0, -1);
        }
        if (lines.length > 1) {
          ctx.fillText(text, itemX + itemL / 2, itemY + itemW / 2 + idx * 10 - 5);
        } else {
          ctx.fillText(text, itemX + itemL / 2, itemY + itemW / 2);
        }
      });
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
    <div className="panel mt-4">
      <div className="section-title mb-2">
        <span>📐 Вид сверху</span>
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"
        style={{ maxHeight: '450px', objectFit: 'contain' }}
      />
    </div>
  );
};

export default Scene2D;
