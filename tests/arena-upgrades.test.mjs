import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStoreSource } from './loadGameStore.mjs';
import { arenaLoadoutSettings } from '../src/modules/Stores/arenaUpgrades.js';
import { POTION_IDS, addPotionInventory, consumePotionEntry, potionCount } from '../src/modules/Stores/potionInventory.js';
import { shopItems } from '../src/static/themedConfigs.js';

let serial = 0;
async function fixture(savedState = {}) {
  const saved = new Map([['hpproject-save-v1', JSON.stringify({ state: savedState, version: 0 })]]);
  globalThis.window = { localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) } };
  const source = prepareStoreSource()
    .replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href));
  const { useGameStore: store } = await import('data:text/javascript;base64,' + Buffer.from(source + '\n// upgrades ' + serial++).toString('base64'));
  return { store, s: () => store.getState(), saved };
}

test('loadout upgrades grant a fourth optional slot and replacement copy tiers only when owned', () => {
  assert.deepEqual(arenaLoadoutSettings(), { slots: 3, copies: 1 });
  assert.deepEqual(arenaLoadoutSettings({ ownedItems: {} }), { slots: 3, copies: 1 });
  assert.deepEqual(arenaLoadoutSettings({ ownedItems: ['upgrade_potion_copies_3'] }), { slots: 3, copies: 1 });
  assert.deepEqual(arenaLoadoutSettings({ ownedItems: ['upgrade_potion_slot', 'upgrade_potion_copies_2'] }), { slots: 4, copies: 2 });
  assert.deepEqual(arenaLoadoutSettings({ ownedItems: ['upgrade_potion_slot', 'upgrade_potion_copies_2', 'upgrade_potion_copies_3'] }), { slots: 4, copies: 3 });
  assert.equal(shopItems.find(item => item.id === 'upgrade_potion_slot').price, 3000);
  assert.equal(shopItems.find(item => item.id === 'upgrade_potion_copies_2').price, 4500);
  assert.equal(shopItems.find(item => item.id === 'upgrade_potion_copies_3').price, 9000);
});

test('upgrade purchases charge once, enforce prerequisites, apply automatically and survive rehydration', async () => {
  const f = await fixture({ stones: 16500 });
  assert.equal(f.s().buyItem('upgrade_potion_copies_3'), 'shop.upgradeRequirement');
  assert.equal(f.s().stones, 16500);
  const equipped = { ...f.s().equippedItems };
  for (const id of ['upgrade_potion_slot', 'upgrade_potion_copies_2', 'upgrade_potion_copies_3']) {
    assert.equal(f.s().buyItem(id), 'shop.upgradePurchased');
    assert.equal(f.s().buyItem(id), 'shop.owned');
    assert.equal(f.s().equipItem(id), 'shop.invalid');
  }
  assert.equal(f.s().stones, 0);
  assert.deepEqual(f.s().equippedItems, equipped);
  assert.deepEqual(arenaLoadoutSettings(f.s()), { slots: 4, copies: 3 });
  const reloaded = await fixture(JSON.parse(f.saved.get('hpproject-save-v1')).state);
  assert.deepEqual(arenaLoadoutSettings(reloaded.s()), { slots: 4, copies: 3 });
  assert.equal(reloaded.s().stones, 0);
  assert.deepEqual(reloaded.s().equippedItems, equipped);
});

test('insufficient balance and invalid upgrade prices cannot create ownership or spend stones', async () => {
  const f = await fixture({ stones: 2999 });
  assert.equal(f.s().buyItem('upgrade_potion_slot'), 'shop.insufficient');
  assert.equal(f.s().ownedItems.includes('upgrade_potion_slot'), false);
  const upgrade = shopItems.find(item => item.id === 'upgrade_potion_slot'), price = upgrade.price;
  try {
    upgrade.price = -.5;
    assert.equal(f.s().buyItem(upgrade.id), 'shop.invalid');
    assert.equal(f.s().stones, 2999);
  } finally { upgrade.price = price; }
});

test('four-type entry is atomic and reports the consumed quality while spending only one global bottle per type', async () => {
  let inventory = addPotionInventory({}, POTION_IDS, 'masterwork');
  inventory = addPotionInventory(inventory, ['frost'], 'basic');
  inventory = addPotionInventory(inventory, ['flame'], 'fine');
  const f = await fixture({ stones: 3000, potionInventory: inventory });
  assert.equal(f.s().consumeEntryPotions(POTION_IDS), false);
  assert.deepEqual(f.s().potionInventory, inventory);
  assert.equal(f.s().buyItem('upgrade_potion_slot'), 'shop.upgradePurchased');
  const entry = f.s().consumeEntryPotions(POTION_IDS);
  assert.deepEqual(entry.qualities, { frost: 'basic', flame: 'fine', echo: 'masterwork', healing: 'masterwork' });
  assert.deepEqual(entry.consumed, entry.qualities);
  for (const id of POTION_IDS) assert.equal(potionCount(f.s().potionInventory, id), potionCount(inventory, id) - 1);
  const after = structuredClone(f.s().potionInventory);
  assert.equal(f.s().consumeEntryPotions(POTION_IDS), false);
  assert.deepEqual(f.s().potionInventory, after);
  assert.ok(consumePotionEntry(inventory, POTION_IDS.slice(0, 3), 4), 'fourth slot must not force four selected types');
});

test('invalid entry lists do not mutate inventory and persisted upgrade ownership does not become equipment', async () => {
  const inventory = addPotionInventory({}, POTION_IDS);
  for (const ids of [[], ['frost', 'flame'], ['frost', 'frost', 'flame'], [...POTION_IDS, 'frost']]) {
    const before = structuredClone(inventory);
    assert.equal(consumePotionEntry(inventory, ids, 4), null);
    assert.deepEqual(inventory, before);
  }
  const f = await fixture({ ownedItems: ['upgrade_potion_slot', 'upgrade_potion_copies_2', 'unknown'],
    equippedItems: { wand: 'upgrade_potion_slot' }, potionInventory: inventory });
  assert.deepEqual(arenaLoadoutSettings(f.s()), { slots: 4, copies: 2 });
  assert.equal(f.s().equippedItems.wand, 'wand_default');
  assert.equal(Object.hasOwn(f.s().equippedItems, 'upgrade'), false);
  assert.equal(f.s().ownedItems.includes('unknown'), false);
});
