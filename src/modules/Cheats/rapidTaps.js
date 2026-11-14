// Each gap must be short; a slow click starts a fresh sequence.
export function createRapidTaps(onActivate, now = () => performance.now()) {
  let count = 0, last = -Infinity;
  return () => {
    const time = now();
    count = time - last <= 500 && time >= last ? count + 1 : 1;
    last = time;
    if (count === 10) { count = 0; onActivate(); }
  };
}
