import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createPotionGeometry, getPotionGeometry, POTION_MODEL_HEIGHT, POTION_MODELS } from '../src/modules/Potions/potionGeometry.js';

const dispose = model => Object.values(model).forEach(geometry => geometry.dispose());

test('all potion models are closed low-poly bottles with a common feet origin and height', () => {
  for (const name of POTION_MODELS) {
    const model = createPotionGeometry(name);
    try {
      let triangles = 0;
      for (const geometry of Object.values(model)) {
        const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
        triangles += geometry.index.count / 3;
        assert.equal(geometry.getAttribute('uv'), undefined);
        assert.equal(position.count, normal.count);
        for (const attribute of [position, normal]) assert.ok([...attribute.array].every(Number.isFinite));
        for (const index of geometry.index.array) assert.ok(index >= 0 && index < position.count);
        const edges = new Map();
        for (let i = 0; i < geometry.index.count; i += 3) {
          const face = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
          for (let edge = 0; edge < 3; edge++) {
            const a = face[edge], b = face[(edge + 1) % 3];
            const key = a < b ? `${a}:${b}` : `${b}:${a}`;
            edges.set(key, (edges.get(key) ?? 0) + 1);
          }
        }
        assert.ok([...edges.values()].every(count => count === 2), `${name} has an open seam`);
      }
      assert.ok(triangles <= 120, `${name} exceeds the bottle triangle budget`);
      assert.equal(model.body.boundingBox.min.y, 0);
      assert.equal(model.stopper.boundingBox.max.y, POTION_MODEL_HEIGHT);
      assert.ok(model.stopper.boundingBox.min.y < model.body.boundingBox.max.y, 'stopper must meet the neck without a gap');
      assert.ok(model.body.boundingBox.max.x <= .32 && model.body.boundingBox.min.x >= -.32);
    } finally { dispose(model); }
  }
});

test('bottles have three distinguishable silhouettes and can be selected through their visible bodies and caps', () => {
  const widths = new Set();
  const material = new MeshBasicMaterial();
  try {
    for (const name of POTION_MODELS) {
      const model = createPotionGeometry(name);
      try {
        widths.add((model.body.boundingBox.max.x - model.body.boundingBox.min.x).toFixed(3));
        for (const [part, height] of [['body', .35], ['stopper', .95]]) {
          const mesh = new Mesh(model[part], material);
          mesh.updateMatrixWorld(true);
          const hit = new Raycaster(new Vector3(0, height, 2), new Vector3(0, 0, -1)).intersectObject(mesh)[0];
          assert.ok(hit, `${name} ${part} cannot be picked from the front`);
        }
      } finally { dispose(model); }
    }
    assert.equal(widths.size, 3);
  } finally { material.dispose(); }
});

test('every potion configuration maps to a shared model and unknown models reuse the vial', () => {
  const potions = JSON.parse(readFileSync(new URL('../src/static/potions.json', import.meta.url), 'utf8'));
  assert.equal(potions.length, 4);
  for (const potion of potions) {
    assert.ok(POTION_MODELS.includes(potion.model));
    assert.equal(getPotionGeometry(potion.model), getPotionGeometry(potion.model));
  }
  assert.equal(new Set(potions.map(potion => getPotionGeometry(potion.model))).size, 3);
  assert.equal(getPotionGeometry('unknown'), getPotionGeometry('vial'));
  assert.equal(getPotionGeometry(undefined), getPotionGeometry('vial'));
});
