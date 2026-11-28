import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3, Quaternion } from 'three';
import { arenaControlPositions, brewingBookPosition } from '../src/modules/Menu/sceneControlLayout.js';
import { arenaRoomLayout } from '../src/modules/Room/arenaRoomGeometry.js';
import { arenaBaseCameraPose } from '../src/modules/Defense/arenaLayout.js';
import { defenseConfig } from '../src/static/themedConfigs.js';
import { enemyPosition } from '../src/static/enemies.js';

test('smaller brewing book and click area leave the left enemy flight path clear', () => {
  for (const [width, height, depth] of [[1366, 768, 9.2], [390, 844, 22], [844, 390, 9.2]]) {
    const camera = new PerspectiveCamera(60, width / height, .1, 100);
    camera.position.z = depth; camera.updateMatrixWorld();
    const view = { height: 2 * depth * Math.tan(Math.PI / 6) };
    view.width = view.height * width / height;
    const book = new Vector3(...brewingBookPosition(view, height)).project(camera);
    assert.ok((1 - book.y) * height / 2 >= 45.99);
    const bookX = (book.x + 1) * width / 2;
    for (let now = 0; now <= 8000; now += 100) {
      const enemy = new Vector3(...enemyPosition({ type: 'enemyfire', side: -1, bornAt: 0 }, now, view.width, view.height)).project(camera);
      const enemyX = (enemy.x + 1) * width / 2;
      // 26px book half hitbox + conservative 25px cube/touch half target.
      assert.ok(bookX - enemyX > 51);
    }
  }
});

test('arena crest stays ahead of wall decorations after billboard rotation', () => {
  const position = arenaControlPositions(defenseConfig.field).crest;
  for (const aspect of [16 / 9, 390 / 844, 844 / 390]) {
    const room = arenaRoomLayout(aspect);
    const camera = new PerspectiveCamera(50, aspect, .1, 1000);
    camera.position.fromArray(arenaBaseCameraPose(aspect).position);camera.lookAt(0, 0, 0);camera.updateMatrixWorld();
    const rotation = camera.getWorldQuaternion(new Quaternion());
    for (const y of [-.94, .94]) for (const z of [-.14, .25]) {
      const vertex = new Vector3(0, y, z).applyQuaternion(rotation).add(new Vector3(...position));
      assert.ok(vertex.z > room.backZ + .75, 'keep clear of projecting masonry and ornaments');
    }
  }
});

test('enlarged arena controls stay in frame and ahead of the wall on phone landscape', () => {
  const positions = arenaControlPositions(defenseConfig.field);
  for (const [width, height] of [[568,320],[640,360],[844,390],[1280,720]]) {
    const camera = new PerspectiveCamera(50,width/height,.1,1000);
    camera.position.fromArray(arenaBaseCameraPose(width/height).position);camera.lookAt(0,0,0);camera.updateMatrixWorld();
    const rotation=camera.getWorldQuaternion(new Quaternion());
    const room=arenaRoomLayout(width/height);
    for (const type of ['book','crest']) {
      const anchor=new Vector3(...positions[type]);
      const pixels=type==='book'?Math.min(100,Math.max(64,height*.20)):Math.min(90,Math.max(56,height*.18));
      const modelHeight=type==='book'?3.2:1.8;
      const scale=2*camera.position.distanceTo(anchor)*Math.tan(camera.fov*Math.PI/360)/height*pixels/modelHeight;
      for (const x of [-.9,.9]) for(const y of [-modelHeight/2,modelHeight/2]) {
        const world=new Vector3(x,y,.25).multiplyScalar(scale).applyQuaternion(rotation).add(anchor);
        assert.ok(world.z>room.backZ+.75,'control intersects the wall');
        const projected=world.clone().project(camera);
        assert.ok(Math.abs(projected.x)<1 && Math.abs(projected.y)<1,`${type} outside ${width}x${height}`);
      }
    }
  }
});

test('hint defaults persist, temporary toggles reset on a new session', async () => {
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  globalThis.window = { localStorage: globalThis.localStorage };
  const { useHintSettings: store, HINT_SETTINGS_KEY, normalizeHintSettings, sessionHintsVisible } = await import('../src/modules/Menu/hintSettings.js');
  assert.equal(store.getState().defaultEnabled, true);
  store.getState().setDefaultEnabled(false);
  assert.equal(JSON.parse(data.get(HINT_SETTINGS_KEY)).state.defaultEnabled, false);
  assert.deepEqual(normalizeHintSettings({ defaultEnabled: 'false' }), { defaultEnabled: true });
  const transient = { key: 1, visible: true };
  assert.equal(sessionHintsVisible(transient, 1, false), true);
  assert.equal(sessionHintsVisible(transient, 2, false), false);
  assert.equal(sessionHintsVisible(null, 'arena', false), false);
  store.setState({ defaultEnabled: true });
  data.set(HINT_SETTINGS_KEY, JSON.stringify({ state: { defaultEnabled: false }, version: 0 }));
  await store.persist.rehydrate();
  assert.equal(store.getState().defaultEnabled, false);
  assert.equal(Object.keys(JSON.parse(data.get(HINT_SETTINGS_KEY)).state).length, 1);
  delete globalThis.localStorage;
  delete globalThis.window;
});
