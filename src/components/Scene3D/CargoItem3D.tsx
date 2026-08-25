// ============================================================================
// Отдельный груз в 3D-сцене: параллелепипед или цилиндр с подписью и тултипом
//
// Поддерживает ручное перетаскивание мышью по горизонтальной плоскости (XZ)
// с ограничением по границам кузова. Высота (Y) при перетаскивании фиксируется.
// Выбор груза кликом позволяет поворачивать его клавишей R.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html, Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { PackedItem, Vehicle } from '../../types';
import { SCALE } from './Container3D';
import { packToScenePosition, sceneToPackPosition, halfExtentX, halfExtentZ } from './coords';

interface Props {
  item: PackedItem;
  vehicle: Vehicle;
  /** true, если сейчас идёт расчёт или отключено редактирование */
  disabled?: boolean;
  /** Колбэк при перетаскивании (реальное обновление состояния) */
  onMove: (id: string, position: { x: number; y: number; z: number }) => void;
  /** Колбэк окончания перетаскивания */
  onDragEnd?: (id: string) => void;
  /** Колбэк начала перетаскивания */
  onDragStart?: (id: string) => void;
  /** Колбэк выбора груза (клик) — для поворота клавишей R */
  onSelect?: (id: string) => void;
  /** Выделен ли груз в данный момент */
  isSelected?: boolean;
  /** Флаг конфликта (пересечение с другим грузом) */
  conflict?: boolean;
  /** Сообщение при выходе за границы кузова */
  onBoundsViolation?: (msg: string) => void;
}

export default function CargoItem3D({
  item,
  vehicle,
  disabled,
  onMove,
  onDragEnd,
  onDragStart,
  onSelect,
  isSelected,
  conflict,
  onBoundsViolation,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const dragInfo = useRef<{ raycaster: THREE.Raycaster; plane: THREE.Plane } | null>(null);

  const { camera, gl, pointer } = useThree();

  const isCylinder = item.shape === 'cylinder';
  const diameter = item.diameter ?? 0;

  // Размеры в сценных единицах
  const { l, w, h } = useMemo(() => {
    return {
      l: item.dimensions.length * SCALE,
      w: item.dimensions.width * SCALE,
      h: item.dimensions.height * SCALE,
    };
  }, [item.dimensions]);

  // Позиция центра в сцене (левый нижний угол пакера -> центр сцены)
  const scenePos = useMemo(
    () => packToScenePosition(item.position, item.dimensions, vehicle, SCALE),
    [item.position, item.dimensions, vehicle],
  );

  // Поворот вокруг Y
  const rotY = ((item.rotationY ?? item.rotation?.y ?? 0) * Math.PI) / 180;

  // --- Логика перетаскивания по горизонтальной плоскости ---
  const startDrag = (e: any) => {
    if (disabled) return;
    e.stopPropagation();
    if (onSelect) onSelect(item.id);
    if (onDragStart) onDragStart(item.id);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -scenePos.y);
    const raycaster = new THREE.Raycaster();
    dragInfo.current = { raycaster, plane };
    setDragging(true);
    gl.domElement.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!dragInfo.current || !dragging) return;
    e.stopPropagation();
    const { raycaster, plane } = dragInfo.current;
    raycaster.setFromCamera(pointer, camera);
    const target = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, target)) return;

    // Ограничение по границам кузова (с учётом текущих габаритов и поворота)
    const halfX = halfExtentX(item, SCALE);
    const halfZ = halfExtentZ(item, SCALE);
    const halfL = (vehicle.length * SCALE) / 2;
    const halfW = (vehicle.width * SCALE) / 2;
    const clampedX = Math.max(-halfL + halfX, Math.min(halfL - halfX, target.x));
    const clampedZ = Math.max(-halfW + halfZ, Math.min(halfW - halfZ, target.z));

    // Обновляем группу сразу для плавности
    if (groupRef.current) {
      groupRef.current.position.set(clampedX, scenePos.y, clampedZ);
    }

    // Преобразуем обратно в координаты пакера (левый нижний угол, мм)
    const packPos = sceneToPackPosition(
      clampedX,
      scenePos.y,
      clampedZ,
      item.dimensions,
      vehicle,
      SCALE,
    );
    onMove(item.id, packPos);

    const wasClamped =
      Math.abs(clampedX - target.x) > 1e-6 || Math.abs(clampedZ - target.z) > 1e-6;
    if (wasClamped && onBoundsViolation) {
      onBoundsViolation(`Груз «${item.name}» упёрся в стенку кузова.`);
    }
  };

  const endDrag = (e: any) => {
    if (!dragInfo.current) return;
    e.stopPropagation();
    gl.domElement.releasePointerCapture(e.pointerId);
    dragInfo.current = null;
    setDragging(false);
    if (onDragEnd) onDragEnd(item.id);
  };

  // Позиция подписи
  const labelY = isCylinder ? h / 2 + 0.06 : h / 2 + 0.05;
  const highlight = hovered || conflict || isSelected;
  const highlightIntensity = conflict ? 0.5 : hovered || isSelected ? 0.25 : 0;

  return (
    <group
      ref={groupRef}
      position={[scenePos.x, scenePos.y, scenePos.z]}
      rotation={[0, rotY, 0]}
      onPointerDown={startDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => { if (!dragging) setHovered(false); }}
    >
      {/* Цилиндр: поворот на -π/2 вокруг Z, чтобы ось стала горизонтальной вдоль X */}
      {isCylinder ? (
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[(diameter * SCALE) / 2, (diameter * SCALE) / 2, l, 32]} />
          <meshStandardMaterial
            color={item.color}
            transparent
            opacity={dragging ? 0.55 : 0.9}
            emissive={highlight ? new THREE.Color('#ffffff') : new THREE.Color('#000000')}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
      ) : (
        <mesh>
          <boxGeometry args={[l, h, w]} />
          <meshStandardMaterial
            color={item.color}
            transparent
            opacity={dragging ? 0.55 : 0.9}
            emissive={highlight ? new THREE.Color('#ffffff') : new THREE.Color('#000000')}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
      )}

      {/* Подпись с названием */}
      <Text
        position={[0, labelY, 0]}
        fontSize={Math.min(Math.max(l, w), 0.6)}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={Math.max(l, w) + 0.2}
      >
        {item.name}
      </Text>

      {/* Тултип при наведении */}
      {(hovered || dragging) && (
        <Html position={[0, labelY + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-box">
            <strong>{item.name}</strong>
            {`\n${isCylinder
              ? `Цилиндр Ø${Math.round(diameter)}×${Math.round(item.dimensions.length)} мм`
              : `${Math.round(item.dimensions.length)}×${Math.round(item.dimensions.width)}×${Math.round(item.dimensions.height)} мм`}`}
            {`\nВес: ${item.weight} кг`}
            {`\nПозиция: x=${Math.round(item.position.x)} y=${Math.round(item.position.y)} z=${Math.round(item.position.z)}`}
            {`\nПоворот Y: ${Math.round(item.rotationY ?? 0)}°`}
          </div>
        </Html>
      )}
    </group>
  );
}