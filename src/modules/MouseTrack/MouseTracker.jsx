import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

export function MouseTracker({ onUpdate, onPosChange }) {
  const { gl } = useThree();
  const callbacks = useRef({ onUpdate, onPosChange });
  useEffect(() => { callbacks.current = { onUpdate, onPosChange }; }, [onUpdate, onPosChange]);
  useEffect(() => {
    const canvas = gl.domElement;
    let activePointer = null;
    let lastPosition = null;
    const publish = (event, isDown, cancelled = false) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width * 2 - 1;
      const y = 1 - (event.clientY - rect.top) / rect.height * 2;
      lastPosition = { x, y, isDown, cancelled, aspectRatio: rect.width / rect.height };
      callbacks.current.onUpdate?.(lastPosition);
      callbacks.current.onPosChange?.({ x, y });
    };
    const down = event => {
      if (event.button !== 0 || event.isPrimary === false || activePointer !== null) return;
      activePointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      publish(event, true);
    };
    const move = event => {
      if (event.isPrimary === false || (activePointer !== null && event.pointerId !== activePointer)) return;
      // Native pointer samples avoid losing fast corners at low render FPS.
      const samples = activePointer !== null ? event.getCoalescedEvents?.() : null;
      if (samples?.length) for (const sample of samples) publish(sample, true);
      else publish(event, activePointer !== null);
    };
    const up = event => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      publish(event, false);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const cancel = event => {
      if (activePointer !== event.pointerId) return;
      activePointer = null; publish(event, false, true);
    };
    const blur = () => {
      if (activePointer === null) return;
      const id = activePointer; activePointer = null;
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      if (lastPosition) callbacks.current.onUpdate?.({ ...lastPosition, isDown: false, cancelled: true });
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', blur);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('blur', blur);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', cancel);
    };
  }, [gl]);
  return null;
}
