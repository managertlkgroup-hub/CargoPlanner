import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore, useActiveVariant, useSelectedVehicle } from '../../store/useAppStore';
import CargoItem3D from './CargoItem3D';
import Container3D from './Container3D';
import { SCALE } from './Container3D';