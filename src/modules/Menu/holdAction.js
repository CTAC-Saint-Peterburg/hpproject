export function createHoldAction(onComplete, onRemaining, duration = 3000) {
  let started = null, owner = null, shown = null;
  const cancel = () => { started = null; owner = null; shown = null; onRemaining(null); };
  return {
    start(id, now) {
      if (started !== null) return false;
      owner = id; started = now; shown = Math.ceil(duration / 1000); onRemaining(shown);
      return true;
    },
    tick(now) {
      if (started === null) return;
      const left = Math.max(0, Math.ceil((duration - (now - started)) / 1000));
      if (!left) { cancel(); onComplete(); }
      else if (left !== shown) { shown = left; onRemaining(left); }
    },
    cancel(id) { if (id === undefined || owner === id) cancel(); },
  };
}
