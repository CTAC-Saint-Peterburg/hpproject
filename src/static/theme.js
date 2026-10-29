import theme from './theme.json' with { type: 'json' };

export { theme };

// Configs keep semantic references; only theme.json owns literal colors.
export function resolveThemeColors(value) {
  if (typeof value === 'string' && value.startsWith('@')) {
    const path = value.slice(1).split('.');
    const resolved = path.reduce((node, key) => node?.[key], theme);
    if (resolved === undefined) throw new Error('Unknown theme reference: ' + value);
    return resolved;
  }
  if (Array.isArray(value)) return value.map(resolveThemeColors);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveThemeColors(item)]));
  }
  return value;
}

// The same JSON palette drives HTML/CSS and Three.js materials.
export function installTheme(root = document.documentElement) {
  const kebab = key => key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
  for (const [group, prefix] of [['colors', 'color'], ['fonts', 'font'], ['typography', 'type']]) {
    for (const [name, value] of Object.entries(theme[group])) {
      if (value !== null) root.style.setProperty('--' + prefix + '-' + kebab(name), String(value));
    }
  }
}
