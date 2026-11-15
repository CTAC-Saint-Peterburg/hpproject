import test from 'node:test';
import assert from 'node:assert/strict';
import { beginMenuTransition, finishMenuTransition, openingPose, OPEN_SECONDS } from '../src/modules/Menu/triptychState.js';

function fixture(mode) {
  const calls = [];
  const game = { startGame: mode === 'brewing', setPaused: value => calls.push(['brewPause', value]), exitToMenu: () => calls.push('brewExit') };
  const arena = { phase: mode === 'arena' ? 'wave' : 'idle', setPaused: value => calls.push(['arenaPause', value]), exit: () => calls.push('arenaExit') };
  const ui = { phase: 'closed', setPhase(value) { this.phase = value; } };
  return { game, arena, ui, calls };
}

for (const mode of ['menu', 'brewing', 'arena']) test(`triptych ${mode}: pauses only active play, exits once after opening`, () => {
  const { game, arena, ui, calls } = fixture(mode);
  beginMenuTransition(game, arena, ui);
  assert.equal(ui.phase, 'opening');
  assert.deepEqual(calls, mode === 'menu' ? [] : [[mode === 'brewing' ? 'brewPause' : 'arenaPause', true]]);
  const before = calls.length;
  beginMenuTransition(game, arena, ui);
  assert.equal(calls.length, before);
  finishMenuTransition(game, arena, ui);
  assert.equal(ui.phase, 'open');
  assert.deepEqual(calls.slice(before), ['brewExit', 'arenaExit']);
  finishMenuTransition(game, arena, ui);
  assert.equal(calls.length, before + 2);
  // Reopening from a new round works even though the menu was open previously.
  beginMenuTransition(game, arena, ui);
  assert.equal(ui.phase, 'opening');
});

test('opening clamps extremes, expands monotonically, and supports reduced motion', () => {
  assert.deepEqual(openingPose(-1), { progress: 0, angle: 0, scale: 1 });
  assert.deepEqual(openingPose(0, true), openingPose(OPEN_SECONDS));
  assert.deepEqual(openingPose(100), openingPose(OPEN_SECONDS));
  let previous = openingPose(0);
  for (let i = 1; i <= 20; i++) {
    const next = openingPose(i * OPEN_SECONDS / 20);
    assert.ok(next.scale > previous.scale);
    assert.ok(next.angle > previous.angle);
    previous = next;
  }
});
