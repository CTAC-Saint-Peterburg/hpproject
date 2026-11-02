import assert from 'node:assert/strict';
import test from 'node:test';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { COIN_RADIUS, createCoinGeometry, createCoinSymbols, getCoinGeometries } from '../src/modules/Defense/coinGeometry.js';
import { COIN_REST_Y, coinPose, createCoinToss } from '../src/modules/Defense/coinMotion.js';

function seeded(seed) {
  let state = seed;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
}

test('coin is a small bevelled octagon with separate raised symbols under 220 triangles', () => {
  const geometries = { body: createCoinGeometry(), ...createCoinSymbols() };
  try {
    let triangles = 0;
    for (const geometry of Object.values(geometries)) {
      triangles += geometry.index.count / 3;
      assert.equal(geometry.getAttribute('uv'), undefined);
      const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
      assert.equal(position.count, normal.count);
      for (const attribute of [position, normal]) assert.ok([...attribute.array].every(Number.isFinite));
      for (const index of geometry.index.array) assert.ok(index >= 0 && index < position.count);
    }
    assert.ok(triangles <= 220);
    assert.ok(geometries.body.boundingBox.max.y - geometries.body.boundingBox.min.y < .17);
    assert.ok(geometries.body.boundingBox.max.x <= COIN_RADIUS + 1e-6);
    assert.ok(geometries.spiral.boundingBox.min.y > 0 && geometries.spiral.boundingBox.max.y > geometries.body.boundingBox.max.y);
    assert.ok(geometries.bones.boundingBox.max.y < 0 && geometries.bones.boundingBox.min.y < geometries.body.boundingBox.min.y);
    // The raised face of each symbol must face outwards under ordinary material culling.
    const material = new MeshBasicMaterial();
    try {
      for (const [name, direction] of [['spiral', -1], ['bones', 1]]) {
        const geometry = geometries[name], position = geometry.getAttribute('position');
        const centre = new Vector3();
        for (let vertex = 0; vertex < 3; vertex++) centre.add(new Vector3().fromBufferAttribute(position, geometry.index.getX(vertex)));
        centre.multiplyScalar(1 / 3);
        const mesh = new Mesh(geometry, material);
        mesh.updateMatrixWorld(true);
        const origin = centre.clone().add(new Vector3(0, -direction * 2, 0));
        assert.ok(new Raycaster(origin, new Vector3(0, direction, 0)).intersectObject(mesh).length > 0, `${name} face points inside the coin`);
      }
    } finally { material.dispose(); }
    assert.equal(getCoinGeometries(), getCoinGeometries(), 'shared model must not allocate geometry per wave');
  } finally { Object.values(geometries).forEach(geometry => geometry.dispose()); }
});

test('each toss captures 2–6 distinct directional hops with progressively lower peaks', () => {
  const counts = new Set();
  for (const randomValue of [0, .2, .4, .6, .8, 1]) {
    const plan = createCoinToss(() => randomValue);
    counts.add(plan.bounceCount);
    assert.equal(plan.hops.length, plan.bounceCount);
    assert.ok(plan.bounceCount >= 2 && plan.bounceCount <= 6);
    assert.ok(plan.duration > plan.drop.duration && plan.duration < 3.2);
    let previousPeak = Infinity;
    const directions = new Set();
    const landings = new Set();
    for (const hop of plan.hops) {
      assert.ok(Math.hypot(hop.to[0] - hop.from[0], hop.to[2] - hop.from[2]) > .001);
      directions.add(Math.atan2(hop.to[2] - hop.from[2], hop.to[0] - hop.from[0]).toFixed(2));
      landings.add(hop.to.map(value => value.toFixed(5)).join(','));
      const peak = coinPose(plan, hop.start + hop.duration / 2, true).position[1];
      assert.ok(peak < previousPeak, 'bounce peaks must lose height');
      previousPeak = peak;
    }
    assert.equal(landings.size, plan.bounceCount);
    assert.ok(directions.size > 1, 'hops should change direction');
  }
  assert.deepEqual([...counts].sort(), [2, 3, 4, 5, 6]);
});

test('toss trajectories stay clear of the crystal and tabletop and settle on the intended face', () => {
  for (let seed = 1; seed <= 24; seed++) {
    const plan = createCoinToss(seeded(seed));
    for (const result of [true, false]) {
      for (let frame = 0; frame <= 500; frame++) {
        const pose = coinPose(plan, plan.duration * frame / 500, result);
        assert.ok([...pose.position, ...pose.rotation].every(Number.isFinite));
        assert.ok(Math.abs(pose.position[0]) < 3.5);
        assert.ok(pose.position[2] >= 1.6 && pose.position[2] <= 4.2);
        assert.ok(Math.hypot(pose.position[0], pose.position[2]) - COIN_RADIUS > 1.4, 'coin collides with the crystal');
        const verticalExtent = COIN_RADIUS * Math.abs(Math.sin(pose.rotation[0])) + .09 * Math.abs(Math.cos(pose.rotation[0]));
        assert.ok(pose.position[1] - verticalExtent >= .005, 'coin passes through the tabletop while flipping');
      }
      const settled = coinPose(plan, plan.duration, result);
      assert.equal(settled.settled, true);
      assert.equal(settled.position[1], COIN_REST_Y);
      assert.ok(Math.abs(Math.sin(settled.rotation[0])) < 1e-10);
      assert.ok(Math.abs(Math.cos(settled.rotation[0]) - (result ? 1 : -1)) < 1e-10);
      assert.deepEqual(coinPose(plan, plan.duration + 100, result), settled, 'settled coin must remain still');
    }
  }
});

test('motion is continuous, deterministic at any FPS and consumes no randomness after planning', () => {
  let draws = 0;
  const random = seeded(41);
  const plan = createCoinToss(() => { draws++; return random(); });
  const afterPlanning = draws;
  const snapshot = JSON.stringify(plan);
  for (const boundary of [plan.drop.duration, ...plan.hops.map(hop => hop.start + hop.duration), plan.duration]) {
    const before = coinPose(plan, boundary - 1e-7, false), after = coinPose(plan, boundary + 1e-7, false);
    assert.ok(Math.hypot(...before.position.map((value, axis) => value - after.position[axis])) < 1e-4);
    assert.ok(Math.hypot(...before.rotation.map((value, axis) => value - after.rotation[axis])) < 1e-4);
  }
  const paused = coinPose(plan, .8, true);
  for (let frame = 0; frame < 100; frame++) assert.deepEqual(coinPose(plan, .8, true), paused);
  for (const fps of [30, 60, 144]) {
    for (let frame = 0; frame <= fps * 4; frame++) coinPose(plan, frame / fps, false);
    assert.deepEqual(coinPose(plan, .8, true), paused);
  }
  assert.equal(draws, afterPlanning);
  assert.equal(JSON.stringify(plan), snapshot, 'rendering must not mutate the toss plan');
});
