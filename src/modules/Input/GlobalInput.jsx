import { useEffect } from 'react';
import { createInputShortcutBinding } from './inputShortcuts';
import { useInputStore } from './inputStore';

export default function GlobalInput() {
  useEffect(() => createInputShortcutBinding(useInputStore), []);
  return null;
}
