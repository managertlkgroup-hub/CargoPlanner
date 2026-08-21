import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore, useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import CargoItem3D from './CargoItem3D';
import Container3D from './Container3D';

const Scene3D: React.FC = () => {
  const updateCargoPosition = useAppStore((s) => s.updateCargoPosition);
  const rotateCargo = useAppStore((s) => s.rotateCargo);
  const setError = useAppStore((s) => s.setError);

  const variant = useActiveVariant();
  const vehicle = useSelectedVehicle();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Поворот выделенного груза клавишей R на +90° (store задаёт абсолютный угол)
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

  const containerSize = useMemo(() => {
    if (!vehicle) return null;
    return {
      width: vehicle.width,
      height: vehicle.height,
      depth: vehicle.length,
    };
  }, [vehicle]);

  if (!variant || !vehicle || !containerSize) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          Загрузите грузы и нажмите «Рассчитать»
        </p>
      </div>
    );
  }

  const packedItems = variant.items || [];

  return (
    <div id="scene-3d" className="w-full h-full relative">
      <Canvas
        camera={{
          position: [
            containerSize.depth * 1.5,
            containerSize.height * 1.5,
            containerSize.width * 1.5,
          ],
        }}
        shadows
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />

        {/* Кузов */}
        <Container3D vehicle={vehicle} />

        {/* Пол-сетка */}
        <gridHelper
          args={[Math.max(containerSize.depth, containerSize.width), 10, '#888888', '#444444']}
          position={[0, 0.01, 0]}
        />

        {/* Грузы */}
        {packedItems.map((item) => (
          <CargoItem3D
            key={item.id}
            item={item}
            vehicle={vehicle}
            isSelected={selectedId === item.id}
            onSelect={(id) => setSelectedId(id)}
            onMove={(id, position) => updateCargoPosition(id, position)}
            onDragStart={() => undefined}
            onDragEnd={() => undefined}
            onBoundsViolation={(msg) => setError(msg)}
          />
        ))}

        <OrbitControls
          enablePan
          enableZoom
          target={[0, containerSize.height / 2, 0]}
        />
      </Canvas>

      <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-1 rounded shadow pointer-events-none">
        Перетаскивайте грузы мышью · R — поворот
      </div>
    </div>
  );
};

export default Scene3D;