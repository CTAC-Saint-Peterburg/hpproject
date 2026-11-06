import { rewardCoinStartTime } from '../Defense/rewardMotion.js';

const validSpell = id => Number.isInteger(id) && id >= 1 && id <= 10;
const latestReward = state => Math.max(state.rewardSerial ?? 0, ...(state.rewardEvents ?? []).map(event => event.id));

// Store events, rather than render frames, own sound playback. Every binding
// starts from the current state so mounting or changing tabs cannot replay it.
export function createGameAudioBinding({ gameStore, defenseStore, settingsStore, manager, documentTarget }) {
  let game = gameStore.getState();
  let defense = defenseStore.getState();
  let settings = settingsStore.getState();
  let highestRewardId = latestReward(defense);
  const pendingRewards = new Map();
  let disposed = false;
  let lastPaused;
  let lastAmbient;

  const call = (method, ...args) => {
    if (disposed) return;
    try {
      Promise.resolve(manager[method](...args)).catch(() => {});
    } catch { /* Audio must never interrupt a game action. */ }
  };
  const play = code => call('play', code);
  const syncPlayback = () => {
    const defenseActive = defense.phase !== 'idle';
    const paused = Boolean(documentTarget?.hidden || (defenseActive ? defense.paused : game.startGame && game.paused));
    const ambient = !paused && !game.startGame && !defenseActive;
    if (paused !== lastPaused) { lastPaused = paused; call('setPaused', paused); }
    if (ambient !== lastAmbient) { lastAmbient = ambient; call('setAmbient', ambient); }
  };

  call('setSettings', { enabled: settings.enabled, volume: settings.volume });
  syncPlayback();

  const unsubscribeGame = gameStore.subscribe(state => {
    const previous = game;
    game = state;
    syncPlayback();
    if (!state.startGame || state.paused || defense.phase !== 'idle') return;
    const cast = state.spellCast;
    if (cast && validSpell(cast.spellId) && (state.runId !== previous.runId || cast.sequence !== previous.spellCast?.sequence)) {
      play('spell.' + cast.spellId);
    }
    // Debug stage skips leave the previous message untouched, but award no
    // recipe points. The accepted final ingredient is emitted before finish().
    if (previous.startGame && previous.status === 'playing' && state.runId === previous.runId &&
      state.currentStage === previous.currentStage + 1 && state.score > previous.score && state.message === 'messages.accepted') {
      play('brewing.recipeAdvance');
    }
  });

  const unsubscribeDefense = defenseStore.subscribe(state => {
    const previous = defense;
    defense = state;
    syncPlayback();
    const terminal = ['idle', 'lost', 'won'].includes(state.phase);
    const reset = terminal || previous.phase === 'idle' || state.time < previous.time || state.rewardSerial < previous.rewardSerial;
    if (reset) {
      pendingRewards.clear();
      highestRewardId = state.phase === 'idle' ? 0 : latestReward(state);
    }
    if (terminal) return;

    const coinStarted = state.phase === 'coin' && state.coinToss &&
      (previous.phase !== 'coin' || state.coinToss !== previous.coinToss);
    if (coinStarted) play('defense.coinToss');
    const fx = state.fx;
    if (!coinStarted && fx?.kind === 'cast' && validSpell(fx.spellId) && fx.id !== previous.fx?.id) {
      play('spell.' + fx.spellId);
    }
    for (const event of state.rewardEvents ?? []) {
      if (event.id <= highestRewardId) continue;
      if (event.stones > 0) pendingRewards.set(event.id, event);
    }
    highestRewardId = latestReward(state);
    for (const [id, event] of pendingRewards) {
      if (state.time + 1e-9 < rewardCoinStartTime(event)) continue;
      pendingRewards.delete(id);
      play('defense.coinReward');
    }
  });

  const unsubscribeSettings = settingsStore.subscribe(state => {
    if (state.enabled === settings.enabled && state.volume === settings.volume) return;
    settings = state;
    call('setSettings', { enabled: state.enabled, volume: state.volume });
  });

  const unlock = event => {
    if (event.isTrusted && !documentTarget.hidden) call('unlock');
  };
  const isEnabled = element => element && !element.disabled && element.getAttribute?.('aria-disabled') !== 'true' && !element.matches?.(':disabled');
  const click = event => {
    if (!event.isTrusted || documentTarget.hidden) return;
    const target = event.target;
    if (target?.closest?.('input,select,textarea')) return;
    const choice = target?.closest?.('button,a[href],[role="button"]');
    if (isEnabled(choice)) play('ui.select');
  };
  const change = event => {
    if (!event.isTrusted || documentTarget.hidden) return;
    const choice = event.target;
    if (isEnabled(choice) && choice.matches?.('select,input[type="checkbox"],input[type="radio"]')) play('ui.select');
  };
  const listeners = [
    ['pointerdown', unlock, { passive: true }],
    ['keydown', unlock, { passive: true }],
    ['click', click, { passive: true }],
    ['change', change, { passive: true }],
    ['visibilitychange', syncPlayback],
  ];
  for (const [type, listener, options] of listeners) documentTarget?.addEventListener(type, listener, options);

  return () => {
    unsubscribeGame();
    unsubscribeDefense();
    unsubscribeSettings();
    for (const [type, listener, options] of listeners) documentTarget?.removeEventListener(type, listener, options);
    pendingRewards.clear();
    call('setAmbient', false);
    call('setPaused', true);
    disposed = true;
  };
}
