import { useTranslation } from 'react-i18next';
import { DISPLAY_PRESETS, useDisplaySettings } from './displaySettings';

export default function DisplaySettings() {
  const { t } = useTranslation();
  const { preset, setPreset } = useDisplaySettings();
  return <section className="audio-settings"><h2>{t('display.title')}</h2>
    <label>{t('display.frame')}<select value={preset} onChange={e => setPreset(e.target.value)}>
      {DISPLAY_PRESETS.map(id => <option key={id} value={id}>{t('display.' + id)}</option>)}
    </select></label><p>{t('display.description')}</p>
  </section>;
}
