import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector3 } from 'three';
import { useDefenseStore } from './DefenseStore';
import { config } from './defenseState';
import { clampCarriedPosition } from './enemyCarry';
import { useInputStore } from '../Input/inputStore';
import { nearbyProjectedPoint } from '../Input/pointerInput';
import { canFollowCarriedPointer, carriedScreenPoint } from './carryInput';

// A single pointer projection drives whichever enemy is held, at simulation rate.
export default function ArenaEnemyCarry({ inputBridge, onHeldTest }) {
  const { camera, pointer } = useThree();
  const projection = useMemo(() => ({ ray: new Raycaster(), plane: new Plane(new Vector3(0, 1, 0), 0), point: new Vector3(), screen: new Vector3() }), []);
  const previous = useRef({ id: null, time: -Infinity, x: Infinity, z: Infinity });
  useEffect(() => {
    const isNearHeld = (point, rect) => {
      const state = useDefenseStore.getState();
      const enemy = state.enemies.find(item => item.id === state.carriedEnemyId && item.carried);
      return !!enemy && nearbyProjectedPoint(point, carriedScreenPoint(enemy, camera, projection.screen), rect);
    };
    onHeldTest?.(isNearHeld);
    return () => onHeldTest?.(null);
  }, [camera, onHeldTest, projection]);
  useFrame(() => {
    const state = useDefenseStore.getState();
    if (state.phase !== 'wave' || !state.carriedEnemyId) { previous.current.id = null; return; }
    if (state.paused) return;
    const interaction = inputBridge?.current ?? {};
    const mode = useInputStore.getState().mode;
    if (!canFollowCarriedPointer(mode, interaction)) { previous.current.id = null; return; }
    const enemy = state.enemies.find(item => item.id === state.carriedEnemyId && item.carried);
    if (!enemy) return;
    const last = previous.current;
    if (last.id === enemy.id && state.time - last.time < .05 - 1e-9) return;
    // Intersect the raised cube's centre rather than the table beneath it,
    // otherwise the tilted camera makes the model drift above the pointer.
    projection.plane.setComponents(0, 1, 0, -((config.enemyCarry?.height ?? 2) + enemy.size * .6));
    projection.ray.setFromCamera(mode === 'touch' || interaction.touch ? interaction.point : pointer, camera);
    if (!projection.ray.ray.intersectPlane(projection.plane, projection.point)) return;
    const point = clampCarriedPosition(enemy, projection.point.x, projection.point.z, config);
    if (last.id === enemy.id && Math.hypot(point.x - last.x, point.z - last.z) < .01) return;
    last.id = enemy.id; last.time = state.time; last.x = point.x; last.z = point.z;
    state.moveCarriedEnemy(point.x, point.z);
  });
  return null;
}
