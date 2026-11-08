import { bestiaryColor } from './bestiaryAppearance';

// Tiny SVG silhouettes keep the whole catalogue visible without extra WebGL contexts.
export default function BestiaryThumbnail({ model }) {
  const color = bestiaryColor(model);
  const slime = model.type === 'enemyslime' || model.type === 'moss';
  const flyer = model.type === 'flyerFire' || model.type === 'flyerFrost';
  const creature = model.kind === 'arenaEnemy' || model.kind === 'brewingEnemy'
    || model.kind === 'projectile' && (model.type === 'brewingCold' || model.type === 'brewingFire');
  return <svg className="bestiary-thumbnail" viewBox="0 0 64 64" aria-hidden="true" style={{ color }}>
    {creature ? slime ? <>
      <ellipse cx="32" cy="36" rx="26" ry="17" fill="currentColor" />
      {model.type === 'enemyslime' && <g fill="var(--color-slime-eye)"><circle cx="23" cy="32" r="3" /><circle cx="41" cy="32" r="3" /></g>}
    </> : <>
      {flyer && <g fill="currentColor"><path d="M4 23 12 20 18 43 11 46Z" /><path d="M60 23 52 20 46 43 53 46Z" /></g>}
      <path d="M14 20 35 10 53 21 53 45 32 56 14 44Z" fill="currentColor" />
      <path d="M14 20 32 31 53 21M32 31V56" fill="none" stroke="var(--color-surface)" strokeWidth="2" opacity=".6" />
    </> : model.kind === 'wand' ? <>
      <path d="M19 52 43 10" stroke="currentColor" strokeWidth="7" strokeLinecap="square" />
      <path d="M41 10 45 5M48 14 55 12M35 6 34 1" stroke="var(--color-wand-tip)" strokeWidth="2" />
    </> : model.kind === 'pot' ? <>
      <path d="M13 22Q7 48 22 53H42Q57 48 51 22Z" fill="currentColor" />
      <ellipse cx="32" cy="21" rx="20" ry="6" fill="var(--color-pot-rim)" />
      <ellipse cx="32" cy="21" rx="15" ry="3" fill="var(--color-pot-liquid)" />
      <path d="M14 27C1 20 1 40 13 36M51 27C63 20 63 40 51 36M22 52 20 59M42 52 44 59" fill="none" stroke="currentColor" strokeWidth="5" />
    </> : model.kind === 'crystal' || model.kind === 'projectile' ? <>
      <path d="M32 6 51 32 32 56 13 32Z" fill="currentColor" />
      <path d="M32 6V56M13 32H51" stroke="var(--color-surface)" strokeWidth="1.5" opacity=".5" />
    </> : model.kind === 'coin' ? <>
      <path d="M22 8H43L57 22V43L43 57H22L8 43V22Z" fill="currentColor" />
      <path d="M27 29 34 25 42 30 40 40 29 44 21 37 23 23 36 18" fill="none" stroke="var(--color-arena-wood-line)" strokeWidth="3" />
    </> : model.kind === 'potion' ? <>
      <path d="M25 12H39V27L48 35V53H16V35L25 27Z" fill="currentColor" />
      <path d="M24 8H40V16H24Z" fill="var(--color-potion-stopper)" />
    </> : model.kind === 'card' ? <>
      <rect x="11" y="5" width="42" height="54" rx="4" fill="var(--color-button)" stroke="currentColor" strokeWidth="2" />
      <path d="M32 12 45 32 32 51 19 32Z" fill="currentColor" />
      <path d="M32 25 34 30 39 32 34 34 32 39 30 34 25 32 30 30Z" fill="var(--color-card-glyph)" />
    </> : model.id === 4 || model.id === 6 ? <path d="M30 55V12H36V27L48 15 52 19 36 35V55ZM30 37 15 24 19 19 30 29Z" fill="currentColor" />
      : model.id === 2 ? <path d="M12 27C8 10 28 9 34 22S54 18 55 36 31 58 20 47 15 36 12 27Z" fill="currentColor" />
        : model.id === 3 ? <path d="M32 7 51 39 39 54H25L13 39Z" fill="currentColor" />
          : <g fill="currentColor"><ellipse cx="20" cy="31" rx="8" ry="20" transform="rotate(-24 20 31)" /><ellipse cx="33" cy="28" rx="8" ry="22" /><ellipse cx="46" cy="32" rx="8" ry="19" transform="rotate(24 46 32)" /></g>}
  </svg>;
}
