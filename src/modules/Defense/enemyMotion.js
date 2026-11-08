import settings from '../../static/enemyMotion.json' with { type: 'json' };

// Only mesh transforms change: the shared geometry, hit target and labels stay put.
// The caller owns `out`, so this adds no allocations or random calls per frame.
export function writeEnemyMotion(out, enemy, time, shape = 'cube') {
  const frozen = enemy.frozenUntil > time;
  const clock = frozen ? Number.isFinite(enemy.frozenAt) ? enemy.frozenAt : 0 : time;
  const seed = enemy.seed ?? 0;
  const rage = enemy.rageUntil > clock && !(enemy.disorientedUntil > clock);
  const strength = (rage ? settings.rageMultiplier : 1) * (shape === 'slime' ? settings.slimeMultiplier : 1);
  const breath = Math.sin(clock * settings.pulseFrequency + seed) * settings.pulseAmplitude * strength;
  out.x = 1 + breath;
  out.y = 1 - breath * .7;
  out.z = 1 + breath * .35;
  out.lift = enemy.size * (shape === 'slime' ? .7 : .6) * (out.y - 1);
  out.yaw = Math.sin(clock * settings.swayFrequency + seed * 1.7) * settings.swayAmplitude * strength;
  out.roll = enemy.disorientedUntil > clock ? Math.sin(clock * 5) * .13 : 0;
  return out;
}
