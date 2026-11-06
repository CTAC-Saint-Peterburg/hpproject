import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import sounds from '../../static/sounds.json' with { type: 'json' };

export const AUDIO_SETTINGS_KEY = 'hpproject-audio-v1';

export function normalizeAudioSettings(settings = {}) {
  const defaults = sounds.master;
  return {
    enabled: typeof settings?.enabled === 'boolean' ? settings.enabled : defaults.enabled,
    volume: Number.isFinite(settings?.volume) ? Math.max(0, Math.min(1, settings.volume)) : defaults.volume,
  };
}

export const useAudioSettings = create(persist(set => ({
  ...normalizeAudioSettings(),
  setEnabled: enabled => set({ enabled: Boolean(enabled) }),
  setVolume: volume => {
    if (Number.isFinite(volume)) set({ volume: Math.max(0, Math.min(1, volume)) });
  },
}), {
  name: AUDIO_SETTINGS_KEY,
  partialize: state => ({ enabled: state.enabled, volume: state.volume }),
  merge: (saved, current) => ({ ...current, ...normalizeAudioSettings(saved) }),
}));
