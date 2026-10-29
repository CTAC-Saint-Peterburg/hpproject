import { readFileSync } from 'node:fs';

// Tests instantiate isolated browser stores via data URLs; resolve their imports
// relative to the original module, including Node's required JSON attributes.
export function prepareStoreSource(source = readFileSync(new URL('../src/modules/Stores/GameStore.js', import.meta.url), 'utf8')) {
  const base = new URL('../src/modules/Stores/GameStore.js', import.meta.url);
  return source.replace(/from '([^']+)'(?:\s+with\s*\{[^}]*\})?;/g, (statement, specifier) => {
    if (!specifier.startsWith('.')) return statement;
    const path = /\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js';
    return 'from ' + JSON.stringify(new URL(path, base).href) + (path.endsWith('.json') ? " with { type: 'json' };" : ';');
  });
}
