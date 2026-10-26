import { useRef } from 'react';
import { Vector3 } from 'three';
import HandWandRig from './HandWandRig';
import { WandParticles } from './WandParticles';

export default function HandWand() {
  const tip = useRef(new Vector3());
  return <><HandWandRig tip={tip} /><WandParticles tip={tip} /></>;
}
