import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { WandParticles } from '../Wand/WandParticles';
import { ingredientFlightPose } from './ingredientAnimation';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants';
import brewing from '../../static/brewing.json';
import IngredientModel from './IngredientModel';
import { INGREDIENT_MODEL_SIZE } from './ingredientGeometry';

// The same renderer as spell effects, with its emitter attached to the ingredient.
export default function IngredientFlight({ flight }) {
  const ingredient = useRef();
  const tip = useRef(new Vector3(...flight.from));
  const color = SPAWN_BOTTLES_CORDS.find(item => item.id === flight.id)?.color;
  useFrame(() => {
    const s = useGameStore.getState();
    if (!ingredient.current || s.paused || !s.ingredientFlight) return;
    const pose = ingredientFlightPose(flight.from, (Date.now() - s.ingredientFlight.startedAt) / 1000, brewing.ingredientAnimation);
    ingredient.current.position.set(...pose.position);
    ingredient.current.scale.setScalar(pose.scale * brewing.ingredientSize / INGREDIENT_MODEL_SIZE);
    ingredient.current.rotation.set(pose.rotation, pose.rotation * .6, 0);
    ingredient.current.material.opacity = pose.opacity;
    tip.current.copy(ingredient.current.position);
  });
  const getEffectState = () => {
    const s = useGameStore.getState();
    return { status: s.status, paused: s.paused, spellCast: {
      sequence: flight.sequence, spellId: brewing.liftSpell, at: flight.startedAt,
      target: { kind: 'world', position: flight.from },
    } };
  };
  return <>
    <IngredientModel ref={ingredient} id={flight.id} color={color} position={flight.from}
      emissiveIntensity={.35} raycast={() => null} />
    <WandParticles tip={tip} getEffectState={getEffectState} />
  </>;
}
