import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore, useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import CargoItem3D from './CargoItem3D';
import Container3D from './Container3D';
import { SCALE } from './Container3D';
import type { PackedItem } from '../../types';

/** Компонент-обёртка для плавного перемещения камеры к грузу */
function CameraFocuser({ items, focusItemId }: { items: PackedItem[]; focusItemId: string | null }) {
  const { camera } = useThree();
  const targetPos = useMemo(() => {
    if (!focusItemId) return null;
    const item = items.find(it => it.id === focusItemId || it.id.startsWith(focusItemId));
    if (!item) return null;
    const rotY = item.rotationY ?? 0;
    const isOdd90 = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
    const effL = isOdd90 ? item.dimensions.width : item.dimensions.length;
    const effW = isOdd90 ? item.dimensions.length : item.dimensions.width;
    const cx = (item.position.x + effL / 2) * SCALE;
    const cy = (item.position.y + item.dimensions.height / 2) * SCALE;
    const cz = (item.position.z + effW / 2) * SCALE;
    return { x: cx, y: cy, z: cz };
  }, [items, focusItemId]);

  useFrame(() => {
    if (!targetPos) return;
    const speed = 0.08;
    camera.position.x += (targetPos.x + 3 - camera.position.x) * speed;
    camera.position.y += (targetPos.y + 2 - camera.position.y) * speed;
    camera.position.z += (targetPos.z + 3 - camera.position.z) * speed;
  });

  return null;
}

const Scene3D: React.FC = () => {
  const result = useAppStore((s) => s.result);
  const activeVariant = useAppStore((s) => s.activeVariant);
  const variant = useActiveVariant();
  const vehicle = useSelectedVehicle();
  const focusItemId = useAppStore((s) => s.focusItemId);
  const highlightItemId = useAppStore((s) => s.highlightItemId);
  const spreadMode = useAppStore((s) => s.spreadMode);
  const toggleSpreadMode = useAppStore((s) => s.toggleSpreadMode);
  const setFocusItemId = useAppStore((s) => s.setFocusItemId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topView] = useState(false);
  const [visibleLayer, setVisibleLayer] = useState<number | null>(null); // null = all
  const controlsRef = useRef<any>(null);

  // Clear focus after 2 seconds
  useEffect(() => {
    if (focusItemId) {
      const timer = setTimeout(() => setFocusItemId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [focusItemId, setFocusItemId]);
  
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

        {/* Камера фокусируется на грузе */}
        <CameraFocuser items={packedItems} focusItemId={focusItemId} />

        {/* Грузы с фильтрацией по слою */}
        {packedItems
          .filter(item => {
            if (visibleLayer === null) return true;
            const layer = Math.round(item.position.y / Math.max(1, item.dimensions.height));
            return layer === visibleLayer;
          })
          .map((item, idx) => {
          // Spread mode: offset items for visual separation
          let spreadOffset = { x: 0, y: 0, z: 0 };
          if (spreadMode) {
            const cols = Math.ceil(Math.sqrt(packedItems.length));
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            // Смещение 25% от габаритов кузова — достаточно для визуального разделения
            const spacingX = vehicle.length * SCALE * 0.25;
            const spacingZ = vehicle.width * SCALE * 0.25;
            spreadOffset = {
              x: (col - cols / 2) * spacingX,
              y: 0,
              z: (row - Math.ceil(packedItems.length / cols) / 2) * spacingZ,
            };
          }
          const spreadItem = spreadMode ? {
            ...item,
            position: {
              x: item.position.x + spreadOffset.x,
              y: item.position.y + spreadOffset.y,
              z: item.position.z + spreadOffset.z,
            },
          } : item;
          const isHighlighted = highlightItemId === item.id || highlightItemId === item.id.split('-')[0];
          return (
            <CargoItem3D
              key={item.id}
              item={spreadItem}
              vehicle={vehicle}
              isSelected={selectedId === item.id || isHighlighted}
              onSelect={(id) => setSelectedId(id)}
              onHover={() => {}}
              allItems={packedItems}
            />
          );
        })}

        {/* Камера заблокирована во время перетаскивания груза */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={true}
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
        ЛКМ вращение · колесо — зум
      </div>

      {/* Переключатель слоёв */}
      {(() => {
        const layers = new Set<number>();
        packedItems.forEach(item => {
          layers.add(Math.round(item.position.y / Math.max(1, item.dimensions.height)));
        });
        if (layers.size <= 1) return null;
        const sortedLayers = [...layers].sort((a, b) => a - b);
        const LAYER_COLORS_3D = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
        return (
          <div className="scene-overlay" style={{
            top: 40, right: 10, display: 'flex', flexDirection: 'column', gap: 4,
            pointerEvents: 'auto',
          }}>
            <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginBottom: 2 }}>Слои:</div>
            <button
              onClick={() => setVisibleLayer(null)}
              style={{
                padding: '3px 8px', fontSize: 10, borderRadius: 4,
                border: '1px solid', borderColor: visibleLayer === null ? '#3b82f6' : '#475569',
                background: visibleLayer === null ? '#3b82f6' : 'rgba(0,0,0,0.5)',
                color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}
            >Все</button>
            {sortedLayers.map(li => (
              <button
                key={li}
                onClick={() => setVisibleLayer(visibleLayer === li ? null : li)}
                style={{
                  padding: '3px 8px', fontSize: 10, borderRadius: 4,
                  border: '1px solid', borderColor: visibleLayer === li ? LAYER_COLORS_3D[li] : '#475569',
                  background: visibleLayer === li ? LAYER_COLORS_3D[li] : 'rgba(0,0,0,0.5)',
                  color: '#fff', cursor: 'pointer', fontWeight: 600,
                }}
              >{li === 0 ? '🟢 0' : `🔵 ${li}`}</button>
            ))}
          </div>
        );
      })()}

      {/* Кнопка «Разнести грузы» */}
      <button
        onClick={toggleSpreadMode}
        style={{
          position: 'absolute',
          bottom: 40,
          right: 10,
          padding: '4px 8px',
          fontSize: 10,
          borderRadius: 4,
          border: '1px solid var(--border)',
          background: spreadMode ? 'var(--color-accent)' : 'var(--bg-panel)',
          color: spreadMode ? '#fff' : 'var(--text)',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        {spreadMode ? '🧲 Склеить' : '📦 Разнести'}
      </button>
    </div>
  );
};

export default Scene3D;