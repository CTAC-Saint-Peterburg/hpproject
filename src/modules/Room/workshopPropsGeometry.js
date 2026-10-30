import { BoxGeometry, Color, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { theme } from '../../static/theme.js';

// All props stay behind the ingredient/recipe interaction plane. Twenty-two boxes,
// 264 triangles, one vertex-coloured material and one draw call.
export function createWorkshopPropsGeometry() {
  const parts = [];
  const addBox = (size, position, colorToken) => {
    const geometry = new BoxGeometry(...size);
    geometry.translate(...position);
    geometry.deleteAttribute('uv');
    const color = new Color(theme.colors[colorToken]);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let index = 0; index < colors.length; index += 3) {
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    parts.push(geometry);
  };

  // A quiet, broad timber rack behind the two existing ingredient rows.
  // Narrow seams suggest planks without adding a texture or extra material.
  for (let plank = 0; plank < 5; plank++) {
    addBox([1.26, 3.25, .08], [2.04 + plank * 1.28, 1.9, -1.92],
      plank % 2 ? 'roomWoodDark' : 'roomWood');
  }
  for (const x of [1.4, 7.8]) {
    addBox([.14, 4.59, .3], [x, 1.295, -1.72], 'roomWoodLight');
  }
  for (const y of [.29, 3.51]) {
    addBox([6.54, .16, .3], [4.6, y, -1.72], 'roomWoodLight');
  }
  for (const y of [.78, 3.08]) {
    addBox([6.4, .12, .35], [4.6, y, -1.65], 'roomWood');
    for (const x of [1.7, 7.5]) {
      addBox([.12, .3, .25], [x, y - .2, -1.745], 'roomMetal');
    }
  }

  // The floating recipe remains the only writing: this is a dark slate backing
  // and a restrained timber frame, positioned behind the original text.
  addBox([4.7, 2.3, .08], [-3.1, .45, -1.65], 'roomBoard');
  for (const x of [-5.45, -.75]) {
    addBox([.12, 2.42, .12], [x, .45, -1.60], 'roomWoodLight');
  }
  for (const y of [-.7, 1.6]) {
    addBox([4.58, .12, .12], [-3.1, y, -1.60], 'roomWood');
  }
  for (const x of [-5.3, -.9]) {
    addBox([.14, .32, .18], [x, -.84, -1.64], 'roomWoodDark');
  }

  const geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
