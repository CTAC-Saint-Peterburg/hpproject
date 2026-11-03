import { BackSide } from 'three';
import { theme } from '../../static/theme';
import { getPotionGeometry } from './potionGeometry';

export default function PotionModel({ potion, quality = 'basic', selected = false, ...groupProps }) {
  const geometry = getPotionGeometry(potion?.model);
  const accent = quality === 'masterwork' ? theme.colors.qualityMasterwork : quality === 'fine' ? theme.colors.qualityFine : theme.colors.qualityBasic;
  return <group {...groupProps}>
    <mesh geometry={geometry.body}>
      <meshStandardMaterial color={potion?.color || theme.colors.potionStopper} roughness={.38} metalness={.05} flatShading />
      {selected && <mesh geometry={geometry.body} scale={1.07} position={[0, -.0315, 0]} raycast={() => null}>
        <meshBasicMaterial color={theme.colors.enemySelected} side={BackSide} />
      </mesh>}
    </mesh>
    <mesh geometry={geometry.stopper}>
      <meshStandardMaterial color={accent} roughness={.6} metalness={.08} flatShading />
      {selected && <mesh geometry={geometry.stopper} scale={1.07} position={[0, -.06615, 0]} raycast={() => null}>
        <meshBasicMaterial color={theme.colors.enemySelected} side={BackSide} />
      </mesh>}
    </mesh>
  </group>;
}
