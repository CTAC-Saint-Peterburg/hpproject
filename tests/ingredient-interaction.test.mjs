import assert from 'node:assert/strict';
import test from 'node:test';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { getIngredientGeometry } from '../src/modules/Ingredients/ingredientGeometry.js';
import { ingredientRaycast } from '../src/modules/Ingredients/ingredientHitArea.js';

test('thin ingredients keep the old pickup area, including spaces around their silhouette', () => {
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(getIngredientGeometry(4), material);
  mesh.raycast = ingredientRaycast;
  mesh.position.set(2, 1, 0);
  mesh.updateMatrixWorld(true);
  const ray = new Raycaster();
  const hitsAt = (x, y) => {
    ray.set(new Vector3(x, y, 5), new Vector3(0, 0, -1));
    return ray.intersectObject(mesh);
  };
  try {
    assert.equal(hitsAt(2, 1).length, 1);
    const cornerHit = hitsAt(2.24, 1.24);
    assert.equal(cornerHit.length, 1);
    assert.equal(cornerHit[0].object, mesh);
    assert.ok(Math.abs(cornerHit[0].point.z - .275) < 1e-6);
    assert.equal(hitsAt(2.3, 1).length, 0);
    assert.equal(hitsAt(2, 1.3).length, 0);
    mesh.scale.setScalar(.5); mesh.updateMatrixWorld(true);
    assert.equal(hitsAt(2.12, 1.12).length, 1);
    assert.equal(hitsAt(2.15, 1).length, 0);
    ray.far = 4;
    assert.equal(hitsAt(2, 1).length, 0);
  } finally { material.dispose(); }
});
