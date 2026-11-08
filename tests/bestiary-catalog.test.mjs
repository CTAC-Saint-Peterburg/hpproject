import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bestiaryEntries } from '../src/modules/Menu/bestiaryCatalog.js';
import { ENEMY_TYPES } from '../src/static/enemies.js';
import { SPAWN_BOTTLES_CORDS } from '../src/static/constants.js';
import { cards, defenseConfig, potionTypes, shopItems } from '../src/static/themedConfigs.js';

const byId = new Map(bestiaryEntries.map(entry => [entry.id, entry]));

test('bestiary covers both modes and preserves their distinct counterspell rules', () => {
  assert.equal(byId.size, bestiaryEntries.length, 'entry IDs must be unique');
  assert.deepEqual(bestiaryEntries.filter(entry => entry.category === 'brewing').map(entry => entry.model.type), Object.keys(ENEMY_TYPES));
  assert.deepEqual(bestiaryEntries.filter(entry => entry.category === 'defense').map(entry => entry.model.type), Object.keys(defenseConfig.enemies));
  for (const [type, enemy] of Object.entries(ENEMY_TYPES)) {
    const entry = byId.get('brewing-' + type);
    if (type === 'enemyslime') {
      assert.equal(entry.dynamicSpells, true);
      assert.deepEqual(entry.spells, Array.from({ length: 10 }, (_, index) => index + 1));
    } else assert.deepEqual(entry.spells, [enemy.counterSpell]);
  }
  for (const [type, enemy] of Object.entries(defenseConfig.enemies)) {
    assert.deepEqual(byId.get('defense-' + type).spells, enemy.counterSpells ?? [enemy.counterSpell]);
  }
  assert.notDeepEqual(byId.get('brewing-enemyslime').spells, byId.get('defense-moss').spells);
});

test('items include all ingredients, potions, equipment, rewards and every projectile interaction', () => {
  for (const ingredient of SPAWN_BOTTLES_CORDS) assert.equal(byId.get('ingredient-' + ingredient.id).model.id, ingredient.id);
  for (const potion of potionTypes) assert.deepEqual(byId.get('potion-' + potion.id).spells, [3]);
  for (const item of shopItems) assert.equal(byId.get('equipment-' + item.id).model.id, item.id);
  for (const card of cards) assert.equal(byId.get('card-' + card.id).model.id, card.id);
  for (const id of ['cauldron', 'crystal', 'coin', 'stones']) assert.ok(byId.has(id));
  assert.deepEqual(byId.get('projectile-fire').spells, [defenseConfig.enemies.flyerFire.counterSpell]);
  assert.deepEqual(byId.get('projectile-frost').spells, [defenseConfig.enemies.flyerFrost.counterSpell]);
  for (const type of ['brewingCold', 'brewingFire', 'sentinel']) assert.deepEqual(byId.get('projectile-' + type).spells, []);
  const splash = byId.get('equipment-wand_splash');
  assert.equal(splash.values.radius, shopItems.find(item => item.id === 'wand_splash').effects.splashRadius);
});

test('every bestiary description and its interpolation values exist in all five languages', () => {
  for (const language of ['ru', 'en', 'es', 'fr', 'zh']) {
    const dictionary = JSON.parse(readFileSync(new URL('../src/translate/' + language + '.json', import.meta.url), 'utf8'));
    for (const entry of bestiaryEntries) {
      assert.ok(['brewing', 'defense', 'items'].includes(entry.category));
      assert.ok(entry.spells.every(spell => Number.isInteger(spell) && spell >= 1 && spell <= 10));
      for (const field of ['name', 'description', 'interaction', 'ineffective']) {
        const text = dictionary[entry[field]];
        assert.ok(typeof text === 'string' && text.trim(), language + ': ' + entry[field]);
        for (const match of text.matchAll(/{{(.*?)}}/g)) assert.ok(Object.hasOwn(entry.values, match[1]), entry.id + ': missing ' + match[1]);
      }
    }
  }
});
