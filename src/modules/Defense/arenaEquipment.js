import { shopItems } from '../../static/themedConfigs.js';

export function equippedArenaItem(profile, type) {
  const fallback = shopItems.find(item => item.type === type && item.default);
  const chosen = shopItems.find(item => item.type === type && item.id === profile?.equippedItems?.[type]);
  return chosen && (chosen.default || Array.isArray(profile?.ownedItems) && profile.ownedItems.includes(chosen.id)) ? chosen : fallback;
}

export function wandEffects(id) {
  const effects = shopItems.find(item => item.id === id && item.type === 'wand')?.effects ?? {};
  const positive = value => Number.isFinite(value) ? Math.max(0, value) : 0;
  return {
    damageBonus: positive(effects.damageBonus),
    instantKillChance: Math.min(1, positive(effects.instantKillChance)),
    splashRadius: positive(effects.splashRadius),
    splashMultiplier: positive(effects.splashMultiplier),
    autoCounter: effects.autoCounter === true,
  };
}

export function enemyDistance(first, second) {
  return Math.hypot(first.x - second.x, first.z - second.z,
    (first.y + first.size * .6) - (second.y + second.size * .6));
}
