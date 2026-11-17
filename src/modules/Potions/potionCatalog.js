import potions from '../../static/potions.json' with { type: 'json' };
import qualities from '../../static/potionQuality.json' with { type: 'json' };

export const starterPotionIds = ['frost', 'flame', 'echo', 'healing'];
export const potionIds = [...starterPotionIds, ...potions.map(potion => potion.id).filter(id=>!starterPotionIds.includes(id))];
export function potionPrice(potion, quality = potion?.purchaseQuality ?? 'basic') {
  const factor = qualities.qualities[quality]?.priceMultiplier;
  return Number.isInteger(potion?.price) && potion.price >= 0 && Number.isFinite(factor)
    ? Math.ceil(potion.price * factor) : null;
}
