import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { config } from './defenseState';
import { useDefenseStore } from './DefenseStore';
import { theme } from '../../static/theme';
import ArenaRune from './ArenaRune';
import TouchHitArea from '../Input/TouchHitArea';
import { isSelectionClick } from '../Input/selectionClick';

function Projectile({ shot, selected, time, gestureRef }) {
  const { t } = useTranslation();
  const size = shot.size ?? .23;
  const color = config.enemies[shot.type]?.color || (shot.element === 'freeze' ? theme.colors.frozenEnemy : theme.colors.burningEnemy);
  const hitSize = Math.max(.72, size * 2.5);
  return <group position={[shot.x, shot.y, shot.z]}>
    <group rotation={[time * 5, time * 6, 0]}>
      <mesh scale={size} raycast={() => null}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} roughness={.35} flatShading />
      </mesh>
      <mesh scale={size * 1.55} raycast={() => null}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={.15} depthWrite={false} toneMapped={false} />
      </mesh>
      {selected && shot.interceptable && <mesh scale={size * 1.85} raycast={() => null}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={theme.colors.enemySelected} wireframe toneMapped={false} />
      </mesh>}
    </group>
    {shot.interceptable && <>
      <mesh onClick={event => { if (!isSelectionClick(event, gestureRef?.current)) return; event.stopPropagation(); useDefenseStore.getState().select(shot.id); }}>
        <boxGeometry args={[hitSize, hitSize, hitSize]} />
        {/* Hidden material skips drawing while preserving the generous raycast volume. */}
        <meshBasicMaterial visible={false} />
        <TouchHitArea size={36} />
      </mesh>
      <Html center position={[0, size + .35, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={'arena-projectile-label' + (selected ? ' arena-projectile-selected' : '')}>
          <ArenaRune id={shot.counterSpell} />
          {selected && <span>{t('arena.projectileIntercept')}</span>}
        </div>
      </Html>
    </>}
  </group>;
}

export default function ArenaProjectiles({ projectiles = [], selected, time, gestureRef }) {
  return <>{projectiles.map(shot => <Projectile key={shot.id} shot={shot} selected={selected === shot.id} time={time} gestureRef={gestureRef} />)}</>;
}
