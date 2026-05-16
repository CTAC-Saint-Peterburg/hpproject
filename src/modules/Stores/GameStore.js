// src/stores/gameStore.js
import { create } from 'zustand';

export const useGameStore = create((set) => ({

    startGame: null,
    setStartGame: (value) => set({ startGame: value }),
  // Начальное состояние
  currentSpell: null, // замените на '' или объект, если нужно

  // Метод обновления
  setCurrentSpell: (spell) => set({ currentSpell: spell }),

  // Новые поля для меню
  selectedLevel: null,
  selectedLang: 'ru',
  setLevel: (id) => set({ selectedLevel: id }),
  setLang: (code) => set({ selectedLang: code }),

}));