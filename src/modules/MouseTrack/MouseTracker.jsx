import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { createPointerInput, isTouchInput } from '../Input/pointerInput';
import { useInputStore } from '../Input/inputStore';
import { useGameStore } from '../Stores/GameStore';
import { projectedIngredientHit } from '../Ingredients/ingredientPointer';

export function MouseTracker({ onStroke, onCast, onPosChange, carryInput, positions, gestureRef, enabled }) {
  const { gl, camera } = useThree();
  const callbacks = useRef({ onStroke, onCast, onPosChange, enabled });
  useEffect(() => { callbacks.current = { onStroke, onCast, onPosChange, enabled }; }, [onStroke, onCast, onPosChange, enabled]);
  const reset = useRef(() => {});
  useEffect(() => {
    if (!enabled) reset.current();
  }, [enabled]);
  useEffect(() => {
    const canvas = gl.domElement;
    let activeCapture = null;
    let controller;
    const stopDrag = () => { carryInput.current.dragging = false; };
    const release = () => {
      const id = activeCapture;
      activeCapture = null;
      if (id !== null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    };
    const resetSession = () => { controller.reset(); stopDrag(); release(); };
    const mode = () => useInputStore.getState().mode;
    controller = createPointerInput({
      isEnabled: () => callbacks.current.enabled,
      getMode: mode,
      isNearHeld: (point, _event, rect) => {
        const id = useGameStore.getState().heldIngredientId;
        return id !== null && projectedIngredientHit(point, positions.current.get(id), camera, rect);
      },
      onPosition: (point, event, role) => {
        const touch = controller.getSession()?.touch ?? isTouchInput(event, mode());
        carryInput.current.touch = touch;
        if (!touch || role === 'drag') {
          carryInput.current.point = point;
          callbacks.current.onPosChange?.(point);
        }
      },
      onDrag: point => {
        carryInput.current.dragging = true;
        carryInput.current.heldId = useGameStore.getState().heldIngredientId;
        carryInput.current.point = point;
      },
      onStroke: points => callbacks.current.onStroke?.(points),
      onCast: stroke => callbacks.current.onCast?.(stroke),
      onSuppressClick: (suppressed, pointerId) => { gestureRef.current = { suppressed, pointerId }; },
      onCancel: stopDrag,
    });
    reset.current = resetSession;
    const rect = () => canvas.getBoundingClientRect();
    const down = event => {
      const session = controller.down(event, rect());
      if (!session) return;
      activeCapture = session.id;
      canvas.setPointerCapture?.(session.id);
    };
    const move = event => controller.move(event, rect());
    const up = event => {
      if (!controller.up(event, rect())) return;
      stopDrag(); release();
    };
    const cancel = event => { if (controller.cancel(event)) { stopDrag(); release(); } };
    const hidden = () => { if (document.hidden) resetSession(); };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', resetSession);
    document.addEventListener('visibilitychange', hidden);
    const unsubscribe = useInputStore.subscribe((state, previous) => {
      if (state.mode !== previous.mode) resetSession();
    });
    return () => {
      resetSession(); unsubscribe(); reset.current = () => {};
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('blur', resetSession);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [gl, camera, carryInput, positions, gestureRef]);
  return null;
}
