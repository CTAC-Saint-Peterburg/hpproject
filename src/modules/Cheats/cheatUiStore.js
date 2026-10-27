import { create } from 'zustand';

export const useCheatUiStore = create(set => ({
  showFps: false,
  toggleFps: () => set(s => ({ showFps: !s.showFps })),
}));
