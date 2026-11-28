import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import missions from '../../static/missions.json';
import { useGameStore } from '../Stores/GameStore';
import { MenuMeasureContext } from './menuMeasureContext';
import ModePreview from './ModePreview';

export default function ModeSelector({ mode, onMode, onDefense }) {
  const { t } = useTranslation(), measuring = useContext(MenuMeasureContext);
  const s = useGameStore(), brewing = mode === 'brewing';
  const switchMode = () => onMode(brewing ? 'defense' : 'brewing');
  const missionLabel = (id, m) => `${t(m.name)} · ${m.rewardPotion ? t('potions.' + m.rewardPotion + '.name') : ''} · ${m.timeLimit ? t('time.seconds', { value: m.timeLimit }) : t('time.unlimited')} · ${'★'.repeat(s.records[id] || 0)}`;
  return <section className="mode-selector" aria-label={t('mode.choose')}>
    <h2>{t('mode.choose')}</h2>
    <div className="mode-carousel">
      <button className="mode-arrow" aria-label={t('mode.previous')} onClick={switchMode}>‹</button>
      <div className="mode-preview">
        {!measuring && <ModePreview mode={mode} rating={s.records[s.selectedLevel] || 0} equipment={s.equippedItems} />}
        <strong className="mode-name" aria-live="polite">{t(brewing ? 'mode.brewing' : 'arena.title')}</strong>
      </div>
      <button className="mode-arrow" aria-label={t('mode.next')} onClick={switchMode}>›</button>
    </div>
    <div className="mode-actions">
      {brewing ? <label className="mode-mission"><span className="sr-only">{t('menu.mission')}</span>
        <span className="mode-mission-value" aria-hidden="true">{missionLabel(s.selectedLevel, missions[s.selectedLevel])}</span>
        <select aria-label={t('menu.mission')} value={s.selectedLevel} onChange={e => s.setLevel(e.target.value)}>
          {Object.entries(missions).sort(([, a], [, b]) => a.difficulty - b.difficulty).map(([id, m]) => <option key={id} value={id}>
            {missionLabel(id, m)}
          </option>)}
        </select>
      </label> : <p className="mode-defense-note">{t('mode.prepare')}</p>}
      <button className="mode-play" onClick={() => brewing ? s.beginMission(s.selectedLevel) : onDefense()}>{t('menu.play')}</button>
    </div>
  </section>;
}
