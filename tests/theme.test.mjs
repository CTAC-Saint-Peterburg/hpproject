import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { theme, installTheme, resolveThemeColors } from '../src/static/theme.js';
import { shopItems, potionTypes, cards, defenseConfig, effects } from '../src/static/themedConfigs.js';

test('one palette resolves every configurable game color and fails clearly for missing tokens', () => {
  const configs = [shopItems, potionTypes, cards, defenseConfig, effects];
  const check = value => {
    if (Array.isArray(value)) value.forEach(check);
    else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (key === 'color' || key === 'emissive') assert.match(item, /^#[0-9a-f]{6}$/i);
        check(item);
      }
    } else if (typeof value === 'string') assert.ok(!value.startsWith('@'), value);
  };
  configs.forEach(check);
  assert.equal(effects.spells[1].color, theme.colors.spellEffectsSpells1Color);
  assert.throws(() => resolveThemeColors('@colors.missing'), /Unknown theme reference/);
});

test('CSS and Three.js receive the same palette and every CSS theme token exists', () => {
  const properties = new Map();
  installTheme({ style: { setProperty: (key, value) => properties.set(key, value) } });
  assert.equal(properties.get('--color-rune-start'), theme.colors.runeStart);
  assert.equal(properties.get('--font-body'), theme.fonts.body);
  for (const file of ['src/index.css', 'src/App.css']) {
    const css = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    for (const [, name] of css.matchAll(/var\((--(?:color|font|type)-[\w-]+)/g)) {
      assert.ok(properties.has(name), file + ': missing ' + name);
    }
  }
});
