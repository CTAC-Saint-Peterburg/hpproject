import assert from 'node:assert/strict';
import test from 'node:test';
import { Euler, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { writeArenaCameraPose } from '../src/modules/Defense/coinCamera.js';
import { getCoinGeometries } from '../src/modules/Defense/coinGeometry.js';
import { createCoinToss, coinPose } from '../src/modules/Defense/coinMotion.js';
import { arenaBaseCameraPose } from '../src/modules/Defense/arenaLayout.js';

test('returning from coin focus restores the enlarged arena framing exactly', () => {
  const out = { position: [0, 0, 0], target: [0, 0, 0] };
  for (const aspect of [9 / 21, 9 / 16, 16 / 9, 32 / 9]) {
    writeArenaCameraPose(out, aspect, [.5, .12, 3], 1);
    writeArenaCameraPose(out, aspect, [.5, .12, 3], 0);
    assert.deepEqual(out.position, arenaBaseCameraPose(aspect).position);
    assert.deepEqual(out.target, [0, 0, 0]);
  }
});

test('the focused camera fits the actual coin and its raised symbols on portrait and wide screens', () => {
  const out = { position: [0, 0, 0], target: [0, 0, 0] };
  const plan = createCoinToss(() => .71);
  const matrix = new Matrix4(), point = new Vector3();
  for (const result of [true, false]) {
    const settled = coinPose(plan, plan.duration, result);
    matrix.makeRotationFromEuler(new Euler(...settled.rotation));
    matrix.setPosition(...settled.position);
    for (const aspect of [9 / 21, 9 / 16, 16 / 9, 32 / 9]) {
      writeArenaCameraPose(out, aspect, settled.position, 1);
      const camera = new PerspectiveCamera(50, aspect, .1, 1000);
      camera.position.fromArray(out.position); camera.lookAt(new Vector3(...out.target)); camera.updateMatrixWorld(true);
      for (const geometry of Object.values(getCoinGeometries())) {
        const positions = geometry.attributes.position;
        for (let index = 0; index < positions.count; index++) {
          point.fromBufferAttribute(positions, index).applyMatrix4(matrix).project(camera);
          assert.ok(Math.abs(point.x) < .9 && Math.abs(point.y) < .9 && point.z > -1 && point.z < 1,
            `coin face must remain readable at aspect ${aspect}`);
        }
      }
    }
  }
});
