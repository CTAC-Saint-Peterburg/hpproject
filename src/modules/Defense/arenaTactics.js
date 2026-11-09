export function crystalThreats(enemies, config) {
  return enemies.filter(enemy => enemy.hp > 0 && config.enemies[enemy.type]?.hostile !== false &&
    !enemy.carried && !(enemy.droppingUntil > 0) && Math.hypot(enemy.x, enemy.z) <= config.crowdControl.radius)
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
}

export function applyCrystalDisorientation(enemies, config, time) {
  const selected = new Set(crystalThreats(enemies, config).slice(0, config.crowdControl.targets).map(enemy => enemy.id));
  return enemies.map(enemy => {
    if (!selected.has(enemy.id)) return enemy;
    const until = Math.max(enemy.disorientedUntil ?? 0, time + config.crowdControl.duration);
    return { ...enemy, disorientedUntil: until, rageUntil: 0, rageAt: until, wanderTurnAt: time,
      windupUntil: 0, nextRangedAt: Math.max(enemy.nextRangedAt ?? 0, until) };
  });
}
