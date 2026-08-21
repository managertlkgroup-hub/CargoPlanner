// ============================================================================
// Прозрачный контейнер (кузов автомобиля) в 3D
// ============================================================================

import * as THREE from 'three';
import type { Vehicle } from '../../types';

/** Масштабный коэффициент: переводим мм в "сценные" единицы */
export const SCALE = 0.001;

interface Props {
  vehicle: Vehicle;
}

export default function Container3D({ vehicle }: Props) {
  const w = vehicle.width * SCALE;
  const h = vehicle.height * SCALE;
  const l = vehicle.length * SCALE;

  // Каркас кузова через LineSegments
  const halfL = l / 2;
  const halfW = w / 2;
  const halfH = h / 2;

  const corners = [
    [-halfL, 0, -halfW], [halfL, 0, -halfW],
    [halfL, 0, halfW], [-halfL, 0, halfW],
    [-halfL, h, -halfW], [halfL, h, -halfW],
    [halfL, h, halfW], [-halfL, h, halfW],
  ];

  const edges = [
    // низ
    corners[0], corners[1], corners[1], corners[2],
    corners[2], corners[3], corners[3], corners[0],
    // верх
    corners[4], corners[5], corners[5], corners[6],
    corners[6], corners[7], corners[7], corners[4],
    // вертикали
    corners[0], corners[4], corners[1], corners[5],
    corners[2], corners[6], corners[3], corners[7],
  ];

  const positions = new Float32Array(edges.length * 3);
  edges.forEach((v, i) => {
    positions[i * 3] = v[0];
    positions[i * 3 + 1] = v[1];
    positions[i * 3 + 2] = v[2];
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return (
    <group>
      {/* Пол */}
      <mesh position={[l / 2, 0, w / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[l, w]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>

      {/* Каркас (ребра кузова) */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#3b82f6" />
      </lineSegments>

      {/* Задняя стенка */}
      <mesh position={[0, h / 2, w / 2]}>
        <boxGeometry args={[0.02, h, w]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.08} />
      </mesh>

      {/* Боковые стенки (полупрозрачные) */}
      <mesh position={[l / 2, h / 2, 0]}>
        <boxGeometry args={[l, h, 0.02]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.05} />
      </mesh>
      <mesh position={[l / 2, h / 2, w]}>
        <boxGeometry args={[l, h, 0.02]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}