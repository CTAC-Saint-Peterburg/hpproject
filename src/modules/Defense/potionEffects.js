import qualityConfig from '../../static/potionQuality.json' with { type: 'json' };

// A bottle keeps its quality at launch; effects use a fresh snapshot of the data.
export function potionEffect(potion, requestedQuality = 'basic') {
  const quality = Object.hasOwn(qualityConfig.qualities, requestedQuality) ? requestedQuality : 'basic';
  const settings = qualityConfig.qualities[quality];
  const multiplier = Math.max(.01, settings.multiplier);
  const effect = { ...potion, quality, multiplier };
  for (const field of ['duration', 'onHitDuration', 'impactDuration', 'dps', 'chainRadius']) {
    if (Number.isFinite(potion[field])) effect[field] = Math.round(potion[field] * multiplier * 100) / 100;
  }
  if (Number.isFinite(potion.heal)) effect.heal = Math.round(potion.heal * multiplier);
  if (Number.isFinite(potion.targets)) {
    effect.targets = Math.max(1, Math.min(qualityConfig.maxTargets, potion.targets + settings.extraTargets));
  }
  if (Array.isArray(potion.spells)) effect.spells = [...potion.spells];
  return effect;
}

// Applies immediately on impact to living enemies. Stronger active statuses win
// when a weaker bottle lands later; extending freeze keeps the original pose.
export function applyPotionImpact(enemies, effect, time) {
  if (effect.effect !== 'freeze' && effect.effect !== 'burn') return enemies;
  const duration = Math.max(0, effect.impactDuration ?? effect.onHitDuration ?? 0);
  if (!duration) return enemies;
  return enemies.map(enemy => {
    if (enemy.hp <= 0) return enemy;
    if (effect.effect === 'freeze') return { ...enemy,
      frozenUntil: Math.max(enemy.frozenUntil ?? 0, time + duration),
      frozenAt: enemy.frozenUntil > time && Number.isFinite(enemy.frozenAt) ? enemy.frozenAt : time,
    };
    return { ...enemy,
      burnUntil: Math.max(enemy.burnUntil ?? 0, time + duration),
      burnDps: Math.max(enemy.burnUntil > time ? enemy.burnDps ?? 0 : 0, effect.dps ?? 0),
    };
  });
}
