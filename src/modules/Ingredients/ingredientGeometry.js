import { BoxGeometry, BufferGeometry, CircleGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const INGREDIENT_MODEL_SIZE = .55;

const shapeFor = id => id === 2 ? 'bean' : id === 3 ? 'dew' : id === 4 || id === 6 ? 'twig' : 'petals';
// Only four canonical geometries are retained, regardless of IDs supplied.
const shared = new Map();

export function getIngredientGeometry(id) {
  const shape = shapeFor(id);
  if (!shared.has(shape)) shared.set(shape, createIngredientGeometry(id));
  return shared.get(shape);
}

export function createIngredientGeometry(id) {
  const shape = shapeFor(id);
  const geometry = shape === 'bean' ? createBean() : shape === 'dew' ? createDew() : shape === 'twig' ? createTwig() : createPetals();
  geometry.deleteAttribute('uv');
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const extent = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
  geometry.center();
  geometry.scale(INGREDIENT_MODEL_SIZE / extent, INGREDIENT_MODEL_SIZE / extent, INGREDIENT_MODEL_SIZE / extent);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function mergeParts(parts) {
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

function createPetals() {
  const parts = [];
  for (const side of [-1, 0, 1]) {
    const petal = new CircleGeometry(1, 8);
    petal.scale(.077, .18, 1);
    petal.rotateZ(-side * .46);
    petal.translate(side * .105, side === 0 ? .045 : -.015, side * .006);
    parts.push(petal);
  }
  return mergeParts(parts);
}

function indexedGeometry(positions, indices) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createBean() {
  // A concave kidney silhouette; three outline rings make a closed shallow bevel.
  const outline = [
    [-.28, -.02], [-.23, -.13], [-.08, -.18], [.12, -.15], [.26, -.04],
    [.25, .09], [.13, .17], [.02, .09], [-.12, .11], [-.24, .13],
  ];
  const positions = [], indices = [];
  const rings = [[.78, -.105], [1, 0], [.78, .105]];
  for (const [scale, depth] of rings) {
    for (const [x, y] of outline) positions.push(x * scale, y * scale, depth);
  }
  const sides = outline.length;
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      const a = ring * sides + side, b = ring * sides + next;
      const c = (ring + 1) * sides + side, d = (ring + 1) * sides + next;
      indices.push(a, b, c, b, d, c);
    }
  }
  const cap = ShapeUtils.triangulateShape(outline.map(([x, y]) => new Vector2(x, y)), []);
  for (const [a, b, c] of cap) {
    indices.push(c, b, a, a + sides * 2, b + sides * 2, c + sides * 2);
  }
  return indexedGeometry(positions, indices);
}

function createDew() {
  const sides = 6;
  const positions = [0, -.25, 0];
  const indices = [];
  for (const [radius, y] of [[.13, -.17], [.19, -.035]]) {
    for (let side = 0; side < sides; side++) {
      const angle = side * Math.PI * 2 / sides;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  const tip = positions.length / 3;
  positions.push(0, .275, 0);
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides;
    const low = side + 1, lowNext = next + 1, high = side + sides + 1, highNext = next + sides + 1;
    indices.push(0, low, lowNext, low, high, lowNext, lowNext, high, highNext, high, tip, highNext);
  }
  return indexedGeometry(positions, indices);
}

function createTwig() {
  const trunk = new BoxGeometry(.075, .40, .075);
  trunk.translate(0, -.025, 0);
  const parts = [trunk];
  for (const side of [-1, 1]) {
    const branch = new BoxGeometry(.065, .25, .065);
    branch.rotateZ(-side * .70);
    branch.translate(side * .08, .10, 0);
    parts.push(branch);
  }
  return mergeParts(parts);
}
