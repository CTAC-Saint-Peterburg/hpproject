import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { createGameAudioBinding } from '../src/modules/Audio/gameAudioBinding.js';
import { rewardCoinStartTime } from '../src/modules/Defense/rewardMotion.js';

class FakeDocument {
  constructor() { this.hidden = false; this.listeners = new Map(); }
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type, extra = {}) { for (const listener of this.listeners.get(type) ?? []) listener({ type, isTrusted: true, ...extra }); }
  count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
}

function control(kind, options = {}) {
  const node = {
    disabled: options.disabled ?? false,
    getAttribute: name => name === 'aria-disabled' && options.ariaDisabled ? 'true' : null,
    matches(selector) {
      if (selector === ':disabled') return this.disabled;
      return selector === 'select,input[type="checkbox"],input[type="radio"]' && ['select', 'checkbox', 'radio'].includes(kind);
    },
    closest(selector) {
      if (selector === 'input,select,textarea') return ['select', 'checkbox', 'radio', 'range', 'textarea'].includes(kind) ? this : null;
      return selector === 'button,a[href],[role="button"]' && ['button', 'link', 'role-button'].includes(kind) ? this : null;
    },
  };
  return node;
}

function fixture(gameState = {}, defenseState = {}) {
  const gameStore = createStore(() => ({ startGame: false, paused: false, status: 'idle', runId: 0,
    currentStage: 0, score: 0, message: '', spellCast: null, ...gameState }));
  const defenseStore = createStore(() => ({ phase: 'idle', paused: false, time: 0, fx: null, coinToss: null,
    rewardSerial: 0, rewardEvents: [], ...defenseState }));
  const settingsStore = createStore(() => ({ enabled: true, volume: .7 }));
  const documentTarget = new FakeDocument(), commands = [];
  const manager = Object.fromEntries(['unlock', 'play', 'setSettings', 'setAmbient', 'setPaused'].map(method =>
    [method, (...args) => { commands.push({ method, args }); return Promise.resolve(true); }]));
  const bind = () => createGameAudioBinding({ gameStore, defenseStore, settingsStore, manager, documentTarget });
  const cleanup = bind();
  const plays = () => commands.filter(command => command.method === 'play').map(command => command.args[0]);
  return { gameStore, defenseStore, settingsStore, manager, documentTarget, commands, plays, bind, cleanup };
}

test('binding bootstraps without replaying old casts or rewards and deduplicates unrelated store updates', () => {
  const f = fixture({ startGame: true, status: 'playing', runId: 7, spellCast: { sequence: 3, spellId: 5 } },
    { fx: { id: 4, kind: 'cast', spellId: 2 }, rewardSerial: 9, rewardEvents: [{ id: 9, time: 0, stones: 5 }] });
  assert.deepEqual(f.plays(), []);
  f.gameStore.setState({ fps: 60 }); f.gameStore.setState({ potTemperature: 50 });
  assert.deepEqual(f.plays(), []);
  f.gameStore.setState({ spellCast: { sequence: 4, spellId: 2 } });
  f.gameStore.setState({ spellCast: { sequence: 4, spellId: 2 }, fps: 59 });
  assert.deepEqual(f.plays(), ['spell.2']);
  f.gameStore.setState({ runId: 8, spellCast: null, currentStage: 0, score: 0 });
  f.gameStore.setState({ spellCast: { sequence: 1, spellId: 6 } });
  assert.deepEqual(f.plays(), ['spell.2', 'spell.6']); f.cleanup();
});

test('all recognized brewing spells have one cue and accepted final ingredients play once before victory', () => {
  const f = fixture({ startGame: true, status: 'playing', runId: 1 });
  for (let id = 1; id <= 10; id++) f.gameStore.setState({ spellCast: { sequence: id, spellId: id } });
  f.gameStore.setState({ spellCast: { sequence: 11, spellId: 11 } });
  assert.deepEqual(f.plays(), Array.from({ length: 10 }, (_, index) => 'spell.' + (index + 1)));
  f.commands.length = 0;
  f.gameStore.setState({ currentStage: 1, score: 100, message: 'messages.accepted' });
  f.gameStore.setState({ status: 'won', rating: 3 }); f.gameStore.setState({ fps: 60 });
  assert.deepEqual(f.plays(), ['brewing.recipeAdvance']);
  f.gameStore.setState({ status: 'playing', currentStage: 2, score: 100 });
  f.gameStore.setState({ currentStage: 3, debugUsed: true });
  f.gameStore.setState({ score: 50, mistakes: 1, message: 'messages.wrongIngredient' });
  assert.deepEqual(f.plays(), ['brewing.recipeAdvance'], 'debug skips and mistakes must not sound like acceptance');
  f.cleanup();
});

test('defense plays effective cast IDs, ignores cosmetic impacts and uses only the toss cue for a coin cast', () => {
  const f = fixture({}, { phase: 'wave', time: 1 });
  f.defenseStore.setState({ fx: { id: 1, kind: 'cast', spellId: 2 } });
  f.defenseStore.setState({ fx: { id: 1, kind: 'cast', spellId: 2 }, hp: 99 });
  f.defenseStore.setState({ fx: { id: 2, kind: 'potionImpact', spellId: 5 } });
  assert.deepEqual(f.plays(), ['spell.2']);
  f.defenseStore.setState({ phase: 'clear' });
  const toss = { duration: 2 };
  f.defenseStore.setState({ phase: 'coin', coinToss: toss, fx: { id: 3, kind: 'cast', spellId: 7 } });
  f.defenseStore.setState({ time: 2, coinToss: toss }); f.defenseStore.setState({ coinResolved: true, score: 100 });
  assert.deepEqual(f.plays(), ['spell.2', 'defense.coinToss']);
  f.defenseStore.setState({ phase: 'wave', coinToss: null });
  f.defenseStore.setState({ fx: { id: 4, kind: 'cast', spellId: 8 } });
  assert.deepEqual(f.plays(), ['spell.2', 'defense.coinToss', 'spell.8']); f.cleanup();
});

test('reward cues wait for visible coins, play once per paid event and ignore debug flashes', () => {
  const f = fixture({}, { phase: 'wave', time: 1 });
  const event = { id: 1, time: 1, stones: 5 }, start = rewardCoinStartTime(event);
  f.defenseStore.setState({ rewardSerial: 1, rewardEvents: [event] }); assert.deepEqual(f.plays(), []);
  f.defenseStore.setState({ time: start - .001 }); assert.deepEqual(f.plays(), []);
  f.defenseStore.setState({ time: start }); assert.deepEqual(f.plays(), ['defense.coinReward']);
  f.defenseStore.setState({ time: start + .1, rewardEvents: [{ ...event }] });
  f.defenseStore.setState({ rewardSerial: 2, rewardEvents: [event, { id: 2, time: 1, stones: 0 }] });
  assert.deepEqual(f.plays(), ['defense.coinReward']);
  f.defenseStore.setState({ time: 2, rewardSerial: 4, rewardEvents: [{ id: 3, time: 2, stones: 5 }, { id: 4, time: 2, stones: 6 }] });
  f.defenseStore.setState({ time: 2.24 });
  assert.deepEqual(f.plays(), ['defense.coinReward', 'defense.coinReward', 'defense.coinReward']); f.cleanup();
});

test('reward bootstrap, run exit and serial resets cannot replay or retain pending old sounds', () => {
  const f = fixture({}, { phase: 'wave', time: 1, rewardSerial: 10, rewardEvents: [{ id: 10, time: 0, stones: 5 }] });
  f.defenseStore.setState({ time: 1.1 }); assert.deepEqual(f.plays(), []);
  f.defenseStore.setState({ rewardSerial: 11, rewardEvents: [{ id: 11, time: 2, stones: 5 }] });
  f.defenseStore.setState({ phase: 'idle', rewardEvents: [] });
  f.defenseStore.setState({ phase: 'wave', time: 0, rewardSerial: 0 });
  f.defenseStore.setState({ time: 1, rewardSerial: 1, rewardEvents: [{ id: 1, time: 1, stones: 5 }] });
  f.defenseStore.setState({ time: 1.24 });
  assert.deepEqual(f.plays(), ['defense.coinReward']);
  f.defenseStore.setState({ time: 10, rewardEvents: [] }); assert.deepEqual(f.plays(), ['defense.coinReward']); f.cleanup();
});

test('victory and defeat discard reward sounds whose coin streams were removed before appearing', () => {
  for (const phase of ['won', 'lost']) {
    const f = fixture({}, { phase: 'wave', time: 1 });
    f.defenseStore.setState({ rewardSerial: 1, rewardEvents: [{ id: 1, time: 1, stones: 5 }] });
    f.defenseStore.setState({ phase, time: 1.1, rewardEvents: [] });
    f.defenseStore.setState({ time: 2 }); f.defenseStore.setState({ paused: true });
    assert.deepEqual(f.plays(), []); f.cleanup();
  }
});

test('menu, gameplay, pause, hidden tabs and settings synchronize only changed playback state', () => {
  const f = fixture();
  assert.ok(f.commands.some(command => command.method === 'setAmbient' && command.args[0] === true));
  f.commands.length = 0;
  f.gameStore.setState({ startGame: true, status: 'playing', runId: 1 });
  f.gameStore.setState({ paused: true }); f.gameStore.setState({ paused: false });
  f.gameStore.setState({ startGame: false, status: 'idle' });
  f.defenseStore.setState({ phase: 'wave' }); f.defenseStore.setState({ paused: true });
  f.documentTarget.hidden = true; f.documentTarget.dispatch('visibilitychange');
  f.defenseStore.setState({ paused: false });
  const paused = f.commands.filter(command => command.method === 'setPaused').map(command => command.args[0]);
  assert.deepEqual(paused, [true, false, true]);
  f.documentTarget.hidden = false; f.documentTarget.dispatch('visibilitychange');
  f.defenseStore.setState({ phase: 'idle' });
  assert.equal(f.commands.filter(command => command.method === 'setPaused').at(-1).args[0], false);
  assert.equal(f.commands.filter(command => command.method === 'setAmbient').at(-1).args[0], true);
  const before = f.commands.length;
  f.settingsStore.setState({ enabled: false, volume: .2 });
  f.settingsStore.setState({ enabled: false, volume: .2 }); f.settingsStore.setState({ unrelated: 1 });
  assert.deepEqual(f.commands.slice(before), [{ method: 'setSettings', args: [{ enabled: false, volume: .2 }] }]);
  f.cleanup();
});

test('only trusted enabled UI controls sound; checkbox and select choices sound once on change', () => {
  const f = fixture(), doc = f.documentTarget;
  doc.dispatch('pointerdown', { isTrusted: false }); assert.equal(f.commands.filter(command => command.method === 'unlock').length, 0);
  doc.dispatch('pointerdown'); doc.dispatch('keydown'); assert.equal(f.commands.filter(command => command.method === 'unlock').length, 2);
  doc.dispatch('click', { target: control('button'), isTrusted: false });
  doc.dispatch('click', { target: control('button', { disabled: true }) });
  doc.dispatch('click', { target: control('button', { ariaDisabled: true }) });
  for (const kind of ['button', 'link', 'role-button']) doc.dispatch('click', { target: control(kind) });
  for (const kind of ['select', 'checkbox', 'radio']) {
    const target = control(kind); doc.dispatch('click', { target }); doc.dispatch('change', { target });
  }
  for (const kind of ['range', 'textarea']) { const target = control(kind); doc.dispatch('click', { target }); doc.dispatch('change', { target }); }
  assert.deepEqual(f.plays(), Array(6).fill('ui.select'));
  doc.hidden = true; doc.dispatch('click', { target: control('button') }); doc.dispatch('keydown');
  assert.equal(f.plays().length, 6); assert.equal(f.commands.filter(command => command.method === 'unlock').length, 2);
  f.cleanup();
});

test('StrictMode cleanup and rebind leave one subscription and no historical replay; audio errors never break updates', async () => {
  const f = fixture({ startGame: true, status: 'playing', runId: 1, spellCast: { sequence: 1, spellId: 2 } });
  f.cleanup(); const cleanup = f.bind();
  assert.equal(f.documentTarget.count(), 5); assert.deepEqual(f.plays(), []);
  f.gameStore.setState({ spellCast: { sequence: 2, spellId: 3 } }); assert.deepEqual(f.plays(), ['spell.3']);
  f.manager.play = () => { throw new Error('audio failed'); };
  assert.doesNotThrow(() => f.gameStore.setState({ spellCast: { sequence: 3, spellId: 4 } }));
  f.manager.play = () => Promise.reject(new Error('async audio failed'));
  f.gameStore.setState({ spellCast: { sequence: 4, spellId: 5 } }); await Promise.resolve(); await Promise.resolve();
  cleanup(); cleanup(); assert.equal(f.documentTarget.count(), 0);
  const count = f.commands.length;
  f.gameStore.setState({ spellCast: { sequence: 5, spellId: 6 } }); f.documentTarget.dispatch('click', { target: control('button') });
  assert.equal(f.commands.length, count);
});

test('sound settings survive reload under their own key and safely normalize malformed stored values', async () => {
  const config = JSON.parse(readFileSync(new URL('../src/static/sounds.json', import.meta.url), 'utf8'));
  const gameSave = JSON.stringify({ state: { stones: 51 }, version: 0 }), saved = new Map([['hpproject-save-v1', gameSave]]);
  const oldStorage = globalThis.localStorage, oldWindow = globalThis.window;
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  globalThis.window = { localStorage: globalThis.localStorage };
  const code = readFileSync(new URL('../src/modules/Audio/audioSettings.js', import.meta.url), 'utf8')
    .replace(/import sounds from '\.\.\/\.\.\/static\/sounds\.json'(?:\s+with\s*\{[^}]*\})?;/, 'const sounds = ' + JSON.stringify(config) + ';')
    .replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href));
  const load = suffix => import('data:text/javascript;base64,' + Buffer.from(code + '\n// ' + suffix).toString('base64'));
  try {
    const first = await load('audio first'); const key = first.AUDIO_SETTINGS_KEY;
    assert.notEqual(key, 'hpproject-save-v1');
    first.useAudioSettings.getState().setEnabled(false); first.useAudioSettings.getState().setVolume(.26);
    const second = await load('audio reload');
    assert.equal(second.useAudioSettings.getState().enabled, false); assert.equal(second.useAudioSettings.getState().volume, .26);
    assert.equal(saved.get('hpproject-save-v1'), gameSave);
    saved.set(key, JSON.stringify({ state: { enabled: 'bad', volume: 9 }, version: 0 }));
    const malformed = await load('audio malformed');
    assert.equal(malformed.useAudioSettings.getState().enabled, config.master.enabled); assert.equal(malformed.useAudioSettings.getState().volume, 1);
    assert.deepEqual(first.normalizeAudioSettings({ enabled: false, volume: NaN }), { enabled: false, volume: config.master.volume });
    assert.deepEqual(first.normalizeAudioSettings(null), config.master);
  } finally { globalThis.localStorage = oldStorage; globalThis.window = oldWindow; }
});
