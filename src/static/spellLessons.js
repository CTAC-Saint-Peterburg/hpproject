import { resampleStroke, recognizeTemplateStroke } from '../modules/Recognaizer/gestureMatching.js';
export { resampleStroke } from '../modules/Recognaizer/gestureMatching.js';

const circle = Array.from({ length: 65 }, (_, i) => {
  const angle = -Math.PI / 2 + i * Math.PI * 2 / 64;
  return [0.5 + Math.cos(angle) * 0.28, 0.5 + Math.sin(angle) * 0.28];
});

export const spellLessons = [
  { id: 1, name: 'spells.1.name', effect: 'spells.1.effect', points: [[.2,.22],[.5,.78],[.8,.22]] },
  { id: 2, name: 'spells.2.name', effect: 'spells.2.effect', points: [[.23,.23],[.77,.23],[.77,.77],[.23,.77],[.23,.23]] },
  { id: 3, name: 'spells.3.name', effect: 'spells.3.effect', points: [[.5,.8],[.5,.2]] },
  { id: 4, name: 'spells.4.name', effect: 'spells.unassigned', points: [[.2,.5],[.8,.5]] },
  { id: 5, name: 'spells.5.name', effect: 'spells.unassigned', points: circle },
  { id: 6, name: 'spells.6.name', effect: 'spells.unassigned', points: [[.2,.23],[.8,.23],[.2,.77],[.8,.77]] },
  { id: 7, name: 'spells.7.name', effect: 'spells.unassigned', points: [[.2,.78],[.5,.22],[.8,.78]] },
  { id: 8, name: 'spells.8.name', effect: 'spells.unassigned', points: [[.27,.2],[.27,.77],[.8,.77]] },
  { id: 9, name: 'spells.9.name', effect: 'spells.unassigned', points: [[.2,.8],[.8,.2]] },
  { id: 10, name: 'spells.10.name', effect: 'spells.unassigned', points: [[.18,.24],[.34,.76],[.5,.32],[.66,.76],[.82,.24]],
    recognitionVariants: [[[.18,.24],[.34,.76],[.5,.48],[.66,.76],[.82,.24]]] },
];

export function matchesLesson(points, lesson) {
  if (points.length < 3 || points.some(p => p.some(value => !Number.isFinite(value)))) return false;
  // Smooth small pointer jitter before comparing length and contour.
  const filtered = points.map((p, i) => {
    if (i === 0 || i === points.length - 1) return p;
    const nearby = points.slice(Math.max(0, i - 2), Math.min(points.length, i + 3));
    return [0, 1].map(axis => nearby.reduce((sum, item) => sum + item[axis], 0) / nearby.length);
  });
  const actual = resampleStroke(filtered);
  const expected = resampleStroke(lesson.points);
  const errors = actual.map((p, i) => Math.hypot(p[0] - expected[i][0], p[1] - expected[i][1]));
  const length = list => list.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - list[i][0], p[1] - list[i][1]), 0);
  const ratio = length(filtered) / length(lesson.points);
  return ratio >= .75 && ratio <= 1.5 && Math.max(...errors) < .15 && Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length) < .065;
}

// Game coordinates have Y pointing up; lesson templates point down.
export function recognizeLessonGesture(points, options = {}) {
  if (!Array.isArray(points) || points.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) return null;
  const aspect = Number.isFinite(options.aspectRatio) && options.aspectRatio > 0 ? options.aspectRatio : 1;
  return recognizeTemplateStroke(points.map(p => [p.x * aspect, -p.y]), spellLessons, options);
}
