import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../../translate/i18n';
import { useGameStore } from '../Stores/GameStore';
import ModeSelector from './ModeSelector';
import Collection from './Collection';
import pkg from '../../../package.json';
import SpellTraining from './SpellTraining';
import Shop from './Shop';
import DefenseSetup from '../Defense/DefenseSetup';
import AudioSettings from '../Audio/AudioSettings.jsx';
import Bestiary from './Bestiary';
import { HintSettings } from './HintControls';
import MenuPages from './MenuPages';
import DisplaySettings from '../Display/DisplaySettings.jsx';
import TrainerCrystal from '../Cheats/TrainerCrystal';

export default function MainMenu() {
 const { t, i18n } = useTranslation();
 const s = useGameStore();
 const [page, setPage] = useState('main');
 const [mode, setMode] = useState('brewing');
 const languageSelect = <label>{t('language')}<select value={i18n.resolvedLanguage} onChange={e => i18n.changeLanguage(e.target.value)}>
 {Object.entries(languages).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label>;
 if (page === 'training') return <section className="menu training-menu"><SpellTraining onBack={() => setPage('main')} /></section>;
 return <section className={'menu triptych-page page-' + page}><header className="menu-heading"><h1>Hyped Pot</h1><p>{t('app.version', {version:pkg.version})}</p><div className="menu-wallet"><TrainerCrystal /><span>{s.stones} {t('hud.stones')}</span></div></header>
 {page !== 'main' && <button className="menu-back" onClick={() => setPage('main')}>{t('menu.back')}</button>}
 {page === 'main' ? <MenuPages>
 <ModeSelector mode={mode} onMode={setMode} onDefense={() => setPage('defense')} />
 {languageSelect}
 {s.showFirstVisitWelcome && <article role="status"><p>{t('firstVisit.welcome')}</p><button onClick={s.dismissFirstVisit}>{t('collection.close')}</button></article>}
 <button onClick={() => setPage('shop')}>{t('shop.title')}</button>
 <button onClick={() => setPage('bestiary')}>{t('bestiary.title')}</button>
 <button onClick={() => setPage('training')}>{t('menu.training')}</button>
 <button onClick={() => setPage('achievements')}>{t('menu.achievements')}</button>
 <button onClick={() => setPage('settings')}>{t('menu.settings')}</button>
 <button onClick={() => setPage('help')}>{t('menu.help')}</button></MenuPages> : <div className="menu-section-content">
 {page === 'achievements' && <Collection />}
 {page === 'defense' && <DefenseSetup />}
 {page === 'help' && <><h2>{t('menu.help')}</h2><p>{t('help.heat')}</p><p>{t('help.ingredients')}</p><p>{t('help.rules')}</p></>}
 {page === 'shop' && <Shop />}
 {page === 'bestiary' && <Bestiary />}
 {page === 'settings' && <><AudioSettings /><HintSettings /><DisplaySettings /></>}
 </div>}
 </section>;
}
