import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import HandWandRig from './HandWandRig';
import { WandParticles } from './WandParticles';
import brewing from '../../static/brewing.json';
import { writeBrewingHandFrame } from './brewingHandFrame';

const origin = [0, 0, 0];

export default function HandWand() {
  const tip = useRef(new Vector3());
  const rig = useRef();
  const { camera, size } = useThree();
  useFrame(() => {
    if (!rig.current) return;
    const scale = writeBrewingHandFrame(rig.current.position, camera, size.width / size.height, brewing.scene.handRig);
    rig.current.quaternion.copy(camera.quaternion);
    rig.current.scale.setScalar(scale);
    rig.current.updateWorldMatrix(true, true);
  }, -3);
  return <>
    <group ref={rig}><HandWandRig tip={tip} position={origin} /></group>
    <WandParticles tip={tip} />
  </>;
}
