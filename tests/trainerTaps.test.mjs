import test from 'node:test';
import assert from 'node:assert/strict';
import { createRapidTaps } from '../src/modules/Cheats/rapidTaps.js';

test('trainer opens exactly on ten rapid activations and resets after opening', () => {
  let time = 0, opened = 0;
  const tap = createRapidTaps(() => opened++, () => time);
  for (let i = 0; i < 9; i++) { time += 100; tap(); }
  assert.equal(opened, 0);
  time += 100; tap();
  assert.equal(opened, 1);
  for (let i = 0; i < 10; i++) { time += 100; tap(); }
  assert.equal(opened, 2);
});

test('slow taps cannot accumulate toward the secret gesture', () => {
  let time = 0, opened = 0;
  const tap = createRapidTaps(() => opened++, () => time);
  for (let i = 0; i < 20; i++) { time += 501; tap(); }
  assert.equal(opened, 0);
  for (let i = 0; i < 9; i++) { time += 100; tap(); }
  assert.equal(opened, 1);
});
