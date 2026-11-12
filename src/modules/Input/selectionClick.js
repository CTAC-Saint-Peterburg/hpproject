// Unlike pointerdown, click defaults isPrimary to false even for the main mouse
// button. Match the accepted pointer's id instead of filtering click.isPrimary.
export function isSelectionClick(event, clickState) {
  if (!event || clickState?.suppressed || event.delta > 4) return false;
  const source = event.nativeEvent ?? event;
  const button = source.button ?? event.button;
  if (button !== undefined && button !== 0) return false;
  const pointerId = source.pointerId ?? event.pointerId;
  return !Number.isFinite(clickState?.pointerId) || !Number.isFinite(pointerId) ||
    pointerId < 0 || pointerId === clickState.pointerId;
}
