export const OPEN_SECONDS = .85;
export function openingPose(elapsed, reduced = false) {
  const progress = reduced ? 1 : Math.min(1, Math.max(0, elapsed / OPEN_SECONDS));
  const eased = progress * progress * (3 - 2 * progress);
  return { progress, angle: eased * 2.25, scale: 1 + eased * 3.6 };
}

// Injectable actions keep the return-to-menu transition independent of stores.
export function beginMenuTransition(game, arena, ui) {
  if (ui.phase === 'opening') return;
  if (game.startGame) game.setPaused(true);
  if (arena.phase !== 'idle') arena.setPaused(true);
  ui.setPhase('opening');
}
export function finishMenuTransition(game, arena, ui) {
  if (ui.phase !== 'opening') return;
  game.exitToMenu();
  arena.exit();
  ui.setPhase('open');
}
