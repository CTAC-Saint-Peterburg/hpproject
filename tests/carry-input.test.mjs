import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { PerspectiveCamera, Plane, Raycaster, Vector3 } from 'three';
import { canFollowCarriedPointer, carriedScreenPoint } from '../src/modules/Defense/carryInput.js';
import { arenaBaseCameraPose } from '../src/modules/Defense/arenaLayout.js';
import { createPointerInput, nearbyProjectedPoint } from '../src/modules/Input/pointerInput.js';
import { recognizeGesture } from '../src/modules/Recognaizer/recognaizer.js';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) =>
  specifier.startsWith('.') ? 'from ' + JSON.stringify(new URL(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', base).href) : statement);
const { defenseState, config } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const rect = { left: 10, top: 20, width: 800, height: 600 };
const event = (x, y, extra = {}) => ({ clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, ...extra });

function cameraFor(aspect) {
  const pose = arenaBaseCameraPose(aspect), camera = new PerspectiveCamera(50, aspect, .1, 1000);
  camera.position.fromArray(pose.position); camera.lookAt(new Vector3(...pose.target)); camera.updateMatrixWorld(true);
  return camera;
}

function fixture(mode = 'touch', pointerType = 'touch') {
  const store = createStore(defenseState(() => ({ consumeEntryPotions: () => true, changeStones() {}, awardMageCard() {} }), () => .99));
  const s = () => store.getState();
  s().start(['frost', 'flame', 'echo']);
  const enemy = { ...s().createEnemy('fire'), x: 5, z: 2, y: 0, hp: 100, maxHp: 100, speed: 0 };
  store.setState({ enemies: [enemy], queue: [], selected: enemy.id, time: 1 });
  assert.equal(s().cast(3), true);
  store.setState({ time: 2, enemies: [{ ...s().enemies[0], y: config.enemyCarry.height }] });
  const camera = cameraFor(rect.width / rect.height), projection = new Vector3(), ray = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), -(config.enemyCarry.height + enemy.size * .6));
  const point = new Vector3(), bridge = { touch: true, role: null, point: null }, casts = [];
  let movements = 0, suppressed = false, input;
  const held = () => s().enemies.find(item => item.id === s().carriedEnemyId);
  input = createPointerInput({ getMode: () => mode, isEnabled: () => !s().paused,
    isNearHeld: location => nearbyProjectedPoint(location, carriedScreenPoint(held(), camera, projection), rect),
    onPosition(location, sourceEvent, role) { bridge.touch = input.getSession()?.touch ?? sourceEvent.pointerType !== 'mouse'; bridge.role = role; if (role === 'drag') bridge.point = location; },
    onDrag(location) {
      if (!canFollowCarriedPointer(mode, bridge)) return;
      ray.setFromCamera(location, camera); ray.ray.intersectPlane(plane, point);
      movements++; s().moveCarriedEnemy(point.x, point.z);
    },
    onCast(stroke) { const spell = recognizeGesture(stroke.points, { aspectRatio: stroke.aspectRatio }); casts.push(spell); if (spell) s().cast(spell); },
    onSuppressClick: value => { suppressed = value; }, onCancel: () => { bridge.role = null; },
  });
  const pointer = (x, y, extra) => event(x, y, { pointerType, ...extra });
  const up = e => { input.up(e, rect); bridge.role = null; };
  return { s, store, input, bridge, held, casts, camera, pointer, up, movements: () => movements, suppressed: () => suppressed };
}

test('arena follow gating preserves desktop hover but never follows a far touch cast or a released finger', () => {
  for (const role of [null, 'hover', 'cast', 'drag']) {
    assert.equal(canFollowCarriedPointer('desktop', { role, touch: false }), true);
    assert.equal(canFollowCarriedPointer('desktop', { role, touch: true }), role === 'drag');
    assert.equal(canFollowCarriedPointer('touch', { role, touch: false }), role === 'drag');
  }
});

test('the projected carried centre and raised drag plane agree on portrait, landscape and ultrawide views', () => {
  for (const aspect of [9 / 21, 9 / 16, 4 / 3, 16 / 9, 32 / 9]) {
    const camera = cameraFor(aspect), enemy = { x: 5, z: 1.5, y: config.enemyCarry.height, size: .6 };
    const point = new Vector3(), screen = carriedScreenPoint(enemy, camera, new Vector3());
    const ray = new Raycaster(); ray.setFromCamera(screen, camera);
    const plane = new Plane(new Vector3(0, 1, 0), -(enemy.y + enemy.size * .6));
    assert.ok(ray.ray.intersectPlane(plane, point));
    assert.ok(Math.abs(point.x - enemy.x) < 1e-8 && Math.abs(point.z - enemy.z) < 1e-8);
  }
});

test('a real horizontal spell far from the held cube drops it without pulling it towards that spell', () => {
  for (const [mode, type] of [['touch', 'touch'], ['touch', 'mouse'], ['desktop', 'touch'], ['desktop', 'pen']]) {
    const f = fixture(mode, type), before = { ...f.held() };
    const start = f.pointer(70, 60);
    assert.equal(f.input.down(start, rect).role, 'cast');
    for (let index = 1; index <= 16; index++) f.input.move(f.pointer(70 + index * 12, 60), rect);
    f.up(f.pointer(275, 60));
    assert.deepEqual(f.casts, [4]); assert.equal(f.movements(), 0);
    assert.equal(f.s().carriedEnemyId, null); assert.equal(f.s().enemies[0].carried, false);
    assert.equal(f.s().enemies[0].hp, before.hp);
    assert.equal(f.s().enemies[0].x, before.x); assert.equal(f.s().enemies[0].z, before.z);
    assert.equal(f.suppressed(), true, 'the post-up click must not change selection');
  }
});

test('a near touch drag can travel far without becoming a spell, then holds still after release or cancellation', () => {
  const f = fixture(), screen = carriedScreenPoint(f.held(), f.camera, new Vector3());
  const x = (screen.x + 1) * rect.width / 2, y = (1 - screen.y) * rect.height / 2;
  assert.equal(f.input.down(f.pointer(x, y), rect).role, 'drag');
  const count = f.movements();
  assert.equal(f.input.move(f.pointer(20, 20, { pointerId: 2, isPrimary: false }), rect), false);
  assert.equal(f.movements(), count);
  f.input.move(f.pointer(x - 200, y - 100), rect); f.up(f.pointer(x - 210, y - 110));
  assert.ok(f.movements() > count); assert.deepEqual(f.casts, []);
  assert.ok(f.s().carriedEnemyId); assert.equal(canFollowCarriedPointer('touch', f.bridge), false);
  const lastCount = f.movements(); f.input.move(f.pointer(20, 20), rect);
  assert.equal(f.movements(), lastCount);
  const held = f.held(), position = carriedScreenPoint(held, f.camera, new Vector3());
  const lastX = (position.x + 1) * rect.width / 2, lastY = (1 - position.y) * rect.height / 2;
  f.input.down(f.pointer(lastX, lastY), rect); f.input.cancel();
  assert.equal(canFollowCarriedPointer('touch', f.bridge), false);
  assert.deepEqual(f.casts, []); assert.equal(f.held().hp, 100);
});
