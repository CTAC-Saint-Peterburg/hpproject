import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubleSide, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { arenaRoomLayout, createArenaRoomGeometry } from '../src/modules/Room/arenaRoomGeometry.js';
import { createBrewingRoomGeometry, ROOM } from '../src/modules/Room/roomGeometry.js';

const aspects = [9 / 21, 9 / 16, 16 / 9, 21 / 9, 32 / 9];
const triangles = geometry => (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;

function originalArenaCamera(aspect) {
  const scale = Math.max(1, 1.35 / aspect);
  const camera = new PerspectiveCamera(50, aspect, .1, 1000);
  camera.position.set(0, 12 * scale, 11 * scale);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function withArena(aspect, run) {
  const layout = arenaRoomLayout(aspect);
  const room = createArenaRoomGeometry(aspect);
  const source = createBrewingRoomGeometry(layout.halfWidth, { ...layout, variant: 'arena' });
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = geometries => Object.values(geometries).map(geometry => {
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    return mesh;
  });
  try { run({ layout, room, source, meshes: meshes(room), sourceMeshes: meshes(source), camera: originalArenaCamera(aspect) }); }
  finally {
    [...Object.values(room), ...Object.values(source)].forEach(geometry => geometry.dispose());
    material.dispose();
  }
}

test('arena decoration keeps finite textureless geometry and prunes its unseen triangle budget', () => {
  for (const aspect of aspects) {
    withArena(aspect, ({ room, source, layout, camera }) => {
      assert.deepEqual(layout.cameraPosition, camera.position.toArray(), 'room layout must match the unchanged arena camera');
      assert.equal(layout.floorY, -.4);
      const total = Object.values(room).reduce((sum, geometry) => sum + triangles(geometry), 0);
      const before = Object.values(source).reduce((sum, geometry) => sum + triangles(geometry), 0);
      assert.ok(total > 0 && total < before, 'unseen triangles should actually be removed');
      assert.ok(total <= 4000);
      for (const [name, geometry] of Object.entries(room)) {
        assert.ok(triangles(geometry) <= triangles(source[name]));
        assert.equal(geometry.getAttribute('uv'), undefined);
        const position = geometry.getAttribute('position');
        assert.equal(position.count % 3, 0);
        for (const name of ['position', 'normal', 'color']) {
          const attribute = geometry.getAttribute(name);
          assert.equal(attribute.count, position.count);
          assert.ok([...attribute.array].every(Number.isFinite));
        }
        for (const color of geometry.getAttribute('color').array) assert.ok(color >= 0 && color <= 1);
      }
    });
  }
});

test('castle walls never cross table, crystal, coin or enemy rays from the original inclined camera', () => {
  for (const aspect of aspects) {
    withArena(aspect, ({ camera, meshes }) => {
      const targets = [[0, .18, 0], [0, 1.1, 0], [0, 1.95, 0], [0, 1.6, 2.3], [0, .4, 0]];
      // Full board footprint includes the original wooden border, which is not moved.
      for (const x of [-8.2, -4, 0, 4, 8.2]) {
        for (const z of [-5.2, -2.5, 0, 2.5, 5.2]) targets.push([x, .1, z]);
      }
      for (const x of [-7.5, 0, 7.5]) {
        for (const z of [-4.5, 0, 4.5]) {
          for (const y of [.2, 1, 2.5]) targets.push([x, y, z]);
        }
      }
      const ray = new Raycaster();
      for (const position of targets) {
        const target = new Vector3(...position);
        ray.set(camera.position, target.clone().sub(camera.position).normalize());
        const first = ray.intersectObjects(meshes, false)[0];
        assert.ok(!first || first.distance > camera.position.distanceTo(target) + .01,
          `room blocks target ${position} at aspect ${aspect}; overhead beams must not cross arena sightlines`);
      }
    });
  }
});

test('portrait and landscape screen edges meet the room floor and back wall without visible voids', () => {
  for (const aspect of aspects) {
    withArena(aspect, ({ camera, meshes, layout }) => {
      const ray = new Raycaster();
      for (const x of [-.98, -.5, 0, .5, .98]) {
        ray.setFromCamera(new Vector2(x, -.98), camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        assert.ok(hit, `bottom edge is missing floor at aspect ${aspect}`);
        assert.ok(hit.point.y <= layout.floorY + .001 && hit.point.y >= layout.floorY - .03,
          `bottom edge must meet the room floor at aspect ${aspect}`);
      }
      ray.setFromCamera(new Vector2(0, .98), camera);
      const top = ray.intersectObjects(meshes, false)[0];
      assert.ok(top, `top edge sees beyond the back wall at aspect ${aspect}`);
      assert.ok(top.point.z < ROOM.backZ + 1.2, 'top central ray should meet the distant castle wall');
    });
  }
});

test('frustum pruning preserves the visible castle surfaces at screen centres and edges', () => {
  for (const aspect of aspects) {
    withArena(aspect, ({ camera, meshes, sourceMeshes }) => {
      const ray = new Raycaster();
      for (const x of [-.98, -.6, 0, .6, .98]) {
        for (const y of [-.98, -.6, 0, .6, .98]) {
          ray.setFromCamera(new Vector2(x, y), camera);
          const full = ray.intersectObjects(sourceMeshes, false)[0];
          const pruned = ray.intersectObjects(meshes, false)[0];
          assert.equal(!!pruned, !!full, `pruning opened a hole at screen ${x},${y}, aspect ${aspect}`);
          if (full) assert.ok(Math.abs(full.distance - pruned.distance) < 1e-5, 'visible surface changed during pruning');
        }
      }
    });
  }
});
