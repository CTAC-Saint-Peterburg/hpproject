import assert from 'node:assert/strict';
import test from 'node:test';
import { defenseConfig as config, potionTypes } from '../src/static/themedConfigs.js';
import { bomberExplosionRadius, bomberSpawnAllowed, explodeBomber } from '../src/modules/Defense/arenaBomber.js';
import { advanceArenaEnemy, createArenaEnemy } from '../src/modules/Defense/enemyBehavior.js';

let serial = 0;
const make = (type = 'fire', overrides = {}) => ({
  ...createArenaEnemy(config, type, {}, 0, ++serial, () => .99, { x: 0, z: 0 }),
  ...overrides,
});
const combat = () => ({ hp: 100, effects: {}, projectiles: [], projectileSerial: 0 });

test('a bomber requires a dense live hostile group and respects phase, pause, cooldown and its own limit', () => {
  const enemies = Array.from({ length: config.bomberSpawn.threshold }, () => make());
  const state = { phase: 'wave', paused: false, time: 20, nextBomberAt: 20, enemies };
  assert.equal(bomberSpawnAllowed(state, config), true);
  assert.equal(bomberSpawnAllowed({ ...state, enemies: enemies.slice(1) }, config), false);
  assert.equal(bomberSpawnAllowed({ ...state, enemies: [...enemies.slice(1), make('fire', { hp: 0 })] }, config), false);
  assert.equal(bomberSpawnAllowed({ ...state, enemies: [...enemies, make('bomber')] }, config), false);
  assert.equal(bomberSpawnAllowed({ ...state, paused: true }, config), false);
  assert.equal(bomberSpawnAllowed({ ...state, phase: 'clear' }, config), false);
  assert.equal(bomberSpawnAllowed({ ...state, time: 19.999 }, config), false);
  assert.equal(bomberSpawnAllowed(state, { ...config, bomberSpawn: { ...config.bomberSpawn, enabled: false } }), false);
});

test('the purple cube moves rapidly without attacking the crystal, and freeze halts it', () => {
  const state = combat();
  let enemy = make('bomber', { x: 1.4, z: 0, wanderAngle: Math.PI / 2, wanderTurnAt: 100,
    rageUntil: 100, nextAttack: 0 });
  const original = { ...enemy };
  enemy = advanceArenaEnemy(enemy, config, potionTypes, .1, .1, () => .99, state);
  assert.ok(Math.hypot(enemy.x - original.x, enemy.z - original.z) >= enemy.speed * .09);
  assert.equal(state.hp, 100);
  assert.deepEqual(state.projectiles, []);
  const frozen = { ...enemy, frozenUntil: 10 };
  enemy = advanceArenaEnemy(frozen, config, potionTypes, .2, .1, () => .99, state);
  assert.deepEqual([enemy.x, enemy.y, enemy.z], [frozen.x, frozen.y, frozen.z]);
  assert.equal(state.hp, 100);
});

test('a direct detonation damages only enemies in the three-dimensional configured radius, once per death', () => {
  const bomber = make('bomber');
  const radius = bomberExplosionRadius(bomber, config);
  assert.ok(Math.abs(radius - 4.2) < 1e-8);
  const victim = make('fire', { x: 1, hp: 80 });
  const survivor = make('giant', { x: 2, hp: 150 });
  const outside = make('fire', { x: radius + 1, hp: 80 });
  const high = make('flyerFire', { y: 10, hp: 80 });
  const deadBefore = make('fire', { hp: 0 });
  const enemies = [bomber, victim, survivor, outside, high, deadBefore], snapshot = JSON.stringify(enemies);
  const result = explodeBomber(enemies, bomber, config);
  assert.equal(JSON.stringify(enemies), snapshot);
  assert.deepEqual(result.dead.map(enemy => enemy.id), [bomber.id, victim.id]);
  assert.equal(result.enemies.find(enemy => enemy.id === survivor.id).hp, 50);
  assert.equal(result.enemies.find(enemy => enemy.id === outside.id).hp, 80);
  assert.equal(result.enemies.find(enemy => enemy.id === high.id).hp, 80);
  assert.equal(result.explosions.length, 1);
  const repeat = explodeBomber(result.enemies, bomber, config);
  assert.equal(repeat.enemies, result.enemies);
  assert.deepEqual(repeat.dead, []);
});

test('overlapping bomber chains are bounded, while passive burn deaths do not detonate', () => {
  const first = make('bomber'), second = make('bomber', { x: 3.5 }), victim = make('fire', { x: 6, hp: 80 });
  const result = explodeBomber([first, second, victim], first, config);
  assert.equal(result.explosions.length, 2);
  assert.equal(new Set(result.explosions.map(event => event.id)).size, 2);
  assert.deepEqual(new Set(result.dead.map(enemy => enemy.id)), new Set([first.id, second.id, victim.id]));
  const state = combat();
  const burned = advanceArenaEnemy({ ...first, burnUntil: 10, burnDps: 100 }, config, potionTypes, .1, .1, () => .99, state);
  assert.ok(burned.hp <= 0);
  assert.equal(state.hp, 100);
  assert.deepEqual(state.projectiles, []);
  assert.equal(victim.hp, 80);
});
