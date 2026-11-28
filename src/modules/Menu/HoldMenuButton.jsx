import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createHoldAction } from './holdAction';

export default function HoldMenuButton({ onComplete, pixels = 90 }) {
  const { t } = useTranslation();
  const action = useRef(null);
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    const controller = createHoldAction(onComplete, setRemaining);
    action.current = controller;
    const cancel = () => controller.cancel();
    const tick = setInterval(() => controller.tick(performance.now()), 50);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => { clearInterval(tick); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', cancel); action.current = null; };
  }, [onComplete]);
  const cancelPointer = event => { event.stopPropagation(); action.current?.cancel(event.pointerId); };
  return <div className="scene-book-hold" style={{ '--hold-size': pixels * .9 + 'px' }}>
    <button style={{ width: pixels * .64, height: pixels }} className="scene-control scene-menu-book" aria-label={t('menu.holdExit')}
      onPointerDown={event => {
        event.stopPropagation(); event.preventDefault();
        if (event.button !== 0 || event.isPrimary === false) return;
        if (action.current?.start(event.pointerId, performance.now())) event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) action.current?.cancel(event.pointerId);
      }}
      onPointerUp={cancelPointer} onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer} onPointerLeave={cancelPointer}
      onClick={event => { event.stopPropagation(); event.preventDefault(); }}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) action.current?.start('keyboard', performance.now()); } }}
      onKeyUp={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); action.current?.cancel('keyboard'); } }}
      onBlur={() => action.current?.cancel()}>menu</button>
    {remaining !== null && <span className="scene-book-progress" role="status" aria-label={t('menu.exitCountdown', { seconds: remaining })}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="hold-track" cx="50" cy="50" r="43" /><circle className="hold-fill" cx="50" cy="50" r="43" pathLength="100" /></svg>
      <strong>{remaining}</strong>
    </span>}
  </div>;
}
