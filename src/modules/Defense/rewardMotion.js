export const MAX_REWARD_EVENTS = 64;
export const MAX_REWARD_COINS = 128;
export const REWARD_FLASH_SECONDS = .24;
export const REWARD_COIN_DELAY_SECONDS = REWARD_FLASH_SECONDS;
export const REWARD_COIN_FLIGHT_SECONDS = 1;
export const REWARD_COIN_STAGGER_SECONDS = .065;

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function rewardCoinCount(stones) {
  return Number.isFinite(stones) && stones > 0 ? Math.min(7, 3 + Math.floor(Math.log2(Math.max(1, stones)))) : 0;
}

export function rewardVisualDuration(event) {
  const count = rewardCoinCount(event.stones);
  return count ? REWARD_COIN_DELAY_SECONDS + REWARD_COIN_FLIGHT_SECONDS + (count - 1) * REWARD_COIN_STAGGER_SECONDS : REWARD_FLASH_SECONDS;
}

// The wallet is authoritative already. This amount is only withheld from the
// displayed counter until the last visual coin reaches it, never re-awarded.
export function pendingRewardStones(events, time) {
  let pending = 0;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.stones > 0 && time >= event.time && time < event.time + rewardVisualDuration(event)) pending += event.stones;
  }
  return pending;
}

function coinSeed(id, index) {
  let value = (id ^ Math.imul(index + 1, 0x9e3779b9)) | 0;
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
}

// Writes into a caller-owned object so the render loop creates no pose objects.
// Coordinates are NDC; the renderer unprojects them at a fixed camera depth.
export function writeRewardCoinPose(event, index, time, fromX, fromY, targetX, targetY, out) {
  const progress = (time - event.time - REWARD_COIN_DELAY_SECONDS - index * REWARD_COIN_STAGGER_SECONDS) / REWARD_COIN_FLIGHT_SECONDS;
  const p = clamp(progress);
  const seed = coinSeed(event.id, index);
  const travel = smooth(p);
  const arc = Math.sin(p * Math.PI);
  out.visible = progress >= -1e-10 && progress < 1 - 1e-10;
  out.progress = p;
  out.x = fromX + (targetX - fromX) * travel + arc * (seed - .5) * .18;
  out.y = fromY + (targetY - fromY) * travel + arc * (.12 + seed * .1);
  out.scale = smooth(p / .1) * (1 - smooth((p - .8) / .2) * .8);
  out.spin = seed * Math.PI * 2 + p * Math.PI * (4 + seed * 2);
  return out;
}

export function writeRewardFlashPose(event, time, out) {
  const age = time - event.time;
  const progress = clamp(age / REWARD_FLASH_SECONDS);
  out.visible = time >= event.time && time < event.time + REWARD_FLASH_SECONDS;
  out.scale = .45 + progress * 2.3;
  out.intensity = (1 - progress) ** 2 * 2.2;
  return out;
}
