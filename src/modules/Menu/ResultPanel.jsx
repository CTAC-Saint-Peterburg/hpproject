import { useLayoutEffect, useRef } from 'react';

// Fit unusually long translations / small windows without hiding reward buttons.
export default function ResultPanel({ children }) {
  const panel = useRef(), content = useRef();
  useLayoutEffect(() => {
    const fit = () => {
      const style = getComputedStyle(panel.current);
      const height = panel.current.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const scale = Math.min(1, Math.max(0, height) / Math.max(1, content.current.scrollHeight));
      content.current.style.transform = `scale(${scale})`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(panel.current); observer.observe(content.current); fit();
    return () => observer.disconnect();
  }, []);
  return <div className="result" ref={panel}><div className="result-body" ref={content}>{children}</div></div>;
}
