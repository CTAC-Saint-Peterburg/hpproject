import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from './Stores/GameStore';

export function FrameCounter() {
  const sample = useRef({ time: 0, frames: 0 });
  useFrame((_, delta) => {
    sample.current.time += delta;
    sample.current.frames++;
    if (sample.current.time >= 0.5) {
      useGameStore.setState({ fps: Math.round(sample.current.frames / sample.current.time) });
      sample.current = { time: 0, frames: 0 };
    }
  });
  return null;
}

export default function GameHud() {
  const { t } = useTranslation();
  const s = useGameStore();
  const [showFps, setShowFps] = useState(false);
  useEffect(() => {
    const handler = e => {
      if (e.repeat || e.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'F8') { e.preventDefault(); setShowFps(v => !v); }
      if (e.code === 'Escape') s.exitToMenu();
      if (e.altKey && e.shiftKey) {
        if (e.code === 'Equal') { e.preventDefault(); s.changeStones(100); }
        if (e.code === 'Minus') { e.preventDefault(); s.changeStones(-100); }
        if (s.startGame && s.status === 'playing') {
          if (e.code === 'ArrowUp') { e.preventDefault(); s.changePotTemperature(1); }
          if (e.code === 'ArrowDown') { e.preventDefault(); s.changePotTemperature(-1); }
          if (e.code === 'KeyN') { e.preventDefault(); s.debugAdvance(); }
          if (e.code === 'Digit1') { e.preventDefault(); s.spawnEnemy('enemycold', true); }
          if (e.code === 'Digit2') { e.preventDefault(); s.spawnEnemy('enemyfire', true); }
          if (e.code === 'KeyL') { e.preventDefault(); s.setCurrentSpell(3); }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [s]);
  useEffect(() => {
    if (!s.startGame || s.status !== 'playing') return;
    const id = setInterval(() => useGameStore.getState().tick(Date.now()), 100);
    return () => clearInterval(id);
  }, [s.startGame, s.status]);
  const stage = s.mission?.stages[s.currentStage];
  return <>
    <div className="wallet">💎 {s.stones} {t('hud.stones')}</div>
    {showFps && <div className="fps">{s.fps}</div>}
    {s.startGame && <>
      <div className="timer">{s.remaining === null ? t('time.unlimited') : t('time.seconds', {value: Math.ceil(s.remaining)})}</div>
      <div className="hud">
        <button onClick={s.exitToMenu}>{t('menu.return')} · Esc</button>
        <p>🌡 {Math.round(s.potTemperature)} °C · {t('hud.heat', {level: s.heatLevel})}</p>
        <p>{stage ? stage.icon + ' ' + t(stage.name) + ' · ' + stage.temperature.min + '–' + stage.temperature.max + ' °C' : t('hud.complete')}</p>
        <p>{t('hud.score', {score:s.score, mistakes:s.mistakes})}</p>
        <p>{t('hud.enemies')}</p>
        <p role="status">{s.message ? t(s.message, s.messageValues) : ''}</p>
      </div>
      {s.status !== 'playing' && <div className="result"><h2>{t(s.status === 'won' ? 'result.won' : 'result.lost')}</h2>
        <p>{t('result.rating', {stars: '★'.repeat(s.rating) + '☆'.repeat(3 - s.rating), score:s.score})}</p>
        <p>{t('result.reward', {reward:s.reward})}</p>{s.debugUsed && <p>{t('result.debug')}</p>}
        <button onClick={() => s.beginMission(s.selectedLevel)}>{t('menu.retry')}</button>
        <button onClick={s.exitToMenu}>{t('menu.return')}</button>
      </div>}
    </>}
  </>;
}
