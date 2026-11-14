import { useEffect } from 'react';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { useInputStore } from './inputStore';
export default function AndroidLifecycle() {
  useEffect(() => {
    if (import.meta.env.MODE !== 'android') return;
    useInputStore.getState().setMode('touch');
    const pause = () => {
      useGameStore.getState().setPaused(true);
      const defense = useDefenseStore.getState();
      if (defense.phase !== 'idle') defense.setPaused(true);
    };
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('android-pause', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('android-pause', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  return null;
}
