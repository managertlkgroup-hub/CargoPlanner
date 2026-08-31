// ============================================================================
// Отдельный груз в 3D-сцене: параллелепипед или цилиндр с подписью и тултипом
//
// 3D — ТОЛЬКО для отображения. Перетаскивание и поворот — только в 2D.
// Клик по грузу позволяет выбирать его (для поворота клавишей R).
// ============================================================================

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html, Outlines } from '@react-three/drei';
import type { PackedItem, Vehicle } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { UNIT_LABEL, toUnit } from '../../utils/helpers';
import { SCALE } from './Container3D';

interface Props {
  item: PackedItem;
  vehicle: Vehicle;
  /** true, если сейчас идёт расчёт или отключено редактирование */
  disabled?: boolean;
  /** Колбэк выбора груза (клик) — для поворота клавишей R */
  onSelect?: (id: string) => void;
  /** Колбэк наведения — для подсветки */
  onHover?: (id: string) => void;
  /** Выделен ли груз в данный момент */
  isSelected?: boolean;
  /** Все размещённые грузы (unused, kept for API compat) */
  allItems?: PackedItem[];
}

export default function CargoItem3D({
  item,
  vehicle,
  disabled,
  onSelect,
  onHover,
  isSelected,
  allItems: _allItems,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const unit = useAppStore((s) => s.unit);

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

  // Позиция центра в сцене
  const rot90 = item.rotationY === 90 || item.rotationY === 270;
  const halfLen = rot90 ? item.dimensions.width / 2 : item.dimensions.length / 2;
  const halfWid = rot90 ? item.dimensions.length / 2 : item.dimensions.width / 2;
  const scenePos = useMemo(() => ({
    x: (item.position.x + halfLen - vehicle.length / 2) * SCALE,
    y: (item.position.y + item.dimensions.height / 2) * SCALE,
    z: (item.position.z + halfWid - vehicle.width / 2) * SCALE,
  }), [item.position.x, item.position.y, item.position.z, item.dimensions, vehicle, halfLen, halfWid]);

  // Поворот вокруг Y
  const rotY = ((item.rotationY ?? item.rotation?.y ?? 0) * Math.PI) / 180;
  
  // Подсветка для выбранного или наведённого груза
  const highlight = hovered || isSelected;
  const highlightIntensity = hovered || isSelected ? 0.25 : 0;
  const isOversize = item.isOversize;

  const outlineColor = isOversize ? '#ef4444' : isSelected ? '#ffffff' : hovered ? '#f59e0b' : undefined;
  const labelY = isCylinder ? h / 2 + 0.06 : h / 2 + 0.05;

  return (
    <group
      position={[scenePos.x, scenePos.y, scenePos.z]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onSelect) onSelect(item.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (onHover) onHover(item.id);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Цилиндр: поворот на -π/2 вокруг Z, чтобы ось стала горизонтальной вдоль X */}
      {isCylinder ? (
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[(diameter * SCALE) / 2, (diameter * SCALE) / 2, l, 32]} />
          <meshStandardMaterial
            color={item.color}
            transparent
            opacity={0.9}
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
            color={isOversize ? '#ef4444' : item.color}
            transparent
            opacity={0.9}
            emissive={highlight ? new THREE.Color('#ffffff') : isOversize ? new THREE.Color('#ff0000') : new THREE.Color('#000000')}
            emissiveIntensity={isOversize ? 0.15 : highlightIntensity}
          />
          {/* Обводка для выбранного или негабаритного груза */}
          {(isSelected || isOversize) && (
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
              <lineBasicMaterial color={isOversize ? '#ef4444' : '#ffffff'} linewidth={2} />
            </lineSegments>
          )}
        </mesh>
      )}

      {/* Outline подсветка при наведении/выделении */}
      {(hovered || isSelected) && !isCylinder && (
        <Outlines
          thickness={3}
          color={outlineColor ?? '#f59e0b'}
        />
      )}

      {/* Тултип при наведении */}
      {hovered && (
        <Html position={[0, labelY + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-box">
            <strong>{item.name}</strong>
            {`\n${isCylinder
              ? `Цилиндр Ø${Math.round(toUnit(diameter, unit))}×${Math.round(toUnit(item.dimensions.length, unit))} ${UNIT_LABEL[unit]}`
              : `${Math.round(toUnit(item.dimensions.length, unit))}×${Math.round(toUnit(item.dimensions.width, unit))}×${Math.round(toUnit(item.dimensions.height, unit))} ${UNIT_LABEL[unit]}`}`}
            {`\nВес: ${item.weight} кг`}
            {isOversize ? `\n⚠ Негабаритный` : ''}
            {`\nПозиция: x=${Math.round(toUnit(item.position.x, unit))} y=${Math.round(toUnit(item.position.y, unit))} z=${Math.round(toUnit(item.position.z, unit))} ${UNIT_LABEL[unit]}`}
            {`\nПоворот Y: ${Math.round(item.rotationY ?? 0)}°`}
          </div>
        </Html>
      )}
    </group>
  );
}