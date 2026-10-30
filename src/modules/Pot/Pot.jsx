import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PotParticles } from './PotParticles';
import { useGameStore } from '../Stores/GameStore';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { shopItems } from '../../static/themedConfigs';
import { isPotBlocked } from '../../static/enemies';
import { theme } from '../../static/theme';
import brewing from '../../static/brewing.json';
import SpellHint from './SpellHint';
import CauldronModel from './CauldronModel';
import { CAULDRON } from './cauldronGeometry';
import { PotMist } from './PotMist';

export const Pot = ({ bottleRadar = [] }) => {
  const { t } = useTranslation();
  const s = useGameStore();
  const appearance = shopItems.find(item => item.id === s.equippedItems.pot && item.type === 'pot');
  const bowl = useRef();
  useFrame((frame, delta) => {
    if (useGameStore.getState().paused) return;
    if (bowl.current) {
      const state = useGameStore.getState();
      const moving = state.status === 'playing' && Date.now() < state.stirUntil;
      const amplitude = moving ? .035 + state.agitation / 100 * .09 : 0;
      const phase = frame.clock.elapsedTime * 10;
      const damping = 1 - Math.exp(-12 * delta);
      bowl.current.rotation.x += (CAULDRON.tilt + Math.sin(phase) * amplitude - bowl.current.rotation.x) * damping;
      bowl.current.rotation.z += (Math.cos(phase) * amplitude - bowl.current.rotation.z) * damping;
    }
    const state = useGameStore.getState();
    if (state.status !== 'playing' || state.ingredientFlight || isPotBlocked(state.enemies, Date.now())) return;
    const bottle = bottleRadar.find(b => b.isSelected && b.currentPos &&
      Math.hypot(b.currentPos[0], b.currentPos[1]) < 1);
    if (bottle) state.beginIngredientDrop(bottle.id, bottle.currentPos);
  });
  const warmth = Math.max(0, (s.potTemperature - 20) / 90);
  return <group>
    <group ref={bowl} rotation={[CAULDRON.tilt, 0, 0]}
      onClick={e => { e.stopPropagation(); if (s.status === 'playing') s.togglePotSelected(); }}>
      <CauldronModel color={appearance?.color || theme.colors.potDefault} warmth={warmth} selected={s.isPotSelected} />
      <PotMist warmth={warmth} position={[0, CAULDRON.mouthY, 0]} />
      {s.status === 'playing' && <Html center position={[0, -.04, .82]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pot-runes">
          <div className="pot-rune pot-rune-heat"><SpellHint spellId={1} labelKey="brewing.ignite" /><span>{t('brewing.heatLabel')}</span></div>
          <div className="pot-rune pot-rune-cool"><SpellHint spellId={2} labelKey="brewing.cool" /><span>{t('brewing.coolLabel')}</span></div>
          <div className="pot-rune pot-rune-stir"><SpellHint spellId={brewing.stirSpell} labelKey="brewing.stir" /><span>{t('brewing.stirLabel')}</span></div>
        </div>
      </Html>}
    </group>
    <PotParticles count={Math.round(warmth * 100)} speed={0.3 + warmth}
      spread={0.7} color={warmth > 0.7 ? theme.colors.fireHot : theme.colors.fireWarm}
      size={0.05 + warmth * 0.05} lifetime={0.8} position={[0, -0.8, 0]} />
    <pointLight position={[0, -0.6, 0.5]} color={theme.colors.fireLight} intensity={warmth * 12} />
    {s.status === 'playing' && <Html center position={[0, -1.35, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pot-guidance">
        <div className="agitation"><span>{t('brewing.agitation', { value: Math.round(s.agitation) })}</span>
          <meter min="0" max="100" value={s.agitation} aria-label={t('brewing.stir')} />
        </div>
      </div>
    </Html>}
  </group>;
}

