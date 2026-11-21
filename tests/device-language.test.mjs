import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeviceLanguage } from '../src/translate/deviceLanguage.js';

test('first launch follows supported system locales, regions and preference order', () => {
  for (const [locales, expected] of [[['fr-CA'], 'fr'], [['ru-RU'], 'ru'], [['zh-Hant-TW'], 'zh'],
    [['es_MX'], 'es'], [['EN-us'], 'en'], [['de-DE', 'es-ES', 'fr'], 'es'], [[], 'en']]) {
    assert.equal(resolveDeviceLanguage(null, locales), expected);
  }
});
test('manual preference wins; invalid storage and unsupported locales fall back safely', () => {
  assert.equal(resolveDeviceLanguage('ru', ['en-US']), 'ru');
  assert.equal(resolveDeviceLanguage('invalid', ['fr-FR']), 'fr');
  assert.equal(resolveDeviceLanguage('', [undefined, null, 'de-DE']), 'en');
});
