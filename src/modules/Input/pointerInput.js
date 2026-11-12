export function isTouchInput(event, mode = 'desktop') {
  return mode === 'touch' || event?.pointerType === 'touch' || event?.pointerType === 'pen';
}

export function pointerPoint(event, rect) {
  if (!(rect?.width > 0 && rect?.height > 0) || !Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return null;
  return { x: (event.clientX - rect.left) / rect.width * 2 - 1,
    y: 1 - (event.clientY - rect.top) / rect.height * 2 };
}

export function nearbyProjectedPoint(point, held, rect, radiusPx = 56) {
  if (!point || !held || !(rect?.width > 0 && rect?.height > 0) ||
    ![point.x, point.y, held.x, held.y].every(Number.isFinite) ||
    Number.isFinite(held.z) && (held.z < -1 || held.z > 1)) return false;
  return Math.hypot((point.x - held.x) * rect.width / 2,
    (point.y - held.y) * rect.height / 2) <= radiusPx;
}

export function appendBoundedPoint(points, point, limit = 4096) {
  const bound = Number.isFinite(limit) ? Math.max(4, Math.trunc(limit)) : 4096;
  if (points.length >= bound) {
    // Halve long recordings instead of chopping off the gesture's beginning.
    const last = points.at(-1);
    let write = 0;
    for (let read = 0; read < points.length; read += 2) points[write++] = points[read];
    points.length = write;
    if (points.at(-1) !== last) points.push(last);
  }
  points.push(point);
  return points;
}

// DOM-independent pointer arbitration, shared by both game modes. The initial
// near/far decision stays locked until up: dragging never turns into casting.
export function createPointerInput(options = {}) {
  let session = null;
  const mode = () => options.getMode?.() ?? 'desktop';
  const enabled = () => options.isEnabled?.() ?? true;
  const threshold = options.dragThreshold ?? 8;
  const reset = () => {
    if (!session) return false;
    const pointerId = session.id;
    session = null;
    options.onSuppressClick?.(true, pointerId);
    options.onStroke?.([]);
    options.onCancel?.();
    return true;
  };
  const valid = event => {
    if (!session || event?.pointerId !== session.id) return false;
    if (!enabled() || mode() !== session.mode) { reset(); return false; }
    return true;
  };
  const publish = (event, rect, publishStroke = true) => {
    const point = pointerPoint(event, rect);
    if (!point || !session) return false;
    session.distance += Math.hypot(event.clientX - session.lastX, event.clientY - session.lastY);
    session.lastX = event.clientX; session.lastY = event.clientY;
    if (session.role === 'drag' || session.distance > threshold) options.onSuppressClick?.(true, session.id);
    options.onPosition?.(point, event, session.role);
    if (session.role === 'drag') options.onDrag?.(point, event);
    else {
      appendBoundedPoint(session.points, point, options.maxPoints ?? 4096);
      if (publishStroke) options.onStroke?.([...session.points]);
    }
    return true;
  };
  return {
    getSession: () => session,
    down(event, rect) {
      if (session || !enabled() || event?.isPrimary === false || event?.button !== undefined && event.button !== 0) return null;
      const point = pointerPoint(event, rect);
      if (!point) return null;
      const currentMode = mode(), touch = isTouchInput(event, currentMode);
      const role = touch && options.isNearHeld?.(point, event, rect) ? 'drag' : 'cast';
      session = { id: event.pointerId, role, touch, mode: currentMode, distance: 0,
        lastX: event.clientX, lastY: event.clientY, points: [], aspectRatio: rect.width / rect.height };
      options.onSuppressClick?.(role === 'drag', session.id);
      publish(event, rect);
      return session;
    },
    move(event, rect) {
      if (!session) {
        if (!enabled() || event?.isPrimary === false || isTouchInput(event, mode())) return false;
        const point = pointerPoint(event, rect);
        if (point) options.onPosition?.(point, event, 'hover');
        return !!point;
      }
      if (!valid(event)) return false;
      const native = event.nativeEvent ?? event;
      const samples = native.getCoalescedEvents?.();
      if (samples?.length) {
        for (const sample of samples) publish(sample, rect, false);
        const last = samples.at(-1);
        if (last.clientX !== event.clientX || last.clientY !== event.clientY) publish(event, rect, false);
        if (session.role === 'cast') options.onStroke?.([...session.points]);
      } else publish(event, rect);
      return true;
    },
    up(event, rect) {
      if (!valid(event)) return false;
      if (!publish(event, rect)) { reset(); return false; }
      const finished = session;
      session = null;
      options.onStroke?.([]);
      if (finished.role === 'cast' && finished.distance > threshold && finished.points.length >= 3) {
        options.onCast?.({ points: finished.points, aspectRatio: finished.aspectRatio });
      }
      return true;
    },
    cancel(event) {
      if (!session || event?.pointerId !== undefined && event.pointerId !== session.id) return false;
      return reset();
    },
    reset,
    blur: reset,
  };
}
