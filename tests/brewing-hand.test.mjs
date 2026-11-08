import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { BoxGeometry, Euler, Group, Matrix4, Mesh, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { writeBrewingHandFrame } from '../src/modules/Wand/brewingHandFrame.js';
import { ROOM } from '../src/modules/Room/roomGeometry.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const scene = readJson('../src/static/brewing.json').scene;
const handConfig = readJson('../src/static/spellEffects.json').handRig;
const correction = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
const up = new Vector3(0, 1, 0);

function withRig(aspect, run) {
  const camera = new PerspectiveCamera(scene.cameraFov, aspect, .1, 1000);
  camera.position.fromArray(scene.cameraPosition);
  camera.updateMatrixWorld(true);
  const root = new Group(), joint = new Group(), grip = new Group();
  const hand = new Mesh(new BoxGeometry(...handConfig.handSize));
  const wand = new Mesh(new BoxGeometry(.1, handConfig.wandLength, .02));
  root.add(joint); joint.add(hand, grip); grip.add(wand);
  root.scale.setScalar(writeBrewingHandFrame(root.position, camera, aspect, scene.handRig));
  root.quaternion.copy(camera.quaternion);
  grip.position.fromArray(handConfig.grip); grip.rotation.fromArray(handConfig.gripRotation);
  wand.position.set(0, handConfig.wandLength / 2 - handConfig.gripDepth, 0);
  root.updateMatrixWorld(true);
  const target = new Vector3(), matrix = new Matrix4(), sway = new Quaternion();
  function setPose(x = 0, y = 0, bob = 0, pitch = 0, roll = 0) {
    joint.position.set(x * handConfig.tracking.positionInfluence[0],
      y * handConfig.tracking.positionInfluence[1] + bob, 0);
    target.set(x * handConfig.brewingAim[0], y * handConfig.brewingAim[1], handConfig.brewingAim[2]);
    root.worldToLocal(target);
    matrix.lookAt(target, joint.position, up);
    joint.quaternion.setFromRotationMatrix(matrix).multiply(correction);
    sway.setFromEuler(new Euler(pitch, 0, roll));
    joint.quaternion.multiply(sway);
    root.updateMatrixWorld(true);
  }
  function vertices() {
    return [hand, wand].flatMap(mesh => {
      const positions = mesh.geometry.getAttribute('position');
      return Array.from({ length: positions.count }, (_, i) =>
        new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld));
    });
  }
  try { run({ camera, root, joint, grip, wand, setPose, vertices }); }
  finally {
    for (const mesh of [hand, wand]) { mesh.geometry.dispose(); mesh.material.dispose(); }
  }
}

test('idle brewing hand and wand fit the lower-right rectangle marked in the reference screenshot', () => {
  // The screenshot is 1421 x 835; its canvas spans (5,38)..(1416,833).
  const width = 1411, height = 795;
  withRig(width / height, ({ camera, setPose, vertices }) => {
    setPose();
    for (const point of vertices()) {
      point.project(camera);
      const x = 5 + (point.x + 1) * width / 2;
      const y = 38 + (1 - point.y) * height / 2;
      assert.ok(x >= 1026 && x <= 1266, `horizontal position ${x} misses the marked region`);
      assert.ok(y >= 367 && y <= 795, `vertical position ${y} misses the marked region`);
    }
  });
});

test('the complete brewing rig stays above the floor and inside the frame throughout pointer and sway extremes', () => {
  const bob = handConfig.sway.bob * 1.25;
  const tilt = handConfig.tracking.maxTilt + handConfig.sway.idleAmplitude + handConfig.sway.moveAmplitude;
  for (const aspect of [9 / 21, 9 / 16, 4 / 3, 1411 / 795, 21 / 9, 32 / 9]) {
    withRig(aspect, ({ camera, setPose, vertices, grip, wand }) => {
      for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
        for (const bounce of [-bob, bob]) for (const pitch of [-tilt, tilt]) for (const roll of [-tilt, tilt]) {
          setPose(x, y, bounce, pitch, roll);
          for (const point of vertices()) {
            assert.ok(point.toArray().every(Number.isFinite));
            assert.ok(point.y > ROOM.floorY + .1, `rig intersects the floor at aspect ${aspect}`);
            point.project(camera);
            assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z > -1 && point.z < 1,
              `rig leaves the frame at aspect ${aspect}: ${point.toArray()}`);
          }
          const actualTip = wand.localToWorld(new Vector3(0, handConfig.wandLength / 2, 0));
          const mountedTip = grip.localToWorld(new Vector3(0, handConfig.wandLength - handConfig.gripDepth, 0));
          assert.ok(actualTip.distanceTo(mountedTip) < 1e-10, 'scaled wand tip must stay attached to its real grip');
        }
      }
    });
  }
});

test('brewing hand anchor follows the camera and retains a finite scale on narrow screens', () => {
  const camera = new PerspectiveCamera(60, 16 / 9, .1, 1000);
  camera.position.set(3, 2, 8);
  camera.rotation.set(.15, -.2, .05);
  camera.updateMatrixWorld(true);
  const position = new Vector3();
  for (const aspect of [9 / 21, 9 / 16, 16 / 9, 32 / 9]) {
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const scale = writeBrewingHandFrame(position, camera, aspect, scene.handRig);
    assert.ok(Number.isFinite(scale) && scale > 0 && scale <= scene.handRig.scale);
    const projected = position.clone().project(camera);
    assert.ok(Math.abs(projected.x - scene.handRig.screenAnchor[0]) < 1e-10);
    assert.ok(Math.abs(projected.y - scene.handRig.screenAnchor[1]) < 1e-10);
  }
});
