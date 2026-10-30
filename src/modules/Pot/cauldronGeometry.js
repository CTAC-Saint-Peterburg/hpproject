import { BoxGeometry, CylinderGeometry, LatheGeometry, TorusGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CAULDRON = {
  segments: 12,
  tilt: .22,
  mouthY: .53,
  mouthRadius: .51,
  liquidY: .43,
  // Closed underside, broad belly, narrow neck, thick lip and a real inner wall.
  profile: [
    [0, -.6], [.30, -.6], [.56, -.51], [.74, -.30], [.79, -.04],
    [.74, .22], [.60, .38], [.60, .48], [.66, .48], [.66, .57],
    [.51, .57], [.51, .43], [.58, .32], [.66, .15], [.69, -.04],
    [.63, -.26], [.46, -.43], [0, -.43],
  ],
};

// All metal pieces share a material and are merged once: one draw call.
export function createCauldronGeometry() {
  const parts = [new LatheGeometry(CAULDRON.profile.map(point => new Vector2(...point)), CAULDRON.segments)];
  for (const side of [-1, 1]) {
    const handle = new TorusGeometry(.19, .045, 3, 8);
    handle.scale(.85, 1, 1);
    handle.translate(side * .82, .23, .02);
    parts.push(handle);
    const hinge = new BoxGeometry(.13, .13, .12);
    hinge.translate(side * .70, .34, .02);
    parts.push(hinge);
  }
  for (let index = 0; index < 3; index++) {
    const angle = Math.PI / 2 + index * Math.PI * 2 / 3;
    const x = Math.cos(angle), z = Math.sin(angle);
    const leg = new CylinderGeometry(.085, .115, .4, 4, 1);
    leg.rotateZ(-x * .18);
    leg.rotateX(z * .18);
    placeFooting(leg, x * .48, -.76, z * .48);
    parts.push(leg);
    const foot = new BoxGeometry(.20, .09, .23);
    foot.rotateY(-angle);
    placeFooting(foot, x * .52, -.94, z * .52);
    parts.push(foot);
  }
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  geometry.deleteAttribute('uv');
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Compensate only the static presentation tilt so all three feet meet the floor.
// The whole assembled model can still sway together while stirring.
function placeFooting(geometry, x, y, z) {
  const cosine = Math.cos(CAULDRON.tilt), sine = Math.sin(CAULDRON.tilt);
  geometry.rotateX(-CAULDRON.tilt);
  geometry.translate(x, y * cosine + z * sine, -y * sine + z * cosine);
}
