import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/^\uFEFF/, '');
// Resolve browser JSON imports for Node without changing application code.
let source = read('src/modules/Stores/GameStore.js');
source = source.replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
  .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href))
  .replace("'../../static/enemies'", JSON.stringify(new URL('../src/static/enemies.js', import.meta.url).href))
  .replace(/import missions from .*?;/, 'const missions = ' + read('src/static/missions.json') + ';')
  .replace(/import achievements from .*?;/, 'const achievements = ' + read('src/static/achievements.json') + ';');
const saved = new Map();
globalThis.window = { localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) } };
const { useGameStore: store } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const s = () => store.getState();

test('enemy spawn, attacks, counterspells, limits and mission cleanup', () => {
  const realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  const start = () => { s().beginMission('level_01'); store.setState({ nextEnemyAt: null }); };
  try {
    start();
    assert.equal(s().spawnEnemy('unknown', true), false);
    assert.equal(s().spawnEnemy('enemycold', true), true);
    const cold = s().enemies[0];
    assert.equal(s().debugUsed, true);
    assert.equal(s().spawnEnemy('enemyfire', true), true);
    assert.notEqual(s().enemies[0].side, s().enemies[1].side);
    assert.equal(s().spawnEnemy('enemycold', true), false);
    s().selectEnemy(cold.id);
    assert.equal(s().isPotSelected, false);
    s().setCurrentSpell(2);
    assert.equal(s().enemies.length, 2);
    s().setCurrentSpell(1);
    assert.equal(s().enemies.length, 1);
    assert.equal(s().selectedEnemyId, null);
    s().selectEnemy(s().enemies[0].id);
    s().setCurrentSpell(2);
    assert.equal(s().enemies.length, 0);

    for (const [type, expected] of [['enemycold', 45], ['enemyfire', 75]]) {
      start();
      s().spawnEnemy(type, true);
      now = s().enemies[0].nextShotAt;
      s().updateEnemies(now);
      assert.equal(s().projectiles.length, 1);
      const shot = s().projectiles[0];
      store.setState({ potTemperature: 60 });
      now = shot.impactAt - 1;
      s().updateEnemies(now);
      assert.equal(s().potTemperature, 60);
      now++;
      s().updateEnemies(now);
      assert.equal(s().potTemperature, expected);
      s().updateEnemies(now);
      assert.equal(s().potTemperature, expected);
      assert.equal(s().heatLevel, 0);
    }

    start();
    s().spawnEnemy('enemyfire', true);
    now = s().enemies[0].nextShotAt;
    s().updateEnemies(now);
    s().selectEnemy(s().enemies[0].id);
    s().setCurrentSpell(2);
    assert.equal(s().enemies.length, 0);
    assert.equal(s().projectiles.length, 1); // A launched projectile survives its owner.
    s().exitToMenu();
    assert.equal(s().projectiles.length, 0);
    assert.equal(s().enemies.length, 0);
    assert.equal(s().spawnEnemy('enemycold', true), false);

    s().beginMission('level_01');
    assert.equal(s().debugUsed, false);
    now = s().nextEnemyAt;
    s().updateEnemies(now);
    assert.equal(s().enemies.length, 1);
    assert.equal(s().enemies[0].type, 'enemycold');
    assert.equal(s().debugUsed, false);
    now = s().nextEnemyAt;
    s().updateEnemies(now);
    assert.equal(s().enemies.length, 2);
    store.setState({ enemies: [], projectiles: [] });
    now += 100000;
    s().updateEnemies(now);
    assert.equal(s().enemies.length, 0); // Mission rarity budget exhausted.

    start();
    store.setState({ mission: { ...s().mission, enemySpawn: { allowed: [], rarity: 10 } }, nextEnemyAt: now });
    s().updateEnemies(now);
    assert.equal(s().enemies.length, 0);

    s().beginMission('level_02');
    s().spawnEnemy('enemycold', true);
    now = s().deadline + 1;
    s().tick(now);
    assert.equal(s().status, 'lost');
    assert.equal(s().enemies.length, 0);
    assert.equal(s().projectiles.length, 0);
    s().updateEnemies(now + 10000);
    assert.equal(s().enemies.length, 0);

    start();
    s().spawnEnemy('enemyfire', true);
    for (let i = 0; i < 4; i++) s().debugAdvance();
    assert.equal(s().reward, 0);
    assert.equal(s().enemies.length, 0);
    assert.equal(s().projectiles.length, 0);
  } finally { Date.now = realNow; }
});
