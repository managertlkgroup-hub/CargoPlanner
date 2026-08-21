// ============================================================================
// Отдельный груз в 3D-сцене: параллелепипед с названием и тултипом
// ============================================================================

import { useState } from 'react';
import * as THREE from 'three';
import { Html, Text } from '@react-three/drei';
import type { PackedItem } from '../../types';
import { SCALE } from './Container3D';

interface Props {
  item: PackedItem;
  /** Функция обратного вызова при ручном перетаскивании */
  onDrag?: (id: string, position: { x: number; y: number; z: number }) => void;
}

export default function CargoItem3D({ item, onDrag }: Props) {
  const [hovered, setHovered] = useState(false);

  const w = item.dimensions.width * SCALE;
  const h = item.dimensions.height * SCALE;
  const l = item.dimensions.length * SCALE;

  // Позиция центра груза: позиция — это левый нижний угол, поэтому добавляем половины
  const pos: [number, number, number] = [
    item.position.x * SCALE + l / 2,
    item.position.y * SCALE + h / 2,
    item.position.z * SCALE + w / 2,
  ];

  // Поворот вокруг оси Y (град��сы -> радианы)
  const rotY = ((item.rotation?.y ?? 0) * Math.PI) / 180;

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[l, h, w]} />
        <meshStandardMaterial
          color={item.color}
          transparent
          opacity={0.9}
          emissive={hovered ? new THREE.Color('#ffffff') : new THREE.Color('#000000')}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>

      {/* Подпись с названием */}
      <Text
        position={[0, h / 2 + 0.05, 0]}
        fontSize={Math.min(l, 0.5)}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={l + 0.2}
      >
        {item.name}
      </Text>

      {/* Тултип при наведении */}
      {hovered && (
        <Html position={[0, h / 2 + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-box">
            <strong>{item.name}</strong>
            {`\n${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.height} мм`}
            {`\nВес: ${item.weight} кг`}
            {`\nПозиция: x=${Math.round(item.position.x)} y=${Math.round(item.position.y)} z=${Math.round(item.position.z)}`}
          </div>
        </Html>
      )}
    </group>
  );
}