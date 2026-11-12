import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import SpellHint from '../Pot/SpellHint';
import brewing from '../../static/brewing.json';
import { ingredientRefillProgress } from './ingredientAnimation';
import { useGameStore } from '../Stores/GameStore';
import IngredientModel from './IngredientModel';
import { ingredientRaycast } from './ingredientHitArea';
import { ingredientMayFollow, projectIngredientPointer, clampIngredientPointer } from './ingredientPointer';
import { useInputStore } from '../Input/inputStore';
import TouchHitArea from '../Input/TouchHitArea';
import { isSelectionClick } from '../Input/selectionClick';

const roundArray = arr => arr.map(value => Math.round(value * 100) / 100 || 0);

export const Bottle = ({ cords, id, color, isFollowMode, mousePos, isSelected,
  onToggle, onPositionUpdate, invertY = false, showHint = true, refillAt = null, carryInput, positions, gestureRef }) => {
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
    positions.current.set(id, group.current.position);
    const refill = refillAt === null ? 1 : ingredientRefillProgress((Date.now() - refillAt) / 1000, brewing.ingredientAnimation);
    group.current.scale.setScalar(Math.max(.001, refill));
    material.current.opacity = refill;
    if (refill < 1) {
      group.current.position.copy(initialPos);
      targetPos.current.copy(initialPos);
      return;
    }
    const input = carryInput.current;
    const touch = useInputStore.getState().mode === 'touch' || input.touch;
    const pointer = input.point ?? mousePos;
    const hasMouse = Number.isFinite(pointer?.x) && Number.isFinite(pointer?.y) && size.width > 0 && size.height > 0;
    if (!following) targetPos.current.copy(initialPos);
    if (ingredientMayFollow(following, touch, input.dragging, input.heldId, id) && hasMouse) {
      mouseNDC.set(pointer.x, invertY ? -pointer.y : pointer.y);
      if (touch) clampIngredientPointer(mouseNDC, camera, cords[2], brewing.ingredientSize, mouseNDC);
      projectIngredientPointer(mouseNDC, camera, cords[2], raycaster, targetPos.current);
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
  const select = event => {
    if (!isSelectionClick(event, gestureRef?.current)) return;
    event.stopPropagation(); onToggle();
  };
  return <group ref={group} position={cords}>
    <IngredientModel id={id} color={color} selected={isSelected} materialRef={material} raycast={ingredientRaycast}
      onClick={select} />
    <TouchHitArea onClick={select} />
    {showHint && <Html center position={[0, -brewing.ingredientSize * .5 - .36, 0]} style={{ pointerEvents: 'none' }}>
      <SpellHint spellId={following ? brewing.dropSpell : brewing.liftSpell}
        labelKey={following ? 'brewing.drop' : 'brewing.lift'} />
    </Html>}
  </group>;
};
