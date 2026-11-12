import { ROOM } from './roomGeometry.js';
import brewing from '../../static/brewing.json' with { type: 'json' };

// Only the distant touch camera needs a deeper floor and a taller background.
// Reuse the same merged room meshes and fixed tile/seam counts.
export function brewingRoomOptions(cameraDepth, fov) {
  if (!(cameraDepth > brewing.scene.cameraPosition[2] + 1e-6)) return {};
  return { frontZ: cameraDepth + .5,
    wallTopY: Math.max(ROOM.wallTopY, (cameraDepth - ROOM.backZ) * Math.tan(fov * Math.PI / 360) + .5) };
}
