import { create } from 'zustand';
import { useGameStore } from '../Stores/GameStore';
import { defenseState } from './defenseState';

export const useDefenseStore = create(defenseState(() => useGameStore.getState()));
