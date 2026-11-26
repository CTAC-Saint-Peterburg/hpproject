import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import { theme } from '../../static/theme';
import { shopItems } from '../../static/themedConfigs';
import CauldronModel from '../Pot/CauldronModel';
import CauldronStars from '../Pot/CauldronStars';
import { CAULDRON } from '../Pot/cauldronGeometry';
import { PotMist } from '../Pot/PotMist';
import { CrystalModel } from './BestiaryModel';
import { useReducedMotion } from './useReducedMotion';

function PreviewScene({ mode, rating, equipment, reduced }) {
  const group = useRef(), crystal = useRef(), time = useRef(0);
  const viewport = useThree(s => s.viewport);
  const potColor = shopItems.find(i => i.id === equipment.pot)?.color || theme.colors.potDefault;
  const crystalColor = shopItems.find(i => i.id === equipment.crystal)?.color || theme.colors.crystal;
  const colors = useMemo(() => [crystalColor, theme.colors.crystalBurn, theme.colors.crystalFreeze].map(c => new Color(c)), [crystalColor]);
  useFrame((_, delta) => {
    if (reduced) return;
    time.current += Math.min(delta, .1);
    group.current.position.y = Math.sin(time.current * 1.2) * .045;
    if (mode === 'defense' && crystal.current) {
      const phase = time.current / 3, index = Math.floor(phase) % colors.length;
      const blend = (1 - Math.cos((phase % 1) * Math.PI)) / 2;
      crystal.current.color.copy(colors[index]).lerp(colors[(index + 1) % colors.length], blend);
      crystal.current.emissive.copy(crystal.current.color);
      crystal.current.emissiveIntensity = .6 + .35 * Math.pow(Math.sin(time.current), 2);
      group.current.rotation.y += delta * .25;
    }
  });
  return <>
    <ambientLight intensity={2} /><directionalLight position={[2, 4, 5]} intensity={3} />
    <group ref={group}>
      {mode === 'brewing' ? <group rotation={[CAULDRON.tilt, 0, 0]}>
        <CauldronModel color={potColor} warmth={0} /><CauldronStars rating={rating} preview />
        <PotMist preview warmth={1} strength={2.5} />
      </group> : <CrystalModel color={crystalColor} materialRef={crystal} />}
    </group>
    {mode === 'brewing' && [-1, 1].flatMap(x => [-1, 1].map(y =>
      <PotMist key={`${x}:${y}`} preview warmth={.8} strength={1.6} phase={x + y + 3}
        position={[x * viewport.width * .37, y * viewport.height * .34, .4]} />))}
  </>;
}

export default function ModePreview(props) {
  const reduced = useReducedMotion();
  return <div className="mode-preview-canvas" aria-hidden="true">
    <Canvas dpr={1} frameloop={reduced ? 'demand' : 'always'} camera={{ position: [0, .2, 6], fov: 34 }} gl={{ antialias: false, alpha: true }}>
      <PreviewScene key={props.mode} {...props} reduced={reduced} />
    </Canvas>
  </div>;
}
