import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { SPAWN_BOTTLES_CORDS } from '../src/static/constants.js';
import { projectedIngredientHit, ingredientMayFollow, projectIngredientPointer, clampIngredientPointer, brewingCameraDepth } from '../src/modules/Ingredients/ingredientPointer.js';
import { createPointerInput } from '../src/modules/Input/pointerInput.js';

const scene = JSON.parse(readFileSync(new URL('../src/static/brewing.json', import.meta.url), 'utf8')).scene;
function cameraFor(aspect = 16 / 9, touch = true) {
  const camera = new PerspectiveCamera(scene.cameraFov, aspect, .1, 1000);
  camera.position.set(scene.cameraPosition[0], scene.cameraPosition[1], brewingCameraDepth(scene, aspect, touch));
  camera.updateMatrixWorld(true);
  return camera;
}

test('all brewing ingredients and recipe markers remain inside the touch camera on narrow and wide screens', () => {
  for (const aspect of [9 / 21, 9 / 16, 4 / 3, 16 / 9, 32 / 9]) {
    const camera = cameraFor(aspect);
    for (const point of [...SPAWN_BOTTLES_CORDS.map(item => item.cords), [-4.25, 1, 0], [-4.25, -.35, 0]]) {
      for (const dx of [-.3, .3]) for (const dy of [-.3, .3]) {
        const visible = new Vector3(point[0] + dx, point[1] + dy, point[2]).project(camera);
        assert.ok(Math.abs(visible.x) < .98 && Math.abs(visible.y) < .98 && visible.z > -1 && visible.z < 1);
      }
    }
    assert.equal(brewingCameraDepth(scene, aspect, false), scene.cameraPosition[2], 'desktop camera is unchanged');
  }
});

test('nearby touch picking follows the actual moved ingredient and uses CSS pixels rather than device pixels', () => {
  for (const aspect of [9 / 16, 16 / 9]) {
    const camera = cameraFor(aspect), rect = { width: 540 * aspect, height: 540 };
    const original = new Vector3(2, 1, 0), actual = new Vector3(-2, 2, 0);
    const projected = actual.clone().project(camera);
    assert.equal(projectedIngredientHit(projected, actual, camera, rect), true);
    assert.equal(projectedIngredientHit({ x: projected.x + 43 * 2 / rect.width, y: projected.y }, actual, camera, rect), true);
    assert.equal(projectedIngredientHit({ x: projected.x + 45 * 2 / rect.width, y: projected.y }, actual, camera, rect), false);
    assert.equal(projectedIngredientHit(original.clone().project(camera), actual, camera, rect), false);
    assert.equal(projectedIngredientHit(projected, null, camera, rect), false);
    assert.equal(projectedIngredientHit(projected, new Vector3(0, 0, camera.position.z + 1), camera, rect), false);
  }
});

test('touch drags stay separate from spell drawing and leave the held position unchanged during far-away casts', () => {
  const camera = cameraFor(), rect = { left: 0, top: 0, width: 1280, height: 720 };
  const held = new Vector3(2, 1, 0), raycaster = new Raycaster(), target = held.clone();
  let dragging = false, casts = 0, suppress = false;
  const controller = createPointerInput({
    getMode: () => 'touch',
    isNearHeld: point => projectedIngredientHit(point, held, camera, rect),
    onDrag: point => {
      dragging = true;
      if (ingredientMayFollow(true, true, dragging, 1, 1)) projectIngredientPointer(point, camera, 0, raycaster, target);
    },
    onCast: () => casts++,
    onSuppressClick: value => { suppress = value; },
  });
  const event = (id, x, y) => ({ pointerId: id, pointerType: 'touch', isPrimary: true, button: 0,
    clientX: (x + 1) * rect.width / 2, clientY: (1 - y) * rect.height / 2 });
  const initial = held.clone().project(camera);
  assert.equal(controller.down(event(1, initial.x, initial.y), rect).role, 'drag');
  controller.move(event(1, -.15, .1), rect); controller.up(event(1, -.15, .1), rect);
  assert.equal(casts, 0); assert.equal(suppress, true); assert.equal(target.z, 0);
  held.copy(target); dragging = false;
  const saved = held.clone();
  assert.equal(controller.down(event(2, .7, .6), rect).role, 'cast');
  controller.move(event(2, .5, .4), rect); controller.move(event(2, .3, .2), rect);
  controller.up(event(2, .1, .2), rect);
  assert.equal(casts, 1); assert.equal(dragging, false); assert.deepEqual(target.toArray(), saved.toArray());
  assert.equal(ingredientMayFollow(true, true, false, 1, 1), false);
  assert.equal(ingredientMayFollow(true, false, false, null, 1), true);
  assert.equal(ingredientMayFollow(false, false, true, 1, 1), false);
});

test('captured touches outside the screen cannot drag an ingredient out of the visible frame', () => {
  for (const aspect of [9 / 21, 9 / 16, 16 / 9, 32 / 9]) {
    const camera = cameraFor(aspect), raycaster = new Raycaster(), centre = new Vector3(), bounded = {};
    for (const x of [-10, 10]) for (const y of [-10, 10]) {
      assert.equal(clampIngredientPointer({ x, y }, camera, 0, .55, bounded), bounded);
      assert.ok(Math.abs(bounded.x) <= .95 && Math.abs(bounded.y) <= .95);
      assert.equal(projectIngredientPointer(bounded, camera, 0, raycaster, centre), true);
      for (const dx of [-.275, .275]) for (const dy of [-.275, .275]) {
        const corner = centre.clone().add(new Vector3(dx, dy, 0)).project(camera);
        assert.ok(Math.abs(corner.x) < .99 && Math.abs(corner.y) < .99);
      }
    }
  }
});
