import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const INPUT_SETTINGS_KEY = 'hpproject-input-v1';

export function detectInputMode(environment = globalThis) {
  const media = query => environment.matchMedia?.(query)?.matches ?? false;
  const coarse = media('(pointer: coarse)'), fine = media('(pointer: fine)');
  return coarse || !fine && (environment.navigator?.maxTouchPoints ?? 0) > 0 ? 'touch' : 'desktop';
}

export function normalizeInputMode(value, fallback = detectInputMode()) {
  return value === 'touch' || value === 'desktop' ? value : fallback;
}

export const useInputStore = create(persist((set, get) => ({
  mode: detectInputMode(),
  setMode: mode => {
    if (mode === 'touch' || mode === 'desktop') set({ mode });
  },
  toggleMode: () => set({ mode: get().mode === 'desktop' ? 'touch' : 'desktop' }),
}), {
  name: INPUT_SETTINGS_KEY,
  partialize: state => ({ mode: state.mode }),
  merge: (saved, current) => ({ ...current, mode: normalizeInputMode(saved?.mode, current.mode) }),
}));
