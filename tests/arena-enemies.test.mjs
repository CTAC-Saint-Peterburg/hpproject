import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) => {
  if (!specifier.startsWith('.')) return statement;
  return 'from ' + JSON.stringify(new URL(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', base).href);
});
const { defenseState, config } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function fixture() {
  let random = () => .99;
  const profile = {
    stones: 0, mageCards: {}, consumeEntryPotions: () => true,
    changeStones(amount) { this.stones += amount; },
    awardMageCard(id) { this.mageCards[id] = (this.mageCards[id] || 0) + 1; },
  };
  const store = createStore(defenseState(() => profile, () => random()));
  const s = () => store.getState();
  assert.equal(s().start(['frost', 'flame', 'echo']), true);
  store.setState({ enemies: [], queue: [], hp: 1000, time: 1 });
  const make = (type, overrides = {}) => {
    const enemy = s().createEnemy(type);
    assert.ok(enemy, 'enemy configuration exists: ' + type);
    store.setState({ serial: s().serial + 1 });
    return { ...enemy, ...overrides };
  };
  const step = seconds => {
    const count = Math.ceil(seconds / .05);
    for (let index = 0; index < count; index++) s().tick(s().lastTick + 50);
  };
  const advanceTo = target => {
    let steps = 0;
    while (s().time < target - 1e-7 && !['idle', 'won', 'lost'].includes(s().phase)) {
      assert.ok(steps++ < 10000);
      s().tick(s().lastTick + Math.min(50, Math.max(1, Math.ceil((target - s().time) * 1000))));
    }
  };
  return { store, s, profile, make, step, advanceTo, random: value => { random = typeof value === 'function' ? value : () => value; } };
}

function afterAttack(knockback, disorientation, run) {
  const oldKnockback = config.afterAttack.knockback.chance;
  const oldDisorientation = config.afterAttack.disorientation.chance;
  config.afterAttack.knockback.chance = knockback;
  config.afterAttack.disorientation.chance = disorientation;
  try { run(); } finally {
    config.afterAttack.knockback.chance = oldKnockback;
    config.afterAttack.disorientation.chance = oldDisorientation;
  }
}

function melee(f, overrides = {}) {
  const enemy = f.make('fire', { x: config.crystal.attackRange, z: 0, hp: 500,
    rageUntil: 100, rageAt: 100, nextAttack: 0, critChance: 0, specialChance: 0, ...overrides });
  f.store.setState({ enemies: [enemy] });
  return enemy;
}

test('post-melee knockback and disorientation roll independently, including both effects together', () => {
  assert.equal(config.afterAttack.knockback.chance, .5);
  assert.equal(config.afterAttack.disorientation.chance, .1);
  for (const knockback of [0, 1]) for (const disorientation of [0, 1]) afterAttack(knockback, disorientation, () => {
    const f = fixture(); const enemy = melee(f);
    f.step(.05);
    assert.equal(f.s().hp, 1000 - enemy.attack);
    assert.equal(f.s().enemies[0].knockbackUntil > f.s().time, Boolean(knockback));
    assert.equal(f.s().enemies[0].disorientedUntil > f.s().time, Boolean(disorientation));
    if (disorientation) assert.equal(f.s().enemies[0].rageUntil, 0);
  });
});

test('proximity, complete freezing and crystal DOT do not trigger post-attack effects', () => afterAttack(1, 1, () => {
  for (const state of [
    { rageUntil: 0, rageAt: 100 },
    { frozenUntil: 100 },
    { x: 6, z: 3, rageUntil: 0, rageAt: 100 },
  ]) {
    const f = fixture(); melee(f, state);
    f.store.setState({ crystalEffects: { burn: { until: 100, dps: 1 } } });
    f.step(.05);
    assert.ok(f.s().hp > 999 && f.s().hp < 1000);
    assert.equal(f.s().enemies[0].knockbackUntil, 0);
    assert.equal(f.s().enemies[0].disorientedUntil, 0);
  }
}));

test('knockback moves smoothly outwards then allows approach; pause freezes its position and lifetime', () => afterAttack(1, 0, () => {
  const f = fixture(); melee(f); f.step(.05);
  const hit = f.s().enemies[0], from = Math.hypot(hit.x, hit.z), hp = f.s().hp;
  assert.ok(Math.abs(from - config.crystal.attackRange) < .01, 'the attack does not teleport the enemy');
  f.step(config.afterAttack.knockback.duration / 3);
  const pushed = f.s().enemies[0], distance = Math.hypot(pushed.x, pushed.z);
  assert.ok(distance > from && distance < from + config.afterAttack.knockback.distance);
  f.s().setPaused(true); const pausedTime = f.s().time; f.step(3);
  assert.equal(f.s().time, pausedTime); assert.deepEqual(f.s().enemies[0], pushed);
  f.s().setPaused(false); f.advanceTo(hit.knockbackUntil + .001);
  const farthest = Math.hypot(f.s().enemies[0].x, f.s().enemies[0].z);
  assert.ok(farthest > from + config.afterAttack.knockback.distance * .9);
  assert.equal(f.s().hp, hp);
  f.step(.2); assert.ok(Math.hypot(f.s().enemies[0].x, f.s().enemies[0].z) < farthest);
}));

test('disorientation lasts ten simulation seconds, wanders within the field and suppresses rage attacks', () => afterAttack(0, 1, () => {
  const f = fixture(); melee(f); f.step(.05);
  const initial = f.s().enemies[0], hp = f.s().hp;
  assert.ok(Math.abs(initial.disorientedUntil - f.s().time - config.afterAttack.disorientation.duration) < 1e-8);
  let travelled = 0, previous = initial;
  while (f.s().time < initial.disorientedUntil - .2) {
    f.step(.05); const enemy = f.s().enemies[0];
    travelled += Math.hypot(enemy.x - previous.x, enemy.z - previous.z);
    assert.ok(Math.abs(enemy.x) < config.field.width / 2 && Math.abs(enemy.z) < config.field.depth / 2);
    assert.equal(f.s().hp, hp); assert.equal(enemy.rageUntil, 0);
    previous = enemy;
  }
  assert.ok(travelled > .5 && travelled <= initial.speed * config.afterAttack.disorientation.speedMultiplier * 10 + .05);
  config.afterAttack.disorientation.chance = 0;
  f.advanceTo(initial.disorientedUntil + .1);
  f.store.setState({ enemies: [{ ...f.s().enemies[0], x: 3, z: 0, rageUntil: 100, rageAt: 100 }] });
  f.step(.2); assert.ok(Math.hypot(f.s().enemies[0].x, f.s().enemies[0].z) < 3);
  f.s().exit(); assert.deepEqual(f.s().enemies, []);
}));

test('simultaneous giant kills split into two standard fire enemies each before completion, direct and burn', () => {
  const [type, giant] = Object.entries(config.enemies).find(([, enemy]) => enemy.split);
  assert.equal(giant.split.count, 2); assert.equal(giant.split.type, 'fire');
  for (const burn of [false, true]) {
    const f = fixture();
    const giants = [0, 1].map(index => f.make(type, { x: 2 + index * .3, z: 0, hp: burn ? .1 : 1,
      burnUntil: burn ? 100 : 0, burnDps: burn ? 100 : 0 }));
    f.store.setState({ enemies: giants, selected: giants[0].id, buffs: { multicast: 100 } });
    if (burn) {
      f.s().setPaused(true); f.step(1); assert.equal(f.s().enemies.length, 2);
      f.s().setPaused(false); f.step(.05);
    } else assert.equal(f.s().cast(giant.counterSpell), true);
    const children = f.s().enemies;
    assert.equal(children.length, 4); assert.equal(new Set(children.map(enemy => enemy.id)).size, 4);
    assert.ok(children.every(enemy => enemy.type === 'fire' && enemy.maxHp === config.enemies.fire.hp));
    assert.ok(children.every(enemy => !giants.some(parent => parent.id === enemy.id)));
    assert.equal(f.s().phase, 'wave'); assert.deepEqual(f.profile.mageCards, {});
    assert.equal(f.profile.stones, 0); assert.equal(f.s().pendingStones, giant.reward * 2, 'children add no temporary reward on spawn');
    f.store.setState({ enemies: children.map(enemy => ({ ...enemy, hp: .1, burnUntil: 100, burnDps: 100 })) });
    f.step(.05);
    assert.equal(f.s().phase, 'clear'); assert.equal(f.profile.stones, 0);
    assert.equal(f.s().pendingStones, giant.reward * 2 + 4 * config.enemies.fire.reward + config.waves[0].stonesReward);
    assert.equal(f.profile.mageCards[config.waves[0].cardId], 1);
    f.step(.1); assert.equal(f.profile.mageCards[config.waves[0].cardId], 1);
  }
});

test('both flyers orbit at height and launch slow projectiles on their configured interval, freezing delays shots', () => {
  for (const type of ['flyerFire', 'flyerFrost']) {
    const f = fixture(), base = config.enemies[type];
    const enemy = f.make(type, { x: base.orbit.radius, z: 0, nextRangedAt: 1 });
    f.store.setState({ enemies: [enemy] }); f.step(.05);
    assert.equal(f.s().projectiles.length, 1); assert.equal(f.s().projectileSerial, 1);
    const shot = f.s().projectiles[0];
    assert.equal(shot.speed, .65); assert.equal(shot.interceptable, true); assert.equal(shot.counterSpell, base.counterSpell);
    assert.ok(Math.abs(Math.hypot(f.s().enemies[0].x, f.s().enemies[0].z) - base.orbit.radius) < .01);
    assert.ok(Math.abs(f.s().enemies[0].y - base.orbit.height) <= .101);
    f.advanceTo(f.s().enemies[0].nextRangedAt - .01); assert.equal(f.s().projectileSerial, 1);
    const next = f.s().enemies[0].nextRangedAt;
    f.store.setState({ enemies: [{ ...f.s().enemies[0], frozenUntil: next + 1 }] });
    f.advanceTo(next + .5); assert.equal(f.s().projectileSerial, 1);
    f.advanceTo(next + 1.1); assert.equal(f.s().projectileSerial, 2);
  }
});

test('flyers approaching from a far corner stay inside the table and settle into their configured orbit', () => {
  for (const type of ['flyerFire', 'flyerFrost']) {
    const f = fixture(), base = config.enemies[type];
    const xBound = config.field.width / 2 - .5, zBound = config.field.depth / 2 - .5;
    f.store.setState({ enemies: [f.make(type, { x: xBound, z: zBound })] });
    for (let tick = 0; tick < 2000; tick++) {
      f.step(.05);
      const enemy = f.s().enemies[0];
      assert.ok(Math.abs(enemy.x) <= xBound + 1e-6, type + ' remains inside table width');
      assert.ok(Math.abs(enemy.z) <= zBound + 1e-6, type + ' remains inside table depth');
    }
    const enemy = f.s().enemies[0];
    assert.equal(f.s().phase, 'wave'); assert.ok(f.s().hp > 0);
    assert.ok(Math.abs(Math.hypot(enemy.x, enemy.z) - base.orbit.radius) < .01);
    assert.ok(Math.abs(enemy.y - base.orbit.height) <= .101);
  }
});

test('interceptable shots survive their owner, block wave completion and grant no currency when countered', () => {
  const f = fixture(), base = config.enemies.flyerFire;
  const enemy = f.make('flyerFire', { x: base.orbit.radius, z: 0, hp: 1, nextRangedAt: 1 });
  f.store.setState({ enemies: [enemy] }); f.step(.05);
  const shot = f.s().projectiles[0];
  f.s().select(enemy.id); assert.equal(f.s().cast(base.counterSpell), true);
  assert.equal(f.s().enemies.length, 0); assert.equal(f.s().projectiles.length, 1); assert.equal(f.s().phase, 'wave');
  assert.deepEqual(f.profile.mageCards, {}); const stones = f.profile.stones;
  f.step(.5); f.s().select(shot.id); assert.equal(f.s().selected, shot.id);
  assert.equal(f.s().cast(1), false); assert.equal(f.s().projectiles.length, 1);
  f.s().setPaused(true); const snapshot = f.s().projectiles; f.step(3);
  assert.deepEqual(f.s().projectiles, snapshot); assert.equal(f.s().cast(base.counterSpell), false);
  f.store.setState({ selected: null }); f.s().select(shot.id); assert.equal(f.s().selected, null);
  f.s().setPaused(false); f.step(.5); f.s().select(shot.id);
  assert.equal(f.s().cast(base.counterSpell), true); assert.deepEqual(f.s().projectiles, []);
  assert.equal(f.profile.stones, stones); assert.equal(f.s().phase, 'clear');
  assert.equal(f.profile.mageCards[config.waves[0].cardId], 1);
});

test('sentinel warns for five seconds, then a fast unselectable shot deals exactly two damage', () => afterAttack(1, 1, () => {
  const f = fixture(), base = config.enemies.sentinel;
  const enemy = f.make('sentinel', { x: 4, z: 0, nextRangedAt: 1 });
  f.store.setState({ enemies: [enemy] }); f.random(0); f.step(.05);
  const until = f.s().enemies[0].windupUntil;
  assert.ok(Math.abs(until - f.s().time - 5) < 1e-8);
  f.advanceTo(until - .005); assert.equal(f.s().projectiles.length, 0); assert.equal(f.s().hp, 1000);
  f.advanceTo(until + .01); assert.equal(f.s().projectiles.length, 1);
  const shot = f.s().projectiles[0];
  assert.equal(shot.damage, 2); assert.equal(shot.speed, base.ranged.projectileSpeed); assert.equal(shot.interceptable, false);
  f.s().select(shot.id); assert.equal(f.s().selected, null); assert.equal(f.s().cast(2), false);
  f.step(1); assert.equal(f.s().hp, 998); assert.deepEqual(f.s().projectiles, []);
  assert.equal(f.s().enemies[0].knockbackUntil, 0); assert.equal(f.s().enemies[0].disorientedUntil, 0);
  assert.equal(f.profile.stones, 0);
}));

test('loss, wave reset and exit discard active projectiles and their selection', () => {
  for (const reset of ['loss', 'wave', 'exit']) {
    const f = fixture(), base = config.enemies.flyerFire;
    f.store.setState({ enemies: [f.make('flyerFire', { x: base.orbit.radius, z: 0, nextRangedAt: 1 })] });
    f.step(.05); const shot = f.s().projectiles[0]; f.s().select(shot.id);
    assert.equal(f.s().selected, shot.id); assert.equal(f.s().projectiles.length, 1);
    if (reset === 'loss') { f.store.setState({ hp: 0 }); f.step(.05); assert.equal(f.s().phase, 'lost'); }
    else if (reset === 'wave') assert.equal(f.s().debugWave(2), true);
    else { f.s().exit(); assert.equal(f.s().phase, 'idle'); assert.equal(f.s().projectileSerial, 0); }
    assert.deepEqual(f.s().projectiles, []); assert.equal(f.s().selected, null);
    f.s().exit(); assert.equal(f.s().start(['frost', 'flame', 'echo']), true);
    assert.deepEqual(f.s().projectiles, []); assert.equal(f.s().projectileSerial, 0);
  }
});

test('weak flyer impacts preserve stronger crystal DOT and longer duration, while expired slots can be replaced', () => {
  for (const type of ['flyerFire', 'flyerFrost']) for (const previous of ['strong-long', 'strong-short', 'expired', 'missing']) {
    const f = fixture(), base = config.enemies[type], ranged = base.ranged;
    f.store.setState({ enemies: [f.make(type, { x: base.orbit.radius, z: 0, nextRangedAt: 1 })] });
    f.step(.05);
    const shot = f.s().projectiles[0];
    const old = previous === 'missing' ? null : {
      dps: previous === 'expired' ? 99 : 5,
      until: f.s().time + (previous === 'strong-long' ? 100 : previous === 'expired' ? -.1 : .1),
    };
    f.store.setState({
      enemies: [{ ...f.s().enemies[0], frozenUntil: 100 }],
      projectiles: [{ ...shot, x: .1, y: 1.1, z: 0 }],
      crystalEffects: old ? { [ranged.element]: old } : {},
    });
    f.step(.05);
    assert.deepEqual(f.s().projectiles, []);
    const effect = f.s().crystalEffects[ranged.element];
    const liveOld = old && old.until > f.s().time;
    assert.equal(effect.dps, liveOld ? Math.max(old.dps, ranged.effectDps) : ranged.effectDps);
    const expectedUntil = liveOld ? Math.max(old.until, f.s().time + ranged.effectDuration) : f.s().time + ranged.effectDuration;
    assert.ok(Math.abs(effect.until - expectedUntil) < 1e-8);
  }
});

test('only attacking spells cancel a sentinel windup, and freezing preserves its remaining warning', () => {
  for (const spell of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const f = fixture();
    const enemy = f.make('sentinel', { x: 4, z: 0, hp: 100, maxHp: 100, windupUntil: 6, nextRangedAt: 100 });
    f.store.setState({ enemies: [enemy], selected: enemy.id });
    const attacking = [1, 2, 6].includes(spell);
    assert.equal(f.s().cast(spell), attacking);
    assert.equal(f.s().enemies[0].hp, attacking ? 100 - config.player.damage : 100);
    assert.equal(f.s().enemies[0].windupUntil, attacking ? 0 : 6);
    if (attacking) assert.ok(f.s().enemies[0].nextRangedAt > f.s().time);
  }
  const f = fixture();
  f.store.setState({ enemies: [f.make('sentinel', { x: 4, z: 0, windupUntil: 6, nextRangedAt: 100, frozenUntil: 2 })] });
  const remaining = f.s().enemies[0].windupUntil - f.s().time;
  f.step(.5);
  assert.ok(Math.abs(f.s().enemies[0].windupUntil - f.s().time - remaining) < .001);
  assert.deepEqual(f.s().projectiles, []);
  f.s().setPaused(true); const time = f.s().time, until = f.s().enemies[0].windupUntil; f.step(2);
  assert.equal(f.s().time, time); assert.equal(f.s().enemies[0].windupUntil, until);
  f.s().setPaused(false); f.step(.6);
  assert.ok(f.s().enemies[0].windupUntil - f.s().time < remaining);
  f.s().exit(); assert.deepEqual(f.s().projectiles, []); assert.equal(f.s().projectileSerial, 0);
});
