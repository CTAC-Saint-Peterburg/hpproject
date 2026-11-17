import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { theme } from '../../static/theme';
import { STAR_PLACEMENTS, createCauldronStarGeometry } from './cauldronStarsGeometry';

const geometry = createCauldronStarGeometry();
const gold = new Color(theme.colors.runeStart), dark = new Color(theme.colors.roomWoodDark);
function Star({ placement, active, index }) {
  const material = useRef(), halo = useRef(), light = useRef(1), clock = useRef(0);
  useFrame((_, delta) => {
    if (useGameStore.getState().paused || !material.current) return;
    clock.current += delta;
    light.current += ((active ? 1 : 0) - light.current) * (1 - Math.exp(-4 * delta));
    material.current.color.copy(dark).lerp(gold, light.current);
    material.current.emissiveIntensity = light.current * (.8 + .12 * Math.sin(clock.current * 2 + index));
    halo.current.opacity = light.current * (.12 + .04 * Math.sin(clock.current * 2 + index));
  });
  return <group position={placement.position} rotation={[0, placement.angle, 0]}>
    <mesh geometry={geometry} raycast={() => null}>
      <meshStandardMaterial ref={material} color={active ? gold : dark} emissive={gold} emissiveIntensity={active ? .8 : 0} roughness={.6} toneMapped={false} />
    </mesh>
    <mesh geometry={geometry} scale={1.25} position={[0,0,.002]} raycast={() => null}>
      <meshBasicMaterial ref={halo} color={gold} transparent opacity={active ? .12 : 0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}
export default function CauldronStars({ rating }) {
  return STAR_PLACEMENTS.map((placement, index) => <Star key={index} placement={placement} index={index} active={index < rating} />);
}
