import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { defenseConfig as config, potionTypes } from '../src/static/themedConfigs.js';
import { beginEnemyCarry, canCarryEnemy, clampCarriedPosition, dropCarriedEnemy } from '../src/modules/Defense/enemyCarry.js';
import { advanceArenaEnemy, createArenaEnemy } from '../src/modules/Defense/enemyBehavior.js';
import { arenaBaseCameraPose } from '../src/modules/Defense/arenaLayout.js';

const make = (type = 'fire', overrides = {}) => ({
  ...createArenaEnemy(config, type, {}, 0, 1, () => .99, { x: 1.4, z: 0 }),
  ...overrides,
});
const combat = () => ({ hp: 100, effects: {}, projectiles: [], projectileSerial: 0 });

test('only the standard ground cubes can be carried; lifting preserves health and cancels an old knockback', () => {
  for (const type of Object.keys(config.enemies)) {
    const enemy = make(type);
    assert.equal(canCarryEnemy(enemy, config), ['fire', 'frost', 'sentinel'].includes(type), type);
  }
  const original = make('fire', { knockbackFrom: [1, 0], knockbackTo: [4, 0], knockbackUntil: 10, y: .3 });
  const snapshot = JSON.stringify(original);
  const lifted = beginEnemyCarry(original, config, 1);
  assert.equal(lifted.hp, original.hp);
  assert.equal(lifted.carried, true);
  assert.equal(lifted.liftFromY, .3);
  assert.equal(lifted.knockbackTo, null);
  assert.equal(lifted.knockbackUntil, 0);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(canCarryEnemy({ ...original, hp: 0 }, config), false);
  const giant = make('giant');
  assert.equal(beginEnemyCarry(giant, config, 1), giant);
});

test('carried cubes rise smoothly, keep all combat clocks suspended, and still receive existing damage over time', () => {
  const original = make('sentinel', { hp: 100, y: .2, windupUntil: 3, nextRangedAt: 4, rageAt: 8 });
  const state = combat();
  let enemy = beginEnemyCarry(original, config, 1);
  enemy = advanceArenaEnemy(enemy, config, potionTypes, 1.09, .09, () => .99, state);
  assert.ok(Math.abs(enemy.y - 1.1) < 1e-8);
  assert.deepEqual([enemy.x, enemy.z], [original.x, original.z]);
  assert.equal(enemy.hp, original.hp);
  assert.equal(enemy.windupUntil, 3.09);
  enemy = advanceArenaEnemy(enemy, config, potionTypes, 1.18, .09, () => .99, state);
  assert.equal(enemy.y, config.enemyCarry.height);
  enemy = { ...enemy, frozenUntil: 20, burnUntil: 10, burnDps: 4 };
  enemy = advanceArenaEnemy(enemy, config, potionTypes, 1.28, .1, () => .99, state);
  assert.ok(Math.abs(enemy.hp - 99.6) < 1e-8);
  assert.equal(enemy.y, config.enemyCarry.height);
  assert.ok(Math.abs(enemy.windupUntil - 3.28) < 1e-8);
  assert.equal(state.hp, 100);
  assert.deepEqual(state.projectiles, []);
});

test('dragging keeps the full cube on the tabletop, including invalid projections and all four corners', () => {
  for (const size of [.3, .6, 1]) {
    const enemy = make('fire', { size });
    for (const x of [-100, 0, 100, NaN]) for (const z of [-100, 0, 100, Infinity]) {
      const position = clampCarriedPosition(enemy, x, z, config);
      assert.ok(Number.isFinite(position.x) && Number.isFinite(position.z));
      assert.ok(Math.abs(position.x) + size * .7 <= config.field.width / 2 - .09);
      assert.ok(Math.abs(position.z) + size * .7 <= config.field.depth / 2 - .09);
    }
  }
  const invalid = clampCarriedPosition(make('fire', { x: 100, z: -100 }), NaN, NaN, config);
  assert.ok(Math.abs(invalid.x) < config.field.width / 2);
  assert.ok(Math.abs(invalid.z) < config.field.depth / 2);
});

test('dropping clears the crystal and lands smoothly without damage, then resumes normal movement', () => {
  const original = { ...beginEnemyCarry(make('fire', { x: 0, z: 0, hp: 100, rageUntil: 20 }), config, 0), y: 2 };
  const dropped = dropCarriedEnemy(original, config, 1);
  assert.equal(dropped.hp, 100);
  assert.equal(dropped.carried, false);
  assert.ok(Math.hypot(dropped.x, dropped.z) >= config.crystal.attackRange + config.enemyCarry.crystalClearance - 1e-8);
  assert.equal(original.carried, true);
  const state = combat(), half = config.enemyCarry.dropSeconds / 2;
  const middle = advanceArenaEnemy(dropped, config, potionTypes, 1 + half, half, () => .99, state);
  assert.ok(Math.abs(middle.y - 1) < 1e-8);
  assert.deepEqual([middle.x, middle.z], [dropped.x, dropped.z]);
  const landed = advanceArenaEnemy(middle, config, potionTypes, dropped.droppingUntil, half, () => .99, state);
  assert.equal(landed.y, 0);
  assert.equal(landed.droppingUntil, 0);
  assert.equal(landed.hp, 100);
  assert.equal(state.hp, 100);
  const resumed = advanceArenaEnemy(landed, config, potionTypes, dropped.droppingUntil + .05, .05, () => .99, state);
  assert.notDeepEqual([resumed.x, resumed.z], [landed.x, landed.z]);
});

test('a pointer ray projected at carry height puts the visible cube centre beneath the pointer', () => {
  const enemy = make('fire');
  for (const aspect of [9 / 16, 16 / 9, 32 / 9]) {
    const cameraPose = arenaBaseCameraPose(aspect);
    const camera = new PerspectiveCamera(50, aspect, .1, 1000);
    camera.position.fromArray(cameraPose.position);
    camera.lookAt(new Vector3(...cameraPose.target));
    camera.updateMatrixWorld(true);
    const pointer = new Vector2(.2, .1), ray = new Raycaster();
    ray.setFromCamera(pointer, camera);
    const height = config.enemyCarry.height + enemy.size * .6;
    const projected = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -height), new Vector3());
    assert.ok(projected);
    projected.project(camera);
    assert.ok(Math.abs(projected.x - pointer.x) < 1e-10);
    assert.ok(Math.abs(projected.y - pointer.y) < 1e-10);
  }
});
