import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { theme } from '../../static/theme';
import { openingPose } from './triptychState';
import { createTriptychTitleGeometry } from './triptychTitleGeometry';

const titleGeometry = [-1, 1].map(createTriptychTitleGeometry);

const colors = theme.colors;
function Block({ size, position, color = colors.roomWood, ...props }) {
  return <mesh position={position} {...props}><boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={.85} flatShading /></mesh>;
}
function Panel({ width, door = false }) {
  return <>
    <Block size={[width, 3.2, .12]} />
    <Block size={[width - .16, 2.98, .03]} position={[0, 0, .08]} color={door ? colors.button : colors.surfaceCard} />
    {[-1, 1].map(side => <group key={side}>
      <Block size={[.055, 3.2, .06]} position={[side * (width / 2 - .045), 0, .11]} color={colors.coinBorder} />
      <Block size={[width, .065, .06]} position={[0, side * 1.55, .11]} color={colors.coinBorder} />
    </group>)}
    {door && [-1, 1].map(side => <mesh key={side} position={[0, side * 1.08, .15]} scale={[.13, .22, .045]}>
      <octahedronGeometry args={[1, 0]} /><meshStandardMaterial color={colors.coinBorder} flatShading />
    </mesh>)}
  </>;
}

export default function TriptychModel({ opening = false, reduced = false, floating = true, title = false }) {
  const root = useRef(), left = useRef(), right = useRef(), elapsed = useRef(0);
  useFrame((state, delta) => {
    elapsed.current = opening ? elapsed.current + Math.min(delta, .05) : 0;
    const pose = openingPose(elapsed.current, reduced);
    const angle = opening ? pose.angle : 0;
    left.current.rotation.y = -angle; right.current.rotation.y = angle;
    root.current.scale.setScalar(opening ? pose.scale : 1);
    root.current.position.y = floating && !reduced && !opening ? Math.sin(state.clock.elapsedTime * 1.15) * .055 : 0;
    root.current.rotation.z = floating && !reduced && !opening ? Math.sin(state.clock.elapsedTime * .7) * .012 : 0;
  });
  return <group ref={root}>
    <Panel width={2.2} />
    <group ref={left} position={[-1.1, 0, .16]}><group position={[.55, 0, 0]}><Panel width={1.1} door /></group>
      {title && <mesh geometry={titleGeometry[0]}><meshBasicMaterial color={colors.rune} /></mesh>}
    </group>
    <group ref={right} position={[1.1, 0, .16]}><group position={[-.55, 0, 0]}><Panel width={1.1} door /></group>
      {title && <mesh geometry={titleGeometry[1]}><meshBasicMaterial color={colors.rune} /></mesh>}
    </group>
  </group>;
}

export function TriptychSparks({ reduced = false }) {
  const ref = useRef();
  const positions = useMemo(() => new Float32Array(18 * 3), []);
  useFrame(state => {
    if (!ref.current) return;
    const array = ref.current.attributes.position.array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < 18; i++) {
      const age = (t * .15 + i / 18) % 1;
      array[i * 3] = Math.sin(i * 2.4 + age * 2) * (.25 + age * 1.45);
      array[i * 3 + 1] = -1.55 + age * 3.6;
      array[i * 3 + 2] = .3 + Math.cos(i * 1.7) * .15;
    }
    if (ref.current) ref.current.attributes.position.needsUpdate = true;
  });
  if (reduced) return null;
  return <points raycast={() => null}><bufferGeometry ref={ref}>
    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
  </bufferGeometry><pointsMaterial color={colors.runeStart} size={.035} transparent opacity={.55} depthWrite={false} /></points>;
}

export function PauseCrest({ paused, reduced = false }) {
  const root = useRef();
  useFrame(state => { root.current.position.y = reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.1) * .04; });
  return <group ref={root}>
    <mesh scale={[.76, .9, .14]}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color={colors.coinBorder} flatShading /></mesh>
    <mesh position={[0, 0, .08]} scale={[.64, .76, .1]}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color={colors.button} flatShading /></mesh>
    {paused ? <mesh position={[.025, 0, .2]} rotation={[0, 0, -Math.PI / 2]}>
      <circleGeometry args={[.3, 3, Math.PI / 2]} /><meshBasicMaterial color={colors.rune} />
    </mesh> : [-1, 1].map(side => <Block key={side} size={[.12, .43, .06]} position={[side * .13, 0, .22]} color={colors.rune} />)}
  </group>;
}
