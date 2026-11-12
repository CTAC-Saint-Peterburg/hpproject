import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { theme } from '../../static/theme';
import { potionTypes } from '../../static/themedConfigs';
import PotionModel from '../Potions/PotionModel';
import SpellHint from '../Pot/SpellHint';
import { useDefenseStore } from './DefenseStore';
import { potionRackPosition } from './arenaLayout';
import { writePotionFlightPose } from './potionMotion';
import { potionEffect } from './potionEffects';
import TouchHitArea from '../Input/TouchHitArea';
import { isSelectionClick } from '../Input/selectionClick';

function FlyingPotion({ flight, time }) {
  const root = useRef();
  const displayTime = useRef(time);
  const pose = useMemo(() => ({ position: [0, 0, 0], rotation: [0, 0, 0] }), []);
  const potion = potionTypes.find(item => item.id === flight.potionId);
  useFrame((_, delta) => {
    if (!root.current || useDefenseStore.getState().paused) return;
    displayTime.current = Math.min(time, Math.max(displayTime.current, time - .1) + Math.min(delta, .1));
    writePotionFlightPose(flight, displayTime.current, pose);
    // Rotate around the bottle's centre, preserving the motion helper's feet path.
    root.current.position.set(pose.position[0], pose.position[1] + .5, pose.position[2]);
    root.current.rotation.set(...pose.rotation);
  });
  if (!potion) return null;
  return <group ref={root} position={[flight.from[0], flight.from[1] + .5, flight.from[2]]}>
    <PotionModel potion={potion} quality={flight.quality} position={[0, -.5, 0]} raycast={() => null} />
  </group>;
}

export default function ArenaPotions({ gestureRef }) {
  const { t } = useTranslation();
  const state = useDefenseStore();
  return <>
    {potionTypes.filter(potion => Object.hasOwn(state.inventory, potion.id)).map(potion => {
      const count = state.inventory[potion.id] ?? 0;
      const effect = potionEffect(potion, state.potionQualities[potion.id]);
      const selected = state.pendingPotion === potion.id;
      return <group key={potion.id} position={potionRackPosition(potion.id, state.inventory)} onClick={event => {
        if (!isSelectionClick(event, gestureRef?.current)) return;
        event.stopPropagation();
        useDefenseStore.getState().usePotion(potion.id);
      }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, 0]} raycast={() => null}>
          <ringGeometry args={[.28, .36, 12]} />
          <meshBasicMaterial color={selected ? theme.colors.coinSelected : theme.colors.arenaWoodLine} />
        </mesh>
        {count > 0 && <>
          <PotionModel potion={potion} quality={effect.quality} selected={selected} />
          <TouchHitArea size={32} position={[0, .5, 0]} />
          <mesh position={[0, .5, 0]}>
            <boxGeometry args={[.85, 1.08, .85]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </>}
        <Html center position={[.43, .23, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span className={'arena-potion-count' + (count ? '' : ' arena-potion-empty')} title={t(potion.name)}>
            ×{count}
          </span>
        </Html>
        {selected && <Html center position={[0, 1.65, 0]} zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <div className="arena-potion-hint">
            <strong>{t(potion.name)}</strong>
            <p>{t('arena.potionQuality', {quality: t('potion.quality.' + effect.quality), multiplier: effect.multiplier})}</p>
            <p>{t(potion.description, effect)}</p>
            <div><SpellHint spellId={3} labelKey="arena.potionHint" /><span>{t('arena.potionHint')}</span></div>
          </div>
        </Html>}
      </group>;
    })}
    {state.potionFlight && <FlyingPotion key={state.potionFlight.id} flight={state.potionFlight} time={state.time} />}
  </>;
}
