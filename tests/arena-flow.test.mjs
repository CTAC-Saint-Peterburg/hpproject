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

function readyCoin(f, pendingStones = 150, wave = 0) {
  f.store.setState({ phase: 'clear', wave, pendingStones, waveSettled: false, enemies: [], queue: [] });
  f.s().select('coin');
  assert.equal(f.s().phase, 'clear');
  assert.equal(f.s().selected, 'coin');
  assert.equal(f.s().coinSelected, true);
}

test('cancelling coin selection keeps temporary stones and advancing banks them exactly once', () => {
  const f = fixture(); f.start(); readyCoin(f);
  f.s().select('coin');
  assert.equal(f.s().coinSelected, false); assert.equal(f.s().selected, null);
  assert.equal(f.s().phase, 'clear'); assert.equal(f.s().coinToss, null);
  assert.equal(f.s().cast(3), false); assert.equal(f.profile.stones, 0);
  f.s().next();
  assert.equal(f.s().phase, 'wave'); assert.equal(f.s().pendingStones, 0);
  assert.equal(f.profile.stones, 150); assert.equal(f.s().runStones, 150);
  f.s().next(); assert.equal(f.s().settleWave(), 0);
  assert.equal(f.profile.stones, 150);
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

test('all ten gestures toss a coin, whose result banks only this wave once at physical rest', () => {
  for (const won of [true, false]) for (let spell = 1; spell <= 10; spell++) {
    const f = fixture(won ? .01 : .99); f.start();
    f.profile.stones = 40; f.store.setState({ runStones: 20 });
    readyCoin(f);
    const randomBefore = f.randomCalls();
    assert.equal(f.s().cast(spell), true);
    const toss = f.s().coinToss, startedAt = f.s().coinStartedAt;
    assert.ok(toss && toss.duration > 0);
    assert.equal(f.s().phase, 'coin'); assert.equal(f.s().coinResult, won);
    assert.equal(f.s().coinResolved, false); assert.equal(f.s().pendingStones, 150);
    assert.equal(f.randomCalls() - randomBefore, 1, 'visual planning must not consume outcome random draws');
    assert.equal(f.s().cast(spell), false);
    assert.equal(f.s().settleWave(), 0, 'a running toss cannot be cashed out early');
    f.s().next(); assert.equal(f.s().phase, 'coin');
    f.advanceTo(startedAt + toss.duration - .005);
    assert.equal(f.s().pendingStones, 150); assert.equal(f.s().coinResolved, false);
    assert.equal(f.profile.stones, 40);
    f.advanceTo(startedAt + toss.duration + .001);
    const payout = won ? 300 : 0;
    assert.equal(f.s().coinResolved, true); assert.equal(f.s().waveSettled, true);
    assert.equal(f.s().pendingStones, 0); assert.equal(f.profile.stones, 40 + payout);
    assert.equal(f.s().runStones, 20 + payout);
    assert.equal(f.s().settleWave(2), 0); assert.equal(f.profile.stones, 40 + payout);
    assert.ok(Math.abs(f.s().coinEnd - (startedAt + toss.duration + config.coin.resultSeconds)) < 1e-8);
    f.advanceTo(f.s().coinEnd + .001);
    assert.equal(f.s().phase, 'wave'); assert.equal(f.s().wave, 1);
    assert.equal(f.profile.stones, 40 + payout); assert.equal(f.s().runStones, 20 + payout);
    assert.equal(f.profile.entries, 1); assert.equal(f.s().coinToss, null);
  }
});

test('pause freezes a toss; exit, restart and final victory clear presentation without losing banked stones', () => {
  const f = fixture(.01); f.start(); readyCoin(f); f.s().cast(5);
  f.advanceTo(f.s().coinStartedAt + f.s().coinToss.duration * .5);
  const time = f.s().time;
  f.s().setPaused(true); f.step(10);
  assert.equal(f.s().time, time); assert.equal(f.s().pendingStones, 150);
  assert.equal(f.s().coinResolved, false); assert.equal(f.profile.stones, 0);
  f.s().setPaused(false);
  f.advanceTo(f.s().coinStartedAt + f.s().coinToss.duration + .001);
  assert.equal(f.profile.stones, 300); f.s().exit();
  assert.equal(f.s().coinToss, null); assert.equal(f.s().selected, null);
  assert.equal(f.profile.stones, 300);
  f.start(); assert.equal(f.s().coinResult, null); assert.equal(f.s().runStones, 0);
  readyCoin(f, 10, config.waves.length - 1); f.s().cast(2);
  f.advanceTo(f.s().coinEnd + .001);
  assert.equal(f.s().phase, 'won'); assert.equal(f.s().runStones, 20);
  assert.equal(f.profile.stones, 320); f.s().next(); assert.equal(f.profile.stones, 320);
  assert.equal(f.s().coinToss, null); assert.deepEqual(f.s().rewardEvents, []);
});

test('multikill rewards animate into a temporary counter; wave reward and transfer cannot be repeated', () => {
  const f = fixture(); f.start();
  const before = f.randomCalls(), enemies = multikill(f);
  const kills = enemies.reduce((sum, enemy) => sum + config.enemies[enemy.type].reward, 0);
  const total = kills + config.waves[0].stonesReward;
  assert.equal(f.randomCalls() - before, enemies.length, 'reward visuals must not draw combat RNG');
  assert.equal(f.profile.stones, 0); assert.equal(f.s().runStones, 0);
  assert.equal(f.s().pendingStones, total); assert.equal(Object.hasOwn(f.s(), 'score'), false);
  assert.equal(f.s().rewardEvents.length, 3); assert.equal(f.s().rewardSerial, 3);
  const ids = f.s().rewardEvents.map(event => event.id);
  assert.equal(new Set(ids).size, 3);
  for (const event of f.s().rewardEvents) {
    assert.equal(event.time, 1); assert.equal(event.position.length, 3);
    assert.ok(event.position.every(Number.isFinite)); assert.match(event.color, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(pendingRewardStones(f.s().rewardEvents, f.s().time), kills);
  assert.equal(f.s().pendingStones - pendingRewardStones(f.s().rewardEvents, f.s().time), config.waves[0].stonesReward);
  const arrival = Math.max(...f.s().rewardEvents.map(event => event.time + rewardVisualDuration(event)));
  f.s().setPaused(true); f.step(5);
  assert.equal(f.s().time, 1); assert.deepEqual(f.s().rewardEvents.map(event => event.id), ids);
  f.s().setPaused(false); f.advanceTo(arrival + .001);
  assert.equal(pendingRewardStones(f.s().rewardEvents, f.s().time), 0);
  assert.equal(f.profile.stones, 0); assert.equal(f.s().pendingStones, total);
  f.s().finishWave(); assert.equal(f.s().pendingStones, total);
  f.s().next();
  assert.equal(f.profile.stones, total); assert.equal(f.s().runStones, total);
  assert.equal(f.s().pendingStones, 0); assert.deepEqual(f.s().rewardEvents, []);
});

test('burn deaths award temporary stones once; debug deaths flash but cannot bank rewards', () => {
  for (const debug of [false, true]) {
    const f = fixture(); f.start();
    const seed = f.s().enemies[0];
    f.store.setState({ queue: [], debugUsed: debug, enemies: [
      { ...seed, id: 'burn-a', hp: .1, burnUntil: 10, burnDps: 4 },
      { ...seed, id: 'burn-b', hp: .1, burnUntil: 10, burnDps: 4 },
    ] });
    f.step(.05);
    assert.equal(f.s().rewardEvents.length, 2); assert.equal(f.s().rewardSerial, 2);
    assert.equal(f.profile.stones, 0); assert.equal(f.s().runStones, 0);
    assert.equal(f.s().pendingStones, debug ? 0 : 10 + config.waves[0].stonesReward);
    assert.ok(f.s().rewardEvents.every(event => event.stones === (debug ? 0 : 5)));
    f.step(.1); assert.equal(f.s().rewardSerial, 2);
    f.s().next(); assert.equal(f.profile.stones, debug ? 0 : 10 + config.waves[0].stonesReward);
  }
});

test('visual pool caps never cap temporary rewards, and death forfeits only the unbanked wave', () => {
  const f = fixture(); f.start();
  f.profile.stones = 900; f.store.setState({ runStones: 200 });
  const dead = Array.from({ length: 80 }, (_, index) => ({ ...f.s().enemies[0], id: 'bulk-' + index, hp: 0 }));
  f.s().awardKills(dead);
  assert.equal(f.profile.stones, 900); assert.equal(f.s().runStones, 200); assert.equal(f.s().pendingStones, 400);
  assert.equal(f.s().rewardSerial, 80); assert.equal(f.s().rewardEvents.length, 64);
  f.store.setState({ hp: 0 }); f.step(.05);
  assert.equal(f.s().phase, 'lost'); assert.equal(f.s().pendingStones, 0);
  assert.equal(f.profile.stones, 900); assert.equal(f.s().runStones, 200); assert.deepEqual(f.s().rewardEvents, []);
  f.s().exit(); f.start(); assert.equal(f.s().rewardSerial, 0); assert.equal(f.s().pendingStones, 0);
});

test('exit and debug reset forfeit unbanked rewards while settled waves stay in the profile', () => {
  for (const action of ['exit-wave', 'exit-clear', 'debug-wave', 'debug-spawn']) {
    const f = fixture(); f.start(); readyCoin(f, 60); f.s().next();
    assert.equal(f.profile.stones, 60);
    f.store.setState({ pendingStones: 25 });
    if (action === 'exit-clear') f.store.setState({ phase: 'clear' });
    if (action.startsWith('exit')) f.s().exit();
    else if (action === 'debug-wave') f.s().debugWave(3);
    else f.s().debugSpawn('fire');
    assert.equal(f.s().pendingStones, 0); assert.equal(f.profile.stones, 60); assert.equal(f.s().runStones, 60);
  }
});

test('all ten configurable wave rewards bank once, with one card each and no score system', () => {
  const f = fixture(); f.start();
  let earned = 0;
  for (let wave = 0; wave < config.waves.length; wave++) {
    assert.ok(Number.isInteger(config.waves[wave].stonesReward) && config.waves[wave].stonesReward > 0);
    f.store.setState({ enemies: [], projectiles: [], queue: [] });
    f.s().finishWave(); f.s().finishWave();
    assert.equal(f.s().pendingStones, config.waves[wave].stonesReward);
    assert.equal(f.profile.stones, earned);
    earned += config.waves[wave].stonesReward; f.s().next();
    assert.equal(f.profile.stones, earned); assert.equal(f.s().runStones, earned);
    assert.equal(f.s().pendingStones, 0); assert.equal(Object.hasOwn(f.s(), 'score'), false);
  }
  assert.equal(f.s().phase, 'won'); assert.equal(Object.keys(f.profile.mageCards).length, 10);
  f.s().next(); assert.equal(f.profile.stones, earned);
});
