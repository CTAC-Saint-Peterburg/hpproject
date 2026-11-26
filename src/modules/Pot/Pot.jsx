import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { potDepth } from '../Room/workshopLayout';
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
import TouchHitArea from '../Input/TouchHitArea';
import { isSelectionClick } from '../Input/selectionClick';
import CauldronStars from './CauldronStars';
import { brewingRating } from './brewingRating';

export const Pot = ({ bottleRadar = [], gestureRef }) => {
  const { t } = useTranslation();
  const s = useGameStore();
  const appearance = shopItems.find(item => item.id === s.equippedItems.pot && item.type === 'pot');
  const bowl = useRef();
  const { camera, size } = useThree();
  const depth=potDepth(camera.position.z);
  const hintY=-1.65-Math.min(.35,100/size.height);
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
  const select = event => {
    if (!isSelectionClick(event, gestureRef?.current)) return;
    event.stopPropagation(); if (s.status === 'playing') s.togglePotSelected();
  };
  return <group position={[0,0,depth]}>
    <group ref={bowl} rotation={[CAULDRON.tilt, 0, 0]}
      onClick={select}>
      <TouchHitArea onClick={select} minWorldRadius={.65} />
      <CauldronModel color={appearance?.color || theme.colors.potDefault} warmth={warmth} selected={s.isPotSelected} />
      {s.mission && <CauldronStars rating={s.status === 'lost' ? 0 : brewingRating(s.mission, s.mistakes)} />}
      <PotMist warmth={warmth} position={[0, CAULDRON.mouthY, 0]} />
    </group>
      {s.status === 'playing' && <Html center position={[0, hintY, .2]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={'pot-runes periodic-hint' + (s.paused ? ' hint-paused' : '')}>
          <div className="pot-rune pot-rune-heat"><SpellHint spellId={1} labelKey="brewing.ignite" /><span>{t('brewing.heatLabel')}</span></div>
          <div className="pot-rune pot-rune-cool"><SpellHint spellId={2} labelKey="brewing.cool" /><span>{t('brewing.coolLabel')}</span></div>
          <div className="pot-rune pot-rune-stir"><SpellHint spellId={brewing.stirSpell} labelKey="brewing.stir" /><span>{t('brewing.stirLabel')}</span></div>
        </div>
      </Html>}
    <PotParticles count={Math.round(warmth * 100)} speed={0.3 + warmth}
      spread={0.7} color={warmth > 0.7 ? theme.colors.fireHot : theme.colors.fireWarm}
      size={0.05 + warmth * 0.05} lifetime={0.8} position={[0, -0.8, 0]} />
    <pointLight position={[0, -0.6, 0.5]} color={theme.colors.fireLight} intensity={warmth * 12} />
  </group>;
}

