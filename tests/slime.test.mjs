import { prepareStoreSource } from './loadGameStore.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { randomSlimeSpells, enemyPosition, isPotBlocked, ENEMY_TYPES } from '../src/static/enemies.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
let source = read('src/modules/Stores/GameStore.js');
source = source.replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
  .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href))
  .replace("'../../static/enemies'", JSON.stringify(new URL('../src/static/enemies.js', import.meta.url).href))
  .replace(/import (\w+) from '([^']+\.json)';/g, (_, name, path) => 'const ' + name + ' = ' + read('src/static/' + path.split('/').at(-1)) + ';');
globalThis.window = {localStorage:{getItem:()=>null,setItem:()=>{}}};
const {useGameStore: store} = await import('data:text/javascript;base64,' + Buffer.from(prepareStoreSource(source)).toString('base64'));
const s = () => store.getState();

test('slime draws three distinct spells from the full pool and reaches the cauldron', () => {
  const seen = new Set();
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i=0; i<200; i++) {
    const spells = randomSlimeSpells(random);
    assert.equal(new Set(spells).size, 3);
    spells.forEach(id => { assert.ok(id >= 1 && id <= 10); seen.add(id); });
  }
  assert.equal(seen.size, 10);
  const slime = {type:'enemyslime', bornAt:0, entrySide:-1};
  assert.ok(enemyPosition(slime, 0, 10, 8)[0] < -5);
  const arrived = enemyPosition(slime, 5000, 10, 8);
  assert.ok(Math.abs(arrived[0]) < 1e-8 && Math.abs(arrived[1]) < 1e-8);
  assert.equal(arrived[2], 1);
  assert.equal(isPotBlocked([slime],4999), false);
  assert.equal(isPotBlocked([slime],5000), true);
});

test('slime blocks brewing, takes three matching spells in any order, and never shoots', () => {
  const realNow = Date.now;
  let now = 10000;
  Date.now = () => now;
  try {
    s().beginMission('level_01'); store.setState({nextEnemyAt:null});
    s().spawnEnemy('enemycold', true); s().spawnEnemy('enemyfire', true);
    assert.equal(s().spawnEnemy('enemyslime',true),true);
    assert.equal(s().spawnEnemy('enemyslime',true),false);
    const slime = s().enemies.find(e=>e.type==='enemyslime');
    assert.equal(slime.remainingSpells.length,3);
    assert.ok(!('nextShotAt' in slime));
    // Isolate the slime to check it has no shots, independently of corner enemies.
    store.setState({enemies:[{...slime,remainingSpells:[1,4,10]}]});
    s().addIngredient(1); assert.equal(s().currentStage,1); // Still approaching.
    now += ENEMY_TYPES.enemyslime.approachMs;
    s().tick(now);
    const score = s().score;
    s().addIngredient(2); assert.equal(s().currentStage,1); assert.equal(s().score,score);
    assert.equal(s().mistakes,0);
    s().togglePotSelected(); assert.equal(s().isPotSelected,false);
    s().changePotTemperature(1); assert.equal(s().heatLevel,0);
    assert.equal(s().projectiles.length,0);
    s().selectEnemy(slime.id);
    s().setCurrentSpell(2); assert.deepEqual(s().enemies[0].remainingSpells,[1,4,10]);
    assert.equal(s().spellCast,null);
    s().setCurrentSpell(10); assert.deepEqual(s().enemies[0].remainingSpells,[1,4]);
    assert.equal(s().spellCast.target.enemy.id,slime.id);
    const sequence = s().spellCast.sequence;
    s().setCurrentSpell(10); assert.deepEqual(s().enemies[0].remainingSpells,[1,4]);
    assert.equal(s().spellCast.sequence,sequence);
    s().setCurrentSpell(1); assert.deepEqual(s().enemies[0].remainingSpells,[4]);
    s().setCurrentSpell(4); assert.equal(s().enemies.length,0);
    assert.equal(s().selectedEnemyId,null);
    s().togglePotSelected(); s().setCurrentSpell(5);
    s().addIngredient(2); assert.equal(s().currentStage,2);
    s().togglePotSelected(); s().changePotTemperature(1); assert.equal(s().heatLevel,1);
    s().spawnEnemy('enemyslime',true); s().exitToMenu(); assert.equal(s().enemies.length,0);
    assert.equal(s().spawnEnemy('enemyslime',true),false);
    s().beginMission('level_02');
    store.setState({mission:{...s().mission,enemySpawn:{allowed:['enemyslime'],rarity:1,spawnWindow:60}},nextEnemyAt:now});
    s().updateEnemies(now);
    assert.equal(s().enemies[0].type,'enemyslime');
    assert.equal(s().enemiesSpawned,1);
    assert.equal(s().debugUsed,false);
    s().finish(false);
    assert.equal(s().enemies.length,0);
  } finally { Date.now = realNow; }
});
