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
    <div className="wallet">💎 {s.stones} stones</div>
    {showFps && <div className="fps">{s.fps}</div>}
    {s.startGame && <>
      <div className="timer">{s.remaining === null ? 'Без ограничения времени' : Math.ceil(s.remaining) + ' сек.'}</div>
      <div className="hud">
        <button onClick={s.exitToMenu}>В меню · Esc</button>
        <p>🌡 {Math.round(s.potTemperature)} °C · огонь {s.heatLevel}/3</p>
        <p>{stage ? stage.icon + ' ' + stage.name + ' · ' + stage.temperature.min + '–' + stage.temperature.max + ' °C' : 'Рецепт завершён'}</p>
        <p>Очки: {s.score} · Ошибки: {s.mistakes}</p>
        <p>Враги: синий — V (огонь), жёлтый — квадрат (холод). Сначала выберите врага кликом.</p>
        <p role="status">{s.message}</p>
      </div>
      {s.status !== 'playing' && <div className="result"><h2>{s.status === 'won' ? 'Зелье готово!' : 'Время истекло'}</h2>
        <p>Оценка: {'★'.repeat(s.rating)}{'☆'.repeat(3 - s.rating)} · {s.score} очков</p>
        <p>Награда: 💎 {s.reward}</p>{s.debugUsed && <p>Отладочное прохождение: награды и достижения отключены.</p>}
        <button onClick={() => s.beginMission(s.selectedLevel)}>Повторить</button>
        <button onClick={s.exitToMenu}>В меню</button>
      </div>}
    </>}
  </>;
}
