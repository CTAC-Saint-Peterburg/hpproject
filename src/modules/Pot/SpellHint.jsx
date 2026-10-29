import { useTranslation } from 'react-i18next';
import { spellLessons } from '../../static/spellLessons';

export default function SpellHint({ spellId, labelKey }) {
  const { t } = useTranslation();
  const spell = spellLessons.find(item => item.id === spellId);
  if (!spell) return null;
  const [startX, startY] = spell.points[0];
  return <span className="spell-hint" title={t(labelKey)} role="img" aria-label={t(labelKey)}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d={spell.points.map(([x, y], index) => (index ? 'L' : 'M') + x * 100 + ',' + y * 100).join(' ')}
        fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={startX * 100} cy={startY * 100} r="5" className="spell-hint-start" />
    </svg>
  </span>;
}
