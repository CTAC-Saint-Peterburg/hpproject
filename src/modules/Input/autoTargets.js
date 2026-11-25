export function nextTarget(targets, current) {
  if (!targets.length) return null;
  return targets[(targets.findIndex(target => target.key === current) + 1) % targets.length];
}
export function nearestEnemies(enemies, types) {
  return enemies.filter(enemy => enemy.hp > 0 && types[enemy.type]?.hostile !== false)
    .slice().sort((a,b) => a.x*a.x+a.z*a.z-b.x*b.x-b.z*b.z || String(a.id).localeCompare(String(b.id)));
}
