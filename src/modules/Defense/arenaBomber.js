const positive = value => Number.isFinite(value) ? Math.max(0, value) : 0;

// Eligibility is separate from the scheduled random roll: the caller checks once
// per interval, and advances nextBomberAt by the cooldown only after spawning.
export function bomberSpawnAllowed(state, config) {
  const spawn = config.bomberSpawn;
  if (!spawn?.enabled || state.phase !== 'wave' || state.paused ||
      state.time < (state.nextBomberAt ?? 0)) return false;
  const alive = state.enemies.filter(enemy => enemy.hp > 0);
  const bombers = alive.filter(enemy => config.enemies[enemy.type]?.movement === 'bomber');
  const hostiles = alive.filter(enemy => config.enemies[enemy.type]?.hostile !== false);
  return hostiles.length >= Math.max(1, Math.trunc(spawn.threshold)) &&
    bombers.length < Math.max(1, Math.trunc(spawn.maxConcurrent ?? 1));
}

export function bomberExplosionRadius(bomber, config) {
  const explosion = config.enemies[bomber.type]?.explosion;
  return positive(explosion?.baseRadius) * positive(explosion?.radiusMultiplier);
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.z - second.z,
    (first.y ?? 0) + (first.size ?? 1) * .6 - (second.y ?? 0) - (second.size ?? 1) * .6);
}

// Only explicitly casting at the bomber calls this helper. Potion/DOT deaths
// use normal death handling instead. No crystal, profile or RNG is accessed.
export function explodeBomber(enemies, bomber, config) {
  const snapshots = enemies.map(enemy => ({ ...enemy }));
  const wasAlive = new Set(enemies.filter(enemy => enemy.hp > 0).map(enemy => enemy.id));
  const source = snapshots.find(enemy => enemy.id === bomber.id);
  const radius = bomberExplosionRadius(bomber, config);
  if (!source || !wasAlive.has(source.id) || config.enemies[source.type]?.movement !== 'bomber') {
    return { enemies, dead: [], radius, explosions: [] };
  }
  const pending = [source], detonated = new Set(), explosions = [];
  while (pending.length) {
    const origin = pending.shift();
    if (detonated.has(origin.id)) continue;
    detonated.add(origin.id);
    origin.hp = 0;
    const blast = config.enemies[origin.type].explosion;
    const range = bomberExplosionRadius(origin, config);
    explosions.push({ id: origin.id, position: [origin.x, (origin.y ?? 0) + origin.size * .6, origin.z], radius: range });
    for (const enemy of snapshots) {
      if (enemy.id === origin.id || enemy.hp <= 0 || distance(enemy, origin) > range + 1e-9) continue;
      enemy.hp = Math.max(0, enemy.hp - positive(blast.damage));
      if (enemy.hp <= 0 && config.enemies[enemy.type]?.movement === 'bomber') pending.push(enemy);
    }
  }
  return { enemies: snapshots.filter(enemy => enemy.hp > 0),
    dead: snapshots.filter(enemy => enemy.hp <= 0 && wasAlive.has(enemy.id)), radius, explosions };
}
