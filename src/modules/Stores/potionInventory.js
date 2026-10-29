export const POTION_IDS = ['frost', 'flame', 'echo', 'healing'];
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

export function consumePotionEntry(inventory, ids) {
  if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3 ||
      ids.some(id => !POTION_IDS.includes(id) || potionCount(inventory, id) < 1)) return null;
  const next = normalizePotionInventory(inventory), consumed = {};
  // Save the rarest bottles until last. Entry still requires three different recipes.
  for (const id of ids) {
    const quality = POTION_QUALITIES.find(key => next[id][key] > 0);
    next[id][quality]--;
    consumed[id] = quality;
  }
  return { inventory: next, consumed };
}

export function resolvePotionProfile(saved) {
  const existing = saved && typeof saved === 'object' && !Array.isArray(saved);
  return {
    potionInventory: existing ? normalizePotionInventory(saved.potionInventory) : addPotionInventory({}, POTION_IDS),
    firstVisitGranted: true,
    showFirstVisitWelcome: !existing,
  };
}
