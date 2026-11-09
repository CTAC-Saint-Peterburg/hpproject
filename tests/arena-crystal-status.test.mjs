import assert from 'node:assert/strict';
import test from 'node:test';
import { CylinderGeometry, OctahedronGeometry, PerspectiveCamera, Vector3 } from 'three';
import { arenaBaseCameraPose, arenaFrontBorder, crystalStatusPosition, potionRackPosition } from '../src/modules/Defense/arenaLayout.js';

test('the rim crystal stays to the left of three or four fixed potion slots, including empty bottles', () => {
  const border = arenaFrontBorder();
  for (const inventory of [{ frost: 1, flame: 1, echo: 1 }, { frost: 1, flame: 1, echo: 1, healing: 1 }]) {
    const position = crystalStatusPosition(inventory);
    assert.ok(position[0] + .4 < potionRackPosition('frost', inventory)[0] - .305);
    assert.ok(Math.abs(position[0]) + .4 < border.width / 2);
    assert.ok(position[1] > border.top);
    assert.equal(position[2], border.z);
    assert.deepEqual(crystalStatusPosition(Object.fromEntries(Object.keys(inventory).map(id => [id, 0]))), position);
  }
});

test('the actual status crystal and its outline clear the rim and fit portrait and wide arena cameras', () => {
  const base = new CylinderGeometry(.35, .4, .1, 6).translate(0, .05, 0);
  const crystal = new OctahedronGeometry(.32, 0).scale(1.13, 1.13, 1.13).translate(0, .43, 0);
  const point = new Vector3(), border = arenaFrontBorder();
  try {
    for (const inventory of [{ frost: 1, flame: 1, echo: 1 }, { frost: 1, flame: 1, echo: 1, healing: 1 }]) {
      const origin = new Vector3(...crystalStatusPosition(inventory));
      for (const aspect of [9 / 21, 9 / 16, 4 / 3, 16 / 9, 21 / 9, 32 / 9]) {
        const pose = arenaBaseCameraPose(aspect), camera = new PerspectiveCamera(50, aspect, .1, 1000);
        camera.position.fromArray(pose.position); camera.lookAt(new Vector3(...pose.target)); camera.updateMatrixWorld(true);
        for (const geometry of [base, crystal]) {
          const positions = geometry.getAttribute('position');
          for (let index = 0; index < positions.count; index++) {
            point.fromBufferAttribute(positions, index).add(origin);
            assert.ok(point.y >= border.top + .009);
            point.project(camera);
            assert.ok(Math.abs(point.x) < .95 && Math.abs(point.y) < .95 && point.z > -1 && point.z < 1,
              `rim status crystal clips at aspect ${aspect}`);
          }
        }
      }
    }
  } finally { base.dispose(); crystal.dispose(); }
});
