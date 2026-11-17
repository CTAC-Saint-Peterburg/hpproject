import { ExtrudeGeometry, Shape } from 'three';

export const STAR_PLACEMENTS = [-.65, 0, .65].map(angle => ({
  position: [Math.sin(angle) * .84, -.08, Math.cos(angle) * .84], angle,
}));
export function createCauldronStarGeometry() {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .075 : .16;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.deleteAttribute('uv');
  return geometry;
}
