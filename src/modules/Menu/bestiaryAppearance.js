import { ENEMY_TYPES } from '../../static/enemies.js';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants.js';
import { cards, defenseConfig, potionTypes, shopItems } from '../../static/themedConfigs.js';
import { theme } from '../../static/theme.js';

export function bestiaryColor(model) {
  if (model.kind === 'brewingEnemy') return ENEMY_TYPES[model.type]?.color;
  if (model.kind === 'arenaEnemy') return defenseConfig.enemies[model.type]?.color;
  if (model.kind === 'ingredient') return SPAWN_BOTTLES_CORDS.find(item => item.id === model.id)?.color;
  if (model.kind === 'potion') return potionTypes.find(item => item.id === model.id)?.color;
  if (model.kind === 'card') return cards.find(item => item.id === model.id)?.color;
  if (model.kind === 'coin') return theme.colors.coin;
  if (model.kind === 'projectile') {
    if (model.type === 'brewingCold') return ENEMY_TYPES.enemycold.color;
    if (model.type === 'brewingFire') return ENEMY_TYPES.enemyfire.color;
    return defenseConfig.enemies[model.type === 'frost' ? 'flyerFrost' : model.type === 'sentinel' ? 'sentinel' : 'flyerFire'].color;
  }
  return shopItems.find(item => item.id === model.id)?.color
    ?? (model.kind === 'crystal' ? theme.colors.crystal : theme.colors.potDefault);
}
