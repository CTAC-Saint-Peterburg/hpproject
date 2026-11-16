import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { useTranslation } from 'react-i18next';
import { config } from './defenseState';
import ArenaRune from './ArenaRune';
import { visibleEnemyHints, enemyHintPhase, enemyStatusHints } from './enemyHintLayout';

export default function ArenaEnemyHints({ enemies, selected, time }) {
  const { t } = useTranslation();
  const nodes = useRef(new Map());
  const point = useMemo(() => new Vector3(), []);
  const settings = config.visuals.enemyHints;
  const statuses = new Map(enemies.map(enemy => [enemy.id, enemyStatusHints(enemy, config.enemies[enemy.type], time, selected === enemy.id)]));
  useFrame(({ camera, size }) => {
    const candidates = enemies.map(enemy => {
      point.set(enemy.x, enemy.y + enemy.size * 1.6 + .45, enemy.z);
      const distance = point.distanceToSquared(camera.position);
      point.project(camera);
      const rows = statuses.get(enemy.id).length;
      const height = settings.height + (rows ? 4 + rows * 18 : 0);
      return { id: enemy.id, x: point.x * size.width / 2, y: -point.y * size.height / 2 + (height - settings.height) / 2, distance,
        width: rows ? 156 : settings.width, height,
        clipped: point.z < -1 || point.z > 1 || Math.abs(point.x) > 1.1 || Math.abs(point.y) > 1.1,
        priority: enemy.id === selected ? 3 : enemy.windupUntil > time && enemy.disorientedUntil <= time ? 2 : config.enemies[enemy.type].split ? 1 : 0 };
    });
    const visible = visibleEnemyHints(candidates, settings.width, settings.height, settings.gap);
    for (const [id, node] of nodes.current) node.style.visibility = visible.has(id) ? 'visible' : 'hidden';
  });
  return enemies.map(enemy => {
    const base = config.enemies[enemy.type];
    const windup = enemy.windupUntil > time && enemy.disorientedUntil <= time;
    const cycle = enemyHintPhase(time + enemy.seed, settings);
    const spells = enemy.carried ? [config.enemyCarry.dropSpell] : base.hostile === false ? [3] : base.counterSpells ?? [base.counterSpell];
    const spell = spells[Math.floor(time / settings.spellSeconds) % spells.length];
    return <Html key={enemy.id} center position={[enemy.x, enemy.y + enemy.size * 1.6 + .45, enemy.z]}
      zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={node => { if (node) nodes.current.set(enemy.id, node); else nodes.current.delete(enemy.id); }}
        className={'arena-enemy-hint' + (enemy.id === selected ? ' is-selected' : '') + (windup ? ' is-dangerous' : '')}
        style={{ width: settings.width, height: settings.height }}
        aria-label={`${t(base.name)}: ${Math.ceil(enemy.hp)}/${Math.ceil(enemy.maxHp)}`}>
        <div className="arena-enemy-hint-content" style={{ opacity: windup || enemy.carried ? 1 : cycle.opacity }}>
          {windup ? <><ArenaRune id={spell} /><b>{Math.ceil(enemy.windupUntil - time)}</b></> : enemy.carried || cycle.phase === 0 ? <ArenaRune id={spell} /> : cycle.phase === 1 ?
            <div className="arena-health"><i style={{ width: Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100)) + '%' }} /></div> :
            <span>{Math.ceil(enemy.hp)}</span>}
        </div>
        {statuses.get(enemy.id).length > 0 && <div className="arena-enemy-status-list">
          {statuses.get(enemy.id).map(status => <span key={status.key} title={t(status.key, status)}>{t(status.key, status)}</span>)}
        </div>}
      </div>
    </Html>;
  });
}
