export const POT_MIST_CAPACITY = 24;
export const POT_MIST_LIFETIME = 3.6;

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function createPotMistBuffers() {
  return {
    positions: new Float32Array(POT_MIST_CAPACITY * 3),
    sizes: new Float32Array(POT_MIST_CAPACITY),
    opacities: new Float32Array(POT_MIST_CAPACITY),
  };
}

// An analytic loop keeps motion independent of FPS and needs no particle objects,
// respawn allocations, random sampling or velocity integration during rendering.
export function writePotMistFrame(buffers, elapsed, warmth) {
  const heat = Number.isFinite(warmth) ? clamp(warmth) : 0;
  const count = Math.round(8 + heat * (POT_MIST_CAPACITY - 8));
  for (let i = 0; i < POT_MIST_CAPACITY; i++) {
    const age = ((Math.max(0, elapsed) / POT_MIST_LIFETIME + i / POT_MIST_CAPACITY) % 1);
    const rise = smooth(age / .35);
    const spill = clamp((age - .35) / .65);
    const radius = .06 + .13 * rise + .94 * spill;
    const angle = i * 2.39996323 + age * .22;
    buffers.positions[i * 3] = Math.cos(angle) * radius;
    buffers.positions[i * 3 + 1] = .04 + .65 * rise - spill * spill;
    buffers.positions[i * 3 + 2] = Math.sin(angle) * radius * .65;
    buffers.sizes[i] = .16 + .34 * smooth(age);
    const fade = smooth(age / .16) * (1 - smooth((age - .65) / .35));
    buffers.opacities[i] = i < count ? fade * (.1 + heat * .13) : 0;
  }
  return count;
}
