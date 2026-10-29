import assert from 'node:assert/strict';
import test from 'node:test';
import {
  POTION_IDS, POTION_QUALITIES, normalizePotionInventory, potionCount,
  addPotionInventory, consumePotionEntry, resolvePotionProfile,
} from '../src/modules/Stores/potionInventory.js';

test('first visit grants four different potions without touching stones and never refills an existing profile', () => {
  const first = resolvePotionProfile();
  assert.equal(first.firstVisitGranted, true);
  assert.equal(first.showFirstVisitWelcome, true);
  assert.equal(Object.hasOwn(first, 'stones'), false);
  for (const id of POTION_IDS) assert.deepEqual(first.potionInventory[id], { basic: 0, fine: 1, masterwork: 0 });
  const consumed = consumePotionEntry(first.potionInventory, POTION_IDS.slice(0, 3));
  const saved = resolvePotionProfile({ potionInventory: consumed.inventory, firstVisitGranted: true });
  assert.equal(saved.showFirstVisitWelcome, false);
  assert.equal(potionCount(saved.potionInventory, 'frost'), 0);
  assert.equal(potionCount(saved.potionInventory, 'healing'), 1);
  assert.deepEqual(resolvePotionProfile({ stones: 31 }).potionInventory, {});
});

test('numeric legacy saves migrate to fine quality without losing bottles or awarding a starter grant', () => {
  const migrated = resolvePotionProfile({ potionInventory: { frost: 7, flame: 2, echo: 0 }, stones: 120 });
  assert.deepEqual(migrated.potionInventory, {
    frost: { basic: 0, fine: 7, masterwork: 0 }, flame: { basic: 0, fine: 2, masterwork: 0 },
    echo: { basic: 0, fine: 0, masterwork: 0 },
  });
  assert.equal(migrated.showFirstVisitWelcome, false);
  assert.equal(potionCount(migrated.potionInventory, 'healing'), 0);
  assert.deepEqual(normalizePotionInventory({ frost: -4, fake: 90, flame: { basic: 1.9, fine: NaN, masterwork: -2 } }), {
    frost: { basic: 0, fine: 0, masterwork: 0 }, flame: { basic: 1, fine: 0, masterwork: 0 },
  });
});

test('crafted quality increments independently and entry consumes the lowest quality of three distinct recipes atomically', () => {
  let inventory = addPotionInventory({}, POTION_IDS, 'masterwork');
  inventory = addPotionInventory(inventory, ['frost'], 'fine');
  inventory = addPotionInventory(inventory, ['frost'], 'basic');
  assert.equal(potionCount(inventory, 'frost'), 3);
  const original = structuredClone(inventory);
  assert.equal(consumePotionEntry(inventory, ['frost', 'frost', 'flame']), null);
  assert.equal(consumePotionEntry(inventory, ['frost', 'flame', 'unknown']), null);
  assert.deepEqual(inventory, original);
  const result = consumePotionEntry(inventory, ['frost', 'flame', 'echo']);
  assert.deepEqual(result.consumed, { frost: 'basic', flame: 'masterwork', echo: 'masterwork' });
  assert.equal(result.inventory.frost.basic, 0);
  assert.equal(result.inventory.frost.fine, 1);
  assert.equal(result.inventory.frost.masterwork, 1);
  assert.equal(potionCount(result.inventory, 'healing'), 1);
  assert.deepEqual(inventory, original);
  assert.equal(POTION_QUALITIES.length, 3);
});
