import assert from 'node:assert/strict';
import test from 'node:test';
import { createPointerInput } from '../src/modules/Input/pointerInput.js';
import { isSelectionClick } from '../src/modules/Input/selectionClick.js';

const rect = { left: 20, top: 40, width: 800, height: 400 };
const pointer = (x, y, extra = {}) => ({ type: 'pointerdown', clientX: rect.left + x,
  clientY: rect.top + y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, ...extra });
// Pointer Events specifies default isPrimary=false on click, including clicks
// produced by an accepted primary pointerdown/up sequence.
const click = (extra = {}) => ({ type: 'click', pointerId: 1, pointerType: 'mouse',
  isPrimary: false, button: 0, ...extra });

function fixture({ mode = 'desktop', near = false } = {}) {
  const state = { suppressed: false, pointerId: null }, casts = [], drags = [];
  const input = createPointerInput({ getMode: () => mode, isNearHeld: () => near,
    onSuppressClick: (suppressed, pointerId) => { state.suppressed = suppressed; state.pointerId = pointerId; },
    onCast: value => casts.push(value), onDrag: value => drags.push(value) });
  return { input, state, casts, drags };
}

test('an ordinary left mouse click remains selectable when click.isPrimary is false', () => {
  const f = fixture();
  f.input.down(pointer(100, 100), rect);
  f.input.up(pointer(100, 100, { type: 'pointerup' }), rect);
  assert.equal(f.casts.length, 0);
  assert.deepEqual(f.state, { suppressed: false, pointerId: 1 });
  assert.equal(isSelectionClick(click(), f.state), true);
  assert.equal(isSelectionClick({ ...click(), delta: 0, nativeEvent: click() }, f.state), true,
    'R3F wraps the native browser click without changing its primary flag');
});

test('primary touch and pen taps also select through native and R3F-wrapped clicks', () => {
  for (const pointerType of ['touch', 'pen']) {
    const f = fixture({ mode: 'touch' });
    f.input.down(pointer(200, 150, { pointerType, pointerId: 12 }), rect);
    f.input.up(pointer(201, 150, { type: 'pointerup', pointerType, pointerId: 12 }), rect);
    const nativeEvent = click({ pointerType, pointerId: 12 });
    assert.equal(isSelectionClick(nativeEvent, f.state), true);
    assert.equal(isSelectionClick({ delta: 1, nativeEvent }, f.state), true);
  }
});

test('clicks from an ignored second contact cannot select or clear a primary pointer target', () => {
  const f = fixture({ mode: 'touch' });
  f.input.down(pointer(100, 100, { pointerType: 'touch', pointerId: 11 }), rect);
  assert.equal(f.input.down(pointer(200, 200, { pointerType: 'touch', pointerId: 22, isPrimary: false }), rect), null);
  assert.equal(f.input.up(pointer(200, 200, { type: 'pointerup', pointerType: 'touch', pointerId: 22, isPrimary: false }), rect), false);
  assert.equal(isSelectionClick(click({ pointerType: 'touch', pointerId: 22 }), f.state), false);
  f.input.up(pointer(100, 100, { type: 'pointerup', pointerType: 'touch', pointerId: 11 }), rect);
  assert.equal(isSelectionClick({ delta: 0, nativeEvent: click({ pointerType: 'touch', pointerId: 22 }) }, f.state), false);
  assert.equal(isSelectionClick(click({ pointerType: 'touch', pointerId: 11 }), f.state), true);
});

test('casting suppresses its trailing click but the following ordinary tap can select again', () => {
  for (const pointerType of ['mouse', 'touch']) {
    const f = fixture();
    f.input.down(pointer(100, 100, { pointerType }), rect);
    f.input.move(pointer(200, 200, { type: 'pointermove', pointerType }), rect);
    f.input.up(pointer(100, 100, { type: 'pointerup', pointerType }), rect);
    assert.equal(f.casts.length, 1);
    assert.equal(isSelectionClick(click({ pointerType }), f.state), false,
      'a return-to-start or small R3F delta must not turn a cast into selection');
    f.input.down(pointer(400, 200, { pointerType }), rect);
    f.input.up(pointer(400, 200, { type: 'pointerup', pointerType }), rect);
    assert.equal(isSelectionClick(click({ pointerType }), f.state), true);
  }
});

test('carrying a lifted object suppresses selection even when release lands at the start', () => {
  const f = fixture({ mode: 'touch', near: true });
  f.input.down(pointer(100, 100, { pointerType: 'touch' }), rect);
  f.input.move(pointer(300, 200, { type: 'pointermove', pointerType: 'touch' }), rect);
  f.input.up(pointer(100, 100, { type: 'pointerup', pointerType: 'touch' }), rect);
  assert.ok(f.drags.length > 0);
  assert.equal(f.casts.length, 0);
  assert.equal(isSelectionClick({ delta: 0, nativeEvent: click({ pointerType: 'touch' }) }, f.state), false);
});

test('cancelled or interrupted pointer sequences cannot produce a selection click', () => {
  for (const cancellation of ['cancel', 'reset', 'blur']) {
    const f = fixture();
    f.input.down(pointer(100, 100, { pointerId: 8 }), rect);
    if (cancellation === 'cancel') f.input.cancel(pointer(100, 100, { pointerId: 8, type: 'pointercancel' }));
    else f.input[cancellation]();
    assert.equal(f.casts.length, 0);
    assert.deepEqual(f.state, { suppressed: true, pointerId: 8 });
    assert.equal(isSelectionClick(click({ pointerId: 8 }), f.state), false);
  }
});

test('legacy mouse clicks work without pointerId while other buttons and large movement do not select', () => {
  const f = fixture();
  f.input.down(pointer(100, 100), rect);
  f.input.up(pointer(100, 100, { type: 'pointerup' }), rect);
  const legacy = { type: 'click', button: 0 };
  assert.equal(isSelectionClick(legacy, f.state), true);
  assert.equal(isSelectionClick({ delta: 0, nativeEvent: legacy }, f.state), true);
  assert.equal(isSelectionClick(click({ button: 1 }), f.state), false);
  assert.equal(isSelectionClick({ delta: 0, nativeEvent: click({ button: 2 }) }, f.state), false);
  assert.equal(isSelectionClick({ ...click(), delta: 20 }, f.state), false);
});
