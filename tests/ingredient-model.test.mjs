import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createIngredientGeometry, getIngredientGeometry, INGREDIENT_MODEL_SIZE } from '../src/modules/Ingredients/ingredientGeometry.js';

test('all ingredient shapes fit the existing cube and retain a small finite triangle budget', () => {
  for (let id = 1; id <= 6; id++) {
    const geometry = createIngredientGeometry(id);
    try {
      assert.ok(geometry.index.count / 3 <= 100, `ingredient ${id} exceeds 100 triangles`);
      assert.ok(geometry.index.count > 0);
      assert.equal(geometry.getAttribute('uv'), undefined, 'ingredients do not need texture buffers');
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
      assert.equal(normals.count, positions.count);
      for (const attribute of [positions, normals]) assert.ok([...attribute.array].every(Number.isFinite));
      for (const index of geometry.index.array) assert.ok(index >= 0 && index < positions.count);
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(geometry.boundingBox.max[axis] <= INGREDIENT_MODEL_SIZE / 2 + 1e-6);
        assert.ok(geometry.boundingBox.min[axis] >= -INGREDIENT_MODEL_SIZE / 2 - 1e-6);
        assert.ok(Math.abs(geometry.boundingBox.max[axis] + geometry.boundingBox.min[axis]) < 1e-6);
      }
    } finally { geometry.dispose(); }
  }
});

test('shared ingredient geometry uses four canonical meshes, including decoys and unknown IDs', () => {
  assert.equal(getIngredientGeometry(1), getIngredientGeometry(5));
  assert.equal(getIngredientGeometry(4), getIngredientGeometry(6));
  assert.equal(getIngredientGeometry(-1), getIngredientGeometry(1));
  assert.equal(getIngredientGeometry(undefined), getIngredientGeometry(1));
  assert.equal(new Set(Array.from({ length: 6 }, (_, index) => getIngredientGeometry(index + 1))).size, 4);
  for (let id = 1; id <= 6; id++) assert.equal(getIngredientGeometry(id), getIngredientGeometry(id));
});

test('all silhouettes can be picked from the game camera, including the flat petals', () => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  try {
    for (const id of [1, 2, 3, 4]) {
      const geometry = createIngredientGeometry(id);
      const mesh = new Mesh(geometry, material);
      mesh.updateMatrixWorld(true);
      const ray = new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1));
      try { assert.ok(ray.intersectObject(mesh).length > 0, `ingredient ${id} cannot be selected from the front`); }
      finally { geometry.dispose(); }
    }
  } finally { material.dispose(); }
});

test('bean and dew are closed volumes and the twig remains three rectangular sticks', () => {
  // Every edge of a closed indexed volume is shared by two triangles.
  for (const id of [2, 3]) {
    const geometry = createIngredientGeometry(id);
    const edges = new Map();
    try {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const face = [indices[i], indices[i + 1], indices[i + 2]];
        for (let edge = 0; edge < 3; edge++) {
          const a = face[edge], b = face[(edge + 1) % 3];
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      assert.ok([...edges.values()].every(count => count === 2), `ingredient ${id} has an open edge`);
    } finally { geometry.dispose(); }
  }
  const twig = createIngredientGeometry(4);
  try { assert.equal(twig.index.count / 3, 36, 'three solid boxes use 36 triangles'); }
  finally { twig.dispose(); }
});
