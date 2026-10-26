export const ENEMY_TYPES = {
  enemycold: { color: '#32aaff', temperatureDelta: -15, counterSpell: 1, name: 'enemies.enemycold' },
  enemyfire: { color: '#ffdf32', temperatureDelta: 15, counterSpell: 2, name: 'enemies.enemyfire' },
  enemyslime: { color: '#94e5b2', name: 'enemies.enemyslime', approachMs: 5000, requiredSpells: 3 },
};
export const ENEMY_FLIGHT_MS = 2500;
export const ENEMY_SHOT_MS = 4000;
export const PROJECTILE_FLIGHT_MS = 2200;

// Shared by enemies and shots so the projectile starts at the visible cube.
export function enemyPosition(enemy, now, width, height) {
  if (enemy.type === 'enemyslime') {
    const progress = Math.min(1, Math.max(0, (now - enemy.bornAt) / ENEMY_TYPES.enemyslime.approachMs));
    return [(enemy.entrySide || 1) * width * .65 * (1 - progress), Math.sin(progress * Math.PI) * .1, 1];
  }
  const age = Math.max(0, (now - enemy.bornAt) / 1000);
  const progress = Math.min(1, age / (ENEMY_FLIGHT_MS / 1000));
  return [
    enemy.side * width * (0.42 + (1 - progress) * 0.22),
    height * 0.34 + Math.sin(age * 1.2) * 0.12,
    0,
  ];
}

export function isPotBlocked(enemies, now) {
  return enemies.some(enemy => enemy.type === 'enemyslime' && now - enemy.bornAt >= ENEMY_TYPES.enemyslime.approachMs);
}

export function randomSlimeSpells(random = Math.random) {
  const pool = Array.from({ length: 10 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, ENEMY_TYPES.enemyslime.requiredSpells);
}
