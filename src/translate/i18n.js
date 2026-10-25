import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import fr from './fr.json';

export const languages = { ru: 'Русский', en: 'English', zh: '中文', es: 'Español', fr: 'Français' };
let language = 'ru';
try { language = localStorage.getItem('hpproject-language') || 'ru'; } catch { /* Storage may be disabled. */ }
if (!Object.hasOwn(languages, language)) language = 'ru';
i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en }, zh: { translation: zh }, es: { translation: es }, fr: { translation: fr } },
  lng: language, fallbackLng: 'ru', supportedLngs: Object.keys(languages),
  keySeparator: false, interpolation: { escapeValue: false }, initAsync: false,
});
const syncLanguage = lng => {
  try { localStorage.setItem('hpproject-language', lng); } catch { /* Keep working without storage. */ }
  document.documentElement.lang = lng;
  document.title = i18n.t('app.title');
};
i18n.on('languageChanged', syncLanguage);
syncLanguage(i18n.language);
export default i18n;
