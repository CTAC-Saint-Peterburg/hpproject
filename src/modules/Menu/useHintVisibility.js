import { useState } from 'react';
import { sessionHintsVisible, useHintSettings } from './hintSettings';

export function useHintVisibility(key) {
  const defaultEnabled = useHintSettings(state => state.defaultEnabled);
  const [session, setSession] = useState(null);
  // Reset on menu/round boundaries too: runId may return to 0 and later reuse 1.
  if (session?.key !== key) setSession({ key, visible: defaultEnabled });
  const visible = sessionHintsVisible(session, key, defaultEnabled);
  return [visible, () => setSession(previous => ({ key, visible: !sessionHintsVisible(previous, key, defaultEnabled) }))];
}
