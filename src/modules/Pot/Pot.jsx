import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PotParticles } from './PotParticles';
import { useGameStore } from '../Stores/GameStore';
import { BackSide } from 'three';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { shopItems } from '../../static/themedConfigs';
import { isPotBlocked } from '../../static/enemies';
import { theme } from '../../static/theme';
import brewing from '../../static/brewing.json';
import SpellHint from './SpellHint';

export const Pot = ({ bottleRadar = [] }) => {
  const { t } = useTranslation();
  const s = useGameStore();
  const appearance = shopItems.find(item => item.id === s.equippedItems.pot && item.type === 'pot');
  const contact = useRef(null);
  const bowl = useRef();
  useFrame((frame, delta) => {
    if (bowl.current) {
      const state = useGameStore.getState();
      const moving = state.status === 'playing' && Date.now() < state.stirUntil;
      const amplitude = moving ? .035 + state.agitation / 100 * .09 : 0;
      const phase = frame.clock.elapsedTime * 10;
      const damping = 1 - Math.exp(-12 * delta);
      bowl.current.rotation.x += (Math.sin(phase) * amplitude - bowl.current.rotation.x) * damping;
      bowl.current.rotation.z += (Math.cos(phase) * amplitude - bowl.current.rotation.z) * damping;
    }
    if (s.status !== 'playing') return;
    if (isPotBlocked(s.enemies, Date.now())) { contact.current = null; return; }
    const bottle = bottleRadar.find(b => b.isSelected && b.currentPos &&
      Math.hypot(b.currentPos[0], b.currentPos[1]) < 1);
    if (bottle && contact.current !== bottle.id) {
      contact.current = bottle.id;
      s.addIngredient(bottle.id);
    } else if (!bottle) contact.current = null;
  });
  const warmth = Math.max(0, (s.potTemperature - 20) / 90);
  return <group>
    <mesh ref={bowl} onClick={e => { e.stopPropagation(); if (s.status === 'playing') s.togglePotSelected(); }}>
      <cylinderGeometry args={[0.65, 0.5, 0.85, 24]} />
      <meshStandardMaterial color={appearance?.color || theme.colors.potDefault}
        emissive={theme.colors.potEmissive} emissiveIntensity={warmth * 0.65} />
      {s.isPotSelected && <mesh scale={1.08} raycast={() => null}>
        <cylinderGeometry args={[0.65, 0.5, 0.85, 24]} />
        <meshBasicMaterial color={theme.colors.potSelected} side={BackSide} />
      </mesh>}
    </mesh>
    <PotParticles count={Math.round(warmth * 100)} speed={0.3 + warmth}
      spread={0.7} color={warmth > 0.7 ? theme.colors.fireHot : theme.colors.fireWarm}
      size={0.05 + warmth * 0.05} lifetime={0.8} position={[0, -0.8, 0]} />
    <pointLight position={[0, -0.6, 0.5]} color={theme.colors.fireLight} intensity={warmth * 12} />
    {s.status === 'playing' && <Html center position={[0, -1.35, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pot-guidance">
        {!s.fireHintSeen && <SpellHint spellId={1} labelKey="brewing.ignite" />}
        <SpellHint spellId={brewing.stirSpell} labelKey="brewing.stir" />
        <div className="agitation"><span>{t('brewing.agitation', { value: Math.round(s.agitation) })}</span>
          <meter min="0" max="100" value={s.agitation} aria-label={t('brewing.stir')} />
        </div>
      </div>
    </Html>}
  </group>;
}

