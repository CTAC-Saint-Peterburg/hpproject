import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { useGameStore } from '../Stores/GameStore';
import { matchesLesson, resampleStroke, spellLessons } from '../../static/spellLessons';

export default function SpellTraining({ onBack }) {
  const { t } = useTranslation();
  const progress = useGameStore(s => s.tutorialProgress);
  const record = useGameStore(s => s.recordTraining);
  const [index, setIndex] = useState(() => Math.max(0, spellLessons.findIndex(lesson => (progress[lesson.id] || 0) < 2)));
  const [stroke, setStroke] = useState([]);
  const [message, setMessage] = useState('training.start');
  const drawing = useRef(null);
  const lesson = spellLessons[index];
  const repeats = progress[lesson.id] || 0;
  const completed = spellLessons.filter(item => progress[item.id] >= 2).length;
  const point = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
  };
  const choose = next => {
    drawing.current = null; setIndex(next); setStroke([]);
    setMessage('training.direction');
  };
  const finish = e => {
    if (!drawing.current || drawing.current.id !== e.pointerId) return;
    const points = [...drawing.current.points, point(e)];
    drawing.current = null;
    setStroke(points);
    if (matchesLesson(points, lesson)) {
      record(lesson.id);
      setMessage(repeats >= 1 ? 'training.mastered' : 'training.again');
    } else setMessage('training.failed');
  };
  const path = points => points.map((p, i) => (i ? 'L' : 'M') + p[0] * 600 + ',' + p[1] * 600).join(' ');
  const arrow = resampleArrow(lesson.points);
  return <div className="training">
    <h2>{t('training.title')}</h2>
    <p>{t('training.intro')}</p>
    <p>{t('training.progress', {completed, total: Object.values(progress).reduce((sum, value) => sum + value, 0)})}</p>
    <label>{t('training.spell')}<select value={index} onChange={e => choose(Number(e.target.value))}>
      {spellLessons.map((item, i) => <option key={item.id} value={i}>{i + 1}. {t(item.name)} · {progress[item.id] || 0}/2</option>)}
    </select></label>
    <h3>{t(lesson.name)} · {t('training.repeats', {count: repeats})}</h3><p>{t(lesson.effect, {id: lesson.id})}</p>
    <svg className="training-board" viewBox="0 0 600 600" role="img" aria-label={t('training.trace', {name: t(lesson.name)})}
      onPointerDown={e => {
        if (drawing.current || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = { id: e.pointerId, points: [point(e)] }; setStroke([...drawing.current.points]);
      }}
      onPointerMove={e => {
        if (!drawing.current || drawing.current.id !== e.pointerId) return;
        drawing.current.points.push(point(e)); setStroke([...drawing.current.points]);
      }} onPointerUp={finish}
      onPointerCancel={() => { drawing.current = null; setStroke([]); setMessage('training.cancelled'); }}>
      <defs><pattern id="rune-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#78614b" strokeOpacity=".15" /></pattern>
        <marker id="rune-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#775320" strokeWidth="1.5" /></marker></defs>
      <rect width="600" height="600" fill="url(#rune-grid)" />
      <path d={path(lesson.points)} fill="none" stroke="#b39466" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" opacity=".3" />
      <path d={path(lesson.points)} fill="none" stroke="#775320" strokeWidth="3" strokeDasharray="9 7" />
      <path d={path(arrow)} fill="none" stroke="#775320" strokeWidth="3" markerEnd="url(#rune-arrow)" />
      <circle cx={lesson.points[0][0] * 600} cy={lesson.points[0][1] * 600} r="11" fill="#d99b28" stroke="#6c451a" strokeWidth="3" />
      <path d={path(stroke)} fill="none" stroke="#7447bd" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
    </svg>
    <p role="status" aria-live="polite">{t(message)}</p>
    {completed === 10 && <p>{t('training.finished')}</p>}
    <div className="training-actions"><button onClick={() => { drawing.current = null; setStroke([]); setMessage('training.cleared'); }}>{t('training.clear')}</button>
      <button disabled={index === 0} onClick={() => choose(index - 1)}>{t('training.previous')}</button>
      <button disabled={index === spellLessons.length - 1} onClick={() => choose(index + 1)}>{t('training.next')}</button>
      <button onClick={onBack}>{t('menu.return')}</button>
      <button onClick={() => useGameStore.getState().beginMission(useGameStore.getState().selectedLevel)}>{t('training.skip')}</button></div>
  </div>;
}

function resampleArrow(points) {
  return resampleStroke(points).slice(1, 10);
}
