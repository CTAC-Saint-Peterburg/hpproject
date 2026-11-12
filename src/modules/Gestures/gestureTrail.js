const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.y);

export function writeTrailPoint(point, width, height, out) {
  out.x = (point.x + 1) * width * .5;
  out.y = (1 - point.y) * height * .5;
  return out;
}

export function createGestureTrail(config = {}) {
  const capacity = Math.min(96, Math.max(1, Math.trunc(positive(config.particleCapacity, 96))));
  return {
    particles: Array.from({ length: capacity }, () => ({ x: 0, y: 0, vx: 0, vy: 0, age: 0, lifetime: 0, size: 0, alive: false })),
    capacity, alive: 0, cursor: 0, serial: 0,
    spacing: positive(config.particleSpacing, 6),
    lifetime: positive(config.particleLifetime, .36),
    particleSize: positive(config.particleSize, 1.1),
    spread: positive(config.particleSpread, 26),
    maxEmission: Math.min(capacity, Math.max(1, Math.trunc(positive(config.maxParticlesPerUpdate, 12)))),
    fadeSeconds: positive(config.fadeSeconds, .16),
    path: [], drawing: false, lineAge: 0, inputCount: 0, remainder: 0,
    firstX: 0, firstY: 0, width: 0, height: 0,
    from: { x: 0, y: 0 }, to: { x: 0, y: 0 },
  };
}

function seed(serial) {
  let value = Math.imul(serial + 1, 0x9e3779b9);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  return ((value ^ value >>> 15) >>> 0) / 4294967296;
}

function emit(state, x, y) {
  const particle = state.particles[state.cursor];
  const variation = seed(state.serial++), angle = variation * Math.PI * 2;
  const speed = state.spread * (.45 + seed(state.serial + 19) * .55);
  if (!particle.alive) state.alive++;
  particle.x = x; particle.y = y;
  particle.vx = Math.cos(angle) * speed; particle.vy = Math.sin(angle) * speed;
  particle.age = 0;
  particle.lifetime = state.lifetime * (.85 + variation * .15);
  particle.size = state.particleSize * (.7 + variation * .3);
  particle.alive = true;
  state.cursor = (state.cursor + 1) % state.capacity;
}

// Only newly appended samples emit particles. Sparse/teleport samples and large
// batches cannot allocate or emit beyond the fixed pool and per-update budget.
export function setGestureTrailPoints(state, points, width, height) {
  if (!(width > 0 && height > 0)) return;
  if (!points.length || !validPoint(points[0])) {
    if (state.drawing) { state.drawing = false; state.lineAge = 0; }
    state.inputCount = 0;
    return;
  }
  const restart = !state.drawing || points.length < state.inputCount ||
    points[0].x !== state.firstX || points[0].y !== state.firstY || width !== state.width || height !== state.height;
  let start = Math.max(1, state.inputCount), budget = state.maxEmission;
  if (restart) {
    state.remainder = 0; state.firstX = points[0].x; state.firstY = points[0].y;
    start = 1;
    writeTrailPoint(points[0], width, height, state.from);
    emit(state, state.from.x, state.from.y); budget--;
  }
  state.path = points; state.drawing = true; state.lineAge = 0;
  state.width = width; state.height = height;
  for (let index = start; index < points.length; index++) {
    if (!validPoint(points[index - 1]) || !validPoint(points[index])) continue;
    writeTrailPoint(points[index - 1], width, height, state.from);
    writeTrailPoint(points[index], width, height, state.to);
    const dx = state.to.x - state.from.x, dy = state.to.y - state.from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-8) continue;
    const count = Math.floor((state.remainder + distance) / state.spacing);
    const emitted = Math.min(count, budget);
    for (let part = 0; part < emitted; part++) {
      // Spread a capped segment over its full length instead of piling sparks
      // at its start. Normal dense input keeps exact distance-based spacing.
      const progress = count > budget ? (part + 1) / emitted
        : (state.spacing - state.remainder + part * state.spacing) / distance;
      emit(state, state.from.x + dx * progress, state.from.y + dy * progress);
    }
    budget -= emitted;
    state.remainder = (state.remainder + distance) % state.spacing;
  }
  state.inputCount = points.length;
}

export function advanceGestureTrail(state, delta) {
  const dt = Math.max(0, Number.isFinite(delta) ? delta : 0);
  for (const particle of state.particles) {
    if (!particle.alive) continue;
    particle.age += dt;
    if (particle.age >= particle.lifetime) { particle.alive = false; state.alive--; continue; }
    particle.x += particle.vx * dt; particle.y += particle.vy * dt;
  }
  if (!state.drawing && state.path.length) {
    state.lineAge += dt;
    if (state.lineAge >= state.fadeSeconds) state.path = [];
  }
  return hasGestureTrailAnimation(state);
}

export function hasGestureTrailAnimation(state) {
  return state.alive > 0 || (!state.drawing && state.path.length > 0);
}

export function clearGestureTrail(state) {
  for (const particle of state.particles) particle.alive = false;
  state.alive = 0; state.cursor = 0; state.path = [];
  state.drawing = false; state.lineAge = 0; state.inputCount = 0; state.remainder = 0;
}
