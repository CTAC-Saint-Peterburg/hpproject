// Screen-space greedy culling: selected target, imminent shooter, giant, then nearest.
export function visibleEnemyHints(candidates, width, height, gap = 6) {
  const accepted = [];
  const ordered = [...candidates].sort((a, b) => b.priority - a.priority || a.distance - b.distance || a.id.localeCompare(b.id));
  for (const candidate of ordered) {
    if (candidate.clipped || accepted.some(other => Math.abs(candidate.x - other.x) < ((candidate.width ?? width) + (other.width ?? width)) / 2 + gap && Math.abs(candidate.y - other.y) < ((candidate.height ?? height) + (other.height ?? height)) / 2 + gap)) continue;
    accepted.push(candidate);
  }
  return new Set(accepted.map(item => item.id));
}

export function enemyStatusHints(enemy, base, time, selected) {
  const statuses = [];
  const timed = (until, key) => { if (until > time) statuses.push({ key, seconds: Math.ceil(until - time) }); };
  timed(enemy.disorientedUntil, 'arena.disoriented');
  timed(enemy.frozenUntil, 'arena.enemyFrozen');
  timed(enemy.burnUntil, 'arena.enemyBurning');
  timed(enemy.poisonUntil, 'arena.enemyPoisoned');
  timed(enemy.madnessUntil, 'arena.enemyMadness');
  if (enemy.disorientedUntil <= time) {
    timed(enemy.windupUntil, 'arena.windup');
    if (!enemy.carried && enemy.frozenUntil <= time && enemy.windupUntil <= time) timed(enemy.rageUntil, 'arena.enemyRage');
  }
  if (enemy.carried) statuses.push({ key: 'arena.enemyCarried' });
  if (base.hostile === false) statuses.push({ key: 'arena.bomberAnySpell' });
  else if (selected && Array.isArray(base.counterSpells)) statuses.push({ key: 'arena.anyAttack' });
  return statuses;
}

export function enemyHintPhase(time, settings) {
  const durations = [settings.spellSeconds, settings.barSeconds, settings.numberSeconds];
  const total = durations.reduce((a, b) => a + b, 0);
  let age = ((time % total) + total) % total;
  let phase = 0;
  while (phase < 2 && age >= durations[phase]) age -= durations[phase++];
  const fade = Math.min(settings.fadeSeconds, durations[phase] / 2);
  return { phase, opacity: fade > 0 ? Math.min(1, age / fade, (durations[phase] - age) / fade) : 1 };
}
