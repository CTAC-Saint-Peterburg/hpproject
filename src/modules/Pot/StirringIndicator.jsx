import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { CAULDRON } from './cauldronGeometry';

// Front silhouette uses the same outer profile as the low-poly cauldron.
const outer = CAULDRON.profile.slice(1, 10);
const points = [...outer.map(([r, y]) => [50 + r * 38, 35 - y * 34]),
  ...outer.slice().reverse().map(([r, y]) => [50 - r * 38, 35 - y * 34])];
const bodyPath = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ') + 'Z';
const top = Math.min(...points.map(point => point[1]));
const bottom = Math.max(...points.map(point => point[1]));

export default function StirringIndicator({ value, paused }) {
  const { t } = useTranslation();
  const clip = useId();
  const amount = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const height = (bottom - top) * amount / 100;
  const label = t('brewing.stirringLabel');
  return <div className={'stirring-indicator' + (paused ? ' stirring-paused' : '')}
    role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={Math.round(amount)} aria-valuetext={t('brewing.agitation', { value: Math.round(amount) })}>
    <div className="stirring-icon" aria-hidden="true">
      <svg viewBox="0 0 100 82" focusable="false">
        <defs><clipPath id={clip}><path d={bodyPath} /></clipPath></defs>
        <rect className="stirring-fill" x="0" y={bottom - height} width="100" height={height} clipPath={`url(#${clip})`} />
        <g className="stirring-outline" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          <path d={bodyPath} />
          <path d="M25 19H75 M22 22L13 19 7 24 7 33 14 38 21 34 M78 22L87 19 93 24 93 33 86 38 79 34 M33 53L28 71H36L39 56 M67 53L72 71H64L61 56 M47 56V76H53V56" />
        </g>
      </svg>
      <span className="stirring-percent">{Math.round(amount)}%</span>
    </div>
    <span className="stirring-label" aria-hidden="true">{Array.from(label).map((letter, index) =>
      <span key={index} style={{ animationDelay: `${index * .075}s` }}>{letter === ' ' ? '\u00a0' : letter}</span>)}</span>
  </div>;
}
