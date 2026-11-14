import { useMemo } from 'react';
import { useCheatUiStore } from './cheatUiStore';
import { createRapidTaps } from './rapidTaps';

export default function TrainerCrystal() {
  const tap = useMemo(() => createRapidTaps(() => useCheatUiStore.getState().setOpen(true)), []);
  return <button className="trainer-crystal" aria-label="Кристалл — 10 быстрых нажатий открывают trainer"
    onClick={event => { event.stopPropagation(); tap(); }}>💎</button>;
}
