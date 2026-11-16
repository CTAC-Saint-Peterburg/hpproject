import { useMemo } from 'react';
import { useCheatUiStore } from './cheatUiStore';
import { createRapidTaps } from './rapidTaps';
import CurrencyCoin from '../Menu/CurrencyCoin';
import { useTranslation } from 'react-i18next';

export default function TrainerCrystal() {
  const { t } = useTranslation();
  const tap = useMemo(() => createRapidTaps(() => useCheatUiStore.getState().setOpen(true)), []);
  return <button className="trainer-crystal" aria-label={t('hud.trainerCoin')}
    onClick={event => { event.stopPropagation(); tap(); }}><CurrencyCoin /></button>;
}
