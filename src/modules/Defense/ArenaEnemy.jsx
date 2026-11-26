import { useMemo, useRef } from 'react';
import SelectionSparks from '../Input/SelectionSparks';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color } from 'three';
import { config } from './defenseState';
import { useDefenseStore } from './DefenseStore';
import { theme } from '../../static/theme';
import { getArenaEnemyGeometry } from './arenaEnemyGeometry';
import { writeEnemyMotion } from './enemyMotion';
import TouchHitArea from '../Input/TouchHitArea';
import { isSelectionClick } from '../Input/selectionClick';
import { enemyGroundedLift, ENEMY_VISUAL_SCALE } from './enemyGrounding';

export default function ArenaEnemy({ enemy, selected, time, gestureRef }) {
  const body = useRef();
  const motion = useRef({});
  const base = config.enemies[enemy.type];
  const flyer = base?.movement === 'orbit' || enemy.type === 'flyerFire' || enemy.type === 'flyerFrost';
  const shape = flyer ? 'flyer' : base?.shape === 'slime' ? 'slime' : 'cube';
  useFrame(() => {
    if (!body.current) return;
    const pose = writeEnemyMotion(motion.current, enemy, useDefenseStore.getState().time, shape);
    body.current.scale.set(enemy.size * (shape === 'slime' ? 1.3 : 1) * pose.x,
      enemy.size * (shape === 'slime' ? .7 : 1) * pose.y, enemy.size * pose.z).multiplyScalar(ENEMY_VISUAL_SCALE);
    body.current.position.y = enemyGroundedLift(enemy, pose, body.current.scale, body.current.geometry.boundingBox, selected);
    body.current.rotation.set(0, pose.yaw, pose.roll);
  });
  const elementColor = useMemo(() => {
    const settings = config.visuals.enemyColor;
    const strength = Math.max(0, Math.min(1, (enemy.maxHp - 18) / (settings.fullColorHp - 18)));
    return new Color(base?.color).lerp(new Color(theme.colors.white), base?.hostile === false ? 0 : settings.paleMix * (1 - strength));
  }, [base, enemy.maxHp]);
  if (!base) return null;
  const disoriented = enemy.disorientedUntil > time;
  const rage = !disoriented && time < enemy.rageUntil;
  const windup = !disoriented && enemy.windupUntil > time;
  const geometry = getArenaEnemyGeometry(shape);
  const scale = (shape === 'slime' ? [enemy.size * 1.3, enemy.size * .7, enemy.size] : [enemy.size, enemy.size, enemy.size]).map(value => value * ENEMY_VISUAL_SCALE);
  const frozen = enemy.frozenUntil > time;
  const color = frozen ? theme.colors.frozenEnemy : elementColor;
  const sentinel = base.movement === 'sentinel';
  const bomber = base.movement === 'bomber';
  const pulseTime = frozen ? enemy.frozenAt ?? 0 : time;
  const pulse = windup ? 1.1 + Math.sin(pulseTime * 11) * .18 : rage ? .7 : bomber ? .95 : sentinel ? .6 : .18;
  return <group position={[enemy.x, enemy.size * .6 + enemy.y, enemy.z]}>
    <mesh ref={body} geometry={geometry} scale={scale}
      onClick={event => { if (!isSelectionClick(event, gestureRef?.current)) return; event.stopPropagation(); useDefenseStore.getState().select(enemy.id); }}>
      <meshStandardMaterial color={color} emissive={frozen ? theme.colors.frozenEnemy : enemy.burnUntil > time ? theme.colors.burningEnemy : elementColor}
        emissiveIntensity={disoriented ? .08 : pulse} roughness={.4} flatShading={shape !== 'slime'} />
      {selected && <SelectionSparks radius={.7} height={.52} />}
      {selected && <mesh geometry={geometry} scale={1.18} raycast={() => null}>
        <meshBasicMaterial color={theme.colors.enemySelected} side={BackSide} />
      </mesh>}
      <TouchHitArea size={40} />
    </mesh>
  </group>;
}
