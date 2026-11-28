import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fitGameFrame, useDisplaySettings } from './displaySettings';
import { useInputStore } from '../Input/inputStore';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { ROTATE_HINT_ENABLED } from './screenMode';

export default function GameFrame({ children, active }) {
  const { t } = useTranslation(), host = useRef(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const preset = useDisplaySettings(s => s.preset);
  const touch = useInputStore(s => s.mode === 'touch');
  const blocked = ROTATE_HINT_ENABLED && active && size.height > size.width && (touch || navigator.maxTouchPoints > 0);
  const brewingPaused = useGameStore(s => s.paused), defensePaused = useDefenseStore(s => s.paused);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!blocked) return;
    // Keep the pause on return: never undo a manual/background pause.
    useGameStore.getState().setPaused(true);
    useDefenseStore.getState().setPaused(true);
  }, [blocked, brewingPaused, defensePaused]);
  const frame = active ? fitGameFrame(size.width, size.height, preset) : { width: Math.min(size.width, size.height * .72), height: size.height };
  return <div className="game-frame-host" ref={host}>
    <div className={'game-frame' + (active ? ' game-frame-active' : '')} style={{ width: frame.width, height: frame.height }} inert={blocked || undefined} aria-hidden={blocked || undefined}>
      {children}
    </div>
    {blocked && <div className="rotate-screen" role="alert"><span aria-hidden="true">↻</span><h2>{t('display.rotate')}</h2><p>{t('display.rotateHint')}</p></div>}
  </div>;
}
