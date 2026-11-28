import { useEffect } from 'react';

export default function ScreenOrientation({ gameplay }) {
  useEffect(() => {
    const mode = gameplay ? 'landscape' : 'portrait';
    if (window.HypedDisplay?.setOrientation) window.HypedDisplay.setOrientation(mode);
    else if (navigator.maxTouchPoints > 0) {
      // Browsers may refuse locking outside fullscreen. The fitted frame remains usable.
      try { window.screen.orientation?.lock?.(mode)?.catch(() => {}); } catch { /* unsupported browser */ }
    }
  }, [gameplay]);
  return null;
}
