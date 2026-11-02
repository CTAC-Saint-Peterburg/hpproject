import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const COIN_RADIUS = .56;
const SIDES = 8;
const FACE_Y = .075;
const RELIEF = .015;
let shared;

function geometryFrom(positions, indices) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Bare octagonal disc is also reused by small reward coins.
export function createCoinGeometry() {
  const positions = [], indices = [];
  const rings = [[.50, -FACE_Y], [COIN_RADIUS, -.045], [COIN_RADIUS, .045], [.50, FACE_Y]];
  for (const [radius, y] of rings) {
    for (let side = 0; side < SIDES; side++) {
      const angle = side * Math.PI * 2 / SIDES;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      const next = (side + 1) % SIDES;
      const a = ring * SIDES + side, b = ring * SIDES + next, c = a + SIDES, d = b + SIDES;
      indices.push(a, c, b, b, c, d);
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, -FACE_Y, 0, 0, FACE_Y, 0);
  for (let side = 0; side < SIDES; side++) {
    const next = (side + 1) % SIDES;
    indices.push(bottom, side, next, bottom + 1, 3 * SIDES + next, 3 * SIDES + side);
  }
  return geometryFrom(positions, indices);
}

function createSpiral() {
  const positions = [], indices = [];
  const steps = 12, width = .046;
  // Two raised edge rails form one continuous angular spiral ribbon.
  for (let point = 0; point <= steps; point++) {
    const t = point / steps, angle = -.6 + t * Math.PI * 3;
    const radius = .025 + .29 * t;
    const dx = .29 * Math.cos(angle) - radius * Math.PI * 3 * Math.sin(angle);
    const dz = .29 * Math.sin(angle) + radius * Math.PI * 3 * Math.cos(angle);
    const length = Math.hypot(dx, dz);
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    for (const y of [FACE_Y, FACE_Y + RELIEF]) {
      positions.push(x - dz / length * width / 2, y, z + dx / length * width / 2,
        x + dz / length * width / 2, y, z - dx / length * width / 2);
    }
  }
  for (let step = 0; step < steps; step++) {
    const a = step * 4, b = (step + 1) * 4;
    indices.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3,
      a, b, a + 2, a + 2, b, b + 2,
      a + 1, a + 3, b + 1, b + 1, a + 3, b + 3);
  }
  const end = steps * 4;
  indices.push(0, 2, 1, 1, 2, 3, end, end + 1, end + 2, end + 1, end + 3, end + 2);
  return geometryFrom(positions, indices);
}

function createBone(angle) {
  const outline = [[-.05, -.29], [.05, -.29], [.08, -.21], [.035, -.18], [.035, .18], [.08, .21],
    [.05, .29], [-.05, .29], [-.08, .21], [-.035, .18], [-.035, -.18], [-.08, -.21]];
  const positions = [], indices = [];
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  for (const y of [-FACE_Y, -FACE_Y - RELIEF]) {
    for (const [x, z] of outline) positions.push(x * cosine + z * sine, y, -x * sine + z * cosine);
  }
  const count = outline.length;
  for (const [a, b, c] of ShapeUtils.triangulateShape(outline.map(([x, z]) => new Vector2(x, z)), [])) indices.push(a + count, b + count, c + count);
  for (let side = 0; side < count; side++) {
    const next = (side + 1) % count;
    indices.push(side, side + count, next, next, side + count, next + count);
  }
  return geometryFrom(positions, indices);
}

export function createCoinSymbols() {
  const parts = [createBone(Math.PI / 4), createBone(-Math.PI / 4)];
  const bones = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  bones.computeBoundingBox();
  bones.computeBoundingSphere();
  return { spiral: createSpiral(), bones };
}

export function getCoinGeometries() {
  if (!shared) shared = { body: createCoinGeometry(), ...createCoinSymbols() };
  return shared;
}
