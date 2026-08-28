// ============================================================================
// Прозрачный контейнер (кузов автомобиля) в 3D
//
// Система координат: центр кузова расположен в точке (0, 0, 0),
// ось X — вдоль длины, ось Y — вверх, ось Z — вдоль ширины.
// Пакер оперирует координатами "левого нижнего угла" в мм; для отображения
// используется центрирование (см. helpers).
// ============================================================================

import * as THREE from 'three';
import type { Vehicle } from '../../types';

/** Масштабный коэффициент: переводим мм в "сценные" единицы */
export const SCALE = 0.001;

/** Видимость по умолчанию для типа кузова */
function getDefaultVisibility(bodyType?: string) {
  switch (bodyType) {
    case 'platform': case 'flatbed': case 'open_container':
    case 'low_loader': case 'trailer': case 'low_platform': case 'telescopic':
      return { showRoof: false, showSides: false, showFront: false, showRear: false, showFloor: true };
    case 'dump':
      return { showRoof: false, showSides: true, showFront: true, showRear: true, showFloor: true };
    default:
      return { showRoof: true, showSides: true, showFront: true, showRear: true, showFloor: true };
  }
}

interface Props {
  vehicle: Vehicle;
}

export default function Container3D({ vehicle }: Props) {
  const w = vehicle.width * SCALE;
  const h = vehicle.height * SCALE;
  const l = vehicle.length * SCALE;
  const defaults = getDefaultVisibility(vehicle.bodyType);
  const showRoof = vehicle.showRoof ?? defaults.showRoof;
  const showSides = vehicle.showSides ?? defaults.showSides;
  const showFront = vehicle.showFront ?? defaults.showFront;
  const showRear = vehicle.showRear ?? defaults.showRear;
  const showFloor = vehicle.showFloor ?? defaults.showFloor;

  // Каркас кузова через LineSegments (центрирован в начале координат)
  const halfL = l / 2;
  const halfW = w / 2;

  const corners = [
    [-halfL, 0, -halfW], [halfL, 0, -halfW],
    [halfL, 0, halfW], [-halfL, 0, halfW],
    [-halfL, h, -halfW], [halfL, h, -halfW],
    [halfL, h, halfW], [-halfL, h, halfW],
  ];

  const edges = [
    corners[0], corners[1], corners[1], corners[2],
    corners[2], corners[3], corners[3], corners[0],
    corners[4], corners[5], corners[5], corners[6],
    corners[6], corners[7], corners[7], corners[4],
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
      {showFloor && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l, w]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} />
        </mesh>
      )}

      {/* Каркас (ребра кузова) */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#3b82f6" />
      </lineSegments>

      {/* Задняя стенка (x = -l/2) */}
      {showRear && (
        <mesh position={[-halfL, h / 2, 0]}>
          <boxGeometry args={[0.02, h, w]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.08} />
        </mesh>
      )}

      {/* Передняя стенка (x = l/2) */}
      {showFront && (
        <mesh position={[halfL, h / 2, 0]}>
          <boxGeometry args={[0.02, h, w]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.08} />
        </mesh>
      )}

      {/* Боковые стенки (полупрозрачные) */}
      {showSides && (
        <>
          <mesh position={[0, h / 2, -halfW]}>
            <boxGeometry args={[l, h, 0.02]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.05} />
          </mesh>
          <mesh position={[0, h / 2, halfW]}>
            <boxGeometry args={[l, h, 0.02]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.05} />
          </mesh>
        </>
      )}

      {/* Крыша */}
      {showRoof && (
        <mesh position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l, w]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}