import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export default function TemperatureIndicator({ value }) {
  const clip = useId(), { t } = useTranslation();
  const temperature = Math.max(20, Math.min(110, Number.isFinite(value) ? value : 20));
  const height = 77 * (temperature - 20) / 90;
  const shape = 'M24 62V15a8 8 0 0 1 16 0v47C54 70 46 84 32 84S10 70 24 62Z';
  return <div className="temperature-indicator" role="meter" aria-label={t('hud.temperature')}
    aria-valuemin={20} aria-valuemax={110} aria-valuenow={Math.round(temperature)}>
    <svg viewBox="0 0 64 90" aria-hidden="true"><defs><clipPath id={clip}><path d={shape} /></clipPath></defs>
      <rect x="0" y={84 - height} width="64" height={height} clipPath={`url(#${clip})`} fill="var(--color-rune-start)" />
      <path d={shape} fill="none" stroke="var(--color-rune)" strokeWidth="2.5" />
      <path d="M40 22h7m-7 10h5m-5 10h7m-7 10h5" fill="none" stroke="var(--color-rune)" strokeWidth="2" />
    </svg><strong aria-hidden="true">{Math.round(temperature)}°C</strong>
  </div>;
}
