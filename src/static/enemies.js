export const ENEMY_TYPES = {
  enemycold: { color: '#32aaff', temperatureDelta: -15, counterSpell: 1, name: 'enemies.enemycold' },
  enemyfire: { color: '#ffdf32', temperatureDelta: 15, counterSpell: 2, name: 'enemies.enemyfire' },
};
export const ENEMY_FLIGHT_MS = 2500;
export const ENEMY_SHOT_MS = 4000;
export const PROJECTILE_FLIGHT_MS = 2200;

// Shared by enemies and shots so the projectile starts at the visible cube.
export function enemyPosition(enemy, now, width, height) {
  const age = Math.max(0, (now - enemy.bornAt) / 1000);
  const progress = Math.min(1, age / (ENEMY_FLIGHT_MS / 1000));
  return [
    enemy.side * width * (0.42 + (1 - progress) * 0.22),
    height * 0.34 + Math.sin(age * 1.2) * 0.12,
    0,
  ];
}
