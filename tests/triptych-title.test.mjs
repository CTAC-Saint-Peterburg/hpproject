import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { createTriptychTitleGeometry } from '../src/modules/Menu/triptychTitleGeometry.js';

test('title halves stay on their own door face and move apart with the hinges', () => {
  let triangles = 0;
  for (const side of [-1, 1]) {
    const geometry = createTriptychTitleGeometry(side), points = geometry.attributes.position;
    triangles += points.count / 3;
    for (let i = 0; i < points.count; i++) {
      const local = new Vector3().fromBufferAttribute(points, i);
      const closedX = local.x + side * 1.1;
      assert.ok(closedX * side >= -1e-7 && Math.abs(closedX) < 1.1);
      assert.ok(local.z > .14 && local.z < .17, 'face is above the panel, without floating');
      const opened = local.clone().applyAxisAngle(new Vector3(0, 1, 0), side * 2.25);
      assert.ok((opened.x + side * 1.1) * side > closedX * side, 'letter follows door outward');
    }
    geometry.dispose();
  }
  assert.ok(triangles < 200, `${triangles} triangles`);
});
