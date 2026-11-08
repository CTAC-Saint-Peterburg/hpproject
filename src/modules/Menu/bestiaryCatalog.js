import { ENEMY_TYPES } from '../../static/enemies.js';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants.js';
import { cards, defenseConfig, potionTypes, shopItems } from '../../static/themedConfigs.js';
import brewing from '../../static/brewing.json' with { type: 'json' };

const allSpells = Array.from({ length: 10 }, (_, index) => index + 1);
const entry = (id, category, name, description, interaction, ineffective, spells, model, values = {}) =>
  ({ id, category, name, description, interaction, ineffective, spells, model, values });

export const bestiaryEntries = [
  ...Object.entries(ENEMY_TYPES).map(([type, enemy]) => ({
    ...entry('brewing-' + type, 'brewing', enemy.name, 'bestiary.' + type,
      type === 'enemyslime' ? 'bestiary.slimeInteraction' : 'bestiary.enemyInteraction',
      type === 'enemyslime' ? 'bestiary.slimeWrong' : 'bestiary.brewingWrong',
      type === 'enemyslime' ? allSpells : [enemy.counterSpell], { kind: 'brewingEnemy', type },
      { cooldown: brewing.slimeRespawnCooldownSeconds ?? 30 }),
    dynamicSpells: type === 'enemyslime',
  })),
  ...Object.entries(defenseConfig.enemies).map(([type, enemy]) => entry('defense-' + type, 'defense', enemy.name,
    'bestiary.arena.' + type, 'bestiary.enemyInteraction', 'bestiary.arenaWrong',
    enemy.counterSpells ?? [enemy.counterSpell], { kind: 'arenaEnemy', type })),
  entry('cauldron', 'items', 'bestiary.cauldron', 'bestiary.cauldronDescription',
    'bestiary.cauldronInteraction', 'bestiary.cauldronWrong', [1, 2, brewing.stirSpell], { kind: 'pot', id: 'pot_default' }),
  ...SPAWN_BOTTLES_CORDS.map(ingredient => entry('ingredient-' + ingredient.id, 'items', 'ingredients.' + ingredient.id,
    ingredient.id > 4 ? 'bestiary.decoyIngredientDescription' : 'bestiary.ingredientDescription', 'bestiary.ingredientInteraction', 'bestiary.ingredientWrong',
    [brewing.liftSpell, brewing.dropSpell], { kind: 'ingredient', id: ingredient.id },
    { bonus: brewing.ingredientTimeBonusSeconds ?? 5 })),
  ...potionTypes.map(potion => entry('potion-' + potion.id, 'items', potion.name, potion.description,
    'bestiary.potionInteraction', 'bestiary.potionWrong', [3], { kind: 'potion', id: potion.id })),
  entry('crystal', 'items', 'bestiary.crystal', 'bestiary.crystalDescription',
    'bestiary.crystalInteraction', 'bestiary.crystalWrong', [1, 2], { kind: 'crystal', id: 'crystal_default' }),
  entry('coin', 'items', 'bestiary.coin', 'arena.coinRules', 'bestiary.coinInteraction',
    'bestiary.coinWrong', allSpells, { kind: 'coin' }),
  ...[['brewingCold', 'enemycold'], ['brewingFire', 'enemyfire']].map(([type, enemy]) =>
    entry('projectile-' + type, 'items', 'bestiary.projectile.' + type, 'bestiary.brewingShotDescription',
      'bestiary.brewingShotInteraction', 'bestiary.brewingShotWrong', [], { kind: 'projectile', type },
      { delta: ENEMY_TYPES[enemy].temperatureDelta })),
  ...[['fire', 'flyerFire'], ['frost', 'flyerFrost']].map(([type, enemy]) =>
    entry('projectile-' + type, 'items', 'bestiary.projectile.' + type, 'bestiary.slowShotDescription',
      'bestiary.slowShotInteraction', 'bestiary.slowShotWrong', [defenseConfig.enemies[enemy].counterSpell],
      { kind: 'projectile', type })),
  entry('projectile-sentinel', 'items', 'bestiary.projectile.sentinel', 'bestiary.fastShotDescription',
    'bestiary.fastShotInteraction', 'bestiary.fastShotWrong', [], { kind: 'projectile', type: 'sentinel' }),
  ...shopItems.map(item => entry('equipment-' + item.id, 'items', item.name, item.description,
    'bestiary.equipment.' + item.type, item.type === 'wand' ? 'bestiary.wandWrong' : 'bestiary.skinWrong',
    item.type === 'pot' ? [1, 2, brewing.stirSpell] : item.type === 'crystal' ? [1, 2] : [],
    { kind: item.type, id: item.id }, {
      ...item.effects,
      chance: Math.round((item.effects?.instantKillChance ?? 0) * 100),
      radius: item.effects?.splashRadius ?? 0,
      percent: Math.round((item.effects?.splashMultiplier ?? 0) * 100),
    })),
  entry('stones', 'items', 'hud.stones', 'bestiary.stonesDescription', 'bestiary.stonesInteraction',
    'bestiary.rewardWrong', [], { kind: 'coin', id: 'stones' }),
  ...cards.map(card => entry('card-' + card.id, 'items', card.name, card.description,
    'bestiary.cardInteraction', 'bestiary.rewardWrong', [], { kind: 'card', id: card.id })),
];
