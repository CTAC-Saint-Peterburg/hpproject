import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { theme } from '../../static/theme';
import { shopItems } from '../../static/themedConfigs';
import { useDefenseStore } from './DefenseStore';

export default function ArenaCrystal({ selected, effects = {}, gestureRef }) {
  const mesh = useRef();
  const skinId = useDefenseStore(state => state.crystalSkinId);
  const skin = shopItems.find(item => item.type === 'crystal' && item.id === skinId);
  const normalColor = skin?.color || theme.colors.crystal;
  const color = effects.burn ? theme.colors.crystalBurn : effects.freeze ? theme.colors.crystalFreeze : normalColor;
  useFrame((_, delta) => {
    if (mesh.current && !useDefenseStore.getState().paused) mesh.current.rotation.y += delta * .4;
  });
  return <group>
    <mesh position={[0, .18, 0]}>
      <cylinderGeometry args={[1.1, 1.3, .35, 8]} />
      <meshStandardMaterial color={theme.colors.crystalBase} metalness={.5} roughness={.4} />
    </mesh>
    <mesh ref={mesh} position={[0, 1.1, 0]} onClick={event => {
      if (gestureRef?.current || event.delta > 4) return;
      event.stopPropagation();
      useDefenseStore.getState().select('crystal');
    }}>
      <octahedronGeometry args={[.85, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.8} metalness={.3} roughness={.1} />
      {selected && <mesh scale={1.13} raycast={() => null}>
        <octahedronGeometry args={[.85, 0]} />
        <meshBasicMaterial color={theme.colors.crystalSelected} wireframe />
      </mesh>}
    </mesh>
    <pointLight position={[0, 2, 0]} color={color} intensity={10} distance={8} />
  </group>;
}
