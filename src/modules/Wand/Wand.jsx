import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { WandParticles } from './WandParticles';
import { settings } from './effectSettings';
import { useGameStore } from '../Stores/GameStore';
import { shopItems } from '../../static/themedConfigs';

export const Wand = ({ tipRef, showParticles = true, attached = false }) => {
  const equipped = useGameStore(s => s.equippedItems.wand);
  const appearance = shopItems.find(item => item.id === equipped && item.type === 'wand');
  const mesh = useRef();
  const ownTip = useRef(new Vector3());
  const tip = tipRef || ownTip;
  const time = useRef(0);
  const { pointer } = useThree();
  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (!attached) {
      time.current += delta;
      const follow = 1 - Math.exp(-delta * 5);
      const sway = Math.sin(time.current * Math.PI * 4) * .1;
      mesh.current.rotation.x += (Math.max(-.15, Math.min(.15, pointer.y * .4 + sway)) - mesh.current.rotation.x) * follow;
      mesh.current.rotation.y += (Math.max(-.15, Math.min(.15, pointer.x * .2)) - mesh.current.rotation.y) * follow;
      mesh.current.position.x += (pointer.x * .4 - mesh.current.position.x) * follow;
    }
    mesh.current.updateWorldMatrix(true, false);
    // Convert the real tip to world coordinates; particles are outside the wand group.
    mesh.current.localToWorld(tip.current.set(0, settings.handRig.wandLength / 2, 0));
  }, -1);
  return <>
    <group position={attached ? settings.handRig.grip : settings.wand.position} rotation={attached ? settings.handRig.gripRotation : [0, 0, 0]}>
      <mesh ref={mesh} position={attached ? [0, settings.handRig.wandLength / 2 - settings.handRig.gripDepth, 0] : [0, 0, 1]}>
        <boxGeometry args={[.1, settings.handRig.wandLength, .02]} />
        <meshStandardMaterial color={appearance && !appearance.default ? appearance.color : settings.wand.color}
          emissive={appearance && !appearance.default ? appearance.emissive : settings.wand.emissive}
          emissiveIntensity={settings.wand.emissiveIntensity} />
      </mesh>
    </group>
    {showParticles && <WandParticles tip={tip} />}
  </>;
};
