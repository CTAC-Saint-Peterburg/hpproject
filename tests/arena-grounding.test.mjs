import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Vector3, PerspectiveCamera } from 'three';
import { enemyGroundedLift } from '../src/modules/Defense/enemyGrounding.js';
import { createArenaEnemyGeometry } from '../src/modules/Defense/arenaEnemyGeometry.js';
import { arenaBaseCameraPose, crystalStatusPosition } from '../src/modules/Defense/arenaLayout.js';
import { potionRackPosition } from '../src/modules/Defense/arenaLayout.js';
import { potionTypes } from '../src/static/themedConfigs.js';
import { getPotionGeometry } from '../src/modules/Potions/potionGeometry.js';

test('2.5x rack bottles fit the landscape camera and do not intersect neighbouring bottles', () => {
  const inventory=Object.fromEntries(potionTypes.slice(0,4).map(p=>[p.id,1]));
  for (const aspect of [1.5,1.6,16/9,1.8]) {
    const pose=arenaBaseCameraPose(aspect),camera=new PerspectiveCamera(50,aspect,.1,1000);
    camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
    for (const potion of potionTypes.slice(0,4)) {
      const position=new Vector3(...potionRackPosition(potion.id,inventory));
      const geometry=getPotionGeometry(potion.model).body;
      for(let i=0;i<geometry.attributes.position.count;i++) {
        const p=new Vector3().fromBufferAttribute(geometry.attributes.position,i).multiplyScalar(2.5).add(position).project(camera);
        assert.ok(Math.abs(p.x)<1 && Math.abs(p.y)<1,'enlarged bottle outside frame');
      }
      assert.ok((geometry.boundingBox.max.x-geometry.boundingBox.min.x)*2.5<2,'neighbouring bottles overlap');
    }
  }
});

test('animated enemy bodies and selected shells clear the tabletop without a blanket floating offset', () => {
  for (const shape of ['cube', 'slime', 'flyer']) {
    const geometry = createArenaEnemyGeometry(shape);
    for (const size of [.5, 1, 1.5]) for (const y of [0, 2]) for (const selected of [false, true]) {
      for (const roll of [-.13, 0, .13]) {
        const enemy = { size, y }, pose = { roll, lift: -.01 };
        const scale = new Vector3(size * (shape === 'slime' ? 1.3 : 1), size * (shape === 'slime' ? .7 : 1) * .98, size);
        const lift = enemyGroundedLift(enemy, pose, scale, geometry.boundingBox, selected);
        let bottom = Infinity;
        for (let i = 0; i < geometry.attributes.position.count; i++) {
          const point = new Vector3().fromBufferAttribute(geometry.attributes.position, i)
            .multiply(scale).multiplyScalar(selected ? 1.18 : 1).applyEuler(new Euler(0, .035, roll));
          bottom = Math.min(bottom, point.y + size * .6 + y + lift);
        }
        assert.ok(bottom >= .012 - 1e-6, `${shape} intersects wood`);
        if (y > 0) assert.equal(lift, pose.lift, 'airborne motion stays unchanged');
        if (y === 0 && shape === 'cube') assert.ok(bottom < .013, 'cube remains grounded');
      }
    }
    geometry.dispose();
  }
});

test('left rim status caption remains inside portrait and landscape screens', () => {
  for (const [width, height] of [[320, 740], [360, 800], [640, 480], [800, 600], [1280, 720], [1920, 1080]]) {
    const pose = arenaBaseCameraPose(width / height), camera = new PerspectiveCamera(50, width / height, .1, 1000);
    camera.position.fromArray(pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
    const anchor = new Vector3(...crystalStatusPosition()).add(new Vector3(.8, 2.55, 0)).project(camera);
    const left = (anchor.x + 1) * width / 2 - Math.min(150, width * .32) / 2;
    assert.ok(left >= 8, `caption clips at ${width}x${height}: ${left}`);
    assert.ok(crystalStatusPosition()[0] < -6, 'indicator stays near the left corner');
  }
});
