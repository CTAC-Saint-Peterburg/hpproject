export function canFollowCarriedPointer(mode, interaction = {}) {
  return mode === 'touch' || interaction.touch ? interaction.role === 'drag' : true;
}

export function carriedScreenPoint(enemy, camera, point) {
  return point.set(enemy.x, enemy.y + enemy.size * .6, enemy.z).project(camera);
}
