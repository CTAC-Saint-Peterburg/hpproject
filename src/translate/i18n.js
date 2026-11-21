import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import fr from './fr.json';
import { resolveDeviceLanguage } from './deviceLanguage';

export const languages = { ru: 'Русский', en: 'English', zh: '中文', es: 'Español', fr: 'Français' };
let savedLanguage;
try { savedLanguage = localStorage.getItem('hpproject-language'); } catch { /* Storage may be disabled. */ }
const deviceLocales = Array.isArray(window.__HYPED_POT_LOCALES__) ? window.__HYPED_POT_LOCALES__ : [];
const language = resolveDeviceLanguage(savedLanguage, [...deviceLocales, ...(navigator.languages || []), navigator.language]);
i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en }, zh: { translation: zh }, es: { translation: es }, fr: { translation: fr } },
  lng: language, fallbackLng: 'ru', supportedLngs: Object.keys(languages),
  keySeparator: false, interpolation: { escapeValue: false }, initAsync: false,
});
const syncLanguage = lng => {
  document.documentElement.lang = lng;
  document.title = i18n.t('app.title');
};
i18n.on('languageChanged', lng => {
  try { localStorage.setItem('hpproject-language', lng); } catch { /* Keep working without storage. */ }
  syncLanguage(lng);
});
syncLanguage(i18n.language);
export default i18n;
