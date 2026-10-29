import rawShop from './shop.json' with { type: 'json' };
import rawPotions from './potions.json' with { type: 'json' };
import rawCards from './cards.json' with { type: 'json' };
import rawDefense from './defense.json' with { type: 'json' };
import rawEffects from './spellEffects.json' with { type: 'json' };
import rawMenu from './menu.json' with { type: 'json' };
import { resolveThemeColors } from './theme.js';

export const shopItems = resolveThemeColors(rawShop);
export const potionTypes = resolveThemeColors(rawPotions);
export const cards = resolveThemeColors(rawCards);
export const defenseConfig = resolveThemeColors(rawDefense);
export const effects = resolveThemeColors(rawEffects);
export const menuConfig = resolveThemeColors(rawMenu);
