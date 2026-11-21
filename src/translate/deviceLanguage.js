export const supportedLanguages = ['ru', 'en', 'zh', 'es', 'fr'];

export function resolveDeviceLanguage(saved, preferred = []) {
  const supported = value => {
    if (typeof value !== 'string') return null;
    const base = value.trim().toLowerCase().split(/[-_]/)[0];
    return supportedLanguages.includes(base) ? base : null;
  };
  return supported(saved) || preferred.map(supported).find(Boolean) || 'en';
}
