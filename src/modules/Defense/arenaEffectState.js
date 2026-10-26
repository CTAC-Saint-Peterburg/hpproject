// Adapt arena events to the shared brewing particle renderer, without a second FX system.
export function arenaEffectState(state, ringRotation = [-Math.PI / 2, 0, 0]) {
  const playing = ['wave', 'clear', 'coin'].includes(state.phase);
  const fx = state.fx;
  const spellCast = fx?.kind === 'cast' ? {
    sequence: fx.id,
    spellId: fx.spellId,
    at: fx.time,
    target: {
      kind: 'world',
      position: Array.isArray(fx.target) ? [...fx.target] : [0, 1.1, 0],
      rotation: [...ringRotation],
    },
  } : null;
  return { status: playing ? 'playing' : 'idle', paused: state.paused, spellCast };
}
