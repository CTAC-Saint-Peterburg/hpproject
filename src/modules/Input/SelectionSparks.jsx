import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DynamicDrawUsage } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { useReducedMotion } from '../Menu/useReducedMotion';
import { theme } from '../../static/theme';

// Sixteen textureless points, one draw call, only on the selected object.
export default function SelectionSparks({ radius = .65, height = radius, center = [0,0,0], color = theme.colors.enemySelected }) {
  const points = useRef(), time = useRef(0), reduced = useReducedMotion();
  const positions = useMemo(() => new Float32Array(16*3),[]);
  useFrame((_,delta) => {
    if (!points.current) return;
    const data=points.current.geometry.attributes.position.array;
    const game=useGameStore.getState(), defense=useDefenseStore.getState();
    if (!reduced && !(game.startGame ? game.paused : defense.paused)) time.current+=Math.min(delta,.05);
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8+time.current*.7, ripple=1+.05*Math.sin(time.current*3+i);
      data[i*3]=Math.cos(angle)*radius*ripple;
      data[i*3+1]=Math.sin(angle)*height*ripple;
      data[i*3+2]=Math.sin(angle*2+time.current)*radius*.4;
    }
    points.current.geometry.attributes.position.needsUpdate=true;
  });
  return <points ref={points} position={center} raycast={()=>null} frustumCulled={false}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]} usage={DynamicDrawUsage}/></bufferGeometry>
    <pointsMaterial color={color} size={3} sizeAttenuation={false} transparent opacity={.85} depthWrite={false} toneMapped={false}/>
  </points>;
}
