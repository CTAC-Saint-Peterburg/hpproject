import { Html } from '@react-three/drei';
import { BackSide } from 'three';
import { useTranslation } from 'react-i18next';
import { config } from './defenseState';
import { useDefenseStore } from './DefenseStore';
import { theme } from '../../static/theme';
import ArenaRune from './ArenaRune';
import { getArenaEnemyGeometry } from './arenaEnemyGeometry';

export default function ArenaEnemy({ enemy, selected, time, gestureRef }) {
  const { t } = useTranslation();
  const base = config.enemies[enemy.type];
  if (!base) return null;
  const disoriented = enemy.disorientedUntil > time;
  const rage = !disoriented && time < enemy.rageUntil;
  const windup = !disoriented && enemy.windupUntil > time;
  const flyer = base.movement === 'orbit' || enemy.type === 'flyerFire' || enemy.type === 'flyerFrost';
  const shape = flyer ? 'flyer' : base.shape === 'slime' ? 'slime' : 'cube';
  const geometry = getArenaEnemyGeometry(shape);
  const scale = shape === 'slime' ? [enemy.size * 1.3, enemy.size * .7, enemy.size] : [enemy.size, enemy.size, enemy.size];
  const frozen = enemy.frozenUntil > time;
  const color = frozen ? theme.colors.frozenEnemy : base.color;
  const sentinel = base.movement === 'sentinel';
  const pulse = windup ? 1.1 + Math.sin(time * 11) * .18 : rage ? .7 : sentinel ? .6 : .18;
  const spells = Array.isArray(base.counterSpells) ? base.counterSpells : [base.counterSpell];
  const health = Math.max(0, Math.min(100, 100 * enemy.hp / Math.max(1, enemy.maxHp)));
  return <group position={[enemy.x, enemy.size * .6 + enemy.y, enemy.z]}>
    <mesh geometry={geometry} scale={scale} rotation={[0, 0, disoriented ? Math.sin(time * 5) * .13 : 0]}
      onClick={event => { if (gestureRef?.current || event.delta > 4) return; event.stopPropagation(); useDefenseStore.getState().select(enemy.id); }}>
      <meshStandardMaterial color={color} emissive={frozen ? theme.colors.frozenEnemy : enemy.burnUntil > time ? theme.colors.burningEnemy : base.color}
        emissiveIntensity={disoriented ? .08 : pulse} roughness={.4} flatShading={shape !== 'slime'} />
      {selected && <mesh geometry={geometry} scale={1.1} raycast={() => null}>
        <meshBasicMaterial color={theme.colors.enemySelected} side={BackSide} />
      </mesh>}
    </mesh>
    <Html center position={[0, enemy.size + .45, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className={'arena-enemy-label' + (windup ? ' arena-enemy-windup' : '')}>
        <div className="arena-health"><i style={{ width: health + '%' }} /></div>
        <span>{Math.ceil(enemy.hp)}/{Math.ceil(enemy.maxHp)} {rage ? '💢' : ''}</span>
        <div className="arena-counter-runes" aria-label={Array.isArray(base.counterSpells) ? t('arena.anyAttack') : undefined}>
          {spells.map(id => <ArenaRune key={id} id={id} />)}
        </div>
        {Array.isArray(base.counterSpells) && selected && <span className="arena-enemy-status">{t('arena.anyAttack')}</span>}
        {disoriented && <span className="arena-enemy-status">{t('arena.disoriented', { seconds: Math.ceil(enemy.disorientedUntil - time) })}</span>}
        {windup && <span className="arena-enemy-status">{t('arena.windup', { seconds: Math.ceil(enemy.windupUntil - time) })}</span>}
      </div>
    </Html>
  </group>;
}
