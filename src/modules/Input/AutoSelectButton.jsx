import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';

export default function AutoSelectButton({ arena = false }) {
  const { t } = useTranslation();
  const game = useGameStore(), defense = useDefenseStore();
  const disabled = arena ? defense.paused || defense.phase !== 'wave' || !defense.enemies.length : game.paused || game.status !== 'playing';
  return <button className="hint-toggle auto-select" disabled={disabled} aria-label={t('selection.next')} title={t('selection.next')}
    onClick={() => window.dispatchEvent(new Event(arena ? 'hyped-select-arena' : 'hyped-select-brewing'))}>
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 36 28 19 32 23 15 40ZM24 23l4 4M33 7v5m8 4h-5m-9-8 2 4m10 12-4-2M37 6l-2 7"/>
      <path d="m32 13 1.5 4.5L38 19l-4.5 1.5L32 25l-1.5-4.5L26 19l4.5-1.5Z"/>
    </svg>
  </button>;
}
