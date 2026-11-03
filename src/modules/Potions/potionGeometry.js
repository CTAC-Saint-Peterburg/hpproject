import { BufferGeometry, Float32BufferAttribute } from 'three';

export const POTION_MODEL_HEIGHT = 1;
export const POTION_MODELS = Object.freeze(['vial', 'phial', 'flask']);
const SIDES = 6;
const profiles = {
  vial: [[.14, 0], [.18, .055], [.18, .59], [.085, .75], [.085, .90]],
  phial: [[.12, 0], [.235, .12], [.235, .40], [.115, .64], [.115, .90]],
  flask: [[.13, 0], [.305, .16], [.305, .43], [.105, .67], [.105, .90]],
};
const cache = new Map();
const modelName = model => Object.hasOwn(profiles, model) ? model : 'vial';

// A capped six-sided lathe uses 60 body triangles and 24 stopper triangles.
function revolve(profile) {
  const positions = [], indices = [];
  for (const [radius, y] of profile) {
    for (let side = 0; side < SIDES; side++) {
      const angle = side * Math.PI * 2 / SIDES;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  for (let ring = 0; ring < profile.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      const next = (side + 1) % SIDES;
      const low = ring * SIDES + side, lowNext = ring * SIDES + next;
      const high = low + SIDES, highNext = lowNext + SIDES;
      indices.push(low, high, lowNext, lowNext, high, highNext);
    }
  }
  const bottom = positions.length / 3, topRing = (profile.length - 1) * SIDES;
  positions.push(0, profile[0][1], 0, 0, profile.at(-1)[1], 0);
  for (let side = 0; side < SIDES; side++) {
    const next = (side + 1) % SIDES;
    indices.push(bottom, side, next, bottom + 1, topRing + next, topRing + side);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createPotionGeometry(model = 'vial') {
  const profile = profiles[modelName(model)];
  const neckRadius = profile.at(-1)[0];
  return {
    body: revolve(profile),
    stopper: revolve([[neckRadius * .96, .89], [neckRadius * 1.15, POTION_MODEL_HEIGHT]]),
  };
}

// Four potion types share only three fixed model pairs; colours stay per bottle.
export function getPotionGeometry(model = 'vial') {
  const name = modelName(model);
  if (!cache.has(name)) cache.set(name, createPotionGeometry(name));
  return cache.get(name);
}
