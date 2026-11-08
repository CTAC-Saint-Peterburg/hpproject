import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { prepareStoreSource } from './loadGameStore.mjs';
import { ingredientFlightSeconds } from '../src/modules/Ingredients/ingredientAnimation.js';

const brewing = JSON.parse(readFileSync(new URL('../src/static/brewing.json', import.meta.url), 'utf8'));
const stage = id => ({ id, temperature: { min: 20, max: 110 }, stirring: { min: 0, max: 100 }, points_add: 10, points_deduct: 2 });
let serial = 0;

async function fixture(settings = {}) {
  const saved = new Map();
  globalThis.window = { localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) } };
  let source = readFileSync(new URL('../src/modules/Stores/GameStore.js', import.meta.url), 'utf8')
    .replace("import brewing from '../../static/brewing.json';", 'const brewing = ' + JSON.stringify({ ...brewing, ...settings }) + ';');
  source = prepareStoreSource(source)
    .replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href));
  const { useGameStore: store } = await import('data:text/javascript;base64,' + Buffer.from(source + '\n// time-spawn fixture ' + serial++).toString('base64'));
  return { store, s: () => store.getState(), saved };
}

function finishSlime(f) {
  const enemy = f.s().enemies.find(item => item.type === 'enemyslime');
  f.s().selectEnemy(enemy.id);
  for (const spell of enemy.remainingSpells) f.s().setCurrentSpell(spell);
}

test('a correct ingredient adds five seconds exactly once at landing, while errors and debug skips add none', async () => {
  const f = await fixture(), realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  try {
    f.s().beginMission('level_02');
    f.store.setState({ nextEnemyAt: null, mission: { ...f.s().mission, stages: [stage(1), stage(2), stage(3)] } });
    const deadline = f.s().deadline;
    f.s().selectIngredient(1); f.s().setCurrentSpell(3);
    assert.equal(f.s().beginIngredientDrop(1, [.7, 0, 0]), true);
    f.s().addIngredient(1);
    assert.equal(f.s().deadline, deadline);
    now += ingredientFlightSeconds(brewing.ingredientAnimation) * 1000 + 1;
    f.s().tick(now);
    assert.equal(f.s().currentStage, 1);
    assert.equal(f.s().deadline, deadline + 5000);
    assert.equal(f.s().remaining, (deadline + 5000 - now) / 1000);
    now += 1000; f.s().tick(now);
    assert.equal(f.s().deadline, deadline + 5000);
    f.s().addIngredient(6);
    assert.equal(f.s().mistakes, 1);
    assert.equal(f.s().deadline, deadline + 5000);
    f.s().debugAdvance();
    assert.equal(f.s().currentStage, 2);
    assert.equal(f.s().deadline, deadline + 5000);
    f.store.setState({ potTemperature: 90, mission: { ...f.s().mission,
      stages: [stage(1), stage(2), { ...stage(3), temperature: { min: 20, max: 60 } }] } });
    f.s().addIngredient(3);
    assert.equal(f.s().message, 'messages.wrongTemperature');
    assert.equal(f.s().deadline, deadline + 5000);
  } finally { Date.now = realNow; }
});

test('the final accepted ingredient earns its time before victory and timeout cannot be revived by a late ingredient', async () => {
  const f = await fixture(), realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  try {
    f.s().beginMission('level_02');
    f.store.setState({ nextEnemyAt: null, deadline: now + 16000, remaining: 16, mission: { ...f.s().mission, stages: [stage(1)] } });
    f.s().addIngredient(1);
    assert.equal(f.s().status, 'won');
    assert.equal(f.s().remaining, 21);
    assert.equal(f.s().deadline, now + 21000);
    assert.ok(f.s().unlocked.includes('time'));
    f.s().addIngredient(1);
    assert.equal(f.s().deadline, now + 21000);
    f.s().beginMission('level_02');
    f.store.setState({ nextEnemyAt: null, deadline: now + 1000, remaining: 1, mission: { ...f.s().mission, stages: [stage(1)] } });
    now += 1000;
    f.s().addIngredient(1);
    assert.equal(f.s().status, 'lost');
    assert.equal(f.s().remaining, 0);
    assert.equal(f.s().currentStage, 0);
  } finally { Date.now = realNow; }
});

test('unlimited missions stay unlimited and zero ingredient bonus disables additional time', async () => {
  const f = await fixture(), realNow = Date.now;
  Date.now = () => 100000;
  try {
    f.s().beginMission('level_01');
    f.store.setState({ nextEnemyAt: null, mission: { ...f.s().mission, stages: [stage(1), stage(2)] } });
    f.s().addIngredient(1);
    assert.equal(f.s().deadline, null);
    assert.equal(f.s().remaining, null);
    const zero = await fixture({ ingredientTimeBonusSeconds: 0 });
    zero.s().beginMission('level_02');
    zero.store.setState({ nextEnemyAt: null, mission: { ...zero.s().mission, stages: [stage(1), stage(2)] } });
    const deadline = zero.s().deadline;
    zero.s().addIngredient(1);
    assert.equal(zero.s().deadline, deadline);
  } finally { Date.now = realNow; }
});

test('slime respawn cooldown starts only on its final matching hit and blocks normal and debug spawns for thirty seconds', async () => {
  const f = await fixture(), realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  try {
    f.s().beginMission('level_01'); f.store.setState({ nextEnemyAt: null });
    assert.equal(f.s().spawnEnemy('enemyslime'), true);
    assert.equal(f.s().spawnEnemy('enemyslime'), false);
    const enemy = f.s().enemies[0];
    f.store.setState({ enemies: [{ ...enemy, remainingSpells: [1, 4, 10] }] });
    f.s().selectEnemy(enemy.id);
    f.s().setCurrentSpell(2);
    assert.equal(f.s().slimeRespawnAt, null);
    f.s().setCurrentSpell(1); f.s().setCurrentSpell(4);
    assert.equal(f.s().slimeRespawnAt, null);
    f.s().setCurrentSpell(10);
    assert.equal(f.s().enemies.length, 0);
    assert.equal(f.s().slimeRespawnAt, now + 30000);
    assert.equal(f.s().spawnEnemy('enemyslime'), false);
    assert.equal(f.s().spawnEnemy('enemyslime', true), false);
    assert.equal(f.s().message, 'messages.slimeCooldown');
    assert.deepEqual(f.s().messageValues, { seconds: 30 });
    now += 29999;
    assert.equal(f.s().spawnEnemy('enemyslime'), false);
    now++;
    assert.equal(f.s().spawnEnemy('enemyslime'), true);
  } finally { Date.now = realNow; }
});

test('a slime on cooldown is excluded from random candidates without delaying other available enemies', async () => {
  const f = await fixture(), realNow = Date.now, realRandom = Math.random;
  Date.now = () => 100000; Math.random = () => 0;
  try {
    f.s().beginMission('level_01'); f.store.setState({ nextEnemyAt: null });
    f.s().spawnEnemy('enemyslime'); finishSlime(f);
    f.store.setState({ nextEnemyAt: 100000, mission: { ...f.s().mission,
      enemySpawn: { allowed: ['enemyslime', 'enemyfire'], rarity: 3, spawnWindow: 60 } } });
    f.s().updateEnemies(100000);
    assert.deepEqual(f.s().enemies.map(enemy => enemy.type), ['enemyfire']);
    assert.equal(f.s().enemiesSpawned, 1);
    assert.equal(f.s().nextEnemyAt, 115000);
    f.store.setState({ enemies: [], nextEnemyAt: 100000, mission: { ...f.s().mission,
      enemySpawn: { allowed: ['enemyslime'], rarity: 3, spawnWindow: 60 } } });
    f.s().updateEnemies(100000);
    assert.equal(f.s().enemies.length, 0);
    assert.equal(f.s().enemiesSpawned, 1);
    f.s().updateEnemies(130000);
    assert.equal(f.s().enemies[0].type, 'enemyslime');
    assert.equal(f.s().enemiesSpawned, 2);
  } finally { Date.now = realNow; Math.random = realRandom; }
});

test('pause freezes slime cooldown, and retry, exit and terminal states clear it without persisting it', async () => {
  const f = await fixture(), realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  try {
    f.s().beginMission('level_01'); f.store.setState({ nextEnemyAt: null });
    f.s().spawnEnemy('enemyslime'); finishSlime(f);
    now += 20000;
    f.s().setPaused(true);
    now += 60000;
    assert.equal(f.s().spawnEnemy('enemyslime'), false);
    f.s().setPaused(false);
    assert.equal(f.s().slimeRespawnAt, now + 10000);
    assert.equal(f.s().spawnEnemy('enemyslime'), false);
    assert.equal('slimeRespawnAt' in JSON.parse(f.saved.get('hpproject-save-v1')).state, false);
    now += 10000;
    assert.equal(f.s().spawnEnemy('enemyslime'), true);
    finishSlime(f);
    f.s().beginMission('level_01'); f.store.setState({ nextEnemyAt: null });
    assert.equal(f.s().slimeRespawnAt, null);
    assert.equal(f.s().spawnEnemy('enemyslime'), true);
    finishSlime(f); f.s().exitToMenu();
    assert.equal(f.s().slimeRespawnAt, null);
    f.s().beginMission('level_01'); f.store.setState({ nextEnemyAt: null });
    f.s().spawnEnemy('enemyslime'); finishSlime(f); f.s().finish(false);
    assert.equal(f.s().slimeRespawnAt, null);
  } finally { Date.now = realNow; }
});

test('a zero JSON slime cooldown allows an immediate replacement after death', async () => {
  const f = await fixture({ slimeRespawnCooldownSeconds: 0 }), realNow = Date.now;
  Date.now = () => 100000;
  try {
    f.s().beginMission('level_01'); f.store.setState({ nextEnemyAt: null });
    f.s().spawnEnemy('enemyslime'); finishSlime(f);
    assert.equal(f.s().slimeRespawnAt, 100000);
    assert.equal(f.s().spawnEnemy('enemyslime'), true);
  } finally { Date.now = realNow; }
});
