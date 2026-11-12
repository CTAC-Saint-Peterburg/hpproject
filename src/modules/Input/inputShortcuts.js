export function editableTarget(target) {
  return !!target?.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target?.tagName ?? '');
}

export function isInputModeShortcut(event) {
  return event.code === 'KeyM' && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey &&
    !event.repeat && !editableTarget(event.target);
}

export function createInputShortcutBinding(store, target = window) {
  const key = event => {
    if (!isInputModeShortcut(event)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    store.getState().toggleMode();
  };
  target.addEventListener('keydown', key, true);
  return () => target.removeEventListener('keydown', key, true);
}
