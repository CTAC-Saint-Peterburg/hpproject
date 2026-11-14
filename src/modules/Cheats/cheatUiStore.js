import { create } from 'zustand';

export const useCheatUiStore = create(set => ({
  open: false,
  setOpen: open => set({ open }),
  toggleOpen: () => set(s => ({ open: !s.open })),
  showFps: false,
  toggleFps: () => set(s => ({ showFps: !s.showFps })),
}));
