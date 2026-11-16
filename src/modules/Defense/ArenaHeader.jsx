import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import TrainerCrystal from '../Cheats/TrainerCrystal';
import { config } from './defenseState';

export function CrystalHealth({ hp }) {
  const clip = useId(), { t } = useTranslation();
  const health = Math.max(0, Math.min(config.crystal.maxHp, hp));
  const height = 82 * health / config.crystal.maxHp;
  return <div className="arena-crystal-health" role="meter" aria-label={t('arena.crystal')}
    aria-valuemin={0} aria-valuemax={config.crystal.maxHp} aria-valuenow={health}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id={clip}><path d="M50 5 82 46 50 87 18 46Z" /></clipPath></defs>
      <path d="M25 89 36 83H64L75 89V96H25Z" fill="var(--color-crystal-base)" />
      <rect x="0" y={87 - height} width="100" height={height} fill="var(--color-hud-red)" opacity=".5" clipPath={`url(#${clip})`} />
      <path d="M50 5 82 46 50 87 18 46Z M50 5V87 M18 46H82" fill="none" stroke="var(--color-crystal)" strokeWidth="2" />
    </svg><strong aria-hidden="true">{Math.ceil(health)}</strong>
  </div>;
}

const romanWaves = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export default function ArenaHeader({ state, stones, pending, walletRef }) {
  const { t } = useTranslation();
  return <header className="arena-top arena-top-indicators">
    <CrystalHealth hp={state.hp} />
    <div className="arena-wave" aria-label={t('arena.wave', { wave: state.wave + 1 })}>
      <span>{t('arena.waveLabel')}</span><hr /><strong>{romanWaves[state.wave] ?? state.wave + 1}</strong>
    </div>
    <div className="arena-currency">
      <small>{t('hud.balance', { value: stones })}</small>
      <div ref={walletRef} className={'arena-currency-target' + (state.rewardCollectedSerial ? ' arena-wallet-collected' : '')} key={state.rewardCollectedSerial}>
        <TrainerCrystal />
      </div>
      <small>{t('hud.pending')}</small><strong aria-live="polite">{pending}</strong>
    </div>
  </header>;
}
