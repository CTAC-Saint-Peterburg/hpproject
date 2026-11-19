import { BufferGeometry, Float32BufferAttribute } from 'three';

// Horizontal runs of a small letter grid become flat quads, split at the seam.
const glyphs = {
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  y: ['00000','00000','10001','10001','01111','00001','01110'],
  p: ['00000','11110','10001','11110','10000','10000','10000'],
  e: ['00000','00000','01110','10001','11111','10000','01111'],
  d: ['00001','00001','01111','10001','10001','10001','01111'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  o: ['00000','00000','01110','10001','10001','10001','01110'],
  t: ['00100','00100','11111','00100','00100','00100','00011'],
};

export function createTriptychTitleGeometry(side) {
  const vertices = [], cell = .058;
  for (const [word, baseline] of [['Hyped', .35], ['Pot', -.24]]) {
    const width = (word.length * 6 - 1) * cell;
    [...word].forEach((letter, index) => glyphs[letter].forEach((row, y) => {
      for (const run of row.matchAll(/1+/g)) {
        const x = -width / 2 + (index * 6 + run.index) * cell;
        const a = Math.max(x, side < 0 ? -1.1 : 0), b = Math.min(x + run[0].length * cell, side < 0 ? 0 : 1.1);
        if (b <= a) continue;
        // Door-local positions: left hinge at -1.1, right hinge at +1.1.
        const left = a - side * 1.1, right = b - side * 1.1;
        const top = baseline - y * cell, bottom = top - cell;
        vertices.push(left,bottom,.155, right,bottom,.155, right,top,.155,
          left,bottom,.155, right,top,.155, left,top,.155);
      }
    }));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeBoundingBox();
  return geometry;
}
