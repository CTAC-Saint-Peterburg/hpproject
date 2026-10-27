import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { config } from '../Defense/defenseState';
import { useCheatUiStore } from './cheatUiStore';

export default function CheatsMenu() {
  const { t } = useTranslation();
  const game = useGameStore(), arena = useDefenseStore();
  const { showFps, toggleFps } = useCheatUiStore();
  const [open, setOpen] = useState(false), [wave, setWave] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const dialog = useRef(null);
  const inArena = arena.phase !== 'idle';
  const brewing = !inArena && game.startGame && game.status === 'playing';
  useEffect(() => {
    const key = e => {
      if (e.repeat) return;
      if (e.code === 'F10') {
        e.preventDefault(); e.stopImmediatePropagation();
        setOpen(value => !value); setFeedback(null);
      } else if (e.code === 'Escape' && open) {
        e.preventDefault(); e.stopImmediatePropagation(); setOpen(false);
      } else if (e.code === 'F8' && !e.target.isContentEditable && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
        e.preventDefault(); toggleFps();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, toggleFps]);
  useEffect(() => {
    if (open) dialog.current.showModal();
    else dialog.current.close();
  }, [open]);
  const run = (label, action) => {
    const success = action() !== false;
    setFeedback({ label, success });
  };
  const command = (label, action, disabled = false, hotkey = '') => <button key={label} disabled={disabled}
    onClick={() => run(label, action)}>{t(label)}{hotkey && <kbd>{hotkey}</kbd>}</button>;
  return <dialog ref={dialog} className="cheat-menu" aria-labelledby="cheat-title"
    onCancel={e => { e.preventDefault(); setOpen(false); }}>
    <header><h2 id="cheat-title">{t('cheats.title')}</h2>
      <button onClick={() => setOpen(false)}>{t('collection.close')} · F10 / Esc</button></header>
    <p>{t('cheats.hint')}</p>
    <p>💎 {game.stones} · {t(inArena ? 'arena.title' : brewing ? 'cheats.brewing' : 'cheats.menu')}</p>
    <section><h3>{t('cheats.general')}</h3><div className="cheat-grid">
      {command('cheats.addStones', () => useGameStore.getState().changeStones(100), false, 'Alt Shift =')}
      {command('cheats.removeStones', () => useGameStore.getState().changeStones(-100), false, 'Alt Shift −')}
      {command('cheats.potions', () => useGameStore.getState().addPotions(['frost','flame','echo','healing']), inArena, 'Alt Shift P')}
      <button onClick={toggleFps} aria-pressed={showFps}>{t('cheats.fps')} · {t(showFps ? 'cheats.on' : 'cheats.off')}<kbd>F8</kbd></button>
    </div></section>
    <section><h3>{t('cheats.brewing')}</h3><div className="cheat-grid">
      {command('cheats.heatUp', () => useGameStore.getState().changePotTemperature(1), !brewing, 'Alt Shift ↑')}
      {command('cheats.heatDown', () => useGameStore.getState().changePotTemperature(-1), !brewing, 'Alt Shift ↓')}
      {command('cheats.levitate', () => useGameStore.getState().setCurrentSpell(3), !brewing, 'Alt Shift L')}
      {command('cheats.advance', () => useGameStore.getState().debugAdvance(), !brewing, 'Alt Shift N')}
      {['enemycold','enemyfire','enemyslime'].map((id, i) => command('cheats.' + id,
        () => useGameStore.getState().spawnEnemy(id, true), !brewing, 'Alt Shift ' + (i + 1)))}
    </div></section>
    <section><h3>{t('arena.title')}</h3><div className="cheat-grid">
      {Object.entries(config.enemies).map(([id, enemy], i) => command(enemy.name,
        () => useDefenseStore.getState().debugSpawn(id), arena.phase !== 'wave', 'Alt Shift ' + (i + 1)))}
    </div><div className="cheat-wave"><label>{t('arena.waveLabel')}<select value={wave} disabled={!inArena}
      onChange={e => setWave(Number(e.target.value))}>{config.waves.map(w => <option key={w.id} value={w.id}>{w.id}</option>)}</select></label>
      {command('arena.jumpWave', () => useDefenseStore.getState().debugWave(wave), !inArena)}</div>
    </section>
    <p>{t('cheats.rewards')}</p>
    <p role="status" aria-live="polite">{feedback && t(feedback.success ? 'cheats.executed' : 'cheats.failed', { name: t(feedback.label) })}</p>
  </dialog>;
}
