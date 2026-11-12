import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DoubleSide, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { ROOM, createBrewingRoomGeometry } from '../src/modules/Room/roomGeometry.js';
import { brewingRoomOptions } from '../src/modules/Room/brewingRoomLayout.js';
import { createWorkshopPropsGeometry } from '../src/modules/Room/workshopPropsGeometry.js';
import { brewingCameraDepth } from '../src/modules/Ingredients/ingredientPointer.js';
import { SPAWN_BOTTLES_CORDS } from '../src/static/constants.js';
import { enemyPosition } from '../src/static/enemies.js';
import { writeBrewingHandFrame } from '../src/modules/Wand/brewingHandFrame.js';

const scene = JSON.parse(readFileSync(new URL('../src/static/brewing.json', import.meta.url), 'utf8')).scene;
function withTouchRoom(aspect, run) {
  const camera = new PerspectiveCamera(scene.cameraFov, aspect, .1, 1000);
  camera.position.set(0, 0, brewingCameraDepth(scene, aspect, true));
  camera.updateMatrixWorld(true);
  const height = 2 * camera.position.z * Math.tan(scene.cameraFov * Math.PI / 360), width = height * aspect;
  const halfWidth = Math.min(ROOM.maxHalfWidth, Math.max(ROOM.minHalfWidth, width * .74));
  const room = createBrewingRoomGeometry(halfWidth, brewingRoomOptions(camera.position.z, camera.fov));
  const props = createWorkshopPropsGeometry(), material = new MeshBasicMaterial({ side: DoubleSide });
  const geometries = [...Object.values(room), props];
  const meshes = geometries.map(geometry => { const mesh = new Mesh(geometry, material); mesh.updateMatrixWorld(true); return mesh; });
  try { run({ camera, width, height, geometries, meshes }); }
  finally { geometries.forEach(geometry => geometry.dispose()); material.dispose(); }
}

test('distant touch cameras keep every top and bottom screen ray inside the same bounded room meshes', () => {
  assert.deepEqual(brewingRoomOptions(9.2, 60), {}, 'desktop room parameters stay unchanged');
  for (const aspect of [9 / 21, 9 / 16, 1, 4 / 3]) {
    withTouchRoom(aspect, ({ camera, geometries, meshes }) => {
      const triangles = geometries.reduce((sum, geometry) => sum + (geometry.index?.count ?? geometry.attributes.position.count) / 3, 0);
      assert.ok(triangles <= 4000, 'stretching background must not increase its existing low-poly budget');
      const ray = new Raycaster();
      for (const x of [-.98, -.6, 0, .6, .98]) for (const y of [-.98, .98]) {
        ray.setFromCamera(new Vector2(x, y), camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        assert.ok(hit, `background gap at ${x},${y} aspect ${aspect}`);
        if (y < 0) assert.ok(Math.abs(hit.point.y - ROOM.floorY) < .03, 'bottom view must meet the floor');
      }
    });
  }
});

test('the stretched touch room does not occlude ingredients, recipe, cauldron, carried hand or enemies', () => {
  for (const aspect of [9 / 21, 9 / 16, 4 / 3, 16 / 9, 32 / 9]) {
    withTouchRoom(aspect, ({ camera, width, height, meshes }) => {
      const hand = new Vector3(); writeBrewingHandFrame(hand, camera, aspect, scene.handRig);
      const targets = [[0, 0, 0], [0, 1.8, 0], [-4.25, 1, 0], hand.toArray(), ...SPAWN_BOTTLES_CORDS.map(item => item.cords)];
      for (const side of [-1, 1]) for (const age of [0, 1250, 2500, 10000]) {
        targets.push(enemyPosition({ type: 'enemycold', side, bornAt: 0 }, age, width, height));
        targets.push(enemyPosition({ type: 'enemyslime', entrySide: side, bornAt: 0 }, age, width, height));
      }
      const ray = new Raycaster();
      for (const target of targets) {
        const point = new Vector3(...target);
        ray.set(camera.position, point.clone().sub(camera.position).normalize());
        const hit = ray.intersectObjects(meshes, false)[0];
        assert.ok(!hit || hit.distance > camera.position.distanceTo(point) + .01, `target ${target} blocked at aspect ${aspect}`);
      }
    });
  }
});
