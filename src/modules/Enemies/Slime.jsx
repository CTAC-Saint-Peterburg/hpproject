import { theme } from '../../static/theme';
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BackSide } from 'three';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { enemyPosition, ENEMY_TYPES } from '../../static/enemies';
import { spellLessons } from '../../static/spellLessons';
import { effects } from '../../static/themedConfigs';

export default function Slime({ enemy, selected }) {
  const { t } = useTranslation();
  const group = useRef();
  const body = useRef();
  const icons = useRef();
  const ghosts = useRef([]);
  const history = useRef([]);
  const sampled = useRef(0);
  const { viewport } = useThree();
  const color = ENEMY_TYPES.enemyslime.color;
  const trail = effects.slimeTrail;
  useFrame(() => {
    if (!group.current) return;
    const state = useGameStore.getState();
    const now = state.status === 'playing' ? Date.now() : state.lastTick;
    const position = enemyPosition(enemy, now, viewport.width, viewport.height);
    group.current.position.set(...position);
    const phase = (now - enemy.bornAt) / 1000;
    body.current.scale.set(1.15 + Math.sin(phase * 3) * .06, .7 + Math.cos(phase * 3) * .04, .65);
    icons.current.position.y = -1.12 + Math.sin(phase * 2) * .06;
    const last = history.current.at(-1);
    if (now - enemy.bornAt < ENEMY_TYPES.enemyslime.approachMs && now - sampled.current >= trail.sampleInterval * 1000 && (!last || Math.abs(last.position[0] - position[0]) > .06)) {
      history.current.push({ position: [...position], at: now });
      sampled.current = now;
    }
    history.current = history.current.filter(sample => now - sample.at < trail.lifetime * 1000).slice(-trail.count);
    for (let i = 0; i < trail.count; i++) {
      const ghost = ghosts.current[i];
      if (!ghost) continue;
      const sample = history.current[i];
      ghost.visible = !!sample;
      if (sample) {
        const fade = 1 - (now - sample.at) / (trail.lifetime * 1000);
        ghost.position.set(sample.position[0], -.35, sample.position[2] - .1);
        ghost.scale.set(trail.size * fade, .12, .45 * fade);
        ghost.material.opacity = trail.opacity * fade;
      }
    }
  });
  return <>
    {Array.from({length: trail.count}, (_, i) => <mesh key={i} ref={node => { ghosts.current[i] = node; }} visible={false} raycast={() => null}>
      <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color={trail.color} transparent depthWrite={false} />
    </mesh>)}
    <group ref={group}>
      <mesh ref={body} onClick={event => { event.stopPropagation(); useGameStore.getState().selectEnemy(enemy.id); }}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={color} transparent opacity={.58} roughness={.2} emissive={color} emissiveIntensity={.18} depthWrite={false} />
        {selected && <mesh scale={1.06} raycast={() => null}><sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color={theme.colors.white} side={BackSide} transparent opacity={.7} depthWrite={false} />
        </mesh>}
      </mesh>
      {[-.3,.3].map(x => <mesh key={x} position={[x,.18,.62]} raycast={() => null}>
        <sphereGeometry args={[.085, 12, 8]} /><meshBasicMaterial color={theme.colors.slimeEye} />
      </mesh>)}
      <group ref={icons} position={[0,-1.12,0]}>
        <Html center style={{pointerEvents:'none'}}>
          <div className="slime-runes" aria-label={t('slime.spells')}>
            {enemy.remainingSpells.map(id => {
              const lesson = spellLessons.find(item => item.id === id);
              return <div className="slime-rune" key={id} title={t(lesson.name)}>
                <svg viewBox="0 0 100 100" role="img" aria-label={t(lesson.name)}>
                  <path d={lesson.points.map(([x,y],i) => (i ? 'L' : 'M') + x * 100 + ',' + y * 100).join(' ')} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={lesson.points[0][0]*100} cy={lesson.points[0][1]*100} r="4" fill={theme.colors.runeStart} />
                </svg><span>{t(lesson.name)}</span>
              </div>;
            })}
          </div>
        </Html>
      </group>
    </group>
  </>;
}
