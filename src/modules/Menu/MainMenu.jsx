import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../../translate/i18n';
import { useGameStore } from '../Stores/GameStore';
import missions from '../../static/missions.json';
import achievements from '../../static/achievements.json';
import pkg from '../../../package.json';
import SpellTraining from './SpellTraining';
import Shop from './Shop';

export default function MainMenu() {
 const { t, i18n } = useTranslation();
 const s = useGameStore();
 const [page, setPage] = useState('main');
 const languageSelect = <label>{t('language')}<select value={i18n.resolvedLanguage} onChange={e => i18n.changeLanguage(e.target.value)}>
 {Object.entries(languages).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label>;
 if (page === 'training') return <section className="menu training-menu">{languageSelect}<SpellTraining onBack={() => setPage('main')} /></section>;
 return <section className="menu"><h1>{t('app.title')}</h1><p>{t('app.version', {version:pkg.version})}</p>
 {languageSelect}
 {page === 'main' && <>
 <label>{t('menu.mission')}<select value={s.selectedLevel} onChange={e => s.setLevel(e.target.value)}>
 {Object.entries(missions).map(([id,m]) => <option key={id} value={id}>{t(m.name)} · {m.timeLimit ? t('time.seconds',{value:m.timeLimit}) : t('time.unlimited')} · {'★'.repeat(s.records[id] || 0)}</option>)}
 </select></label>
 <button onClick={() => s.beginMission(s.selectedLevel)}>{t('menu.play')}</button>
 <button onClick={() => setPage('shop')}>{t('shop.title')}</button>
 <button onClick={() => setPage('training')}>{t('menu.training')}</button>
 <button onClick={() => setPage('achievements')}>{t('menu.achievements')} ({s.unlocked.length}/{achievements.length})</button>
 <button onClick={() => setPage('help')}>{t('menu.help')}</button></>}
 {page === 'achievements' && <><h2>{t('menu.achievements')}</h2>{achievements.map(a => <article key={a.id}><strong>{s.unlocked.includes(a.id) ? '🏆' : '🔒'} {t(a.name)}</strong><p>{t(a.description)}</p></article>)}</>}
 {page === 'help' && <><h2>{t('menu.help')}</h2><p>{t('help.heat')}</p><p>{t('help.ingredients')}</p><p>{t('help.rules')}</p></>}
 {page === 'shop' && <Shop />}
 {page !== 'main' && <button onClick={() => setPage('main')}>{t('menu.back')}</button>}
 </section>;
}
