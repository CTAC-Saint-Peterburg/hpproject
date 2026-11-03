import { arenaBaseCameraPose } from './arenaLayout.js';

export function writeArenaCameraPose(out, aspect, coinPosition, weight, basePose = arenaBaseCameraPose(aspect)) {
  const focus = coinPosition ? Math.max(0, Math.min(1, weight)) : 0;
  const x = coinPosition?.[0] ?? 0, y = coinPosition?.[1] ?? 0, z = coinPosition?.[2] ?? 0;
  out.position[0] = basePose.position[0] * (1 - focus) + x * focus;
  out.position[1] = basePose.position[1] * (1 - focus) + (y + 4.4) * focus;
  out.position[2] = basePose.position[2] * (1 - focus) + (z + 3.7) * focus;
  out.target[0] = basePose.target[0] * (1 - focus) + x * focus;
  out.target[1] = basePose.target[1] * (1 - focus) + y * focus;
  out.target[2] = basePose.target[2] * (1 - focus) + z * focus;
  return out;
}
