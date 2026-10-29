import { theme } from '../../static/theme';
import React, { useEffect, useState, useRef } from 'react';
import { Html, useProgress } from '@react-three/drei';
import { useTranslation } from 'react-i18next';

export default function LoaderOverlay() {
  const { t } = useTranslation();
  const { progress, active, errors } = useProgress();
  const [isVisible, setIsVisible] = useState(true);
  const [displayProgress, setDisplayProgress] = useState(0);
  const fakeProgressRef = useRef(null);

  useEffect(() => {
    // 🔹 Если загрузка завершена или не активна
    if (!active) {
      const timer = setTimeout(() => setIsVisible(false), 600);
      return () => clearTimeout(timer);
    }

    // 🔹 Фейковый прогресс, пока Three.js не начал отдавать реальные данные
    if (active) {
      setDisplayProgress(prev => Math.max(prev, progress > 0 ? progress : 10));
      fakeProgressRef.current = setInterval(() => {
        setDisplayProgress(prev => (prev >= 95 ? prev : prev + 3));
      }, 200);
    }

    return () => {
      if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    };
  }, [active, progress]);

  // 🔹 Доводим до 100% когда реальная загрузка завершена
  useEffect(() => {
    if (progress === 100 && !active) setDisplayProgress(100);
  }, [progress, active]);

  if (!isVisible) return null;

  return (
    // 🔹 fullscreen растягивает HTML на весь размер Canvas
    // 🔹 center центрирует содержимое
    <Html fullscreen transform={false} style={{ pointerEvents: 'auto' }}>
      <div style={styles.overlay}>
        <div style={styles.content}>
          <div style={styles.spinner} />
          <div style={styles.text}>
            {errors?.length ? t('loading.error') : t('loading.progress', {progress: Math.round(displayProgress)})}
          </div>
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressBar, width: `${displayProgress}%` }} />
          </div>
        </div>
      </div>
      {/* Инъекция анимации */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Html>
  );
}

const styles = {
  overlay: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.loader, // синий фон
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    fontFamily: theme.fonts.loader,
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: `4px solid ${theme.colors.loaderTrack}`,
    borderTopColor: theme.colors.white,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  text: {
    color: theme.colors.white,
    fontSize: theme.typography.loading,
    fontWeight: theme.typography.loadingWeight,
    textShadow: `0 1px 2px ${theme.colors.loaderShadow}`,
  },
  progressContainer: {
    width: '220px',
    height: '8px',
    backgroundColor: theme.colors.loaderTrack,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.white,
    transition: 'width 0.2s ease-out',
    borderRadius: '4px',
  },
};
