import assert from 'node:assert/strict';
import test from 'node:test';
import { createPotMistBuffers, writePotMistFrame, POT_MIST_CAPACITY, POT_MIST_LIFETIME } from '../src/modules/Pot/potMistMotion.js';

test('mist rises from the mouth then spreads and sinks with a smooth fade', () => {
  const buffers = createPotMistBuffers();
  const initialArrays = Object.values(buffers);
  writePotMistFrame(buffers, 0, 1);
  const startHeight = buffers.positions[1];
  const startRadius = Math.hypot(buffers.positions[0], buffers.positions[2]);
  assert.equal(buffers.opacities[0], 0);
  writePotMistFrame(buffers, POT_MIST_LIFETIME * .35, 1);
  const crestHeight = buffers.positions[1];
  const crestSize = buffers.sizes[0];
  assert.ok(crestHeight > startHeight + .6);
  assert.ok(buffers.opacities[0] > .2);
  writePotMistFrame(buffers, POT_MIST_LIFETIME * .96, 1);
  assert.ok(buffers.positions[1] < crestHeight - .8);
  assert.ok(Math.hypot(buffers.positions[0], buffers.positions[2]) > startRadius + .7);
  assert.ok(buffers.sizes[0] > crestSize);
  assert.ok(buffers.opacities[0] < .02);
  Object.values(buffers).forEach((array, index) => assert.equal(array, initialArrays[index]));
});

test('mist has a fixed small buffer budget, heat-dependent density and bounded periodic motion', () => {
  const cold = createPotMistBuffers();
  const hot = createPotMistBuffers();
  assert.equal(cold.positions.length, POT_MIST_CAPACITY * 3);
  assert.equal(cold.sizes.length, POT_MIST_CAPACITY);
  assert.equal(cold.opacities.length, POT_MIST_CAPACITY);
  assert.equal(writePotMistFrame(cold, 1, 0), 8);
  assert.equal(writePotMistFrame(hot, 1, 1), 24);
  assert.ok(hot.opacities[0] > cold.opacities[0]);
  assert.ok(cold.opacities.slice(8).every(value => value === 0));
  for (let frame = 0; frame < 500; frame++) {
    const count = writePotMistFrame(hot, frame / 30, 2);
    assert.equal(count, POT_MIST_CAPACITY);
    assert.ok(hot.positions.every(value => Number.isFinite(value) && Math.abs(value) < 1.2));
    assert.ok(hot.sizes.every(value => value >= .15 && value <= .51));
    assert.ok(hot.opacities.every(value => value >= 0 && value <= .24));
  }
  writePotMistFrame(cold, 1, 1);
  writePotMistFrame(hot, 1 + POT_MIST_LIFETIME, 1);
  for (let i = 0; i < cold.positions.length; i++) assert.ok(Math.abs(cold.positions[i] - hot.positions[i]) < 1e-6);
});
