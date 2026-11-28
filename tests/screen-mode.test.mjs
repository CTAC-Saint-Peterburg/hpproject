import test from 'node:test';
import assert from 'node:assert/strict';
import { isGameplayScreen, ROTATE_HINT_ENABLED } from '../src/modules/Display/screenMode.js';

test('both games keep landscape through pause and between-wave coin flow; menus and rewards use portrait', () => {
  assert.equal(ROTATE_HINT_ENABLED, false);
  assert.equal(isGameplayScreen(false, 'idle', 'idle', 'closed'), false);
  assert.equal(isGameplayScreen(true, 'playing', 'idle', 'open'), true);
  for (const status of ['won', 'lost']) assert.equal(isGameplayScreen(true, status, 'idle', 'open'), false);
  for (const phase of ['wave', 'clear', 'toss']) assert.equal(isGameplayScreen(false, 'idle', phase, 'open'), true);
  for (const phase of ['idle', 'won', 'lost']) assert.equal(isGameplayScreen(false, 'idle', phase, 'open'), false);
  assert.equal(isGameplayScreen(true, 'playing', 'wave', 'opening'), false);
});
