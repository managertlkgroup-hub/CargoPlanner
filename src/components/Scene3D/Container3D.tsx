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
  hasFrame: boolean; // каркас (для тента)
  lowSides: boolean; // невысокие борта (для бортового)
  label: string; // название типа
} {
  switch (bodyType) {
    case 'tent': case 'curtain':
      return { wallOpacity: 0.05, roofOpacity: 0.08, floorColor: '#64748b', wallColor: '#3b82f6', roofColor: '#3b82f6', isCylindrical: false, wallHeight: 1, hasFrame: true, lowSides: false, label: 'Тент' };
    case 'van': case 'isothermal': case 'refrigerator': case 'refrigerator_partition': case 'refrigerator_multi':
      return { wallOpacity: 0.22, roofOpacity: 0.3, floorColor: '#64748b', wallColor: '#475569', roofColor: '#475569', isCylindrical: false, wallHeight: 1, hasFrame: false, lowSides: false, label: 'Фургон' };
    case 'platform': case 'flatbed': case 'open_container':
    case 'low_loader': case 'trailer': case 'low_platform': case 'telescopic':
      return { wallOpacity: 0, roofOpacity: 0, floorColor: '#94a3b8', wallColor: '#94a3b8', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 1, hasFrame: false, lowSides: false, label: 'Платформа' };
    case 'dump':
      return { wallOpacity: 0.15, roofOpacity: 0, floorColor: '#94a3b8', wallColor: '#f59e0b', roofColor: '#f59e0b', isCylindrical: false, wallHeight: 1, hasFrame: false, lowSides: false, label: 'Самосвал' };
    case 'side':
      return { wallOpacity: 0.1, roofOpacity: 0, floorColor: '#94a3b8', wallColor: '#2563eb', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 0.3, hasFrame: false, lowSides: true, label: 'Бортовой' };
    case 'tanker': case 'container':
      return { wallOpacity: 0.18, roofOpacity: 0.22, floorColor: '#64748b', wallColor: '#64748b', roofColor: '#64748b', isCylindrical: true, wallHeight: 1, hasFrame: false, lowSides: false, label: 'Цистерна' };
    default:
      return { wallOpacity: 0.08, roofOpacity: 0.15, floorColor: '#94a3b8', wallColor: '#3b82f6', roofColor: '#94a3b8', isCylindrical: false, wallHeight: 1, hasFrame: false, lowSides: false, label: 'Тент' };
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
        <>
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[l, w]} />
            <meshStandardMaterial color={bodyStyle.floorColor} transparent opacity={0.35} />
          </mesh>
          {/* Балки пола для платформы (3 продольные линии) */}
          {bodyStyle.label === 'Платформа' && (
            <>
              {[-halfW * 0.5, 0, halfW * 0.5].map((z, i) => (
                <mesh key={`beam-${i}`} position={[0, -0.005, z]}>
                  <boxGeometry args={[l, 0.008, 0.008]} />
                  <meshStandardMaterial color="#64748b" transparent opacity={0.5} />
                </mesh>
              ))}
            </>
          )}
        </>
      )}

      {/* Каркас (ребра кузова) */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={bodyStyle.wallColor} />
      </lineSegments>

      {/* Каркасные стойки для тента/тента (4 вертикальные опоры по углам) */}
      {bodyStyle.hasFrame && showSides && (
        <>\n          {[[-halfL, -halfW], [-halfL, halfW], [halfL, -halfW], [halfL, halfW]].map(([x, z], i) => (
            <mesh key={`post-${i}`} position={[x, h / 2, z]}>
              <cylinderGeometry args={[0.008, 0.008, h, 6]} />
              <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.5} />
            </mesh>
          ))}
          {/* Горизонтальные перекладины вверху (каркас крыши тента) */}
          <mesh position={[0, h, -halfW]}>
            <boxGeometry args={[l, 0.006, 0.006]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.4} />
          </mesh>
          <mesh position={[0, h, halfW]}>
            <boxGeometry args={[l, 0.006, 0.006]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.4} />
          </mesh>
          <mesh position={[-halfL, h, 0]}>
            <boxGeometry args={[0.006, 0.006, w]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.4} />
          </mesh>
          <mesh position={[halfL, h, 0]}>
            <boxGeometry args={[0.006, 0.006, w]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.4} />
          </mesh>
        </>
      )}

      {/* Невысокие борта для бортового (20% высоты, сплошные) */}
      {bodyStyle.lowSides && showSides && (
        <>\n          <mesh position={[0, h * 0.1, -halfW]}>
            <boxGeometry args={[l, h * 0.2, 0.015]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.35} />
          </mesh>
          <mesh position={[0, h * 0.1, halfW]}>
            <boxGeometry args={[l, h * 0.2, 0.015]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.35} />
          </mesh>
          <mesh position={[-halfL, h * 0.1, 0]}>
            <boxGeometry args={[0.015, h * 0.2, w]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.35} />
          </mesh>
          <mesh position={[halfL, h * 0.1, 0]}>
            <boxGeometry args={[0.015, h * 0.2, w]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={0.35} />
          </mesh>
        </>
      )}

      {/* Задняя стенка */}
      {showRear && !bodyStyle.isCylindrical && (
        <>
          <mesh position={[-halfL, sideH / 2, 0]}>
            <boxGeometry args={[0.02, sideH, w]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} />
          </mesh>
          {/* Линии дверей фургона (вертикальная линия по центру) */}
          {bodyStyle.wallOpacity > 0.15 && (
            <mesh position={[-halfL - 0.005, sideH / 2, 0]}>
              <boxGeometry args={[0.003, sideH * 0.9, 0.003]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
            </mesh>
          )}
        </>
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
        <>
          <mesh position={[0, w / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[w / 2, w / 2, l, 24, 1, true]} />
            <meshStandardMaterial color={bodyStyle.wallColor} transparent opacity={bodyStyle.wallOpacity} side={THREE.DoubleSide} />
          </mesh>
          {/* Пояса цистерны (3 кольца) */}
          {[-halfL * 0.5, 0, halfL * 0.5].map((x, i) => (
            <mesh key={`band-${i}`} position={[x, w / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[w / 2 + 0.005, 0.004, 8, 24]} />
              <meshStandardMaterial color="#475569" transparent opacity={0.4} />
            </mesh>
          ))}
        </>
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

      {/* Тип кузова над контейнером */}
      <Text
        position={[0, h + 0.15, 0]}
        fontSize={0.1}
        color={bodyStyle.wallColor}
        anchorX="center"
        anchorY="middle"
      >
        {bodyStyle.label}
      </Text>
    </group>
  );
}