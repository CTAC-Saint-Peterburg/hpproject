import { COIN_RADIUS, getCoinGeometries } from '../Defense/coinGeometry';

const project = (x, z) => `${50 + x / COIN_RADIUS * 46},${50 - z / COIN_RADIUS * 46}`;
const octagon = radius => Array.from({ length: 8 }, (_, i) => project(Math.cos(i * Math.PI / 4) * radius, Math.sin(i * Math.PI / 4) * radius)).join(' ');
// Project the actual raised front-face triangles once, reusing the toss model.
const spiral = getCoinGeometries().spiral;
const vertices = spiral.attributes.position;
const indices = spiral.index;
const faceY = spiral.boundingBox.max.y;
let facePath = '';
for (let i = 0; i < indices.count; i += 3) {
  const triangle = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
  if (triangle.every(index => Math.abs(vertices.getY(index) - faceY) < .00001)) {
    facePath += triangle.map((index, n) => `${n ? 'L' : 'M'}${project(vertices.getX(index), vertices.getZ(index))}`).join('') + 'Z';
  }
}

export default function CurrencyCoin({ className = '' }) {
  return <svg className={'currency-coin ' + className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <polygon points={octagon(COIN_RADIUS)} fill="var(--color-coin)" />
    <polygon points={octagon(.50)} fill="var(--color-coin-glow)" />
    <path d={facePath} fill="var(--color-arena-wood-line)" />
  </svg>;
}
