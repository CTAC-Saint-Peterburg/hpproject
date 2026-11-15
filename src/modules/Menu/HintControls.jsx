import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { createRapidTaps } from '../Cheats/rapidTaps';
import { useCheatUiStore } from '../Cheats/cheatUiStore';
import { useHintSettings } from './hintSettings';

export function HintToggle({ visible, onToggle, panelId, trainer = false }) {
  const { t } = useTranslation();
  const tap = useMemo(() => createRapidTaps(() => useCheatUiStore.getState().setOpen(true)), []);
  return <button className={'hint-toggle' + (visible ? ' hint-toggle-on' : '')}
    aria-pressed={visible} aria-controls={panelId} aria-label={t(visible ? 'hints.hide' : 'hints.show')}
    title={t(visible ? 'hints.hide' : 'hints.show')} onClick={() => { onToggle(); if (trainer) tap(); }}>?</button>;
}

export function HintSettings() {
  const { t } = useTranslation();
  const { defaultEnabled, setDefaultEnabled } = useHintSettings();
  return <section className="audio-settings" aria-labelledby="hint-settings-title">
    <h2 id="hint-settings-title">{t('hints.title')}</h2>
    <label className="audio-toggle"><input type="checkbox" checked={defaultEnabled}
      onChange={event => setDefaultEnabled(event.target.checked)} /><span>{t('hints.defaultEnabled')}</span></label>
    <p>{t('hints.description')}</p>
  </section>;
}
