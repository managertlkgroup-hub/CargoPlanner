// ============================================================================
// Ручное редактирование раскладки: перетаскивание грузов в 3D
//
// Использует <DragControls> из @react-three/drei. Груз перемещается
// по осям X и Z (горизонтальная плоскость); высота Y фиксируется.
// Вращение вокруг оси Y выполняется кнопками в редакторе координат.
// ============================================================================

import { DragControls } from '@react-three/drei';
import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { PackedItem } from '../../types';
import { SCALE } from './Container3D';

interface Props {
  item: PackedItem;
  children: React.ReactNode;
  onDragEnd: (id: string, position: { x: number; y: number; z: number }) => void;
  enabled: boolean;
}

export default function DragControls({ item, children, onDragEnd, enabled }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  // Запоминаем базовую высоту груза (Y не меняется при перетаскивании)
  const baseY = useRef(item.position.y);

  const handleDragEnd = (_e: ThreeEvent<PointerEvent>) => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    // Позиция группы — это центр груза. Переводим в мм левого нижнего угла.
    const halfL = (item.dimensions.length * SCALE) / 2;
    const halfW = (item.dimensions.width * SCALE) / 2;
    const x = Math.max(0, g.position.x / SCALE - halfL / SCALE);
    const z = Math.max(0, g.position.z / SCALE - halfW / SCALE);
    onDragEnd(item.id, { x, y: baseY.current, z });
  };

  if (!enabled) {
    return <group>{children}</group>;
  }

  return (
    <DragControls onDragEnd={handleDragEnd}>
      <group ref={groupRef}>{children}</group>
    </DragControls>
  );
}