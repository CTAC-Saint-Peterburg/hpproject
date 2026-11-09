const carryTypes = new Set(['fire', 'frost', 'sentinel']);

const settings = config => ({ height: 2, dropSeconds: .35, crystalClearance: .3, ...config.enemyCarry });

export function canCarryEnemy(enemy, config) {
  const base = config.enemies[enemy?.type];
  return !!base && enemy.hp > 0 && carryTypes.has(enemy.type) && base.shape === 'cube' && !base.split && base.movement !== 'orbit';
}

// The cube's full silhouette remains inside the playable top, away from the rack.
// Carrying can cross the crystal; landing is nudged away from its occupied centre.
export function clampCarriedPosition(enemy, x, z, config, avoidCrystal = false) {
  const margin = Math.max(0, enemy.size) * .7 + .1;
  const width = Math.max(0, config.field.width / 2 - margin);
  const depth = Math.max(0, config.field.depth / 2 - margin);
  const fallbackX = Number.isFinite(enemy.x) ? enemy.x : 0;
  const fallbackZ = Number.isFinite(enemy.z) ? enemy.z : 0;
  let nextX = Math.max(-width, Math.min(width, Number.isFinite(x) ? x : fallbackX));
  let nextZ = Math.max(-depth, Math.min(depth, Number.isFinite(z) ? z : fallbackZ));
  if (avoidCrystal) {
    const radius = Math.max(0, config.crystal.attackRange + settings(config).crystalClearance);
    const distance = Math.hypot(nextX, nextZ);
    if (distance < radius) {
      const angle = distance > .001 ? Math.atan2(nextZ, nextX) : Math.atan2(enemy.z || 0, enemy.x || 1);
      nextX = Math.max(-width, Math.min(width, Math.cos(angle) * radius));
      nextZ = Math.max(-depth, Math.min(depth, Math.sin(angle) * radius));
    }
  }
  return { x: nextX, z: nextZ };
}

export function beginEnemyCarry(enemy, config, time) {
  if (!canCarryEnemy(enemy, config)) return enemy;
  return { ...enemy, carried: true, liftStartedAt: time, liftFromY: Math.max(0, enemy.y ?? 0),
    droppingStartedAt: null, droppingUntil: 0, dropFromY: 0,
    knockbackFrom: null, knockbackTo: null, knockbackStart: 0, knockbackUntil: 0 };
}

export function dropCarriedEnemy(enemy, config, time) {
  if (!enemy.carried) return enemy;
  const point = clampCarriedPosition(enemy, enemy.x, enemy.z, config, true);
  return { ...enemy, ...point, carried: false, droppingStartedAt: time,
    droppingUntil: time + Math.max(.01, settings(config).dropSeconds), dropFromY: Math.max(0, enemy.y ?? 0) };
}

function suspendTimers(enemy, seconds) {
  for (const field of ['rageAt', 'rageUntil', 'nextAttack', 'disorientedUntil', 'wanderTurnAt', 'windupUntil', 'nextRangedAt']) {
    if (Number.isFinite(enemy[field]) && enemy[field] > 0) enemy[field] += seconds;
  }
}

const smooth = progress => { const p = Math.max(0, Math.min(1, progress)); return p * p * (3 - 2 * p); };

// Works on advanceArenaEnemy's clone. Combat/DOT is processed by its caller first.
// Suspension is explicit, so melee and ranged attacks cannot happen while held.
export function advanceEnemyCarry(enemy, config, time, dt) {
  if (enemy.carried) {
    suspendTimers(enemy, dt);
    const progress = smooth((time - enemy.liftStartedAt) / .18);
    enemy.y = enemy.liftFromY + (settings(config).height - enemy.liftFromY) * progress;
    return true;
  }
  if (!(enemy.droppingUntil > 0)) return false;
  const heldSeconds = Math.min(dt, Math.max(0, enemy.droppingUntil - (time - dt)));
  suspendTimers(enemy, heldSeconds);
  const progress = smooth((time - enemy.droppingStartedAt) / (enemy.droppingUntil - enemy.droppingStartedAt));
  enemy.y = enemy.dropFromY * (1 - progress);
  if (time >= enemy.droppingUntil) {
    enemy.y = 0;
    enemy.droppingUntil = 0;
    enemy.droppingStartedAt = null;
    enemy.dropFromY = 0;
    enemy.liftStartedAt = null;
    enemy.liftFromY = 0;
  }
  return true;
}
