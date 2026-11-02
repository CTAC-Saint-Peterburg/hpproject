import { BoxGeometry, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const geometryCache = new Map();
const canonicalShape = shape => shape === 'slime' || shape === 'flyer' ? shape : 'cube';

export function createArenaEnemyGeometry(requestedShape = 'cube') {
  const shape = canonicalShape(requestedShape);
  let geometry;
  if (shape === 'slime') geometry = new SphereGeometry(1, 12, 8);
  else if (shape === 'flyer') {
    const parts = [new BoxGeometry(1.4, 1.2, 1.4)];
    for (const side of [-1, 1]) {
      const fin = new BoxGeometry(.16, .7, .8);
      fin.rotateZ(-side * .4).translate(side * .83, .02, 0);
      parts.push(fin);
    }
    geometry = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
  } else geometry = new BoxGeometry(1.4, 1.2, 1.4);
  geometry.deleteAttribute('uv');
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Three shared geometries remain stable across enemy spawns and wave changes.
export function getArenaEnemyGeometry(requestedShape = 'cube') {
  const shape = canonicalShape(requestedShape);
  if (!geometryCache.has(shape)) geometryCache.set(shape, createArenaEnemyGeometry(shape));
  return geometryCache.get(shape);
}
