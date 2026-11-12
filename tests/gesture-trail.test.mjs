import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { advanceGestureTrail, clearGestureTrail, createGestureTrail, hasGestureTrailAnimation, setGestureTrailPoints, writeTrailPoint } from '../src/modules/Gestures/gestureTrail.js';

const drawing = JSON.parse(readFileSync(new URL('../src/static/spellEffects.json', import.meta.url), 'utf8')).drawing;

test('the overlay maps screen-space gestures to the same CSS pixels on portrait, wide and bottom-edge input', () => {
  const out = {};
  for (const [width, height] of [[360, 800], [1420, 800], [2400, 900]]) {
    assert.equal(writeTrailPoint({ x: -1, y: 1 }, width, height, out), out);
    assert.deepEqual(out, { x: 0, y: 0 });
    writeTrailPoint({ x: 1, y: -1 }, width, height, out);
    assert.deepEqual(out, { x: width, y: height });
    writeTrailPoint({ x: .25, y: -.99 }, width, height, out);
    assert.equal(out.x, width * .625);
    assert.equal(out.y, height * .995);
  }
});

test('sparks use a fixed small pool and bound emission even for huge teleports and coalesced batches', () => {
  const state = createGestureTrail(drawing), pool = state.particles, references = [...pool];
  let points = [{ x: -1, y: 0 }];
  setGestureTrailPoints(state, points, 1000, 600);
  assert.equal(state.alive, 1);
  const serial = state.serial;
  setGestureTrailPoints(state, points, 1000, 600);
  assert.equal(state.serial, serial, 're-rendering the same points cannot emit twice');
  points = [...points, { x: 1e6, y: 0 }];
  setGestureTrailPoints(state, points, 1000, 600);
  assert.ok(state.serial - serial <= drawing.maxParticlesPerUpdate);
  for (let update = 0; update < 30; update++) {
    const before = state.serial;
    points = [...points, ...Array.from({ length: 100 }, (_, index) => ({ x: Math.sin(update + index), y: Math.cos(update + index) }))];
    setGestureTrailPoints(state, points, 1000, 600);
    assert.ok(state.serial - before <= drawing.maxParticlesPerUpdate);
    assert.ok(state.alive <= 96);
  }
  assert.equal(state.particles, pool);
  assert.ok(state.particles.every((particle, index) => particle === references[index]));
  assert.equal(createGestureTrail({ particleCapacity: 100000 }).capacity, 96);
});

test('spark drift and fading use elapsed seconds consistently at 30, 60 and 144 FPS', () => {
  const states = [30, 60, 144].map(fps => {
    const state = createGestureTrail(drawing);
    setGestureTrailPoints(state, [{ x: 0, y: 0 }, { x: .2, y: -.1 }], 1000, 600);
    for (let step = 0; step < fps; step++) advanceGestureTrail(state, .2 / fps);
    return state;
  });
  for (const state of states.slice(1)) {
    assert.equal(state.alive, states[0].alive);
    state.particles.forEach((particle, index) => {
      for (const field of ['x', 'y', 'age']) assert.ok(Math.abs(particle[field] - states[0].particles[index][field]) < 1e-8);
    });
  }
  for (const particle of states[0].particles.filter(particle => particle.alive)) {
    assert.ok(Math.hypot(particle.vx, particle.vy) * particle.lifetime <= 10,
      'sparks must stay close to the three-pixel stroke');
  }
});

test('ending a gesture gives a short tail, while disabling or cancelling can clear immediately and stop animation', () => {
  const state = createGestureTrail(drawing), points = [{ x: -.3, y: .1 }, { x: .3, y: -.1 }];
  setGestureTrailPoints(state, points, 1000, 600);
  assert.ok(hasGestureTrailAnimation(state));
  setGestureTrailPoints(state, [], 1000, 600);
  assert.equal(state.drawing, false);
  advanceGestureTrail(state, .1);
  assert.ok(state.path.length > 0);
  assert.ok(state.alive > 0);
  advanceGestureTrail(state, .4);
  assert.equal(state.path.length, 0);
  assert.equal(state.alive, 0);
  assert.equal(hasGestureTrailAnimation(state), false);
  setGestureTrailPoints(state, points, 1000, 600);
  clearGestureTrail(state);
  assert.equal(hasGestureTrailAnimation(state), false);
  assert.equal(state.path.length, 0);
  assert.ok(state.particles.every(particle => !particle.alive));
  setGestureTrailPoints(state, points, 1000, 600);
  advanceGestureTrail(state, 1);
  assert.equal(state.alive, 0);
  assert.equal(hasGestureTrailAnimation(state), false, 'an unmoving held stroke must not run a permanent RAF');
  assert.equal(state.path, points, 'the static line stays visible until release');
});
