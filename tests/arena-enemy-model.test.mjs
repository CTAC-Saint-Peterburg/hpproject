import assert from 'node:assert/strict';
import test from 'node:test';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createArenaEnemyGeometry, getArenaEnemyGeometry } from '../src/modules/Defense/arenaEnemyGeometry.js';

test('arena enemy primitives remain finite, textureless and within small per-model triangle budgets', () => {
  for (const [shape, budget] of [['cube', 12], ['flyer', 36], ['slime', 200]]) {
    const geometry = createArenaEnemyGeometry(shape);
    try {
      assert.ok(geometry.index.count / 3 <= budget);
      assert.ok(geometry.index.count > 0);
      assert.equal(geometry.getAttribute('uv'), undefined);
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      assert.equal(positions.count, normals.count);
      for (const attribute of [positions, normals]) assert.ok([...attribute.array].every(Number.isFinite));
      for (const index of geometry.index.array) assert.ok(index >= 0 && index < positions.count);
      assert.ok(geometry.boundingSphere.radius > 0 && geometry.boundingSphere.radius < 2);
    } finally { geometry.dispose(); }
  }
});

test('both flyer fins protrude beyond the cube and remain part of its selectable surface', () => {
  const flyer = createArenaEnemyGeometry('flyer');
  const cube = createArenaEnemyGeometry('cube');
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(flyer, material);
  mesh.updateMatrixWorld(true);
  try {
    assert.ok(flyer.boundingBox.min.x < cube.boundingBox.min.x - .2);
    assert.ok(flyer.boundingBox.max.x > cube.boundingBox.max.x + .2);
    assert.ok(Math.abs(flyer.boundingBox.max.x + flyer.boundingBox.min.x) < 1e-6);
    for (const side of [-1, 1]) {
      const ray = new Raycaster(new Vector3(side * .9, .15, 3), new Vector3(0, 0, -1));
      assert.ok(ray.intersectObject(mesh).length > 0, `fin on side ${side} cannot be clicked`);
    }
  } finally { flyer.dispose(); cube.dispose(); material.dispose(); }
});

test('enemy geometry shares only three fixed shapes and unknown variants fall back to a cube', () => {
  for (const shape of ['cube', 'flyer', 'slime']) assert.equal(getArenaEnemyGeometry(shape), getArenaEnemyGeometry(shape));
  assert.equal(getArenaEnemyGeometry('sentinel'), getArenaEnemyGeometry('cube'));
  assert.equal(getArenaEnemyGeometry('giant'), getArenaEnemyGeometry('cube'));
  assert.equal(getArenaEnemyGeometry(undefined), getArenaEnemyGeometry('cube'));
  assert.equal(new Set(['cube', 'flyer', 'slime', 'sentinel', 'giant'].map(getArenaEnemyGeometry)).size, 3);
});
