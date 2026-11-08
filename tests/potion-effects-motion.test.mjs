import assert from 'node:assert/strict';
import test from 'node:test';
import { potionTypes, defenseConfig as config } from '../src/static/themedConfigs.js';
import { potionEffect, applyPotionImpact } from '../src/modules/Defense/potionEffects.js';
import { advanceArenaEnemy, createArenaEnemy } from '../src/modules/Defense/enemyBehavior.js';
import { writeEnemyMotion } from '../src/modules/Defense/enemyMotion.js';

const potion = id => potionTypes.find(item => item.id === id);
const enemy = (type = 'fire', overrides = {}) => ({
  ...createArenaEnemy(config, type, {}, 0, 1, () => .9, { x: 1.4, z: 0 }),
  ...overrides,
});
const combatState = () => ({ hp: 100, effects: {}, projectiles: [], projectileSerial: 0 });

test('each quality gives a stronger configured potion while leaving its source and counterspells unchanged', () => {
  for (const source of potionTypes) {
    const before = JSON.stringify(source);
    const [basic, fine, master] = ['basic', 'fine', 'masterwork'].map(quality => potionEffect(source, quality));
    assert.equal(basic.multiplier, 1); assert.equal(fine.multiplier, 1.35); assert.equal(master.multiplier, 1.75);
    for (const field of ['heal', 'duration', 'onHitDuration', 'impactDuration', 'dps', 'chainRadius']) {
      if (source[field] === undefined) continue;
      assert.ok(basic[field] < fine[field] && fine[field] < master[field], source.id + ': ' + field);
    }
    assert.equal(basic.slowMultiplier, source.slowMultiplier);
    assert.equal(master.slowMultiplier, source.slowMultiplier);
    if (source.effect === 'multicast') {
      assert.deepEqual([basic.targets, fine.targets, master.targets], [3, 4, 5]);
      assert.deepEqual(master.spells, source.spells); assert.notEqual(master.spells, source.spells);
    }
    assert.equal(JSON.stringify(source), before);
    assert.deepEqual(potionEffect(source, 'unknown'), basic);
  }
  assert.deepEqual(['basic', 'fine', 'masterwork'].map(quality => potionEffect(potion('healing'), quality).heal), [35, 47, 61]);
});

test('landing statuses affect every living enemy immediately and never downgrade an active stronger effect', () => {
  const original = [enemy('fire'), enemy('flyerFire'), enemy('moss'), enemy('giant', { hp: 0 })];
  const frozen = applyPotionImpact(original, potionEffect(potion('frost')), 10);
  assert.ok(original.slice(0, 3).every(item => item.frozenUntil === 0));
  assert.ok(frozen.slice(0, 3).every(item => item.frozenUntil === 14 && item.frozenAt === 10));
  assert.equal(frozen[3], original[3]);
  const extended = applyPotionImpact(frozen, potionEffect(potion('frost'), 'masterwork'), 11);
  assert.ok(extended.slice(0, 3).every(item => item.frozenUntil === 18 && item.frozenAt === 10));
  const burning = applyPotionImpact(original, potionEffect(potion('flame'), 'masterwork'), 10);
  assert.ok(burning.slice(0, 3).every(item => item.burnDps === 7 && item.burnUntil === 18.75));
  const weak = applyPotionImpact(burning, potionEffect(potion('flame')), 11);
  assert.ok(weak.slice(0, 3).every(item => item.burnDps === 7 && item.burnUntil === 18.75));
  const refreshed = applyPotionImpact(burning, potionEffect(potion('flame')), 30);
  assert.ok(refreshed.slice(0, 3).every(item => item.burnDps === 4 && item.burnUntil === 35));
  assert.equal(applyPotionImpact(original, potionEffect(potion('echo')), 10), original);
});

test('complete freeze pauses knockback, wandering, melee attacks and the remaining ranged warning', () => {
  const frost = potionEffect(potion('frost'));
  for (const type of Object.keys(config.enemies)) {
    const source = enemy(type, { x: 1.4, y: .3, z: 0, rageUntil: 10, rageAt: 20, nextAttack: 1,
      windupUntil: type === 'sentinel' ? 6 : 0, nextRangedAt: 10,
      knockbackFrom: [1.4, 0], knockbackTo: [3.5, 0], knockbackStart: 0, knockbackUntil: 2,
      wanderTurnAt: 2, disorientedUntil: type === 'moss' ? 8 : 0 });
    let frozen = applyPotionImpact([source], frost, 1)[0];
    const combat = combatState();
    for (let time = 1.1; time < 5 + 1e-8; time += .1) {
      frozen = advanceArenaEnemy(frozen, config, potionTypes, Math.min(time, 5), .1, () => .99, combat);
      assert.deepEqual([frozen.x, frozen.y, frozen.z], [source.x, source.y, source.z], type);
    }
    assert.equal(combat.hp, 100); assert.deepEqual(combat.projectiles, []);
    assert.ok(Math.abs(frozen.knockbackStart - 4) < 1e-8);
    assert.ok(Math.abs(frozen.knockbackUntil - 6) < 1e-8);
    assert.ok(Math.abs(frozen.nextRangedAt - 14) < 1e-8);
    if (type === 'sentinel') assert.ok(Math.abs(frozen.windupUntil - 10) < 1e-8);
    const resumed = advanceArenaEnemy(frozen, config, potionTypes, 5.1, .1, () => .99, combat);
    assert.ok(resumed.x > frozen.x, type + ' resumes its knockback after thawing');
  }
});

test('all enemy micro motions are seeded, subtle, allocation-free and fixed while frozen or paused', () => {
  for (const type of Object.keys(config.enemies)) {
    const sample = enemy(type), shape = config.enemies[type].shape === 'slime' ? 'slime' : type.startsWith('flyer') ? 'flyer' : 'cube';
    const out = {}, second = {};
    for (const time of [0, .3, 1, 10, 1000]) {
      assert.equal(writeEnemyMotion(out, sample, time, shape), out);
      assert.deepEqual(writeEnemyMotion(second, sample, time, shape), out);
      assert.ok(Object.values(out).every(Number.isFinite));
      for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(out[axis] - 1) < .05);
      assert.ok(Math.abs(out.yaw) < .06);
    }
    const moving = { ...writeEnemyMotion({}, sample, .2, shape) };
    assert.notDeepEqual(writeEnemyMotion({}, { ...sample, seed: sample.seed + .7 }, .2, shape), moving);
    const frozen = { ...sample, frozenAt: 2, frozenUntil: 10 };
    assert.deepEqual(writeEnemyMotion({}, frozen, 2.1, shape), writeEnemyMotion({}, frozen, 9.9, shape));
    assert.deepEqual(writeEnemyMotion({}, { ...frozen, frozenAt: undefined }, 2.1, shape),
      writeEnemyMotion({}, { ...frozen, frozenAt: undefined }, 9.9, shape));
  }
});
