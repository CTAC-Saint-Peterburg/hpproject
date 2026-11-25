import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function TargetPrompt() {
  const { t } = useTranslation(); const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer;
    const show = () => { clearTimeout(timer); setVisible(true); timer = setTimeout(() => setVisible(false), 3000); };
    window.addEventListener('hyped-target-needed', show);
    return () => { clearTimeout(timer); window.removeEventListener('hyped-target-needed', show); };
  }, []);
  return visible && <div className="target-prompt stirring-label" role="status">{Array.from(t('display.selectTarget')).map((letter, index) =>
    <span key={index} style={{ animationDelay: `${index * .075}s` }}>{letter === ' ' ? '\u00a0' : letter}</span>)}</div>;
}
