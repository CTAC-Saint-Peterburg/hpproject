import { potionIds, starterPotionIds } from '../Potions/potionCatalog.js';
export const POTION_IDS = potionIds;
export const POTION_QUALITIES = ['basic', 'fine', 'masterwork'];

const validCount = value => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

export function potionQualities(inventory, id) {
  const value = inventory?.[id];
  // Bottles brewed before qualities existed retain their full quantity.
  if (typeof value === 'number') return { basic: 0, fine: validCount(value), masterwork: 0 };
  return Object.fromEntries(POTION_QUALITIES.map(quality => [quality, validCount(value?.[quality])]));
}

export function normalizePotionInventory(inventory) {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return {};
  return Object.fromEntries(POTION_IDS.filter(id => Object.hasOwn(inventory, id))
    .map(id => [id, potionQualities(inventory, id)]));
}

export function potionCount(inventory, id) {
  if (!POTION_IDS.includes(id)) return 0;
  return Object.values(potionQualities(inventory, id)).reduce((sum, count) => sum + count, 0);
}

export function addPotionInventory(inventory, ids, quality = 'fine') {
  const next = normalizePotionInventory(inventory);
  if (!POTION_QUALITIES.includes(quality) || !Array.isArray(ids)) return next;
  for (const id of ids) {
    if (!POTION_IDS.includes(id)) continue;
    next[id] = potionQualities(next, id);
    next[id][quality]++;
  }
  return next;
}

export function consumePotionEntry(inventory, ids, slots = 3) {
  const maxSlots = slots === 4 ? 4 : 3;
  if (!Array.isArray(ids)) return null;
  const selections = ids.map(item => typeof item === 'string' ? { id: item } : item);
  if (ids.length < 3 || ids.length > maxSlots || new Set(selections.map(item => item?.id)).size !== ids.length ||
      selections.some(item => !item || !POTION_IDS.includes(item.id) || potionCount(inventory, item.id) < 1 ||
        item.quality !== undefined && (!POTION_QUALITIES.includes(item.quality) || !potionQualities(inventory,item.id)[item.quality]))) return null;
  const next = normalizePotionInventory(inventory), consumed = {};
  // Save the rarest bottles until last. Upgrades duplicate this consumed quality
  // inside the arena; they never remove extra bottles from the profile.
  for (const {id, quality: chosen} of selections) {
    const quality = chosen ?? POTION_QUALITIES.find(key => next[id][key] > 0);
    next[id][quality]--;
    consumed[id] = quality;
  }
  return { inventory: next, consumed, qualities: consumed };
}

export function resolvePotionProfile(saved) {
  const existing = saved && typeof saved === 'object' && !Array.isArray(saved);
  return {
    potionInventory: existing ? normalizePotionInventory(saved.potionInventory) : addPotionInventory({}, starterPotionIds),
    firstVisitGranted: true,
    showFirstVisitWelcome: !existing,
  };
}
