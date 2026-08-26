import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore, useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import CargoItem3D from './CargoItem3D';
import Container3D from './Container3D';
import { SCALE } from './Container3D';

const Scene3D: React.FC = () => {
  const updateCargoPosition = useAppStore((s) => s.updateCargoPosition);
  const rotateCargo = useAppStore((s) => s.rotateCargo);
  const setError = useAppStore((s) => s.setError);

  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const variant = useActiveVariant();
  const vehicle = useSelectedVehicle();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);
  // Блокировка камеры во время перетаскивания груза
  const [isDragging, setIsDragging] = useState(false);
  // Вид сверху по нажатию T
  const [topView, setTopView] = useState(false);
  const controlsRef = useRef<any>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Обработка изменения размера окна для корректного рендеринга
  useEffect(() => {
    const handleResize = () => {
      // Three.js через @react-three/fiber автоматически обрабатывает resize
      // но можно принудительно вызвать обновление если нужно
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Диагностика: при изменении данных выводим каждый груз с его параметрами
  useEffect(() => {
    setSelectedId(null);
    setLastInteractedId(null);
    const items = variant?.items ?? [];
    console.log('[Scene3D] Данные обновлены:', {
      variants: result?.variants?.length ?? 0,
      activeVariant,
      items: items.length,
    });
    items.forEach((item, idx) => {
      console.log(`[Scene3D] Груз ${idx}:`, {
        name: item.name,
        shape: item.shape,
        position: item.position,
        dimensions: item.dimensions,
        rotationY: item.rotationY,
        color: item.color,
      });
    });
  }, [result, activeVariant, variant]);

  // Поворот груза клавишей R на +90° и переключение вида сверху клавишей T
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && variant) {
        const targetId = lastInteractedId || selectedId;
        if (targetId) {
          const item = variant.items.find((it) => it.id === targetId);
          if (!item) return;
          const current = item.rotationY ?? item.rotation?.y ?? 0;
          rotateCargo(targetId, current + 90);
        }
      }
      // T — переключить вид сверху
      if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
        setTopView((prev) => !prev);
      }
    },
    [lastInteractedId, selectedId, variant, rotateCargo],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Габариты кузова в сценных единицах
  const containerSize = useMemo(() => {
    if (!vehicle) return null;
    return {
      width: vehicle.width * SCALE,
      height: vehicle.height * SCALE,
      depth: vehicle.length * SCALE,
    };
  }, [vehicle]);

  // Максимальный габарит — для расчёта дистанции камеры
  const maxDim = useMemo(() => {
    if (!containerSize) return 10;
    return Math.max(containerSize.depth, containerSize.width, containerSize.height);
  }, [containerSize]);

  if (!vehicle || !containerSize) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Выберите автомобиль</p>
      </div>
    );
  }

  if (!variant || !variant.items || variant.items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          Загрузите грузы и нажмите «Рассчитать»
        </p>
      </div>
    );
  }

  const packedItems = variant.items || [];

  // Камера: ставим так, чтобы кузов целиком попадал в кадр.
  const isSmallVehicle = maxDim < 5;
  const camDistance = isSmallVehicle ? maxDim * 2.8 : maxDim * 1.6;
  const camHeight = isSmallVehicle ? maxDim * 1.4 : maxDim * 0.9;

  // Позиция камеры с учётом topView
  const camPosition: [number, number, number] = topView
    ? [0, maxDim * 2.5, 0.01] // Вид сверху
    : [camDistance, camHeight, camDistance]; // Обычный вид

  return (
    <div id="scene-3d" className="w-full h-full relative">
      <Canvas
        ref={canvasRef}
        camera={{
          position: camPosition,
          fov: topView ? 60 : 45,
          near: 0.01,
          far: 1000,
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        className="scene-canvas"
        onCreated={({ gl }) => {
          // Очистка ресурсов при размонтировании
          return () => {
            gl.dispose();
          };
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />

        {/* Оси координат для ориентации */}
        <axesHelper args={[maxDim * 0.5]} />

        {/* Пол-сетка */}
        <gridHelper
          args={[Math.max(containerSize.depth * 1.4, 10), 20, '#555555', '#333333']}
          position={[0, 0, 0]}
        />

        {/* Кузов (центрирован, центр в начале координат) */}
        <Container3D vehicle={vehicle} />

        {/* Грузы */}
        {packedItems.map((item) => (
          <CargoItem3D
            key={item.id}
            item={item}
            vehicle={vehicle}
            isSelected={selectedId === item.id}
            onSelect={(id) => setSelectedId(id)}
            onHover={(id) => setLastInteractedId(id)}
            onMove={(id, position) => updateCargoPosition(id, position)}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            onBoundsViolation={(msg) => setError(msg)}
            allItems={packedItems}
          />
        ))}

        {/* Камера заблокирована во время перетаскивания груза */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={!isDragging}
          enablePan
          enableZoom
          target={[0, containerSize.height / 2, 0]}
          minDistance={maxDim * 0.5}
          maxDistance={maxDim * 5}
        />
      </Canvas>

      {/* Уголок с размерами кузова */}
      <div className="scene-overlay scene-dims">
        Кузов: {vehicle.length}×{vehicle.width}×{vehicle.height} мм
      </div>

      <div className="scene-overlay scene-hint">
        Перетаскивайте грузы мышью · ЛКМ вращение · колесо — зум
      </div>

      <div className="rotate-hint">
        Наведите на груз и нажмите R для поворота на 90° · T — вид сверху
      </div>
    </div>
  );
};

export default Scene3D;