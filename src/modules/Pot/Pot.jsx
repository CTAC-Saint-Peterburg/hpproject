import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PotParticles } from './PotParticles';
import { useGameStore } from '../Stores/GameStore';

export const Pot = ({ bottleRadar = [] }) => {
  const s = useGameStore();
  const contact = useRef(null);
  useFrame(() => {
    if (s.status !== 'playing') return;
    const bottle = bottleRadar.find(b => b.isSelected && b.currentPos &&
      Math.hypot(b.currentPos[0], b.currentPos[1]) < 1);
    if (bottle && contact.current !== bottle.id) {
      contact.current = bottle.id;
      s.addIngredient(bottle.id);
    } else if (!bottle) contact.current = null;
  });
  const warmth = Math.max(0, (s.potTemperature - 20) / 90);
  return <group>
    <mesh onClick={e => { e.stopPropagation(); if (s.status === 'playing') s.togglePotSelected(); }}>
      <cylinderGeometry args={[0.65, 0.5, 0.85, 24]} />
      <meshStandardMaterial color={s.isPotSelected ? '#70a86b' : '#39333e'}
        emissive="#ff4500" emissiveIntensity={warmth * 0.65} />
    </mesh>
    <PotParticles count={Math.round(warmth * 100)} speed={0.3 + warmth}
      spread={0.7} color={warmth > 0.7 ? '#ffd34e' : '#ff6b20'}
      size={0.05 + warmth * 0.05} lifetime={0.8} position={[0, -0.8, 0]} />
    <pointLight position={[0, -0.6, 0.5]} color="#ff6600" intensity={warmth * 12} />
  </group>;
}

