export function createHandMotion() {
  return { x: 0, y: 0, vx: 0, vy: 0, phase: 0 };
}

// Exact critically damped spring: stable at different frame rates, no overshoot.
export function stepHandMotion(state, pointer, delta, config) {
  const dt = Math.max(0, Math.min(delta, .1));
  const frequency = config.tracking.frequency;
  const decay = Math.exp(-frequency * dt);
  for (const axis of ['x', 'y']) {
    const velocity = 'v' + axis;
    const target = Math.max(-1, Math.min(1, pointer[axis]));
    const offset = state[axis] - target;
    const impulse = (state[velocity] + frequency * offset) * dt;
    state[axis] = target + (offset + impulse) * decay;
    state[velocity] = (state[velocity] - frequency * impulse) * decay;
  }
  const motion = Math.min(1, Math.hypot(state.vx, state.vy) * config.sway.velocityScale);
  state.phase += dt * Math.PI * 2 * config.sway.frequency;
  const amplitude = config.sway.idleAmplitude + config.sway.moveAmplitude * motion;
  const tilt = config.tracking.maxTilt;
  return {
    x: state.x, y: state.y,
    roll: Math.max(-tilt, Math.min(tilt, -state.vx * config.tracking.velocityTilt)) + Math.sin(state.phase) * amplitude,
    pitch: Math.max(-tilt, Math.min(tilt, state.vy * config.tracking.velocityTilt)) + Math.cos(state.phase) * amplitude * .5,
    bob: Math.sin(state.phase * .5) * config.sway.bob * (.25 + motion),
  };
}
