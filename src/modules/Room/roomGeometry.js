import { BoxGeometry, BufferGeometry, CircleGeometry, Color, CylinderGeometry, Float32BufferAttribute, OctahedronGeometry, PlaneGeometry, RingGeometry, Shape, ShapeGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { theme } from '../../static/theme.js';

export const ROOM = Object.freeze({
  backZ: -6.5,
  frontZ: 9,
  floorY: -1,
  wallTopY: 8.5,
  minHalfWidth: 11,
  maxHalfWidth: 48,
});

// Everything is built once, grouped by material and merged into five meshes.
// Small colour variations and painted mortar replace textures and extra lights.
export function createBrewingRoomGeometry(requestedHalfWidth = 15) {
  const halfWidth = Math.max(ROOM.minHalfWidth, Math.min(ROOM.maxHalfWidth,
    Number.isFinite(requestedHalfWidth) ? requestedHalfWidth : 15));
  const groups = { stone: [], wood: [], metal: [], glass: [], banners: [] };
  const depth = ROOM.frontZ - ROOM.backZ;
  const height = ROOM.wallTopY - ROOM.floorY;
  const middleY = (ROOM.wallTopY + ROOM.floorY) / 2;
  const middleZ = (ROOM.frontZ + ROOM.backZ) / 2;

  function add(category, source, token, shade = 1, gradient = null) {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute('uv');
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const base = themeColor(token).multiplyScalar(shade);
    const top = gradient ? themeColor(gradient.token).multiplyScalar(shade) : base;
    const color = new Color();
    for (let i = 0; i < positions.count; i++) {
      const blend = gradient ? Math.max(0, Math.min(1, (positions.getY(i) - gradient.bottom) / (gradient.top - gradient.bottom))) : 0;
      color.copy(base).lerp(top, blend);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    groups[category].push(geometry);
  }

  function box(category, dimensions, position, token, shade = 1, rotation = null) {
    const geometry = new BoxGeometry(...dimensions);
    if (rotation) {
      geometry.rotateX(rotation[0]);
      geometry.rotateY(rotation[1]);
      geometry.rotateZ(rotation[2]);
    }
    geometry.translate(...position);
    add(category, geometry, token, shade);
  }

  function plane(category, width, height, position, token, rotationY = 0, shade = 1) {
    const geometry = new PlaneGeometry(width, height);
    geometry.rotateY(rotationY);
    geometry.translate(...position);
    add(category, geometry, token, shade);
  }

  function upperArch(category, x, springY, radius, z, token, gradient = null) {
    const geometry = new CircleGeometry(radius, 8, 0, Math.PI);
    geometry.translate(x, springY, z);
    add(category, geometry, token, 1, gradient);
  }

  function archTrim(x, springY, innerRadius, outerRadius, z) {
    // Eight separated voussoirs give the arch a block-built silhouette.
    add('stone', new RingGeometry(innerRadius - .025, outerRadius + .06, 8, 1, 0, Math.PI)
      .translate(x, springY, z - .025), 'roomMortar');
    for (let segment = 0; segment < 8; segment++) {
      const arch = new RingGeometry(innerRadius, outerRadius, 1, 1,
        segment * Math.PI / 8 + .009, Math.PI / 8 - .018);
      arch.translate(x, springY, z);
      add('stone', arch, segment % 3 === 0 ? 'roomStone' : 'roomStoneLight');
    }
  }

  // Structural planes remain solid behind the decorative recesses.
  box('stone', [halfWidth * 2, height, .32], [0, middleY, ROOM.backZ - .16], 'roomStone');
  for (const side of [-1, 1]) {
    box('stone', [.32, height, depth], [side * (halfWidth + .16), middleY, middleZ], 'roomStone', .88);
  }

  // Flagstones: column/row caps bound geometry even on ultrawide displays.
  const floor = new PlaneGeometry(halfWidth * 2, depth);
  floor.rotateX(-Math.PI / 2).translate(0, ROOM.floorY - .018, middleZ);
  add('stone', floor, 'roomMortar');
  const tileColumns = Math.min(32, Math.ceil(halfWidth * 2 / 1.7));
  const tileRows = 8;
  const tileWidth = halfWidth * 2 / tileColumns;
  const tileDepth = depth / tileRows;
  for (let row = 0; row < tileRows; row++) {
    for (let column = 0; column < tileColumns; column++) {
      const tile = new PlaneGeometry(tileWidth - .035, tileDepth - .035);
      tile.rotateX(-Math.PI / 2).translate(-halfWidth + tileWidth * (column + .5), ROOM.floorY,
        ROOM.backZ + tileDepth * (row + .5));
      add('stone', tile, (column + row * 3) % 5 === 0 ? 'roomFloorLight' : 'roomFloor', 1 - ((column * 7 + row * 3) % 4) * .025);
    }
  }

  // Mortar is painted with narrow quads instead of separate block meshes.
  const rows = 13;
  const rowHeight = height / rows;
  const backColumns = Math.min(28, Math.ceil(halfWidth * 2 / 2.1));
  const blockWidth = halfWidth * 2 / backColumns;
  const sideColumns = 8;
  const sideBlockDepth = depth / sideColumns;
  for (let row = 0; row <= rows; row++) {
    const y = ROOM.floorY + row * rowHeight;
    const seamY = Math.max(ROOM.floorY + .0125, Math.min(ROOM.wallTopY - .0125, y));
    plane('stone', halfWidth * 2, .025, [0, seamY, ROOM.backZ + .008], 'roomMortar', 0, .95);
    for (const side of [-1, 1]) {
      plane('stone', depth, .025, [side * (halfWidth - .008), seamY, middleZ], 'roomMortar', -side * Math.PI / 2, .9);
    }
    if (row === rows) continue;
    const offset = row % 2 ? .5 : 0;
    for (let column = 0; column < backColumns; column++) {
      const x = -halfWidth + (column + offset) * blockWidth;
      if (x > -halfWidth + .03 && x < halfWidth - .03) {
        plane('stone', .023, rowHeight - .025, [x, y + rowHeight / 2, ROOM.backZ + .009], 'roomMortar');
      }
    }
    for (const side of [-1, 1]) {
      for (let column = 0; column < sideColumns; column++) {
        const z = ROOM.backZ + (column + offset) * sideBlockDepth;
        if (z > ROOM.backZ + .03 && z < ROOM.frontZ - .03) {
          plane('stone', .023, rowHeight - .025, [side * (halfWidth - .009), y + rowHeight / 2, z],
            'roomMortar', -side * Math.PI / 2, .9);
        }
      }
    }
  }

  // A quiet, darker inset keeps the recipe text legible against the room.
  plane('stone', 4.4, 3.3, [-5.9, .85, ROOM.backZ + .025], 'roomStoneDark');

  // Stepped pilasters, plinths and continuous cornices suggest castle masonry.
  const columnXs = [-halfWidth + .7, -4.4, 4.4, halfWidth - .7];
  if (halfWidth > 20) columnXs.push(-halfWidth * .55, halfWidth * .55);
  for (const x of columnXs) {
    box('stone', [.68, 7.25, .46], [x, 3.25, ROOM.backZ + .22], 'roomStoneLight', .96);
    for (const [width, stepHeight, y, forward] of [[1.08, .25, -.85, .38], [.88, .22, -.615, .32], [.78, .18, -.415, .28],
      [.84, .19, 6.97, .31], [1.02, .23, 7.18, .38], [1.17, .18, 7.385, .44]]) {
      box('stone', [width, stepHeight, forward + .24], [x, y, ROOM.backZ + forward / 2], 'roomStoneLight');
    }
    for (let band = 0; band < 5; band++) {
      box('stone', [.73, .055, .5], [x, .3 + band * 1.3, ROOM.backZ + .245], 'roomStone', .95);
    }
  }
  for (const [y, stepHeight, reach] of [[7.62, .18, .24], [7.86, .3, .38], [8.18, .34, .54]]) {
    box('stone', [halfWidth * 2, stepHeight, reach], [0, y, ROOM.backZ + reach / 2], 'roomStoneLight', .95);
    for (const side of [-1, 1]) {
      box('stone', [reach, stepHeight, depth], [side * (halfWidth - reach / 2), y, middleZ], 'roomStoneLight', .88);
    }
  }
  box('stone', [halfWidth * 2, .22, .23], [0, -.7, ROOM.backZ + .115], 'roomStoneDark');
  for (const side of [-1, 1]) {
    box('stone', [.23, .22, depth], [side * (halfWidth - .115), -.7, middleZ], 'roomStoneDark');
  }

  // The central arched door is dark wood under an inexpensive iron grille.
  const doorX = -.8;
  const doorSpring = 1.8;
  const doorRadius = 1.5;
  const doorZ = ROOM.backZ + .055;
  plane('wood', doorRadius * 2, doorSpring - ROOM.floorY, [doorX, (doorSpring + ROOM.floorY) / 2, doorZ], 'roomWoodDark');
  upperArch('wood', doorX, doorSpring, doorRadius, doorZ, 'roomWoodDark');
  for (let plank = -6; plank <= 6; plank++) {
    const x = plank * .225;
    const top = doorSpring + Math.sqrt(Math.max(0, doorRadius * doorRadius - (Math.abs(x) + .105) ** 2));
    plane('wood', .205, top - ROOM.floorY - .08, [doorX + x, (top + ROOM.floorY + .08) / 2, doorZ + .006],
      plank % 3 === 0 ? 'roomWood' : 'roomWoodDark');
  }
  archTrim(doorX, doorSpring, 1.53, 1.9, ROOM.backZ + .29);
  for (const side of [-1, 1]) {
    box('stone', [.37, doorSpring - ROOM.floorY, .4], [doorX + side * 1.715, (doorSpring + ROOM.floorY) / 2, ROOM.backZ + .2], 'roomStoneLight');
    box('stone', [.52, .25, .55], [doorX + side * 1.715, -.865, ROOM.backZ + .275], 'roomStone');
  }
  for (let bar = -3; bar <= 3; bar++) {
    const x = bar * .38;
    const top = doorSpring + Math.sqrt(doorRadius * doorRadius - x * x) - .12;
    box('metal', [.052, top - ROOM.floorY - .18, .075], [doorX + x, (top + ROOM.floorY + .18) / 2, doorZ + .075], 'roomMetal');
  }
  for (const y of [-.05, 1.25]) box('metal', [2.88, .075, .085], [doorX, y, doorZ + .09], 'roomMetal');
  box('metal', [.28, .36, .04], [doorX + .65, .58, doorZ + .115], 'roomMetal');
  add('metal', new RingGeometry(.075, .11, 6).translate(doorX + .65, .54, doorZ + .14), 'roomMetal');

  // Blue windows stay high and away from the recipe's projected background.
  for (const x of [-8.2, 8.2]) {
    const bottom = 2.4, spring = 4.9, radius = 1.18, z = ROOM.backZ + .065;
    const glassGradient = { token: 'roomGlassHigh', bottom, top: spring + radius };
    const pane = new PlaneGeometry(radius * 2, spring - bottom);
    pane.translate(x, (spring + bottom) / 2, z);
    add('glass', pane, 'roomGlassLow', 1, glassGradient);
    upperArch('glass', x, spring, radius, z, 'roomGlassLow', glassGradient);
    archTrim(x, spring, 1.2, 1.52, ROOM.backZ + .29);
    for (const side of [-1, 1]) {
      box('stone', [.31, spring - bottom, .4], [x + side * 1.365, (spring + bottom) / 2, ROOM.backZ + .2], 'roomStoneLight');
    }
    box('stone', [3.16, .22, .62], [x, bottom - .12, ROOM.backZ + .31], 'roomStoneLight');
    for (const offset of [-.39, .39]) {
      const top = spring + Math.sqrt(radius * radius - offset * offset) - .04;
      box('metal', [.055, top - bottom, .08], [x + offset, (top + bottom) / 2, z + .065], 'roomMetal');
    }
    box('metal', [radius * 2, .07, .08], [x, 4.15, z + .07], 'roomMetal');
  }

  // Sparse ceiling beams and two plain hanging banners complete the silhouette.
  for (const z of [-5.1, .8, 6.7]) {
    box('wood', [halfWidth * 2, .26, .32], [0, 7.48, z], 'roomWoodDark');
  }
  for (const x of [-4.4, 4.4]) {
    const shape = new Shape().moveTo(-.4, 1.1).lineTo(.4, 1.1).lineTo(.4, -.86).lineTo(0, -1.15).lineTo(-.4, -.86).closePath();
    const banner = new ShapeGeometry(shape);
    banner.translate(x, 4.7, ROOM.backZ + .59);
    add('banners', banner, x < 0 ? 'roomBannerGreen' : 'roomBannerBlue');
    box('metal', [1.04, .065, .1], [x, 5.88, ROOM.backZ + .62], 'roomMetal');
    const emblem = new PlaneGeometry(.28, .28);
    emblem.rotateZ(Math.PI / 4).translate(x, 4.85, ROOM.backZ + .603);
    add('banners', emblem, 'roomStoneLight');
  }

  // Flames join the unlit glass batch: no dynamic lights, shadows or animation.
  for (const x of [-3.05, 2.2]) {
    box('metal', [.22, .38, .08], [x, 2.0, ROOM.backZ + .38], 'roomMetal');
    const holder = new CylinderGeometry(.065, .09, .48, 6);
    holder.translate(x, 2.17, ROOM.backZ + .63);
    add('metal', holder, 'roomMetal');
    const flame = new OctahedronGeometry(.18, 0);
    flame.scale(.66, 1.35, .66).translate(x, 2.59, ROOM.backZ + .63);
    add('glass', flame, 'roomFlame');
    const core = new OctahedronGeometry(.09, 0);
    core.scale(.7, 1.25, .7).translate(x, 2.55, ROOM.backZ + .75);
    add('glass', core, 'roomFlameCore');
  }

  return Object.fromEntries(Object.entries(groups).map(([name, parts]) => {
    const merged = parts.length ? mergeGeometries(parts) : new BufferGeometry();
    parts.forEach(part => part.dispose());
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return [name, merged];
  }));
}

function themeColor(token) {
  const value = theme.colors[token];
  if (!value) throw new Error('Missing room theme color: ' + token);
  return new Color(value);
}
