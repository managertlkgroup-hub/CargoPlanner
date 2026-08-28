// ============================================================================
// Прозрачный контейнер (кузов автомобиля) в 3D
//
// Система координат: центр кузова расположен в точке (0, 0, 0),
// ось X — вдоль длины, ось Y — вверх, ось Z — вдоль ширины.
// Пакер оперирует координатами "левого нижнего угла" в мм; для отображения
// используется центрирование (см. helpers).
// ============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { Vehicle } from '../../types';
import { useAppStore } from '../../store/useAppStore';

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
    case 'side':
      return { showRoof: false, showSides: true, showFront: false, showRear: false, showFloor: true };
    default:
      return { showRoof: true, showSides: true, showFront: true, showRear: true, showFloor: true };
  }
}

/** Определяет визуальный стиль кузова по типу */
function getBodyStyle(bodyType?: string): {
  wallOpacity: number; roofOpacity: number; floorColor: string;
  wallColor: string; roofColor: string; isCylindrical: boolean;
  wallHeight: number; // 1 = full, 0.3 = low sides
} {
  switch (bodyType) {
    case 'tent': case 'curtain':
      return { wallOpacity: 0.06, roofOpacity: 0.12, floorColor: '#94a3b8', wallColor: '#3b82f6', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 1 };
    case 'van': case 'isothermal': case 'refrigerator': case 'refrigerator_partition': case 'refrigerator_multi':
      return { wallOpacity: 0.18, roofOpacity: 0.25, floorColor: '#94a3b8', wallColor: '#64748b', roofColor: '#64748b', isCylindrical: false, wallHeight: 1 };
    case 'platform': case 'flatbed': case 'open_container':
    case 'low_loader': case 'trailer': case 'low_platform': case 'telescopic':
      return { wallOpacity: 0, roofOpacity: 0, floorColor: '#94a3b8', wallColor: '#94a3b8', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 1 };
    case 'dump':
      return { wallOpacity: 0.12, roofOpacity: 0, floorColor: '#94a3b8', wallColor: '#f59e0b', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 1 };
    case 'side':
      return { wallOpacity: 0.08, roofOpacity: 0, floorColor: '#94a3b8', wallColor: '#3b82f6', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 0.3 };
    case 'tanker': case 'container':
      return { wallOpacity: 0.15, roofOpacity: 0.2, floorColor: '#94a3b8', wallColor: '#64748b', roofColor: '#64748b', isCylindrical: true, wallHeight: 1 };
    default:
      return { wallOpacity: 0.08, roofOpacity: 0.15, floorColor: '#94a3b8', wallColor: '#3b82f6', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 1 };
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
  const visMap = useAppStore((s) => s.vehicleVisibilityMap);
  const vis = visMap[vehicle.id] || {};
  const showRoof = vis.showRoof ?? defaults.showRoof;
  const showSides = vis.showSides ?? defaults.showSides;
  const showFront = vis.showFront ?? defaults.showFront;
  const showRear = vis.showRear ?? defaults.showRear;
  const showFloor = vis.showFloor ?? defaults.showFloor;
  const bodyStyle = getBodyStyle(vehicle.bodyType);
  const sideH = h * bodyStyle.wallHeight;

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

  const geometry = useMemo(() => {
    const positions = new Float32Array(edges.length * 3);
    edges.forEach((v, i) => {
      positions[i * 3] = v[0];
      positions[i * 3 + 1] = v[1];
      positions[i * 3 + 2] = v[2];
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [halfL, halfW, h]);

  return (
    <group>
      {/* Пол */}
      {showFloor && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l, w]} />
          <meshStandardMaterial color={bodyStyle.floorColor} transparent opacity={0.35} />
        </mesh>
      )}

      {/* Каркас (ребра кузова) */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={bodyStyle.wallColor} />
      </lineSegments>

      {/* Задняя стенка */}
      {showRear && !bodyStyle.isCylindrical && (
        <mesh position={[-halfL, sideH / 2, 0]}>
          <boxGeometry args={[0.02, sideH, w]} />
          <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} />
        </mesh>
      )}

      {/* Передняя стенка */}
      {showFront && !bodyStyle.isCylindrical && (
        <mesh position={[halfL, sideH / 2, 0]}>
          <boxGeometry args={[0.02, sideH, w]} />
          <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} />
        </mesh>
      )}

      {/* Боковые стенки */}
      {showSides && !bodyStyle.isCylindrical && (
        <>
          <mesh position={[0, sideH / 2, -halfW]}>
            <boxGeometry args={[l, sideH, 0.02]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} />
          </mesh>
          <mesh position={[0, sideH / 2, halfW]}>
            <boxGeometry args={[l, sideH, 0.02]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} />
          </mesh>
        </>
      )}

      {/* Цилиндрический кузов (цистерна) */}
      {bodyStyle.isCylindrical && showSides && (
        <mesh position={[0, w / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[w / 2, w / 2, l, 24, 1, true]} />
          <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Крыша */}
      {showRoof && (
        <mesh position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l, w]} />
          <meshStandardMaterial color={bodyStyle.roofColor} transparent opacity={bodyStyle.roofOpacity} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Надпись "Cargo Planner" на задней стенке */}
      <Text
        position={[0, h * 0.5, -halfW - 0.01]}
        fontSize={0.12}
        color={bodyStyle.wallColor}
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, 0]}
      >
        Cargo Planner
      </Text>
    </group>
  );
}