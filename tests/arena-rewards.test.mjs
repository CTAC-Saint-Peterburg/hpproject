import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_REWARD_COINS, MAX_REWARD_EVENTS, REWARD_FLASH_SECONDS, REWARD_COIN_DELAY_SECONDS, REWARD_COIN_FLIGHT_SECONDS, REWARD_COIN_STAGGER_SECONDS, rewardCoinCount, rewardVisualDuration, pendingRewardStones, writeRewardCoinPose, writeRewardFlashPose } from '../src/modules/Defense/rewardMotion.js';

test('visual streams follow reward size, stay bounded and begin after the death flash', () => {
  assert.equal(MAX_REWARD_EVENTS, 64);
  assert.equal(MAX_REWARD_COINS, 128);
  assert.equal(REWARD_COIN_DELAY_SECONDS, REWARD_FLASH_SECONDS);
  assert.equal(rewardCoinCount(0), 0);
  assert.equal(rewardCoinCount(-5), 0);
  assert.equal(rewardCoinCount(NaN), 0);
  assert.equal(rewardCoinCount(1), 3);
  assert.equal(rewardCoinCount(16), 7);
  assert.equal(rewardCoinCount(1e9), 7);
  assert.equal(rewardVisualDuration({ stones: 0 }), REWARD_FLASH_SECONDS);
  for (const stones of [1, 2, 5, 10, 16, 100]) {
    const count = rewardCoinCount(stones);
    assert.ok(count >= 3 && count <= 7);
    assert.equal(rewardVisualDuration({ stones }), REWARD_COIN_DELAY_SECONDS + REWARD_COIN_FLIGHT_SECONDS + (count - 1) * REWARD_COIN_STAGGER_SECONDS);
  }
});

test('display-only pending rewards clear exactly on the final arrival without changing authoritative events', () => {
  const event = Object.freeze({ id: 1, time: .3, stones: 10 });
  const debug = Object.freeze({ id: 2, time: .3, stones: 0 });
  const future = Object.freeze({ id: 3, time: 10, stones: 5 });
  const events = Object.freeze([event, debug, future]);
  const end = event.time + rewardVisualDuration(event);
  assert.equal(pendingRewardStones(events, event.time - .001), 0);
  assert.equal(pendingRewardStones(events, event.time), 10);
  assert.equal(pendingRewardStones(events, end - .000001), 10);
  assert.equal(pendingRewardStones(events, end), 0);
  assert.equal(pendingRewardStones(events, 10), 5);
  assert.equal(pendingRewardStones([], 10), 0);
  assert.equal(event.stones, 10);
});

test('coin paths start at the enemy, arc towards a moving HUD target and end on that exact target', () => {
  const event = { id: 17, time: .3, stones: 10 };
  const output = {};
  for (let index = 0; index < rewardCoinCount(event.stones); index++) {
    const start = event.time + REWARD_COIN_DELAY_SECONDS + index * REWARD_COIN_STAGGER_SECONDS;
    assert.equal(writeRewardCoinPose(event, index, start, -.3, -.2, .7, .9, output), output);
    assert.equal(output.visible, true);
    assert.ok(Math.abs(output.x + .3) < 1e-12);
    assert.ok(Math.abs(output.y + .2) < 1e-12);
    assert.ok(output.scale < 1e-10);
    writeRewardCoinPose(event, index, start + .5, -.3, -.2, .7, .9, output);
    assert.equal(output.visible, true);
    assert.ok(output.y > .35);
    assert.ok(output.scale > .9);
    writeRewardCoinPose(event, index, start + REWARD_COIN_FLIGHT_SECONDS, -.3, -.2, .8, .85, output);
    assert.equal(output.visible, false);
    assert.ok(Math.abs(output.x - .8) < 1e-12);
    assert.ok(Math.abs(output.y - .85) < 1e-12);
  }
  const first = { ...writeRewardCoinPose(event, 0, .9, 0, 0, 1, 1, output) };
  writeRewardCoinPose(event, 1, .9, 0, 0, 1, 1, output);
  assert.notEqual(first.x, output.x);
  assert.deepEqual(writeRewardCoinPose(event, 0, .9, 0, 0, 1, 1, output), first);
});

test('zero-stone kills still flash, then vanish; repeated simulation time freezes the effect', () => {
  const event = { id: 2, time: 3, stones: 0 };
  const output = {};
  writeRewardFlashPose(event, 2.99, output);
  assert.equal(output.visible, false);
  writeRewardFlashPose(event, 3.02, output);
  assert.equal(output.visible, true);
  assert.ok(output.intensity > 1);
  const paused = { ...output };
  assert.deepEqual(writeRewardFlashPose(event, 3.02, output), paused);
  writeRewardFlashPose(event, 3.2, output);
  assert.ok(output.scale > paused.scale);
  assert.ok(output.intensity < paused.intensity);
  writeRewardFlashPose(event, event.time + rewardVisualDuration(event), output);
  assert.equal(output.visible, false);
  assert.equal(output.intensity, 0);
});
