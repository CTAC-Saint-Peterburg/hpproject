import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import SpellHint from '../Pot/SpellHint';
import brewing from '../../static/brewing.json';
import { theme } from '../../static/theme';
import { ingredientRefillProgress } from './ingredientAnimation';
import { useGameStore } from '../Stores/GameStore';

const roundArray = arr => arr.map(value => Math.round(value * 100) / 100 || 0);

export const Bottle = ({ cords, id, color, isFollowMode, mousePos, isSelected,
  onToggle, onPositionUpdate, invertY = false, showHint = true, refillAt = null }) => {
  const group = useRef();
  const material = useRef();
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseNDC = useMemo(() => new THREE.Vector2(), []);
  const initialPos = useMemo(() => new THREE.Vector3(...cords), [cords]);
  const targetPos = useRef(new THREE.Vector3(...cords));
  const lastUpdate = useRef(0), lastSentPos = useRef(new THREE.Vector3());
  const following = isFollowMode && isSelected;
  useFrame((state, delta) => {
    if (!group.current || useGameStore.getState().paused) return;
    const refill = refillAt === null ? 1 : ingredientRefillProgress((Date.now() - refillAt) / 1000, brewing.ingredientAnimation);
    group.current.scale.setScalar(Math.max(.001, refill));
    material.current.opacity = refill;
    if (refill < 1) {
      group.current.position.copy(initialPos);
      return;
    }
    const hasMouse = Number.isFinite(mousePos?.x) && Number.isFinite(mousePos?.y) && size.width > 0 && size.height > 0;
    targetPos.current.copy(initialPos);
    if (following && hasMouse) {
      mouseNDC.set(mousePos.x, invertY ? -mousePos.y : mousePos.y);
      raycaster.setFromCamera(mouseNDC, camera);
      const direction = raycaster.ray.direction.z;
      if (Math.abs(direction) > .001) {
        const distance = (cords[2] - raycaster.ray.origin.z) / direction;
        if (Number.isFinite(distance) && distance > 0) raycaster.ray.at(distance, targetPos.current);
      }
    }
    group.current.position.lerp(targetPos.current, 1 - Math.exp(-14 * delta));
    if (!following || !hasMouse || !onPositionUpdate) return;
    const now = state.clock.getElapsedTime() * 1000;
    const current = group.current.position;
    if (now - lastUpdate.current > 66 && current.distanceTo(lastSentPos.current) > .01) {
      lastUpdate.current = now;
      lastSentPos.current.copy(current);
      onPositionUpdate({ id, color, cords: roundArray(cords), currentPos: roundArray(current.toArray()),
        isSelected: true, timestamp: Math.round(now) });
    }
  });
  return <group ref={group} position={cords}>
    <mesh onClick={event => { event.stopPropagation(); onToggle(); }}>
      <boxGeometry args={[brewing.ingredientSize, brewing.ingredientSize, brewing.ingredientSize]} />
      <meshStandardMaterial ref={material} color={color} transparent />
      {isSelected && <mesh scale={1.08} raycast={() => null}>
        <boxGeometry args={[brewing.ingredientSize, brewing.ingredientSize, brewing.ingredientSize]} />
        <meshBasicMaterial color={theme.colors.white} side={THREE.BackSide} />
      </mesh>}
    </mesh>
    {showHint && <Html center position={[0, -brewing.ingredientSize * .5 - .36, 0]} style={{ pointerEvents: 'none' }}>
      <SpellHint spellId={following ? brewing.dropSpell : brewing.liftSpell}
        labelKey={following ? 'brewing.drop' : 'brewing.lift'} />
    </Html>}
  </group>;
};
