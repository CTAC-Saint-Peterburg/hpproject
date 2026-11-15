import { Billboard, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import TriptychModel, { PauseCrest } from './TriptychModel';
import { openTriptych } from './triptychStore';
import { useReducedMotion } from './useReducedMotion';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { config } from '../Defense/defenseState';
import { brewingBookPosition, arenaControlPositions } from './sceneControlLayout';

const stop = event => event.stopPropagation();
function Control({ position, scale, children, label, onClick, book = false, paused = false, compact = false }) {
  return <Billboard position={position}>
    <group scale={scale}>{children}</group>
    <Html center zIndexRange={[20, 15]}>
      <button className={'scene-control ' + (book ? 'scene-menu-book' : 'scene-pause-crest') + (compact ? ' scene-menu-compact' : '')}
        aria-label={label} title={label} aria-pressed={book ? undefined : paused}
        onPointerDown={stop} onPointerMove={stop} onPointerUp={stop}
        onClick={event => { event.stopPropagation(); onClick(); }}>{book ? 'menu' : <span className="sr-only">{label}</span>}</button>
    </Html>
  </Billboard>;
}

export default function SceneMenuControls({ arena = false }) {
  const { t } = useTranslation();
  const game = useGameStore(), defense = useDefenseStore();
  const { camera, viewport, size } = useThree();
  const reduced = useReducedMotion();
  const state = arena ? defense : game;
  const visible = arena ? !['idle', 'won', 'lost'].includes(state.phase) : state.status === 'playing';
  const view = viewport.getCurrentViewport(camera, [0, 0, 0]);
  const unit = view.height / size.height;
  const arenaPositions = arenaControlPositions(config.field);
  const bookPosition = arena ? arenaPositions.book : brewingBookPosition(view, size.height);
  const crestPosition = arena ? arenaPositions.crest : [0, view.height * .28, 0];
  if (!visible) return null;
  return <>
    <Control position={bookPosition} scale={arena ? .6 : unit * 76 / 3.2} book compact={!arena} label={t('menu.return')} onClick={openTriptych}>
      <TriptychModel reduced={reduced} />
    </Control>
    <Control position={crestPosition} scale={arena ? 1 : unit * 76 / 1.8} paused={state.paused}
      label={t(state.paused ? 'arena.resume' : 'arena.pause')} onClick={() => state.setPaused(!state.paused)}>
      <PauseCrest paused={state.paused} reduced={reduced} />
    </Control>
  </>;
}
