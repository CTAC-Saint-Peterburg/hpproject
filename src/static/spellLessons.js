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
  { id: 10, name: 'spells.10.name', effect: 'spells.unassigned', points: [[.18,.24],[.34,.76],[.5,.32],[.66,.76],[.82,.24]] },
];

export function resampleStroke(points, count = 64) {
  if (!points.length) return [];
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = distances.at(-1);
  if (total === 0) return Array.from({ length: count }, () => points[0]);
  let segment = 1;
  return Array.from({ length: count }, (_, i) => {
    const target = total * i / (count - 1);
    while (segment < points.length - 1 && distances[segment] < target) segment++;
    const fraction = (target - distances[segment - 1]) / (distances[segment] - distances[segment - 1] || 1);
    return [0, 1].map(axis => points[segment - 1][axis] + (points[segment][axis] - points[segment - 1][axis]) * fraction);
  });
}

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

// Match game gestures to the same shapes taught on the training board.
// Game coordinates have Y pointing up; lesson coordinates have Y pointing down.
export function recognizeLessonGesture(points) {
  if (!Array.isArray(points) || points.length < 3 || points.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) return null;
  const stroke = points.map(p => [p.x, -p.y]);
  const fit = list => {
    const xs = list.map(p => p[0]), ys = list.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
    const size = Math.max(width, height);
    return size > 0 ? list.map(p => [.5 + (p[0] - minX - width / 2) * .6 / size, .5 + (p[1] - minY - height / 2) * .6 / size]) : list;
  };
  const extent = Math.max(...stroke.map(p => p[0])) - Math.min(...stroke.map(p => p[0]));
  const verticalExtent = Math.max(...stroke.map(p => p[1])) - Math.min(...stroke.map(p => p[1]));
  if (Math.max(extent, verticalExtent) < .15) return null;
  const actual = fit(stroke);
  const lesson = spellLessons.find(item => {
    const template = { points: fit(item.points) };
    return matchesLesson(actual, template) || matchesLesson([...actual].reverse(), template);
  });
  return lesson?.id ?? null;
}
