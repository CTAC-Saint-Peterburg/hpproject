const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export const ingredientFlightSeconds = config => config.riseSeconds + config.hoverSeconds + config.fallSeconds;

export function ingredientFlightPose(from, elapsed, config) {
  const rise = smooth(elapsed / config.riseSeconds);
  const fall = clamp((elapsed - config.riseSeconds - config.hoverSeconds) / config.fallSeconds);
  const apex = Math.max(config.liftHeight, from[1] + .8);
  return {
    position: [from[0] * (1 - rise), (from[1] + (apex - from[1]) * rise) * (1 - fall * fall) - .15 * fall * fall, from[2] * (1 - rise)],
    scale: (1 - rise * .25) * (1 - fall * (1 - config.minimumScale)),
    rotation: rise * Math.PI * .5 + fall * Math.PI,
    opacity: 1 - smooth((fall - .8) / .2),
  };
}

export function ingredientRefillProgress(elapsed, config) {
  return smooth(elapsed / config.refillSeconds);
}
