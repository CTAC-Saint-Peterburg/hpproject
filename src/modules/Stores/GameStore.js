// src/stores/gameStore.js
import { create } from 'zustand';

export const useGameStore = create((set) => ({
  // Начальное состояние
  currentSpell: null, // замените на '' или объект, если нужно

  // Метод обновления
  setCurrentSpell: (spell) => set({ currentSpell: spell }),
}));