export function writePotionFlightPose(flight, time, out) {
  const progress = Math.max(0, Math.min(1, (time - flight.startedAt) / Math.max(.001, flight.duration)));
  const eased = progress * progress * (3 - 2 * progress);
  for (let axis = 0; axis < 3; axis++) out.position[axis] = flight.from[axis] + (flight.to[axis] - flight.from[axis]) * eased;
  out.position[1] += Math.sin(progress * Math.PI) * flight.arcHeight;
  out.rotation[0] = progress * Math.PI * 2;
  out.rotation[1] = progress * Math.PI * .4;
  out.rotation[2] = Math.sin(progress * Math.PI) * .3;
  out.progress = progress;
  out.done = progress >= 1;
  return out;
}
