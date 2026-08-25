import React, { useEffect, useRef } from 'react';
import { useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';

const SCALE = 0.001; // 1 мм = 0.001 единицы canvas

interface Scene2DProps {
  width?: number;
  height?: number;
}

const Scene2D: React.FC<Scene2DProps> = ({ width = 600, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const variant = useActiveVariant();
  const vehicle = useSelectedVehicle();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vehicle || !variant) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка
    ctx.clearRect(0, 0, width, height);
    
    // Фон
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Размеры кузова в пикселях
    const containerW = vehicle.length * SCALE * 100; // длина по X
    const containerH = vehicle.width * SCALE * 100;  // ширина по Z

    // Центрирование
    const offsetX = (width - containerW) / 2;
    const offsetY = (height - containerH) / 2;

    // Рисуем кузов (вид сверху: X - горизонтально, Z - вертикально)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, containerW, containerH);
    
    // Подпись размеров кузова
    ctx.fillStyle = '#3b82f6';
    ctx.font = '12px system-ui';
    ctx.fillText(`L: ${vehicle.length}мм`, offsetX + 5, offsetY + 15);
    ctx.fillText(`W: ${vehicle.width}мм`, offsetX + 5, offsetY + 30);

    // Рисуем грузы
    variant.items.forEach((item) => {
      const itemW = item.dimensions.length * SCALE * 100;
      const itemH = item.dimensions.width * SCALE * 100;
      
      // Позиция груза (преобразуем из координат пакера в canvas)
      const itemX = offsetX + item.position.x * SCALE * 100;
      const itemY = offsetY + item.position.z * SCALE * 100;

      // Фон груза
      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(itemX, itemY, itemW, itemH);
      ctx.globalAlpha = 1.0;

      // Обводка
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, itemY, itemW, itemH);

      // Подпись (название)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Обрезаем текст если не помещается
      let label = item.name;
      if (ctx.measureText(label).width > itemW - 4) {
        while (label.length > 0 && ctx.measureText(label + '..').width > itemW - 4) {
          label = label.slice(0, -1);
        }
        label += '..';
      }
      
      ctx.fillText(label, itemX + itemW / 2, itemY + itemH / 2);
    });

  }, [variant, vehicle, width, height]);

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
        width={width}
        height={height}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"
        style={{ maxHeight: '400px', objectFit: 'contain' }}
      />
    </div>
  );
};

export default Scene2D;
