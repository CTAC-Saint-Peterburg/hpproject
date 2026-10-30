import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { WandParticles } from '../Wand/WandParticles';
import { ingredientFlightPose } from './ingredientAnimation';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants';
import brewing from '../../static/brewing.json';

// The same renderer as spell effects, with its emitter attached to the cube.
export default function IngredientFlight({ flight }) {
  const cube = useRef();
  const tip = useRef(new Vector3(...flight.from));
  const color = SPAWN_BOTTLES_CORDS.find(item => item.id === flight.id)?.color;
  useFrame(() => {
    const s = useGameStore.getState();
    if (!cube.current || s.paused || !s.ingredientFlight) return;
    const pose = ingredientFlightPose(flight.from, (Date.now() - s.ingredientFlight.startedAt) / 1000, brewing.ingredientAnimation);
    cube.current.position.set(...pose.position);
    cube.current.scale.setScalar(pose.scale);
    cube.current.rotation.set(pose.rotation, pose.rotation * .6, 0);
    cube.current.material.opacity = pose.opacity;
    tip.current.copy(cube.current.position);
  });
  const getEffectState = () => {
    const s = useGameStore.getState();
    return { status: s.status, paused: s.paused, spellCast: {
      sequence: flight.sequence, spellId: brewing.liftSpell, at: flight.startedAt,
      target: { kind: 'world', position: flight.from },
    } };
  };
  return <>
    <mesh ref={cube} position={flight.from} raycast={() => null}>
      <boxGeometry args={[brewing.ingredientSize, brewing.ingredientSize, brewing.ingredientSize]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.35} transparent />
    </mesh>
    <WandParticles tip={tip} getEffectState={getEffectState} />
  </>;
}
