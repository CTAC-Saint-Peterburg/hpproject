export function writeArenaCameraPose(out, aspect, coinPosition, weight) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const scale = Math.max(1, 1.35 / safeAspect);
  const focus = coinPosition ? Math.max(0, Math.min(1, weight)) : 0;
  const x = coinPosition?.[0] ?? 0, y = coinPosition?.[1] ?? 0, z = coinPosition?.[2] ?? 0;
  out.position[0] = x * focus;
  out.position[1] = 12 * scale * (1 - focus) + (y + 4.4) * focus;
  out.position[2] = 11 * scale * (1 - focus) + (z + 3.7) * focus;
  out.target[0] = x * focus;
  out.target[1] = y * focus;
  out.target[2] = z * focus;
  return out;
}
