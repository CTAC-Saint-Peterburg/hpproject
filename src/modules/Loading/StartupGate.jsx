import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { preloadFont } from 'troika-three-text';
import { audioManager } from '../Audio/audioRuntime';
import i18n from '../../translate/i18n';
import { theme } from '../../static/theme';

let fontsReady;
function prepareFonts() {
  if (!fontsReady) fontsReady = new Promise(resolve => {
    const characters = [...new Set(Object.values(i18n.options.resources)
      .flatMap(resource => Object.entries(resource.translation)
        .filter(([key]) => /^ingredients\.|^spells\.\d+\.name$|^brewing\.next/.test(key))
        .map(([, value]) => value)).join('') + '0123456789°%♨❄↻◷')].join('');
    preloadFont({ font: theme.fonts.spatial || undefined, characters }, resolve);
  });
  return fontsReady;
}

export default function StartupGate({ children }) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0), [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0), [error, setError] = useState(false);
  useEffect(() => {
    let active = true, timeout;
    const work = Promise.all([
      audioManager.preload(value => { if (active) setProgress(Math.round(value * 80)); }),
      prepareFonts(), document.fonts.ready,
    ]);
    Promise.race([work, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Loading timed out')), 60000);
    })]).then(() => { if (active) setReady(true); })
      .catch(() => { if (active) setError(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); };
  }, [attempt]);
  if (ready) return children;
  return <div className="startup-loading" role="status" aria-live="polite" aria-busy={!error}>
    <h1>Hyped Pot</h1><p>{t(error ? 'loading.failed' : 'loading.preparing')}</p>
    {!error && <progress max="100" value={progress} aria-label={t('loading.preparing')} />}
    {error && <button onClick={() => { fontsReady = undefined; setError(false); setProgress(0); setAttempt(value => value + 1); }}>{t('loading.retry')}</button>}
  </div>;
}
