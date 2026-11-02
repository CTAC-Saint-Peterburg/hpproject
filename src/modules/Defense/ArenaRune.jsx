import { useTranslation } from 'react-i18next';
import { spellLessons } from '../../static/spellLessons';

export default function ArenaRune({ id }) {
  const { t } = useTranslation();
  const lesson = spellLessons.find(item => item.id === id);
  if (!lesson) return null;
  return <svg className="arena-rune" viewBox="0 0 100 100" role="img" aria-label={t(lesson.name)}>
    <path d={lesson.points.map(([x, y], index) => (index ? 'L' : 'M') + x * 100 + ',' + y * 100).join(' ')}
      fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
