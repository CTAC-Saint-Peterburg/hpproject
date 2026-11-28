// Results and all menu pages are portrait; pauses remain in the current game.
export function isGameplayScreen(brewingStarted, brewingStatus, arenaPhase, menuPhase) {
  if (menuPhase === 'opening') return false;
  return (brewingStarted && brewingStatus === 'playing') || !['idle', 'won', 'lost'].includes(arenaPhase);
}
// Retain the old rotate hint for a future optional setting, disabled for now.
export const ROTATE_HINT_ENABLED = false;
