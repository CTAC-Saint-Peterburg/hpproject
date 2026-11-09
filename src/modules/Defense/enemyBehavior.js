import { advanceEnemyCarry } from './enemyCarry.js';

// All motion and attack timers use arena simulation time, including projectiles.
export function rangedDelay(ranged, random) {
  return ranged.interval ?? ranged.intervalMin + random() * (ranged.intervalMax - ranged.intervalMin);
}

export function createArenaEnemy(config, type, group, time, serial, random, position) {
  const base = config.enemies[type];
  if (!base) return null;
  const edge = Math.floor(random() * 4), w = config.field.width / 2 - .5, d = config.field.depth / 2 - .5;
  const x = position?.x ?? (edge < 2 ? (edge === 0 ? -w : w) : (random() * 2 - 1) * w);
  const z = position?.z ?? (edge >= 2 ? (edge === 2 ? -d : d) : (random() * 2 - 1) * d);
  const maxHp = base.hp * (group.hpMultiplier ?? 1);
  return {
    id: 'arena-enemy-' + serial, type, x, z, y: base.orbit?.height ?? 0, hp: maxHp, maxHp,
    size: base.size * ((group.sizeMin ?? 1) + random() * ((group.sizeMax ?? 1) - (group.sizeMin ?? 1))),
    attack: base.attack * (group.attackMultiplier ?? 1), speed: base.speed * (group.speedMultiplier ?? 1),
    critChance: group.critChance ?? base.critChance, specialChance: group.specialChance ?? base.special.chance,
    rageAt: time + base.rageInterval * (.6 + random() * .5), rageUntil: 0, nextAttack: 0,
    frozenUntil: 0, frozenAt: null, burnUntil: 0, burnDps: 0,
    motion: base.split ? 'walk' : ['walk', 'dash', 'jump'][Math.floor(random() * 3)], seed: random() * Math.PI * 2,
    disorientedUntil: 0, knockbackUntil: 0, wanderAngle: random() * Math.PI * 2, wanderTurnAt: 0,
    windupUntil: 0, nextRangedAt: base.ranged ? time + rangedDelay(base.ranged, random) : 0,
    spawnGroup: { hpMultiplier: group.hpMultiplier ?? 1, attackMultiplier: group.attackMultiplier ?? 1,
      speedMultiplier: group.speedMultiplier ?? 1 },
  };
}

function constrain(enemy, config) {
  const margin = enemy.size * .7 + .1;
  const w = Math.max(0, config.field.width / 2 - margin), d = Math.max(0, config.field.depth / 2 - margin);
  enemy.x = Math.max(-w, Math.min(w, enemy.x));
  enemy.z = Math.max(-d, Math.min(d, enemy.z));
}

function wander(enemy, config, time, dt, speed, turnInterval, random) {
  if (time >= enemy.wanderTurnAt) {
    enemy.wanderAngle = random() * Math.PI * 2;
    enemy.wanderTurnAt = time + turnInterval;
  }
  const x = enemy.x, z = enemy.z;
  enemy.x += Math.cos(enemy.wanderAngle) * speed * dt;
  enemy.z += Math.sin(enemy.wanderAngle) * speed * dt;
  constrain(enemy, config);
  if (Math.abs(enemy.x - x) < speed * dt * .01 || Math.abs(enemy.z - z) < speed * dt * .01) {
    enemy.wanderTurnAt = time;
  }
}

function afterMeleeAttack(enemy, config, time, random) {
  const { knockback, disorientation } = config.afterAttack;
  if (random() < knockback.chance) {
    const distance = Math.hypot(enemy.x, enemy.z);
    const angle = distance > .001 ? Math.atan2(enemy.z, enemy.x) : random() * Math.PI * 2;
    const end = { ...enemy, x: enemy.x + Math.cos(angle) * knockback.distance,
      z: enemy.z + Math.sin(angle) * knockback.distance };
    constrain(end, config);
    enemy.knockbackFrom = [enemy.x, enemy.z];
    enemy.knockbackTo = [end.x, end.z];
    enemy.knockbackStart = time;
    enemy.knockbackUntil = time + knockback.duration;
  }
  if (random() < disorientation.chance) {
    enemy.disorientedUntil = time + disorientation.duration;
    enemy.rageUntil = 0;
    enemy.rageAt = enemy.disorientedUntil;
    enemy.wanderTurnAt = time;
  }
}

function shoot(enemy, base, combat) {
  const ranged = base.ranged;
  combat.projectileSerial++;
  combat.projectiles.push({ id: 'arena-shot-' + combat.projectileSerial, sourceId: enemy.id, type: enemy.type,
    x: enemy.x, y: enemy.y + enemy.size * .6, z: enemy.z, size: ranged.projectileSize,
    speed: ranged.projectileSpeed, damage: ranged.damage * (base.attack > 0 ? enemy.attack / base.attack : 1), interceptable: ranged.interceptable,
    counterSpell: base.counterSpell, element: ranged.element,
    effectDuration: ranged.effectDuration ?? 0, effectDps: ranged.effectDps ?? 0 });
}

export function advanceArenaEnemy(original, config, potions, time, dt, random, combat) {
  const enemy = { ...original }, base = config.enemies[enemy.type];
  if (enemy.burnUntil > time) enemy.hp -= enemy.burnDps * dt;
  if (enemy.hp <= 0) return enemy;
  if (advanceEnemyCarry(enemy, config, time, dt)) return enemy;
  const frozenSpeed = potions.find(p => p.effect === 'freeze').slowMultiplier;
  const frozenSeconds = Math.min(dt, Math.max(0, enemy.frozenUntil - (time - dt)));
  // Freeze halts every movement branch, including knockback and disorientation.
  // Shift active timers so attacks and a ranged warning resume after thawing.
  if (frozenSeconds > 0 && frozenSpeed === 0) {
    if (enemy.knockbackTo && enemy.knockbackUntil > time - dt) enemy.knockbackStart += frozenSeconds;
    for (const field of ['rageAt', 'rageUntil', 'nextAttack', 'knockbackUntil',
      'disorientedUntil', 'wanderTurnAt', 'windupUntil', 'nextRangedAt']) {
      if (Number.isFinite(enemy[field]) && enemy[field] > 0) enemy[field] += frozenSeconds;
    }
    dt -= frozenSeconds;
    if (dt <= 1e-9) return enemy;
  }
  const slow = enemy.frozenUntil > time ? frozenSpeed : 1;
  const disoriented = enemy.disorientedUntil > time;
  const knockback = original.knockbackUntil > time - dt && enemy.knockbackTo;
  if (knockback) {
    const progress = Math.min(1, Math.max(0, (time - enemy.knockbackStart) / (enemy.knockbackUntil - enemy.knockbackStart)));
    const eased = 1 - (1 - progress) ** 2;
    enemy.x = enemy.knockbackFrom[0] + (enemy.knockbackTo[0] - enemy.knockbackFrom[0]) * eased;
    enemy.z = enemy.knockbackFrom[1] + (enemy.knockbackTo[1] - enemy.knockbackFrom[1]) * eased;
    return enemy;
  }
  if (disoriented) {
    const behavior = config.afterAttack.disorientation;
    if (slow > 0) wander(enemy, config, time, dt, enemy.speed * slow * behavior.speedMultiplier, behavior.turnInterval, random);
    return enemy;
  }
  if (base.movement === 'bomber') {
    wander(enemy, config, time, dt, enemy.speed * slow, base.wanderTurnInterval, random);
    enemy.y = Math.sin(time * 2 + enemy.seed) * .03;
    return enemy;
  }
  if (base.ranged) {
    if (base.movement === 'orbit') {
      const distance = Math.hypot(enemy.x, enemy.z) || .001;
      const radius = Math.min(base.orbit.radius, config.field.width / 2 - 1, config.field.depth / 2 - 1);
      const nextRadius = distance + Math.sign(radius - distance) * Math.min(Math.abs(radius - distance), enemy.speed * slow * dt);
      // Enter the circular path radially, so an edge spawn never sweeps outside the table.
      const angle = Math.atan2(enemy.z, enemy.x) + (nextRadius <= radius + .01 ? base.orbit.angularSpeed * slow * dt : 0);
      enemy.x = Math.cos(angle) * nextRadius; enemy.z = Math.sin(angle) * nextRadius;
      enemy.y = base.orbit.height + Math.sin(time * 2 + enemy.seed) * .1;
    } else {
      wander(enemy, config, time, dt, enemy.speed * .35 * slow, base.ranged.checkInterval, random);
      enemy.y = Math.sin(time * 2 + enemy.seed) * .03;
    }
    if (enemy.windupUntil > 0) {
      if (time >= enemy.windupUntil) {
        shoot(enemy, base, combat);
        enemy.windupUntil = 0;
        enemy.nextRangedAt = time + rangedDelay(base.ranged, random);
      }
    } else if (time >= enemy.nextRangedAt) {
      if (!base.ranged.countdown) {
        shoot(enemy, base, combat);
        enemy.nextRangedAt = time + rangedDelay(base.ranged, random);
      } else if (random() < base.ranged.chance) enemy.windupUntil = time + base.ranged.countdown;
      else enemy.nextRangedAt = time + base.ranged.checkInterval;
    }
    return enemy;
  }
  if (time >= enemy.rageAt && time >= enemy.rageUntil) {
    enemy.rageUntil = time + base.rageDuration;
    enemy.rageAt = time + base.rageDuration + base.rageInterval;
  }
  const rage = time < enemy.rageUntil, distance = Math.hypot(enemy.x, enemy.z) || .001;
  const dash = rage || (enemy.motion === 'dash' && Math.sin(time * 2 + enemy.seed) > .8);
  const speed = enemy.speed * slow * (dash ? base.rageSpeed : .35);
  if (rage || distance > 3) {
    const step = Math.min(Math.max(0, distance - config.crystal.attackRange), speed * dt);
    enemy.x -= enemy.x / distance * step; enemy.z -= enemy.z / distance * step;
  } else {
    const angle = speed * dt / Math.max(distance, 1), x = enemy.x;
    enemy.x = x * Math.cos(angle) - enemy.z * Math.sin(angle);
    enemy.z = x * Math.sin(angle) + enemy.z * Math.cos(angle);
  }
  if (rage && slow > 0 && Math.hypot(enemy.x, enemy.z) <= config.crystal.attackRange + .05 && time >= enemy.nextAttack) {
    enemy.nextAttack = time + base.attackInterval / Math.max(slow, .25);
    combat.hp -= enemy.attack * (random() < enemy.critChance ? base.criticalMultiplier : 1);
    if (random() < enemy.specialChance) {
      combat.hp -= base.special.damage;
      if (base.special.effect !== 'extra') combat.effects[base.special.effect] = { until: time + base.special.duration, dps: base.special.dps };
    }
    afterMeleeAttack(enemy, config, time, random);
  }
  enemy.y = slow === 0 ? original.y : enemy.motion === 'jump' ? Math.max(0, Math.sin(time * (rage ? 5 : 2) + enemy.seed)) * .65 : Math.sin(time * 4 + enemy.seed) * .04;
  return enemy;
}

export function advanceArenaProjectiles(projectiles, time, dt, combat) {
  const active = [];
  for (const original of projectiles) {
    const shot = { ...original }, dx = -shot.x, dy = 1.1 - shot.y, dz = -shot.z;
    const distance = Math.hypot(dx, dy, dz), step = shot.speed * dt;
    if (distance <= step + shot.size + .35) {
      combat.hp -= shot.damage;
      if (shot.element && shot.effectDuration > 0) {
        const previous = combat.effects[shot.element];
        combat.effects[shot.element] = { until: Math.max(previous?.until ?? 0, time + shot.effectDuration),
          dps: Math.max(previous?.dps ?? 0, shot.effectDps) };
      }
    } else {
      shot.x += dx / distance * step; shot.y += dy / distance * step; shot.z += dz / distance * step;
      active.push(shot);
    }
  }
  return active;
}
