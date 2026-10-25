import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spellLessons } from '../src/static/spellLessons.js';
import { ENEMY_TYPES } from '../src/static/enemies.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const languages = ['ru', 'en', 'zh', 'es', 'fr'];
const resources = Object.fromEntries(languages.map(lng => [lng, JSON.parse(read(`src/translate/${lng}.json`))]));

test('all five dictionaries contain every key and the same interpolation variables', () => {
  const keys = Object.keys(resources.ru).sort();
  const params = value => [...value.matchAll(/{{(.*?)}}/g)].map(match => match[1]).sort();
  for (const lng of languages) {
    assert.deepEqual(Object.keys(resources[lng]).sort(), keys);
    for (const key of keys) {
      assert.equal(typeof resources[lng][key], 'string');
      assert.ok(resources[lng][key].trim(), lng + ': ' + key);
      assert.deepEqual(params(resources[lng][key]), params(resources.ru[key]), lng + ': ' + key);
    }
  }
  const missions = JSON.parse(read('src/static/missions.json'));
  const achievements = JSON.parse(read('src/static/achievements.json'));
  const items = JSON.parse(read('src/static/shop.json'));
  const dynamicKeys = [
    ...Object.values(missions).flatMap(m => [m.name, ...m.stages.map(stage => stage.name)]),
    ...achievements.flatMap(a => [a.name, a.description]),
    ...spellLessons.flatMap(lesson => [lesson.name, lesson.effect]),
    ...Object.values(ENEMY_TYPES).map(enemy => enemy.name),
    ...items.flatMap(item => [item.name, item.description]),
  ];
  for (const key of dynamicKeys) assert.ok(resources.ru[key], key);
  // Literal UI and message keys, including translated Zustand notifications.
  for (const file of ['src/modules/Menu/MainMenu.jsx','src/modules/Menu/SpellTraining.jsx','src/modules/Menu/Shop.jsx','src/modules/GameHud.jsx','src/modules/Stores/GameStore.js']) {
    for (const match of read(file).matchAll(/['"]((?:app|menu|time|hud|result|messages|training|help|loading|shop)\.[\w.]+)['"]/g)) {
      if (match[1] === 'shop.category.') continue;
      assert.ok(resources.ru[match[1]], match[1]);
    }
  }
});

test('actual i18n setup switches languages, updates HTML and remembers the choice', async () => {
  const saved = new Map([['hpproject-language', 'fr']]);
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key,value) => saved.set(key,value) };
  globalThis.document = { documentElement: {lang: ''}, title: '' };
  const require = createRequire(import.meta.url);
  let source = read('src/translate/i18n.js');
  source = source.replace("'i18next'", JSON.stringify(pathToFileURL(require.resolve('i18next')).href))
    .replace("'react-i18next'", JSON.stringify(pathToFileURL(require.resolve('react-i18next')).href));
  for (const lng of languages) source = source.replace(`import ${lng} from './${lng}.json';`, `const ${lng} = ${JSON.stringify(resources[lng])};`);
  const {default: i18n} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(i18n.resolvedLanguage, 'fr');
  for (const lng of languages) {
    await i18n.changeLanguage(lng);
    assert.equal(document.documentElement.lang, lng);
    assert.equal(document.title, resources[lng]['app.title']);
    assert.equal(saved.get('hpproject-language'), lng);
    assert.equal(i18n.t('menu.play'), resources[lng]['menu.play']);
    assert.equal(i18n.t('messages.impact', {delta: '+15'}), resources[lng]['messages.impact'].replace('{{delta}}', '+15'));
    for (const count of [0,1,2]) assert.equal(i18n.t('training.repeats', {count}), resources[lng]['training.repeats'].replace('{{count}}', count));
  }
});
