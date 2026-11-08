import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStoreSource } from './loadGameStore.mjs';
import { shopItems as catalog, potionTypes } from '../src/static/themedConfigs.js';
import { potionCount } from '../src/modules/Stores/potionInventory.js';

const defaults = { wand: 'wand_default', pot: 'pot_default', crystal: 'crystal_default' };
let serial = 0;
async function fixture(savedState) {
  const saved = new Map();
  if (savedState !== undefined) saved.set('hpproject-save-v1', JSON.stringify({ state: savedState, version: 0 }));
  globalThis.window = { localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) } };
  const source = prepareStoreSource()
    .replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href));
  const { useGameStore: store } = await import('data:text/javascript;base64,' + Buffer.from(source + '\n// shop fixture ' + serial++).toString('base64'));
  return { store, s: () => store.getState(), saved };
}

test('permanent catalog has equipment and upgrades while consumables retain separate repeatable prices', () => {
  assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
  for (const item of catalog) {
    assert.ok(Number.isInteger(item.price) && item.price >= 0);
    assert.ok(['wand', 'pot', 'crystal', 'upgrade'].includes(item.type));
    assert.match(item.color, /^#[0-9a-f]{6}$/i);
  }
  for (const type of Object.keys(defaults)) {
    assert.equal(catalog.filter(item => item.type === type && item.default && item.price === 0).length, 1);
  }
  assert.equal(potionTypes.length, 4);
  for (const potion of potionTypes) {
    assert.ok(Number.isInteger(potion.price) && potion.price > 0);
    assert.equal(potion.purchaseQuality, 'basic');
    assert.ok(!catalog.some(item => item.id === potion.id));
  }
});

test('permanent purchases debit once, require ownership to equip and persist all three categories', async () => {
  const { s, saved } = await fixture({ stones: 0, potionInventory: {} });
  assert.equal(s().buyItem('wand_ruby'), 'shop.insufficient');
  assert.equal(s().equipItem('wand_ruby'), 'shop.notOwned');
  assert.equal(s().buyItem('missing'), 'shop.invalid');
  assert.equal(s().equipItem('missing'), 'shop.invalid');
  s().changeStones(200);
  assert.equal(s().buyItem('wand_ruby'), 'shop.purchased');
  assert.equal(s().stones, 120);
  assert.equal(s().buyItem('wand_ruby'), 'shop.owned');
  assert.equal(s().stones, 120);
  assert.equal(s().equippedItems.wand, 'wand_default');
  assert.equal(s().equipItem('wand_ruby'), 'shop.applied');
  assert.equal(s().buyItem('pot_jade'), 'shop.purchased');
  assert.equal(s().stones, 60);
  assert.equal(s().equipItem('pot_jade'), 'shop.applied');
  const crystal = catalog.find(item => item.id === 'crystal_emerald');
  assert.equal(s().equipItem(crystal.id), 'shop.notOwned');
  s().changeStones(crystal.price);
  assert.equal(s().buyItem(crystal.id), 'shop.purchased');
  assert.equal(s().stones, 60);
  assert.equal(s().equipItem(crystal.id), 'shop.applied');
  assert.equal(s().buyItem(crystal.id), 'shop.owned');
  assert.equal(s().buyItem('crystal_default'), 'shop.owned');
  s().beginMission('level_01');
  const equipped = { wand: 'wand_ruby', pot: 'pot_jade', crystal: crystal.id };
  assert.deepEqual(s().equippedItems, equipped);
  s().exitToMenu();
  const reloaded = await fixture(JSON.parse(saved.get('hpproject-save-v1')).state);
  assert.equal(reloaded.s().stones, 60);
  assert.deepEqual(reloaded.s().equippedItems, equipped);
  assert.ok(reloaded.s().ownedItems.includes(crystal.id));
  assert.equal(reloaded.s().equipItem('wand_default'), 'shop.applied');
  assert.equal(reloaded.s().stones, 60);
  assert.equal(reloaded.s().equippedItems.pot, 'pot_jade');
});

test('consumable purchases add one configured quality repeatedly without overdraft or equipment ownership', async () => {
  const potion = potionTypes.find(item => item.id === 'frost');
  const { s, saved } = await fixture({ stones: potion.price * 2, potionInventory: {
    frost: { basic: 2, fine: 3, masterwork: 4 }, flame: 7,
  } });
  const owned = [...s().ownedItems], equipped = { ...s().equippedItems };
  assert.deepEqual(Array.from({ length: 5 }, () => s().buyPotion('frost')),
    ['shop.potionPurchased', 'shop.potionPurchased', 'shop.insufficient', 'shop.insufficient', 'shop.insufficient']);
  assert.equal(s().stones, 0);
  assert.deepEqual(s().potionInventory.frost, { basic: 4, fine: 3, masterwork: 4 });
  assert.equal(potionCount(s().potionInventory, 'flame'), 7);
  assert.deepEqual(s().ownedItems, owned);
  assert.deepEqual(s().equippedItems, equipped);
  assert.equal(s().buyItem('frost'), 'shop.invalid');
  assert.equal(s().equipItem('frost'), 'shop.invalid');
  assert.equal(s().buyPotion('wand_default'), 'shop.invalid');
  assert.equal(s().buyPotion('missing'), 'shop.invalid');
  const reloaded = await fixture(JSON.parse(saved.get('hpproject-save-v1')).state);
  assert.deepEqual(reloaded.s().potionInventory.frost, s().potionInventory.frost);
  assert.equal(reloaded.s().stones, 0);
});

test('all four consumables use their individual configured prices and preserve legacy quality counts', async () => {
  const total = potionTypes.reduce((sum, potion) => sum + potion.price, 0);
  const { s } = await fixture({ stones: total, potionInventory: { echo: 5 } });
  for (const potion of potionTypes) {
    assert.equal(s().buyPotion(potion.id), 'shop.potionPurchased');
    assert.equal(s().potionInventory[potion.id].basic, 1);
  }
  assert.equal(s().stones, 0);
  assert.equal(s().potionInventory.echo.fine, 5);
  assert.equal(potionCount(s().potionInventory, 'echo'), 6);
});

test('legacy equipment migration adds the default crystal without losing purchased items or potion stocks', async () => {
  const oldOwned = ['wand_default', 'pot_default', 'wand_ruby', 'pot_jade'];
  const { s } = await fixture({ stones: 25, ownedItems: oldOwned, equippedItems: { wand: 'wand_ruby', pot: 'pot_jade' },
    potionInventory: { echo: 3 }, records: { level_01: 3 } });
  assert.equal(s().stones, 25);
  assert.deepEqual(s().equippedItems, { wand: 'wand_ruby', pot: 'pot_jade', crystal: 'crystal_default' });
  oldOwned.forEach(id => assert.ok(s().ownedItems.includes(id)));
  assert.ok(s().ownedItems.includes('crystal_default'));
  assert.equal(potionCount(s().potionInventory, 'echo'), 3);
  assert.equal(potionCount(s().potionInventory, 'frost'), 0);
  assert.deepEqual(s().records, { level_01: 3 });
});

test('migration rejects unknown, cross-category and unowned equipped selections while keeping valid ownership', async () => {
  const invalid = await fixture({ stones: 50,
    ownedItems: ['wand_ruby', 'pot_jade', 'crystal_emerald', 'phantom', 'wand_ruby'],
    equippedItems: { wand: 'pot_jade', pot: 'wand_ruby', crystal: 'crystal_emerald', potion: 'frost' } });
  assert.deepEqual(invalid.s().equippedItems, { ...defaults, crystal: 'crystal_emerald' });
  assert.ok(!invalid.s().ownedItems.includes('phantom'));
  assert.equal(new Set(invalid.s().ownedItems).size, invalid.s().ownedItems.length);
  const unowned = await fixture({ ownedItems: [], equippedItems: { wand: 'wand_noob', pot: 'missing', crystal: 'crystal_ice' } });
  assert.deepEqual(unowned.s().equippedItems, defaults);
  assert.deepEqual(unowned.s().ownedItems, Object.values(defaults));
  const malformed = await fixture({ ownedItems: {}, equippedItems: [] });
  assert.deepEqual(malformed.s().equippedItems, defaults);
  assert.deepEqual(malformed.s().ownedItems, Object.values(defaults));
});

test('invalid configured prices and qualities cannot deduct currency or create purchases', async () => {
  const { s } = await fixture({ stones: 10000, potionInventory: {} });
  const item = catalog.find(entry => entry.id === 'wand_ruby');
  const potion = potionTypes[0];
  const itemPrice = item.price, potionPrice = potion.price, quality = potion.purchaseQuality;
  try {
    item.price = -1;
    assert.equal(s().buyItem(item.id), 'shop.invalid');
    item.price = 1.5;
    assert.equal(s().buyItem(item.id), 'shop.invalid');
    potion.price = NaN;
    assert.equal(s().buyPotion(potion.id), 'shop.invalid');
    potion.price = potionPrice;
    potion.purchaseQuality = 'unknown';
    assert.equal(s().buyPotion(potion.id), 'shop.invalid');
    assert.equal(s().stones, 10000);
    assert.equal(potionCount(s().potionInventory, potion.id), 0);
    assert.ok(!s().ownedItems.includes(item.id));
  } finally {
    item.price = itemPrice;
    potion.price = potionPrice;
    potion.purchaseQuality = quality;
  }
});
