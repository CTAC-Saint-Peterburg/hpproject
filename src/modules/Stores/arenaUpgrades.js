import { shopItems } from '../../static/themedConfigs.js';

// Permanent upgrades are additive ownership, never an equipped cosmetic slot.
// Copy tiers replace one another; owning both x2 and x3 still grants x3.
export function arenaLoadoutSettings(profile = {}) {
  const owned = new Set(Array.isArray(profile?.ownedItems) ? profile.ownedItems : []);
  let slots = 3, copies = 1;
  for (const item of shopItems) {
    if (item.type !== 'upgrade' || !owned.has(item.id) || item.requires && !owned.has(item.requires)) continue;
    if (Number.isInteger(item.effects?.potionSlots)) slots = Math.max(slots, Math.min(4, item.effects.potionSlots));
    if (Number.isInteger(item.effects?.potionCopies)) copies = Math.max(copies, Math.min(3, item.effects.potionCopies));
  }
  return { slots, copies };
}
