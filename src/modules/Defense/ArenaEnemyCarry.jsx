import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector3 } from 'three';
import { useDefenseStore } from './DefenseStore';
import { config } from './defenseState';
import { clampCarriedPosition } from './enemyCarry';

// A single pointer projection drives whichever enemy is held, at simulation rate.
export default function ArenaEnemyCarry() {
  const { camera, pointer } = useThree();
  const projection = useMemo(() => ({ ray: new Raycaster(), plane: new Plane(new Vector3(0, 1, 0), 0), point: new Vector3() }), []);
  const previous = useRef({ id: null, time: -Infinity, x: Infinity, z: Infinity });
  useFrame(() => {
    const state = useDefenseStore.getState();
    if (state.phase !== 'wave' || !state.carriedEnemyId) { previous.current.id = null; return; }
    if (state.paused) return;
    const enemy = state.enemies.find(item => item.id === state.carriedEnemyId && item.carried);
    if (!enemy) return;
    const last = previous.current;
    if (last.id === enemy.id && state.time - last.time < .05 - 1e-9) return;
    // Intersect the raised cube's centre rather than the table beneath it,
    // otherwise the tilted camera makes the model drift above the pointer.
    projection.plane.setComponents(0, 1, 0, -((config.enemyCarry?.height ?? 2) + enemy.size * .6));
    projection.ray.setFromCamera(pointer, camera);
    if (!projection.ray.ray.intersectPlane(projection.plane, projection.point)) return;
    const point = clampCarriedPosition(enemy, projection.point.x, projection.point.z, config);
    if (last.id === enemy.id && Math.hypot(point.x - last.x, point.z - last.z) < .01) return;
    last.id = enemy.id; last.time = state.time; last.x = point.x; last.z = point.z;
    state.moveCarriedEnemy(point.x, point.z);
  });
  return null;
}
