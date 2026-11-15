import { create } from 'zustand';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { beginMenuTransition, finishMenuTransition } from './triptychState';

export const useTriptychStore = create(set => ({ phase: 'closed', setPhase: phase => set({ phase }) }));
export const openTriptych = () => beginMenuTransition(useGameStore.getState(), useDefenseStore.getState(), useTriptychStore.getState());
export const finishTriptych = () => finishMenuTransition(useGameStore.getState(), useDefenseStore.getState(), useTriptychStore.getState());
