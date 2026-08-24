import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  // Блокировка камеры во время перетаскивания груза
  const [isDragging, setIsDragging] = useState(false);

  // Диагностика: при изменении данных выводим каждый груз с его параметрами
  useEffect(() => {
    setSelectedId(null);
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

  // Поворот выделенного груза клавишей R на +90°
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') &&
        selectedId &&
        variant
      ) {
        const item = variant.items.find((it) => it.id === selectedId);
        if (!item) return;
        const current = item.rotationY ?? item.rotation?.y ?? 0;
        rotateCargo(selectedId, current + 90);
      }
    },
    [selectedId, variant, rotateCargo],
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
  const camDistance = maxDim * 1.8;
  const camHeight = maxDim * 0.8;

  return (
    <div id="scene-3d" className="w-full h-full relative">
      <Canvas
        camera={{
          position: [camDistance, camHeight, camDistance],
          fov: 45,
          near: 0.01,
          far: 1000,
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        style={{ background: '#0f172a' }}
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
            onMove={(id, position) => updateCargoPosition(id, position)}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            onBoundsViolation={(msg) => setError(msg)}
          />
        ))}

        {/* Камера заблокирована во время перетаскивания груза */}
        <OrbitControls
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
      <div
        className="absolute top-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded pointer-events-none"
        style={{ zIndex: 10 }}
      >
        Кузов: {vehicle.length}×{vehicle.width}×{vehicle.height} мм
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-1 rounded shadow pointer-events-none">
        Перетаскивайте грузы мышью · R — поворот · ЛКМ вращение · колесо — зум
      </div>
    </div>
  );
};

export default Scene3D;