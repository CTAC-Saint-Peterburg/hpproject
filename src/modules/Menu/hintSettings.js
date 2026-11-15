import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const HINT_SETTINGS_KEY = 'hpproject-hints-v1';
export const normalizeHintSettings = saved => ({ defaultEnabled: typeof saved?.defaultEnabled === 'boolean' ? saved.defaultEnabled : true });
export const useHintSettings = create(persist(set => ({
  ...normalizeHintSettings(),
  setDefaultEnabled: value => set({ defaultEnabled: Boolean(value) }),
}), {
  name: HINT_SETTINGS_KEY,
  partialize: state => ({ defaultEnabled: state.defaultEnabled }),
  merge: (saved, current) => ({ ...current, ...normalizeHintSettings(saved) }),
}));

export function sessionHintsVisible(session, key, defaultEnabled) {
  return session?.key === key ? session.visible : defaultEnabled;
}
