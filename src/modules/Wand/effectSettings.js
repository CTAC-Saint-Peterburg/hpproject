import settings from '../../static/spellEffects.json';

export { settings };
export function spellEffect(spellId) {
  const override = settings.spells[spellId] || {};
  const color = override.color || settings.trail.color;
  return {
    trail: { ...settings.trail, ...override, color },
    burst: { ...settings.burst, ...override.burst, color },
    flash: { ...settings.flash, ...override.flash, color },
  };
}

// All motion is in world units per second, independent of render FPS.
export function advanceParticle(particle, delta) {
  particle.age += delta;
  particle.velocity[1] -= particle.gravity * delta;
  const angle = particle.swirl * delta;
  if (particle.motion === 'spiral') {
    const [x, , z] = particle.velocity;
    particle.velocity[0] = x * Math.cos(angle) - z * Math.sin(angle);
    particle.velocity[2] = x * Math.sin(angle) + z * Math.cos(angle);
  }
  for (let axis = 0; axis < 3; axis++) particle.position[axis] += particle.velocity[axis] * delta;
}
