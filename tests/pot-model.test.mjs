import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { CAULDRON, createCauldronGeometry } from '../src/modules/Pot/cauldronGeometry.js';

test('cauldron metal has finite indexed geometry within a small low-poly budget', () => {
  const geometry = createCauldronGeometry();
  try {
    assert.ok(geometry.index, 'merged metal must retain its index buffer');
    assert.ok(geometry.index.count / 3 <= 700, 'metal must stay below 700 triangles');
    assert.ok(geometry.index.count > 0);
    assert.equal(geometry.getAttribute('uv'), undefined, 'the textureless model needs no UV buffer');
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    assert.equal(normals.count, positions.count);
    for (const attribute of [positions, normals]) {
      assert.ok([...attribute.array].every(Number.isFinite));
    }
    for (const index of geometry.index.array) assert.ok(index >= 0 && index < positions.count);
    const bounds = geometry.boundingBox;
    assert.ok(bounds.max.y > .4 && bounds.max.y < .8);
    assert.ok(bounds.max.x < 1.1 && bounds.min.x > -1.1, 'handles stay near the existing interaction area');
  } finally { geometry.dispose(); }
});

test('tilted cauldron has an open mouth and clear central ingredient descent', () => {
  const geometry = createCauldronGeometry();
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = CAULDRON.tilt;
  mesh.updateMatrixWorld(true);
  const ray = new Raycaster();
  try {
    // A ray through the opening must reach the cavity floor, not a cap at the lip.
    for (const [x, z] of [[0, 0], [.2, 0], [-.2, 0], [0, .2], [0, -.2]]) {
      ray.set(new Vector3(x, 2, z), new Vector3(0, -1, 0));
      const hits = ray.intersectObject(mesh);
      assert.ok(hits.length > 0, 'the pot needs a closed underside');
      assert.ok(hits[0].point.y < 0 && hits[0].point.y > -.8, 'no metal cap may span the mouth');
    }
    // The existing animation ends at world [0, -.15, 0], inside the hollow bowl.
    ray.set(new Vector3(0, -.15, 0), new Vector3(0, 1, 0));
    assert.equal(ray.intersectObject(mesh).length, 0, 'the drop path above the landing point must remain clear');
    // Unlike the opening, the substantial raised lip must remain actual geometry.
    ray.set(new Vector3(.6, 2, 0), new Vector3(0, -1, 0));
    assert.ok(ray.intersectObject(mesh)[0]?.point.y > .45);
  } finally { geometry.dispose(); material.dispose(); }
});

test('tilted feet stay above the floor and the model leaves room for ingredient flight', () => {
  const geometry = createCauldronGeometry();
  const rotation = new Matrix4().makeRotationX(CAULDRON.tilt);
  const vertex = new Vector3();
  const positions = geometry.getAttribute('position');
  try {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let index = 0; index < positions.count; index++) {
      vertex.fromBufferAttribute(positions, index).applyMatrix4(rotation);
      highest = Math.max(highest, vertex.y);
      lowest = Math.min(lowest, vertex.y);
    }
    assert.ok(lowest >= -1, 'baseline tilt must not bury the feet below the floor at Y=-1');
    assert.ok(lowest < -.9, 'the tripod must rest close to the floor');
    assert.ok(highest < 1, 'the 1.8-unit ingredient lift must clear the entire model');
    assert.ok(CAULDRON.mouthRadius >= .4, 'mouth must fit a shrinking ingredient cube');
  } finally { geometry.dispose(); }
});
