// ============================================================================
// 3D-сцена: контейнер автомобиля + размещённые грузы
// ============================================================================

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { Vehicle } from '../../types';
import { useAppStore, useActiveVariant, getCurrentVehicle } from '../../store/useAppStore';
import Container3D, { SCALE } from './Container3D';
import CargoItem3D from './CargoItem3D';
import DragControls from './DragControls';

export default function Scene3D() {
  const vehicle = useSelectedVehicle();
  const variant = useActiveVariant();
  const isCalculating = useAppStore((s) => s.isCalculating);
  const result = useAppStore((s) => s.result);
  const setResult = useAppStore((s) => s.setResult);

  // Обновление позиции груза при ручном перетаскивании — записываем в результат
  const handleDragEnd = (id: string, position: { x: number; y: number; z: number }) => {
    if (!result || !variant) return;
    const newVariants = result.variants.map((v) => {
      if (v.id !== variant.id) return v;
      const items = v.items.map((it) => (it.id === id ? { ...it, position } : it));
      return { ...v, items };
    });
    setResult({ ...result, variants: newVariants });
  };

  // Масштаб и позиция камеры зависят от размеров кузова
  const maxDim = Math.max(vehicle.length, vehicle.width, vehicle.height) * SCALE;
  const cameraPos: [number, number, number] = [
    vehicle.length * SCALE * 0.6,
    maxDim * 1.4,
    maxDim * 1.4,
  ];

  return (
    <div id="scene-3d" className="scene-container">
      {isCalculating && (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      )}
      <Canvas
        camera={{ position: cameraPos, fov: 50, near: 0.01, far: 1000 }}
        style={{ background: 'var(--bg-card)' }}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} />

          <Grid
            args={[Math.max(vehicle.length, 10) * SCALE, Math.max(vehicle.width, 10) * SCALE]}
            cellSize={0.2}
            sectionSize={1}
            cellColor="#94a3b8"
            sectionColor="#64748b"
            fadeDistance={50}
          />

          {/* Контейнер кузова */}
          <group position={[-(vehicle.length * SCALE) / 2, 0, -(vehicle.width * SCALE) / 2]}>
            <Container3D vehicle={vehicle} />
          </group>

          {/* Грузы активного варианта */}
          {variant &&
            variant.items.map((item) => (
              <DragControls
                key={item.id}
                item={item}
                enabled={true}
                onDragEnd={handleDragEnd}
              >
                <CargoItem3D item={item} />
              </DragControls>
            ))}

          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** Селектор выбранного автомобиля */
function useSelectedVehicle(): Vehicle {
  const id = useAppStore((s) => s.selectedVehicleId);
  const custom = useAppStore((s) => s.customVehicles);
  return getCurrentVehicle(id, custom);
}