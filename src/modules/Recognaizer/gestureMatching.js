import defaults from '../../static/gestureRecognition.json' with { type: 'json' };

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pathLength = points => points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]), 0);
const templateCache = new WeakMap();

export function resampleStroke(points, count = 64) {
  if (!points.length) return [];
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + distance(points[i], points[i - 1]));
  const total = distances.at(-1);
  if (total === 0) return Array.from({ length: count }, () => [...points[0]]);
  let segment = 1;
  return Array.from({ length: count }, (_, i) => {
    const target = total * i / (count - 1);
    while (segment < points.length - 1 && distances[segment] < target) segment++;
    const ratio = (target - distances[segment - 1]) / (distances[segment] - distances[segment - 1] || 1);
    return [0, 1].map(axis => points[segment - 1][axis] + (points[segment][axis] - points[segment - 1][axis]) * ratio);
  });
}

function span(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of points) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return Math.max(maxX - minX, maxY - minY);
}

function smooth(points, closed) {
  return points.map((p, i) => {
    if (!closed && (i === 0 || i === points.length - 1)) return p;
    const before = points[(i + points.length - 1) % points.length];
    const after = points[(i + 1) % points.length];
    return [(before[0] + p[0] * 2 + after[0]) / 4, (before[1] + p[1] * 2 + after[1]) / 4];
  });
}

function normalize(points) {
  const center = points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]);
  const centered = points.map(p => [p[0] - center[0], p[1] - center[1]]);
  const radius = Math.sqrt(centered.reduce((sum, p) => sum + p[0] ** 2 + p[1] ** 2, 0) / points.length);
  return centered.map(p => [p[0] / (radius || 1), p[1] / (radius || 1)]);
}

function prepare(points, count, closed) {
  const stroke = closed ? [...points, points[0]] : points;
  const sampled = resampleStroke(stroke, count + (closed ? 1 : 0));
  if (closed) sampled.pop();
  return normalize(smooth(sampled, closed));
}

function references(templates, config) {
  const key = JSON.stringify([config.sampleCount, config.aspectScales]);
  let cache = templateCache.get(templates);
  if (!cache) { cache = new Map(); templateCache.set(templates, cache); }
  if (cache.has(key)) return cache.get(key);
  const result = templates.filter(t => ![3, 4, 9].includes(t.id)).map(template => {
    const closed = [2, 5].includes(template.id);
    const forms = [template.points, ...(template.recognitionVariants || [])];
    return { id: template.id, closed, variants: forms.flatMap(form => {
      const points = closed ? form.slice(0, -1) : form;
      return config.aspectScales.map(scale => ({
        scale, points: prepare(points.map(([x, y]) => [x * scale, y]), config.sampleCount, closed),
      }));
    }) };
  });
  cache.set(key, result);
  return result;
}

function alignmentRotation(actual, expected, shift, closed, config) {
  let dot = 0, cross = 0;
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i], b = expected[(i + shift) % expected.length];
    dot += a[0] * b[0] + a[1] * b[1];
    cross += a[0] * b[1] - a[1] * b[0];
  }
  let angle = Math.atan2(cross, dot);
  const limit = config.maxRotationDegrees * Math.PI / 180;
  if (!closed) {
    if (Math.abs(angle) > limit + config.rotationSlackDegrees * Math.PI / 180) return null;
    angle = Math.max(-limit, Math.min(limit, angle));
  }
  return angle;
}

function anglePenalty(angle, closed, config) {
  return closed ? 0 : config.anglePenalty * Math.abs(angle) / (config.maxRotationDegrees * Math.PI / 180 || 1);
}

function alignmentScore(actual, expected, shift, closed, config) {
  const angle = alignmentRotation(actual, expected, shift, closed, config);
  if (angle === null) return Infinity;
  const c = Math.cos(angle), s = Math.sin(angle);
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i], b = expected[(i + shift) % expected.length];
    sum += (a[0] * c - a[1] * s - b[0]) ** 2 + (a[0] * s + a[1] * c - b[1]) ** 2;
  }
  return Math.sqrt(sum / actual.length) + anglePenalty(angle, closed, config);
}

// Narrow-band dynamic alignment tolerates uneven corners without skipping whole strokes.
function elasticScore(actual, expected, shift, closed, config) {
  const angle = alignmentRotation(actual, expected, shift, closed, config);
  if (angle === null) return Infinity;
  const c = Math.cos(angle), s = Math.sin(angle), count = actual.length;
  const window = Math.max(1, Math.floor(count * config.elasticWindowRatio));
  const rotated = actual.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  let previous = new Float64Array(count + 1).fill(Infinity);
  previous[0] = 0;
  for (let i = 1; i <= count; i++) {
    const current = new Float64Array(count + 1).fill(Infinity);
    for (let j = Math.max(1, i - window); j <= Math.min(count, i + window); j++) {
      const a = rotated[i - 1], b = expected[(j - 1 + shift) % count];
      const cost = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
      current[j] = cost + Math.min(previous[j - 1], previous[j] + config.elasticStepPenalty, current[j - 1] + config.elasticStepPenalty);
    }
    previous = current;
  }
  return Math.sqrt(previous[count] / count) + anglePenalty(angle, closed, config);
}

function recognizeLine(points, config) {
  const first = points[0], last = points.at(-1), length = pathLength(points), extent = distance(first, last);
  if (!length || extent / length < config.lineStraightness) return { straight: false };
  const dx = last[0] - first[0], dy = last[1] - first[1];
  const error = Math.sqrt(points.reduce((sum, p) => sum + ((p[0] - first[0]) * dy - (p[1] - first[1]) * dx) ** 2, 0) / points.length) / (extent ** 2);
  if (error > config.maxLineDeviation) return { straight: false };
  const angle = ((Math.atan2(dy, dx) * 180 / Math.PI) % 180 + 180) % 180;
  const candidates = [{ angle: 0, id: 4 }, { angle: 45, id: 9 }, { angle: 90, id: 3 }, { angle: 135, id: 9 }]
    .map(candidate => ({ id: candidate.id, error: Math.min(Math.abs(angle - candidate.angle), 180 - Math.abs(angle - candidate.angle)) }))
    .sort((a, b) => a.error - b.error);
  return { straight: true, id: candidates[0].error <= config.lineAngleToleranceDegrees ? candidates[0].id : null };
}

function isClosed(points, config) {
  const gap = distance(points[0], points.at(-1)), extent = span(points);
  return gap / extent <= config.closureDistanceRatio ||
    (gap / extent <= config.closureMaxSpanRatio && gap / pathLength(points) <= config.closurePathRatio);
}

function rankShapes(points, templates, config, elastic) {
  const closed = isClosed(points, config);
  const actual = prepare(points, config.sampleCount, closed);
  const directions = [actual, [...actual].reverse()];
  return references(templates, config).filter(reference => reference.closed === closed).map(reference => {
    const alignments = [];
    let score = Infinity;
    for (const variant of reference.variants) for (const direction of directions) {
      const step = closed ? Math.max(1, config.closedShiftStep) : config.sampleCount;
      const penalty = config.stretchPenalty * Math.abs(Math.log(variant.scale));
      for (let shift = 0; shift < config.sampleCount; shift += step) {
        const rigid = alignmentScore(direction, variant.points, shift, closed, config);
        score = Math.min(score, rigid + penalty);
        if (elastic && rigid < config.elasticMaxRigidDistance) alignments.push({ direction, expected: variant.points, shift, rigid, penalty });
      }
    }
    if (elastic) {
      alignments.sort((a, b) => a.rigid + a.penalty - b.rigid - b.penalty);
      for (const alignment of alignments.slice(0, config.elasticCandidatesPerShape)) {
        const flexible = elasticScore(alignment.direction, alignment.expected, alignment.shift, closed, config);
        score = Math.min(score, alignment.rigid * (1 - config.elasticWeight) + flexible * config.elasticWeight + alignment.penalty + config.elasticPenalty);
      }
    }
    return { id: reference.id, score };
  }).sort((a, b) => a.score - b.score);
}

function strokeViews(points, config) {
  const views = [{ points, penalty: 0 }];
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
  const total = distances.at(-1);
  const pointAt = target => {
    let index = 1;
    while (index < points.length - 1 && distances[index] < target) index++;
    const ratio = (target - distances[index - 1]) / (distances[index] - distances[index - 1] || 1);
    return [0, 1].map(axis => points[index - 1][axis] + (points[index][axis] - points[index - 1][axis]) * ratio);
  };
  const add = (start, end) => {
    const first = total * start, last = total * (1 - end);
    const middle = points.filter((_, i) => distances[i] > first && distances[i] < last);
    views.push({ points: [pointAt(first), ...middle, pointAt(last)], penalty: (start + end) * config.endpointTrimPenalty });
  };
  for (const ratio of config.endpointTrimRatios) { add(ratio, 0); add(0, ratio); }
  const smaller = config.endpointTrimRatios[0];
  if (smaller) add(smaller, smaller);
  return views;
}

function endpointLineDeviation(original, cropped) {
  const first = cropped[0], last = cropped.at(-1), length = distance(first, last);
  if (!length) return Infinity;
  const dx = last[0] - first[0], dy = last[1] - first[1];
  let maximum = 0;
  for (const p of original) maximum = Math.max(maximum, Math.abs((p[0] - first[0]) * dy - (p[1] - first[1]) * dx) / length);
  return maximum / span(original);
}

function accepted(scores, maxDistance, margin) {
  return !!scores.length && scores[0].score <= maxDistance && (!scores[1] || scores[1].score - scores[0].score >= margin);
}

// Compare every candidate, optimizing rotation without erasing orientation-specific spells.
export function recognizeTemplateStroke(input, templates, options = {}) {
  const config = { ...defaults, ...options };
  if (!Array.isArray(input) || input.length < config.minPoints || input.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)))) return null;
  const extent = span(input);
  if (extent < config.minExtent) return null;
  const clean = [];
  for (const p of input) if (!clean.length || distance(p, clean.at(-1)) >= extent * config.jitterSpacingRatio) clean.push(p);
  if (clean.length < 2 || pathLength(clean) / extent > config.maxLengthToSpan) return null;
  const sampled = smooth(resampleStroke(clean, config.sampleCount), false);
  const line = recognizeLine(sampled, config);
  if (line.straight) return line.id;
  const threshold = Number.isFinite(options.threshold) ? options.threshold : .5;
  const maxDistance = config.maxDistance * Math.max(.5, Math.min(1.5, 1.5 - threshold));
  const baseline = rankShapes(clean, templates, config, false);
  if (accepted(baseline, Math.min(maxDistance, config.rigidConfidenceDistance), config.minMargin)) return baseline[0].id;
  const best = new Map();
  for (const view of strokeViews(clean, config)) {
    const trimmedLine = recognizeLine(resampleStroke(view.points, config.sampleCount), config);
    const safeLine = trimmedLine.id && endpointLineDeviation(clean, view.points) <= config.maxEndpointLineDeviation;
    const candidates = trimmedLine.straight
      ? (safeLine ? [{ id: trimmedLine.id, score: config.lineFallbackPenalty }] : [])
      : rankShapes(view.points, templates, config, true);
    for (const candidate of candidates) {
      const score = candidate.score + view.penalty;
      if (score < (best.get(candidate.id) ?? Infinity)) best.set(candidate.id, score);
    }
  }
  const scores = [...best].map(([id, score]) => ({ id, score })).sort((a, b) => a.score - b.score);
  if (!accepted(scores, maxDistance, config.minMargin)) return null;
  return scores[0].id;
}
