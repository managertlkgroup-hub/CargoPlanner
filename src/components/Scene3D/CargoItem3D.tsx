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
  /** Колбэк наведения — для поворота клавишей R */
  onHover?: (id: string) => void;
  /** Выделен ли груз в данный момент */
  isSelected?: boolean;
  /** Сообщение при выходе за границы кузова */
  onBoundsViolation?: (msg: string) => void;
  /** Все размещённые грузы для проверки коллизий */
  allItems?: PackedItem[];
}

export default function CargoItem3D({
  item,
  vehicle,
  disabled,
  onMove,
  onDragEnd,
  onDragStart,
  onSelect,
  onHover,
  isSelected,
  onBoundsViolation,
  allItems,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [conflict, setConflict] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const dragInfo = useRef<{ raycaster: THREE.Raycaster; plane: THREE.Plane } | null>(null);
  const lastValidPos = useRef<{ x: number; y: number; z: number } | null>(null);

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

  // Проверка коллизии AABB
  const checkCollision = (pos: { x: number; y: number; z: number }): boolean => {
    if (!allItems) return false;
    const rotY = item.rotationY ?? 0;
    const isOdd90 = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
    const xLen = isOdd90 ? item.dimensions.width : item.dimensions.length;
    const zLen = isOdd90 ? item.dimensions.length : item.dimensions.width;
    const yH = item.dimensions.height;
    return allItems.some((other) => {
      if (other.id === item.id) return false;
      const otherRotY = other.rotationY ?? 0;
      const otherOdd90 = Math.round(((otherRotY % 360) + 360) % 360 / 90) % 2 === 1;
      const oXLen = otherOdd90 ? other.dimensions.width : other.dimensions.length;
      const oZLen = otherOdd90 ? other.dimensions.length : other.dimensions.width;
      const oYH = other.dimensions.height;
      return (
        pos.x < other.position.x + oXLen &&
        pos.x + xLen > other.position.x &&
        pos.y < other.position.y + oYH &&
        pos.y + yH > other.position.y &&
        pos.z < other.position.z + oZLen &&
        pos.z + zLen > other.position.z
      );
    });
  };

  // Позиция центра в сцене (левый нижний угол пакера -> центр сцены)
  const scenePos = useMemo(
    () => packToScenePosition(item.position, item.dimensions, vehicle, SCALE),
    [item.position, item.dimensions, vehicle],
  );

  // Поворот вокруг Y
  const rotY = ((item.rotationY ?? item.rotation?.y ?? 0) * Math.PI) / 180;
  
  // Подсветка для выбранного или наведённого груза
  const highlight = hovered || isSelected;
  const highlightIntensity = hovered || isSelected ? 0.25 : 0;
  const displayColor = conflict ? '#ef4444' : item.color;

  // --- Логика перетаскивания по горизонтальной плоскости ---
  const startDrag = (e: any) => {
    if (disabled) return;
    e.stopPropagation();
    if (onSelect) onSelect(item.id);
    if (onDragStart) onDragStart(item.id);
    lastValidPos.current = { ...item.position };
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -scenePos.y);
    const raycaster = new THREE.Raycaster();
    dragInfo.current = { raycaster, plane };
    setDragging(true);
    setConflict(false);
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

    // Преобразуем обратно в координаты пакера (левый нижний угол, мм)
    const packPos = sceneToPackPosition(
      clampedX,
      scenePos.y,
      clampedZ,
      item.dimensions,
      vehicle,
      SCALE,
    );

    // Проверка коллизии с другими грузами — ДО обновления позиции
    if (checkCollision(packPos)) {
      setConflict(true);
      // Не перемещаем — груз остаётся на предыдущей позиции
      return;
    }

    // Коллизий нет — обновляем позицию
    setConflict(false);
    lastValidPos.current = packPos;
    onMove(item.id, packPos);

    // Обновляем визуальную позицию группы
    if (groupRef.current) {
      groupRef.current.position.set(clampedX, scenePos.y, clampedZ);
    }

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

  return (
    <group
      ref={groupRef}
      position={[scenePos.x, scenePos.y, scenePos.z]}
      rotation={[0, rotY, 0]}
      onPointerDown={startDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); if (onHover) onHover(item.id); }}
      onPointerOut={() => { if (!dragging) setHovered(false); }}
    >
      {/* Цилиндр: поворот на -π/2 вокруг Z, чтобы ось стала горизонтальной вдоль X */}
      {isCylinder ? (
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[(diameter * SCALE) / 2, (diameter * SCALE) / 2, l, 32]} />
          <meshStandardMaterial
            color={displayColor}
            transparent
            opacity={dragging ? 0.55 : 0.9}
            emissive={highlight ? new THREE.Color('#ffffff') : new THREE.Color('#000000')}
            emissiveIntensity={highlightIntensity}
          />
          {/* Обводка для выбранного груза */}
          {isSelected && (
            <lineSegments>
              <edgesGeometry args={[new THREE.CylinderGeometry((diameter * SCALE) / 2, (diameter * SCALE) / 2, l, 32)]} />
              <lineBasicMaterial color="#ffffff" linewidth={2} />
            </lineSegments>
          )}
        </mesh>
      ) : (
        <mesh>
          <boxGeometry args={[l, h, w]} />
          <meshStandardMaterial
            color={displayColor}
            transparent
            opacity={dragging ? 0.55 : 0.9}
            emissive={highlight ? new THREE.Color('#ffffff') : new THREE.Color('#000000')}
            emissiveIntensity={highlightIntensity}
          />
          {/* Обводка для выбранного груза */}
          {isSelected && (
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
              <lineBasicMaterial color="#ffffff" linewidth={2} />
            </lineSegments>
          )}
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