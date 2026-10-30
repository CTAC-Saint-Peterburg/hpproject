import { useEffect, useMemo } from 'react';
import { BackSide } from 'three';
import { theme } from '../../static/theme';
import { CAULDRON, createCauldronGeometry } from './cauldronGeometry';

export default function CauldronModel({ color, warmth, selected }) {
  const geometry = useMemo(() => createCauldronGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry} dispose={null}>
      <meshStandardMaterial color={color} roughness={.86} metalness={.18} flatShading
        emissive={theme.colors.potEmissive} emissiveIntensity={warmth * .65} />
    </mesh>
    {selected && <mesh geometry={geometry} dispose={null} scale={1.035} raycast={() => null}>
      <meshBasicMaterial color={theme.colors.potSelected} side={BackSide} />
    </mesh>}
    <mesh position={[0, CAULDRON.liquidY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[CAULDRON.mouthRadius - .025, CAULDRON.segments]} />
      <meshStandardMaterial color={theme.colors.potLiquid} roughness={.5}
        emissive={theme.colors.potEmissive} emissiveIntensity={warmth * .12} />
    </mesh>
  </>;
}
