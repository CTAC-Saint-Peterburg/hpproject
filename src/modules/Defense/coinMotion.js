export const COIN_REST_Y = .12;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const unit = random => { const value = random(); return Number.isFinite(value) ? clamp(value, 0, 1 - Number.EPSILON) : .5; };
const mix = (from, to, t) => from + (to - from) * t;

// All random choices are captured once. Rendering and pausing never consume RNG.
export function createCoinToss(random = Math.random) {
  const bounceCount = 2 + Math.floor(unit(random) * 5);
  const drop = { start: 0, duration: .54 + unit(random) * .16, from: [0, 1.6, 2.3], to: [0, COIN_REST_Y, 2.3] };
  const dropTurns = (1 + Math.floor(unit(random) * 2)) * (unit(random) < .5 ? -1 : 1);
  const centre = [(unit(random) - .5) * .6, 2.45 + (unit(random) - .5) * .15];
  const firstHeight = .92 + unit(random) * .25;
  let angle = unit(random) * Math.PI * 2;
  let yaw = unit(random) * Math.PI * 2;
  const initialYaw = yaw;
  let start = drop.duration, from = drop.to, turns = dropTurns;
  const hops = [];
  for (let index = 0; index < bounceCount; index++) {
    angle += Math.PI * (.5 + unit(random) * .9);
    const radius = .65 * .62 ** index;
    const to = [centre[0] + Math.cos(angle) * radius, COIN_REST_Y,
      clamp(centre[1] + Math.sin(angle) * radius, 2.05, 3.35)];
    const height = firstHeight * .56 ** index;
    const spinTurns = height >= .55 ? (unit(random) < .5 ? -1 : 1) : 0;
    const duration = Math.max(.21, (.50 + unit(random) * .10) * .79 ** index);
    const nextYaw = yaw + (unit(random) - .5) * Math.PI;
    hops.push({ start, duration, height, from: [...from], to, yawFrom: yaw, yawTo: nextYaw, turnsFrom: turns, spinTurns });
    start += duration;
    turns += spinTurns;
    yaw = nextYaw;
    from = to;
  }
  const settleSeconds = .22;
  return { bounceCount, duration: start + settleSeconds, drop, dropTurns, initialYaw, hops,
    settleSeconds, settleStart: start, finalPosition: [...from], finalTurns: turns, finalYaw: yaw };
}

// Simulation seconds, not wall-clock time, keep the complete motion frozen on pause.
export function coinPose(plan, elapsed = 0, result = true) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  if (!plan) return { position: [0, 1.6 + Math.sin(time * 2) * .04, 2.3], rotation: [0, Math.sin(time * .6) * .15, 0], settled: false };
  const face = result === false ? Math.PI : 0;
  const flatRotation = [plan.finalTurns * Math.PI * 2 + face, plan.finalYaw, 0];
  if (time >= plan.duration) return { position: [...plan.finalPosition], rotation: flatRotation, settled: true };
  if (time < plan.drop.duration) {
    const t = clamp(time / plan.drop.duration), turn = smooth(t);
    return {
      position: [mix(plan.drop.from[0], plan.drop.to[0], turn),
        mix(plan.drop.from[1], COIN_REST_Y, t * t), mix(plan.drop.from[2], plan.drop.to[2], turn)],
      rotation: [(plan.dropTurns * Math.PI * 2 + face) * turn, plan.initialYaw * turn, 0], settled: false,
    };
  }
  for (const hop of plan.hops) {
    if (time > hop.start + hop.duration) continue;
    const t = clamp((time - hop.start) / hop.duration);
    const turn = smooth(t);
    const rock = hop.spinTurns ? 0 : Math.sin(t * Math.PI) * .3 * hop.height / .55;
    return {
      position: [mix(hop.from[0], hop.to[0], turn), COIN_REST_Y + 4 * hop.height * t * (1 - t), mix(hop.from[2], hop.to[2], turn)],
      rotation: [(hop.turnsFrom + hop.spinTurns * turn) * Math.PI * 2 + face + rock, mix(hop.yawFrom, hop.yawTo, turn), 0],
      settled: false,
    };
  }
  const t = clamp((time - plan.settleStart) / plan.settleSeconds);
  const wobble = Math.sin(t * Math.PI * 6) * .035 * (1 - t) ** 2;
  return { position: [plan.finalPosition[0], COIN_REST_Y + Math.abs(wobble) * .56, plan.finalPosition[2]],
    rotation: [flatRotation[0] + wobble, flatRotation[1], 0], settled: false };
}
