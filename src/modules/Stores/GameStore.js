// src/stores/gameStore.js
import { create } from 'zustand';

export const useGameStore = create((set) => ({

    startGame: null,
    setStartGame: (value) => set({ startGame: value }),
  // Начальное состояние
  currentSpell: null, // замените на '' или объект, если нужно

  // котел выбран 
  isPotSelected: false,
  potTemperature: 0,
  togglePotSelected: () => set((state) => ({
    currentSpell: null,
    isPotSelected: !state.isPotSelected,
  })),
  changePotTemperature: (value) =>
    set((state) => {
        console.log(state.potTemperature)
      const nextTemperature = state.potTemperature + value;

      if (nextTemperature > 3 || nextTemperature < 0) {
        return state;
      }

      return { potTemperature: nextTemperature };
    }),

  // Метод обновления
  setCurrentSpell: (spell) => set({ currentSpell: spell }),

  // Новые поля для меню
  selectedLevel: null,
  selectedLang: 'ru',
  setLevel: (id) => set({ selectedLevel: id }),
  setLang: (code) => set({ selectedLang: code }),

}));