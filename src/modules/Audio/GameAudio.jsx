import { useEffect } from 'react';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { useAudioSettings } from './audioSettings.js';
import { audioManager } from './audioRuntime.js';
import { createGameAudioBinding } from './gameAudioBinding';

export default function GameAudio() {
  useEffect(() => createGameAudioBinding({
    gameStore: useGameStore,
    defenseStore: useDefenseStore,
    settingsStore: useAudioSettings,
    manager: audioManager,
    documentTarget: document,
  }), []);
  return null;
}
