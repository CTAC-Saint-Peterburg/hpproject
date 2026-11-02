import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, DoubleSide } from 'three';
import { useTranslation } from 'react-i18next';
import { useDefenseStore } from './DefenseStore';
import { getCoinGeometries } from './coinGeometry';
import { coinPose } from './coinMotion';
import { theme } from '../../static/theme';
import SpellHint from '../Pot/SpellHint';

export default function ArenaCoin({ selected, result, time, toss, startedAt = 0, resolved = false }) {
  const { t } = useTranslation();
  const root = useRef(), visual = useRef(), displayTime = useRef(time);
  const geometries = getCoinGeometries();
  useFrame((_, delta) => {
    if (!root.current || !visual.current || useDefenseStore.getState().paused) return;
    // Interpolate towards the simulation clock, never beyond it.
    displayTime.current = resolved ? time : Math.min(time, Math.max(displayTime.current, time - .1) + Math.min(delta, .1));
    const pose = coinPose(toss, displayTime.current - startedAt, result);
    root.current.position.set(...pose.position);
    visual.current.rotation.set(...pose.rotation);
  });
  return <group ref={root} position={[0, 1.6, 2.3]} onClick={event => {
    event.stopPropagation();
    if (!toss && !resolved) useDefenseStore.getState().select('coin');
  }}>
    <group ref={visual}>
      <mesh geometry={geometries.body}>
        <meshStandardMaterial color={selected ? theme.colors.coinSelected : theme.colors.coin} roughness={.42} metalness={.65}
          emissive={theme.colors.coin} emissiveIntensity={selected ? .25 : .07} flatShading />
      </mesh>
      <mesh geometry={geometries.spiral} raycast={() => null}>
        <meshStandardMaterial color={theme.colors.arenaWoodLine} roughness={.85} metalness={.05} side={DoubleSide} flatShading />
      </mesh>
      <mesh geometry={geometries.bones} raycast={() => null}>
        <meshStandardMaterial color={theme.colors.arenaWoodLine} roughness={.85} metalness={.05} side={DoubleSide} flatShading />
      </mesh>
      {!toss && <mesh position={[0, -.09, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[.60, .68, 12]} />
        <meshBasicMaterial color={theme.colors.coinGlow} transparent opacity={selected ? .7 : .28}
          side={DoubleSide} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>}
    </group>
    {selected && !toss && !resolved && <Html center position={[0, .8, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="arena-coin-hint" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 220, padding: 8,
        borderRadius: 8, background: 'var(--color-coin-panel)', color: 'var(--color-rune)', fontSize: 'var(--type-small)' }}>
        <SpellHint spellId={3} labelKey="arena.coinHint" /><span>{t('arena.coinHint')}</span>
      </div>
    </Html>}
    {resolved && <Html center position={[0, .8, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <span className="arena-coin-result" role="status" style={{ padding: 7, borderRadius: 7,
        color: 'var(--color-rune)', background: 'var(--color-coin-panel)', whiteSpace: 'nowrap' }}>
        {t(result ? 'arena.coinFaceWin' : 'arena.coinFaceLose')}
      </span>
    </Html>}
  </group>;
}
