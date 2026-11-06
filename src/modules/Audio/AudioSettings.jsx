import { useTranslation } from 'react-i18next';
import { useAudioSettings } from './audioSettings.js';

export default function AudioSettings() {
  const { t } = useTranslation();
  const enabled = useAudioSettings(state => state.enabled);
  const volume = useAudioSettings(state => state.volume);
  const setEnabled = useAudioSettings(state => state.setEnabled);
  const setVolume = useAudioSettings(state => state.setVolume);
  const percentage = Math.round(volume * 100);

  return <section className="audio-settings" aria-labelledby="audio-settings-title">
    <h2 id="audio-settings-title">{t('audio.title')}</h2>
    <p>{t('audio.description')}</p>
    <label className="audio-toggle">
      <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
      <span>{t('audio.enabled')}</span>
    </label>
    <label className="audio-volume">
      <span>{t('audio.volume')} <output>{t('audio.volumeValue', { value: percentage })}</output></span>
      <input type="range" min="0" max="100" step="1" value={percentage}
        aria-valuetext={t('audio.volumeValue', { value: percentage })}
        onChange={event => setVolume(Number(event.target.value) / 100)} />
    </label>
  </section>;
}
