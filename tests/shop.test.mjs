import { prepareStoreSource } from './loadGameStore.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveThemeColors } from '../src/static/theme.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const catalog = resolveThemeColors(JSON.parse(read('src/static/shop.json')));
let source = read('src/modules/Stores/GameStore.js');
source = source.replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
  .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href))
  .replace("'../../static/enemies'", JSON.stringify(new URL('../src/static/enemies.js', import.meta.url).href))
  .replace(/import (\w+) from '([^']+\.json)';/g, (_, name, path) => 'const ' + name + ' = ' + read('src/static/' + path.split('/').at(-1)) + ';');
const saved = new Map();
globalThis.window = { localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key,value) => saved.set(key,value) } };
const {useGameStore: store} = await import('data:text/javascript;base64,' + Buffer.from(prepareStoreSource(source)).toString('base64'));
const s = () => store.getState();

test('catalog has unique IDs, prices, colors and free defaults for both types', () => {
  assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
  for (const item of catalog) {
    assert.ok(Number.isInteger(item.price) && item.price >= 0);
    assert.ok(['wand','pot'].includes(item.type));
    assert.match(item.color, /^#[0-9a-f]{6}$/i);
  }
  for (const type of ['wand','pot']) assert.equal(catalog.filter(item => item.type === type && item.default && item.price === 0).length, 1);
});

test('purchases debit exactly once, protect ownership and persist equipment', async () => {
  assert.equal(s().buyItem('wand_ruby'), 'shop.insufficient');
  assert.equal(s().equipItem('wand_ruby'), 'shop.notOwned');
  assert.equal(s().buyItem('missing'), 'shop.invalid');
  s().changeStones(200);
  assert.equal(s().buyItem('wand_ruby'), 'shop.purchased');
  assert.equal(s().stones, 120);
  assert.equal(s().buyItem('wand_ruby'), 'shop.owned');
  assert.equal(s().stones, 120);
  assert.equal(s().equippedItems.wand, 'wand_default');
  assert.equal(s().equipItem('wand_ruby'), 'shop.applied');
  assert.equal(s().buyItem('pot_jade'), 'shop.purchased');
  assert.equal(s().stones, 60);
  s().equipItem('pot_jade');
  s().beginMission('level_01');
  assert.deepEqual(s().equippedItems, {wand:'wand_ruby', pot:'pot_jade'});
  s().exitToMenu();
  const snapshot = saved.get('hpproject-save-v1');
  store.setState({ownedItems:[], equippedItems:{}});
  saved.set('hpproject-save-v1', snapshot);
  await store.persist.rehydrate();
  assert.equal(s().stones, 60);
  assert.ok(s().ownedItems.includes('wand_ruby'));
  assert.deepEqual(s().equippedItems, {wand:'wand_ruby',pot:'pot_jade'});
  assert.equal(s().equipItem('wand_default'), 'shop.applied');
  assert.equal(s().stones, 60);
  assert.equal(s().equippedItems.pot, 'pot_jade');
  saved.set('hpproject-save-v1', JSON.stringify({state:{stones:25},version:0}));
  const {useGameStore: legacy} = await import('data:text/javascript;base64,' + Buffer.from(prepareStoreSource(source) + '\n// legacy save instance').toString('base64'));
  assert.equal(legacy.getState().stones, 25);
  assert.deepEqual(legacy.getState().equippedItems, {wand:'wand_default',pot:'pot_default'});
  assert.deepEqual(legacy.getState().ownedItems, ['wand_default','pot_default']);
});
