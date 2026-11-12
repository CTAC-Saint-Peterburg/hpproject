import { useEffect, useRef } from 'react';
import { effects } from '../../static/themedConfigs';
import { advanceGestureTrail, clearGestureTrail, createGestureTrail, setGestureTrailPoints } from './gestureTrail';
import './MagicGestureTrail.css';

// A screen-space layer keeps the gesture above every room/table/floor surface.
// The only animation is the bounded spark pool; static strokes need no RAF.
export default function MagicGestureTrail({ points, paused = false, enabled = true }) {
  const canvasRef = useRef();
  const controller = useRef();
  useEffect(() => {
    const canvas = canvasRef.current, context = canvas.getContext('2d');
    if (!context) return;
    const config = effects.drawing, state = createGestureTrail(config);
    let frameId = null, previousTime = null, disposed = false;
    let width = 0, height = 0, dpr = 1;
    let current = { points: [], paused: false, enabled: true };
    const clear = () => {
      clearGestureTrail(state);
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null; previousTime = null;
      context.clearRect(0, 0, width, height);
    };
    const line = (lineWidth, alpha) => {
      if (!state.path.length || alpha <= 0) return;
      const stride = Math.max(1, Math.ceil(state.path.length / (config.maxRenderPoints ?? 512)));
      context.beginPath();
      let started = false;
      for (let index = 0; index < state.path.length; index++) {
        if (index % stride && index !== state.path.length - 1) continue;
        const point = state.path[index];
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
        if (!started) { context.moveTo(x, y); started = true; }
        else context.lineTo(x, y);
      }
      context.lineWidth = lineWidth; context.globalAlpha = alpha;
      context.stroke();
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.strokeStyle = config.color; context.fillStyle = config.color;
      context.lineCap = 'round'; context.lineJoin = 'round';
      const fade = state.drawing ? 1 : Math.max(0, 1 - state.lineAge / state.fadeSeconds);
      const glowWidth = config.glowWidth ?? 12, glowOpacity = config.glowOpacity ?? .3;
      line(glowWidth * 1.7, fade * glowOpacity * .28);
      line(glowWidth, fade * glowOpacity);
      line(config.lineWidth, fade * config.opacity);
      for (const particle of state.particles) {
        if (!particle.alive) continue;
        const remaining = 1 - particle.age / particle.lifetime;
        context.globalAlpha = remaining * remaining * (config.particleOpacity ?? .72);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * (.5 + remaining * .5), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };
    const frame = now => {
      frameId = null;
      if (disposed) return;
      const delta = previousTime === null ? 0 : Math.max(0, (now - previousTime) / 1000);
      previousTime = now;
      const moving = advanceGestureTrail(state, delta);
      draw();
      if (moving) frameId = requestAnimationFrame(frame);
      else previousTime = null;
    };
    const schedule = () => { if (frameId === null && !disposed) frameId = requestAnimationFrame(frame); };
    const update = input => {
      current = input;
      if (!current.enabled || current.paused || document.hidden) { clear(); return; }
      setGestureTrailPoints(state, current.points, width, height);
      schedule();
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextDpr = Math.min(config.maxDpr ?? 1.5, window.devicePixelRatio || 1);
      if (rect.width === width && rect.height === height && nextDpr === dpr) return;
      clear(); width = rect.width; height = rect.height; dpr = nextDpr;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      update(current);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    controller.current = { update };
    resize();
    return () => {
      disposed = true; clear(); controller.current = null;
      observer?.disconnect(); window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => { controller.current?.update({ points, paused, enabled }); }, [points, paused, enabled]);
  return <canvas ref={canvasRef} className="magic-gesture-trail" aria-hidden="true" />;
}
