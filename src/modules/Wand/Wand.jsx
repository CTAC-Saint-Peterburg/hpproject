import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { WandParticles } from './WandParticles';
import { settings } from './effectSettings';
import { useGameStore } from '../Stores/GameStore';
import shopItems from '../../static/shop.json';

export const Wand = ({ tipRef, showParticles = true }) => {
  const equipped = useGameStore(s => s.equippedItems.wand);
  const appearance = shopItems.find(item => item.id === equipped && item.type === 'wand');
  const mesh = useRef();
  const ownTip = useRef(new Vector3());
  const tip = tipRef || ownTip;
  const time = useRef(0);
  const { pointer } = useThree();
  useFrame((_, delta) => {
    if (!mesh.current) return;
    time.current += delta;
    const follow = 1 - Math.exp(-delta * 5);
    const sway = Math.sin(time.current * Math.PI * 4) * .1;
    mesh.current.rotation.x += (Math.max(-.15, Math.min(.15, pointer.y * .4 + sway)) - mesh.current.rotation.x) * follow;
    mesh.current.rotation.y += (Math.max(-.15, Math.min(.15, pointer.x * .2)) - mesh.current.rotation.y) * follow;
    mesh.current.position.x += (pointer.x * .4 - mesh.current.position.x) * follow;
    mesh.current.updateWorldMatrix(true, false);
    // Convert the real tip to world coordinates; particles are outside the wand group.
    mesh.current.localToWorld(tip.current.set(0, 1.25, 0));
  }, -1);
  return <>
    <group position={settings.wand.position}>
      <mesh ref={mesh} position={[0, 0, 1]}>
        <boxGeometry args={[.1, 2.5, .02]} />
        <meshStandardMaterial color={appearance && !appearance.default ? appearance.color : settings.wand.color}
          emissive={appearance && !appearance.default ? appearance.emissive : settings.wand.emissive}
          emissiveIntensity={settings.wand.emissiveIntensity} />
      </mesh>
    </group>
    {showParticles && <WandParticles tip={tip} />}
  </>;
};
