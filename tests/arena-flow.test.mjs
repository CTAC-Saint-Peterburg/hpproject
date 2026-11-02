import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { rewardVisualDuration, pendingRewardStones } from '../src/modules/Defense/rewardMotion.js';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) => {
  if (!specifier.startsWith('.')) return statement;
  const path = /\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js';
  return 'from ' + JSON.stringify(new URL(path, base).href);
});
const { defenseState, config } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function fixture(value = .99) {
  let randomCalls = 0;
  const profile = {
    stones: 0, entries: 0, mageCards: {},
    consumeEntryPotions() { this.entries++; return true; },
    changeStones(amount) { this.stones += amount; },
    awardMageCard(id) { this.mageCards[id] = (this.mageCards[id] || 0) + 1; },
  };
  const store = createStore(defenseState(() => profile, () => { randomCalls++; return value; }));
  const s = () => store.getState();
  const start = () => assert.equal(s().start(['frost', 'flame', 'echo']), true);
  const step = seconds => {
    const steps = Math.ceil(seconds / .05);
    for (let index = 0; index < steps; index++) s().tick(s().lastTick + 50);
  };
  const advanceTo = target => {
    let steps = 0;
    while (s().time < target - 1e-8 && !['idle', 'won', 'lost'].includes(s().phase)) {
      assert.ok(steps++ < 10000, 'simulation must advance toward the requested time');
      const milliseconds = Math.min(50, Math.max(1, Math.ceil((target - s().time) * 1000)));
      s().tick(s().lastTick + milliseconds);
    }
  };
  return { store, s, profile, start, step, advanceTo, randomCalls: () => randomCalls };
}

function readyCoin(f, score = 150, wave = 0) {
  f.store.setState({ phase: 'clear', wave, score, enemies: [], queue: [] });
  f.s().select('coin');
  assert.equal(f.s().phase, 'clear');
  assert.equal(f.s().selected, 'coin');
  assert.equal(f.s().coinSelected, true);
}

test('a second click cancels coin selection and restores the option to keep points', () => {
  const f = fixture(); f.start(); readyCoin(f);
  f.s().select('coin');
  assert.equal(f.s().coinSelected, false); assert.equal(f.s().selected, null);
  assert.equal(f.s().phase, 'clear'); assert.equal(f.s().coinToss, null);
  assert.equal(f.s().cast(3), false);
  f.s().next(); assert.equal(f.s().phase, 'wave'); assert.equal(f.s().score, 150);
});

function multikill(f, debug = false) {
  const seed = f.s().enemies[0];
  const enemies = ['fire', 'frost', 'moss'].map((type, index) => ({
    ...seed, id: 'flow-' + index, type, hp: 1, maxHp: 1,
    x: 2 + index * .2, y: .25, z: 0,
  }));
  f.store.setState({ enemies, queue: [], time: 1, selected: enemies[0].id,
    buffs: { multicast: 100 }, debugUsed: debug });
  assert.equal(f.s().cast(1), true);
  return enemies;
}

test('coin selection waits for a gesture; every spell starts a toss and both outcomes commit only at rest', () => {
  for (const won of [true, false]) for (let spell = 1; spell <= 10; spell++) {
    const f = fixture(won ? .01 : .99); f.start();
    f.profile.stones = 40;
    readyCoin(f);
    const randomBefore = f.randomCalls();
    assert.equal(f.s().cast(spell), true);
    const toss = f.s().coinToss;
    const startedAt = f.s().coinStartedAt;
    assert.ok(toss && toss.duration > 0);
    assert.equal(f.s().phase, 'coin');
    assert.equal(f.s().coinResult, won);
    assert.equal(f.s().coinResolved, false);
    assert.equal(f.s().score, 150);
    assert.equal(f.randomCalls() - randomBefore, 1, 'visual planning must not consume combat/outcome random draws');
    assert.equal(f.s().cast(spell), false);
    f.s().next(); assert.equal(f.s().phase, 'coin');
    f.advanceTo(startedAt + toss.duration - .005);
    assert.equal(f.s().score, 150); assert.equal(f.s().coinResolved, false);
    f.advanceTo(startedAt + toss.duration + .001);
    assert.equal(f.s().coinResolved, true);
    assert.equal(f.s().score, won ? 300 : 0);
    assert.equal(f.profile.stones, 40);
    assert.ok(Math.abs(f.s().coinEnd - (startedAt + toss.duration + config.coin.resultSeconds)) < 1e-8);
    f.advanceTo(f.s().coinEnd + .001);
    assert.equal(f.s().phase, 'wave'); assert.equal(f.s().wave, 1);
    assert.equal(f.s().score, won ? 300 : 0); assert.equal(f.profile.entries, 1);
    assert.equal(f.s().coinToss, null); assert.equal(f.s().coinSelected, false);
  }
});

test('pause freezes an unresolved coin; exit, restart and final victory clear its presentation state', () => {
  const f = fixture(.01); f.start(); readyCoin(f); f.s().cast(5);
  f.advanceTo(f.s().coinStartedAt + f.s().coinToss.duration * .5);
  const time = f.s().time;
  f.s().setPaused(true); f.step(10);
  assert.equal(f.s().time, time); assert.equal(f.s().coinResolved, false); assert.equal(f.s().score, 150);
  f.s().setPaused(false);
  f.advanceTo(f.s().coinStartedAt + f.s().coinToss.duration + .001);
  assert.equal(f.s().score, 300);
  f.s().exit();
  assert.equal(f.s().coinToss, null); assert.equal(f.s().coinSelected, false); assert.equal(f.s().selected, null);
  f.start(); assert.equal(f.s().coinResult, null); assert.equal(f.s().coinResolved, false);
  readyCoin(f, 10, config.waves.length - 1); f.s().cast(2);
  f.advanceTo(f.s().coinEnd + .001);
  assert.equal(f.s().phase, 'won'); assert.equal(f.s().score, 20);
  assert.equal(f.s().coinToss, null); assert.equal(f.s().selected, null);
  assert.equal(f.s().coinSelected, false); assert.deepEqual(f.s().rewardEvents, []);
});

test('multikill credits once immediately and keeps death/reward events through the next wave until arrival', () => {
  const f = fixture(); f.start();
  const before = f.randomCalls();
  const enemies = multikill(f);
  const stones = enemies.reduce((sum, enemy) => sum + config.enemies[enemy.type].reward, 0);
  assert.equal(f.randomCalls() - before, enemies.length, 'reward visuals must not draw combat RNG');
  assert.equal(f.profile.stones, stones); assert.equal(f.s().runStones, stones); assert.equal(f.s().score, stones * 10);
  assert.equal(f.s().rewardEvents.length, 3); assert.equal(f.s().rewardSerial, 3);
  assert.equal(new Set(f.s().rewardEvents.map(event => event.id)).size, 3);
  for (const event of f.s().rewardEvents) {
    assert.equal(event.time, 1); assert.equal(event.position.length, 3);
    assert.ok(event.position.every(Number.isFinite)); assert.match(event.color, /^#[0-9a-f]{6}$/i);
    assert.ok(event.stones > 0);
  }
  assert.equal(pendingRewardStones(f.s().rewardEvents, f.s().time), stones);
  assert.equal(f.profile.stones - pendingRewardStones(f.s().rewardEvents, f.s().time), 0);
  const ids = f.s().rewardEvents.map(event => event.id);
  const arrival = Math.max(...f.s().rewardEvents.map(event => event.time + rewardVisualDuration(event)));
  f.s().setPaused(true); f.step(5);
  assert.equal(f.s().time, 1); assert.deepEqual(f.s().rewardEvents.map(event => event.id), ids);
  assert.equal(pendingRewardStones(f.s().rewardEvents, f.s().time), stones);
  f.s().setPaused(false);
  assert.equal(f.s().phase, 'clear'); f.s().next();
  assert.deepEqual(f.s().rewardEvents.map(event => event.id), ids);
  f.advanceTo(arrival + .001);
  assert.deepEqual(f.s().rewardEvents, []);
  assert.equal(pendingRewardStones(f.s().rewardEvents, f.s().time), 0);
  assert.equal(f.profile.stones, stones); assert.equal(f.s().runStones, stones); assert.equal(f.s().score, stones * 10);
});

test('burn deaths emit one event each; debug deaths keep their flash without flying currency', () => {
  for (const debug of [false, true]) {
    const f = fixture(); f.start();
    const seed = f.s().enemies[0];
    f.store.setState({ queue: [], debugUsed: debug, enemies: [
      { ...seed, id: 'burn-a', hp: .1, burnUntil: 10, burnDps: 4 },
      { ...seed, id: 'burn-b', hp: .1, burnUntil: 10, burnDps: 4 },
    ] });
    f.step(.05);
    assert.equal(f.s().rewardEvents.length, 2); assert.equal(f.s().rewardSerial, 2);
    assert.equal(f.profile.stones, debug ? 0 : 10); assert.equal(f.s().runStones, debug ? 0 : 10);
    assert.equal(f.s().score, 100);
    assert.ok(f.s().rewardEvents.every(event => event.stones === (debug ? 0 : 5)));
    assert.equal(pendingRewardStones(f.s().rewardEvents, f.s().time), debug ? 0 : 10);
    f.step(.1); assert.equal(f.s().rewardSerial, 2);
    assert.equal(f.profile.stones, debug ? 0 : 10);
  }
});

test('reward event pool is capped without capping credited kills and terminal states remove remaining visuals', () => {
  const f = fixture(); f.start();
  const dead = Array.from({ length: 80 }, (_, index) => ({
    ...f.s().enemies[0], id: 'bulk-' + index, hp: 0,
  }));
  f.s().awardKills(dead);
  assert.equal(f.profile.stones, 400); assert.equal(f.s().runStones, 400); assert.equal(f.s().score, 4000);
  assert.equal(f.s().rewardSerial, 80); assert.equal(f.s().rewardEvents.length, 64);
  assert.equal(new Set(f.s().rewardEvents.map(event => event.id)).size, 64);
  f.store.setState({ hp: 0 }); f.step(.05);
  assert.equal(f.s().phase, 'lost'); assert.deepEqual(f.s().rewardEvents, []);
  f.s().exit(); assert.deepEqual(f.s().rewardEvents, []);
  f.start(); assert.equal(f.s().rewardSerial, 0); assert.deepEqual(f.s().rewardEvents, []);
});
