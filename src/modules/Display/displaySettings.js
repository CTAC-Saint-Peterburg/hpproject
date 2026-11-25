import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DISPLAY_PRESETS = ['auto', 'standard', 'wide'];
export function fitGameFrame(width, height, preset = 'auto') {
  const aspect = preset === 'standard' ? 1.6 : preset === 'wide' ? 16 / 9 : Math.max(1.5, Math.min(1.8, width / Math.max(1, height)));
  const fittedWidth = Math.min(width, height * aspect);
  return { width: Math.max(1, fittedWidth), height: Math.max(1, fittedWidth / aspect) };
}
export const useDisplaySettings = create(persist(set => ({
  preset: 'auto', setPreset: preset => { if (DISPLAY_PRESETS.includes(preset)) set({ preset }); },
}), { name: 'hpproject-display-v1', partialize: s => ({ preset: s.preset }),
  merge: (saved, current) => ({ ...current, preset: DISPLAY_PRESETS.includes(saved?.preset) ? saved.preset : 'auto' }) }));
