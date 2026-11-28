import { useTranslation } from 'react-i18next';
import { HintToggle } from './Menu/HintControls';
import { useHintVisibility } from './Menu/useHintVisibility';
import { openTriptych, useTriptychStore } from './Menu/triptychStore';
import { useEffect, useRef } from 'react';
import { useCheatUiStore } from './Cheats/cheatUiStore';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from './Stores/GameStore';
import { isPotBlocked } from '../static/enemies';
import PotionResult from './Pot/PotionResult';
import StirringIndicator from './Pot/StirringIndicator';
import TemperatureIndicator from './Pot/TemperatureIndicator';
import { useInputStore } from './Input/inputStore';
import { POTION_IDS } from './Stores/potionInventory';
import AutoSelectButton from './Input/AutoSelectButton';
import ResultPanel from './Menu/ResultPanel';

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
  const [hintsVisible, toggleHints] = useHintVisibility(s.runId);
  const showFps = useCheatUiStore(s => s.showFps);
  useEffect(() => {
    const handler = e => {
      if (useTriptychStore.getState().phase === 'opening') return;
      if (e.repeat || e.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'Escape' && s.startGame) openTriptych();
      if (e.code === 'KeyP' && !e.altKey && !e.ctrlKey && !e.metaKey) s.setPaused(!s.paused);
      if (e.altKey && e.shiftKey && useInputStore.getState().mode === 'desktop') {
        if (e.code === 'Equal') { e.preventDefault(); s.changeStones(100); }
        if (e.code === 'Minus') { e.preventDefault(); s.changeStones(-100); }
        if (e.code === 'KeyP') { e.preventDefault(); s.addPotions(POTION_IDS); }
        if (s.startGame && s.status === 'playing' && !s.paused) {
          if (e.code === 'ArrowUp') { e.preventDefault(); s.changePotTemperature(1); }
          if (e.code === 'ArrowDown') { e.preventDefault(); s.changePotTemperature(-1); }
          if (e.code === 'KeyN') { e.preventDefault(); s.debugAdvance(); }
          if (e.code === 'Digit1') { e.preventDefault(); s.spawnEnemy('enemycold', true); }
          if (e.code === 'Digit2') { e.preventDefault(); s.spawnEnemy('enemyfire', true); }
          if (e.code === 'Digit3') { e.preventDefault(); s.spawnEnemy('enemyslime', true); }
          if (e.code === 'KeyL') { e.preventDefault(); s.setCurrentSpell(3); }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [s]);
  useEffect(() => {
    if (!s.startGame || s.status !== 'playing' || s.paused) return;
    const id = setInterval(() => useGameStore.getState().tick(Date.now()), 100);
    return () => clearInterval(id);
  }, [s.startGame, s.status, s.paused]);
  const stage = s.mission?.stages[s.currentStage];
  return <>
    {showFps && <div className="fps">{s.fps}</div>}
    {s.startGame && <>
      <div className="timer">{s.remaining === null ? t('time.unlimited') : t('time.seconds', {value: Math.ceil(s.remaining)})}</div>
      <HintToggle visible={hintsVisible} onToggle={toggleHints} panelId="brewing-hints" trainer />
      <AutoSelectButton />
      {s.status === 'playing' && <div className="brewing-meters"><TemperatureIndicator value={s.potTemperature} /><StirringIndicator value={s.agitation} paused={s.paused} /></div>}
      <div className="hud" id="brewing-hints" hidden={!hintsVisible}>
        <p className="recipe-quality-rule">{t('brewing.qualityRule',{three:s.mission.rating.threeStarMistakes,two:s.mission.rating.twoStarMistakes})}</p>
        <p>🌡 {Math.round(s.potTemperature)} °C · {t('hud.heat', {level: s.heatLevel})}</p>
        <p>{stage ? stage.icon + ' ' + t(stage.name) + ' · ' + stage.temperature.min + '–' + stage.temperature.max + ' °C' : t('hud.complete')}</p>
        {stage && <p>{t('brewing.requiredStirring', { min: stage.stirring?.min ?? 0, max: stage.stirring?.max ?? 100 })}</p>}
        <p>{t('hud.score', {score:s.score, mistakes:s.mistakes})}</p>
        <p>{t('hud.enemies')}</p>
        {isPotBlocked(s.enemies, s.lastTick) && <p>{t('messages.slimeBlocked')}</p>}
        <p role="status">{s.message ? t(s.message, s.messageValues) : ''}</p>
      </div>
      {s.paused && <div className="pause-notice" role="status">{t('arena.paused')}</div>}
      {s.status !== 'playing' && <ResultPanel><h2>{t(s.status === 'won' ? 'result.won' : 'result.lost')}</h2>
        <p>{t('result.rating', {stars: '★'.repeat(s.rating) + '☆'.repeat(3 - s.rating), score:s.score})}</p>
        <p>{t('result.reward', {reward:s.reward})}</p>{s.debugUsed && <p>{t('result.debug')}</p>}
        {s.status === 'won' && s.mission?.rewardPotion && <PotionResult potionId={s.mission.rewardPotion} quality={s.resultQuality} />}
        <button onClick={() => s.beginMission(s.selectedLevel)}>{t('menu.retry')}</button>
        <button onClick={s.exitToMenu}>{t('menu.return')}</button>
      </ResultPanel>}
    </>}
  </>;
}
