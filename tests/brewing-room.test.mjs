import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { ROOM, createBrewingRoomGeometry } from '../src/modules/Room/roomGeometry.js';
import { createWorkshopPropsGeometry } from '../src/modules/Room/workshopPropsGeometry.js';
import { SPAWN_BOTTLES_CORDS } from '../src/static/constants.js';
import { enemyPosition } from '../src/static/enemies.js';

const camera = new Vector3(0, 0, 10);
const triangleCount = geometry => (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;

function withRoom(halfWidth, run) {
  const room = createBrewingRoomGeometry(halfWidth);
  const props = createWorkshopPropsGeometry();
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = [...Object.values(room), props].map(geometry => {
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    return mesh;
  });
  try { run({ room, props, meshes }); }
  finally { [...Object.values(room), props].forEach(geometry => geometry.dispose()); material.dispose(); }
}

test('room and workshop props retain finite textureless geometry and a bounded low-poly budget', () => {
  for (const width of [ROOM.minHalfWidth, 15, ROOM.maxHalfWidth]) {
    withRoom(width, ({ room, props }) => {
      const geometries = [...Object.values(room), props];
      assert.ok(geometries.reduce((sum, geometry) => sum + triangleCount(geometry), 0) <= 4000,
        `room of half-width ${width} exceeds the full 4000-triangle decoration budget`);
      for (const geometry of geometries) {
        const positions = geometry.getAttribute('position');
        assert.ok(positions.count > 0);
        assert.equal(geometry.getAttribute('uv'), undefined);
        for (const name of ['position', 'normal', 'color']) {
          const attribute = geometry.getAttribute(name);
          assert.ok(attribute, `missing ${name} buffer`);
          assert.equal(attribute.count, positions.count);
          assert.ok([...attribute.array].every(Number.isFinite));
        }
        for (const value of geometry.getAttribute('color').array) assert.ok(value >= 0 && value <= 1);
        if (geometry.index) {
          for (const index of geometry.index.array) assert.ok(index >= 0 && index < positions.count);
        }
        assert.ok(Number.isFinite(geometry.boundingSphere.radius));
      }
      assert.ok(props.boundingBox.max.z <= -1.4, 'furniture must stay behind the interaction plane');
    });
  }
});

test('flagstone floor covers the camera-facing room and keeps the existing ground height', () => {
  withRoom(15, ({ room }) => {
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const stone = new Mesh(room.stone, material);
    stone.updateMatrixWorld(true);
    const ray = new Raycaster();
    try {
      assert.ok(room.stone.boundingBox.min.z <= ROOM.backZ);
      assert.ok(room.stone.boundingBox.max.z >= 8, 'floor must extend toward the camera');
      for (const [x, z] of [[0, 8], [-10, 8], [10, 8], [0, 4], [-10, 4], [10, 4]]) {
        ray.set(new Vector3(x, 0, z), new Vector3(0, -1, 0));
        const hit = ray.intersectObject(stone)[0];
        assert.ok(hit, `floor has a gap at ${x},${z}`);
        assert.ok(hit.point.y <= ROOM.floorY + .001 && hit.point.y >= ROOM.floorY - .03,
          'visible floor must remain at Y=-1');
      }
    } finally { material.dispose(); }
  });
});

test('walls and furniture never occlude existing gameplay targets on narrow, wide and ultrawide views', () => {
  for (const aspect of [9 / 16, 16 / 9, 21 / 9, 32 / 9]) {
    const height = 2 * 10 * Math.tan(Math.PI / 6);
    const width = height * aspect;
    const halfWidth = Math.min(ROOM.maxHalfWidth, Math.max(ROOM.minHalfWidth, width * .74));
    const targets = [
      ['cauldron', [0, 0, 0]],
      ['hand', [-.64, -.92, 3.68]],
      ['recipe text', [-4.05, 1, 0]],
      ['recipe marker', [-4.25, 1, 0]],
      ['ingredient flight apex', [0, 1.8, 0]],
      ...SPAWN_BOTTLES_CORDS.map(item => [`ingredient ${item.id}`, item.cords]),
    ];
    for (const side of [-1, 1]) {
      for (const age of [0, 1250, 2500, 10000]) {
        targets.push([`enemy ${side} at ${age}ms`, enemyPosition({ type: 'enemycold', side, bornAt: 0 }, age, width, height)]);
      }
      targets.push([`slime approach ${side}`, enemyPosition({ type: 'enemyslime', entrySide: side, bornAt: 0 }, 0, width, height)]);
    }
    withRoom(halfWidth, ({ meshes }) => {
      const ray = new Raycaster();
      for (const [label, position] of targets) {
        const target = new Vector3(...position);
        ray.set(camera, target.clone().sub(camera).normalize());
        const hit = ray.intersectObjects(meshes, false)[0];
        assert.ok(!hit || hit.distance > camera.distanceTo(target) + .01,
          `${label} is obscured by decoration at aspect ${aspect}`);
      }
    });
  }
});
