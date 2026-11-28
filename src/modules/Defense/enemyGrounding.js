// Reserve only the space needed by the animated silhouette, including selection.
export const ENEMY_VISUAL_SCALE = 1.15 * 1.15;
// Airborne enemies keep their existing height; grounded ones stay just above wood.
export function enemyGroundedLift(enemy, pose, scale, bounds, selected) {
  const halfX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
  const halfY = Math.max(Math.abs(bounds.min.y), Math.abs(bounds.max.y));
  const bottom = (Math.abs(Math.sin(pose.roll)) * halfX * scale.x + Math.abs(Math.cos(pose.roll)) * halfY * scale.y) * (selected ? 1.18 : 1);
  return Math.max(pose.lift, .012 + bottom - (enemy.size * .6 + enemy.y));
}
