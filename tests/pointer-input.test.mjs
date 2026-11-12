import assert from 'node:assert/strict';
import test from 'node:test';
import { appendBoundedPoint, createPointerInput, isTouchInput, nearbyProjectedPoint, pointerPoint } from '../src/modules/Input/pointerInput.js';
import { createInputShortcutBinding, isInputModeShortcut } from '../src/modules/Input/inputShortcuts.js';
import { detectInputMode, normalizeInputMode } from '../src/modules/Input/inputStore.js';

const rect = { left: 20, top: 40, width: 800, height: 400 };
const event = (x, y, extra = {}) => ({ clientX: 20 + x, clientY: 40 + y, pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, ...extra });
function fixture(overrides = {}) {
  const log = { strokes: [], casts: [], drags: [], positions: [], suppression: [], cancelled: 0 };
  let mode = 'touch', enabled = true, near = true;
  const input = createPointerInput({ getMode: () => mode, isEnabled: () => enabled, isNearHeld: () => near,
    onStroke: value => log.strokes.push(value), onCast: value => log.casts.push(value), onDrag: value => log.drags.push(value),
    onPosition: (point, source, role) => log.positions.push({ point, role, type: source.pointerType }),
    onSuppressClick: value => log.suppression.push(value), onCancel: () => log.cancelled++, ...overrides });
  return { input, log, setMode: value => { mode = value; }, setEnabled: value => { enabled = value; }, setNear: value => { near = value; } };
}

test('near touch movement stays a drag even after moving far away and never casts on release', () => {
  const f = fixture();
  assert.equal(f.input.down(event(200, 200), rect).role, 'drag');
  assert.equal(f.input.getSession().id, 1);
  f.setNear(false); f.input.move(event(700, 50), rect); f.input.up(event(710, 50), rect);
  assert.equal(f.log.casts.length, 0); assert.equal(f.log.drags.length, 3);
  assert.equal(f.input.getSession(), null); assert.equal(f.log.suppression.at(-1), true);
  assert.equal(f.input.cancel(event(710, 50)), false, 'normal lost capture after up must not cancel or cast twice');
  assert.equal(f.log.cancelled, 0);
});

test('far touch movement stays a cast, keeps the held object fixed and records coalesced corners', () => {
  const f = fixture(); f.setNear(false);
  assert.equal(f.input.down(event(10, 10), rect).role, 'cast');
  f.setNear(true);
  f.input.move(event(300, 200, { nativeEvent: { getCoalescedEvents: () => [event(100, 10), event(100, 200), event(300, 200)] } }), rect);
  f.input.up(event(400, 200), rect);
  assert.equal(f.log.drags.length, 0); assert.equal(f.log.casts.length, 1);
  assert.equal(f.log.casts[0].aspectRatio, 2);
  assert.deepEqual(f.log.casts[0].points, [pointerPoint(event(10, 10), rect), pointerPoint(event(100, 10), rect),
    pointerPoint(event(100, 200), rect), pointerPoint(event(300, 200), rect), pointerPoint(event(400, 200), rect)]);
  assert.equal(f.log.suppression.at(-1), true);
});

test('single-pointer taps remain selectable, extra contacts are ignored and clicks stay suppressed until the next down', () => {
  const f = fixture(); f.setNear(false);
  f.input.down(event(10, 10), rect);
  assert.equal(f.input.down(event(30, 30, { pointerId: 2, isPrimary: false }), rect), null);
  assert.equal(f.input.move(event(300, 300, { pointerId: 2 }), rect), false);
  assert.equal(f.input.up(event(300, 300, { pointerId: 2 }), rect), false);
  f.input.up(event(11, 10), rect);
  assert.equal(f.log.casts.length, 0); assert.equal(f.log.suppression.at(-1), false);
  f.input.down(event(10, 10), rect); f.input.move(event(300, 10), rect); f.input.up(event(400, 10), rect);
  f.input.move(event(600, 100), rect); assert.equal(f.log.suppression.at(-1), true);
  f.input.down(event(10, 10), rect); assert.equal(f.log.suppression.at(-1), false);
});

test('cancellation, blur, disabled input and a mode switch discard strokes without casting', () => {
  for (const cancel of ['cancel', 'reset', 'blur', 'disable', 'mode']) {
    const f = fixture(); f.setNear(false);
    f.input.down(event(10, 10), rect); f.input.move(event(200, 150), rect);
    if (cancel === 'disable') { f.setEnabled(false); f.input.up(event(300, 150), rect); }
    else if (cancel === 'mode') { f.setMode('desktop'); f.input.up(event(300, 150), rect); }
    else f.input[cancel]();
    assert.equal(f.input.getSession(), null); assert.equal(f.log.casts.length, 0); assert.equal(f.log.cancelled, 1);
    assert.deepEqual(f.log.strokes.at(-1), []); assert.equal(f.log.suppression.at(-1), true);
    f.input.cancel(); assert.equal(f.log.cancelled, 1);
  }
});

test('desktop mouse retains hover and gesture behavior while touch simulation and pen use near-object dragging', () => {
  const f = fixture(); f.setMode('desktop');
  f.input.move(event(10, 20, { pointerType: 'mouse' }), rect);
  assert.equal(f.log.positions.at(-1).role, 'hover');
  assert.equal(f.input.down(event(10, 20, { pointerType: 'mouse' }), rect).role, 'cast'); f.input.reset();
  assert.equal(f.input.down(event(10, 20, { pointerType: 'pen' }), rect).role, 'drag'); f.input.reset();
  f.setMode('touch');
  assert.equal(f.input.down(event(10, 20, { pointerType: 'mouse' }), rect).role, 'drag');
  assert.equal(isTouchInput({ pointerType: 'touch' }, 'desktop'), true);
});

test('proximity is measured in CSS pixels across screen aspects and long strokes retain both ends within a bound', () => {
  const centre = { x: 0, y: 0, z: .5 };
  assert.equal(nearbyProjectedPoint({ x: .1, y: .1 }, centre, rect, 56), true);
  assert.equal(nearbyProjectedPoint({ x: .2, y: .2 }, centre, rect, 56), false);
  assert.equal(nearbyProjectedPoint({ x: 0, y: 0 }, { ...centre, z: 2 }, rect), false);
  assert.equal(nearbyProjectedPoint({ x: 0, y: 0 }, centre, { ...rect, width: 0 }), false);
  assert.equal(pointerPoint(event(10, 10), { ...rect, width: 0 }), null);
  const points = [], first = { x: 0, y: 0 }; appendBoundedPoint(points, first, 32);
  for (let i = 1; i <= 10000; i++) appendBoundedPoint(points, { x: i, y: i % 7 }, 32);
  assert.ok(points.length <= 32); assert.equal(points[0], first); assert.equal(points.at(-1).x, 10000);
});

test('input defaults detect coarse touch without forcing a fine-pointer touchscreen PC and keyboard toggle is guarded', () => {
  const environment = (coarse, fine, points) => ({ matchMedia: query => ({ matches: query.includes('coarse') ? coarse : fine }), navigator: { maxTouchPoints: points } });
  assert.equal(detectInputMode(environment(true, false, 5)), 'touch');
  assert.equal(detectInputMode(environment(false, true, 5)), 'desktop');
  assert.equal(detectInputMode({ navigator: { maxTouchPoints: 2 } }), 'touch');
  assert.equal(normalizeInputMode('invalid', 'touch'), 'touch');
  const shortcut = { code: 'KeyM', altKey: true, shiftKey: true, ctrlKey: false, metaKey: false, repeat: false, target: { tagName: 'BUTTON' } };
  assert.equal(isInputModeShortcut(shortcut), true);
  for (const patch of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { target: { tagName: 'INPUT' } }, { target: { isContentEditable: true } }]) {
    assert.equal(isInputModeShortcut({ ...shortcut, ...patch }), false);
  }
  let listener, toggles = 0, prevented = 0, stopped = 0;
  const target = { addEventListener(type, fn) { assert.equal(type, 'keydown'); listener = fn; }, removeEventListener(type, fn) { assert.equal(type, 'keydown'); assert.equal(fn, listener); listener = null; } };
  const dispose = createInputShortcutBinding({ getState: () => ({ toggleMode: () => toggles++ }) }, target);
  listener({ ...shortcut, preventDefault: () => prevented++, stopImmediatePropagation: () => stopped++ });
  assert.equal(toggles, 1); assert.equal(prevented, 1); assert.equal(stopped, 1); dispose(); assert.equal(listener, null);
});

test('manual control mode persists independently and a new load honors the saved override', async () => {
  const values = new Map();
  globalThis.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } };
  try {
    const first = await import('../src/modules/Input/inputStore.js?pointer-input-persist-one');
    first.useInputStore.getState().setMode('touch');
    const saved = JSON.parse(values.get(first.INPUT_SETTINGS_KEY));
    assert.deepEqual(saved.state, { mode: 'touch' });
    assert.equal(values.has('hpproject-save-v1'), false);
    const second = await import('../src/modules/Input/inputStore.js?pointer-input-persist-two');
    assert.equal(second.useInputStore.getState().mode, 'touch');
    second.useInputStore.getState().toggleMode(); assert.equal(second.useInputStore.getState().mode, 'desktop');
  } finally { delete globalThis.window; }
});
