import { Children, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { paginateHeights } from './paginateHeights';
import { MenuMeasureContext } from './menuMeasureContext';

// Measure the actual translated blocks, not a fixed number of English buttons.
export default function MenuPages({ children }) {
  const { t } = useTranslation();
  const items = Children.toArray(children), area = useRef(null), measure = useRef(null);
  const [pages, setPages] = useState([[]]), [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const update = () => {
      const next = paginateHeights([...measure.current.children].map(el => el.getBoundingClientRect().height), area.current.clientHeight);
      setPages(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(area.current); observer.observe(measure.current); update();
    return () => observer.disconnect();
  }, [children]);
  const current = Math.min(page, pages.length - 1);
  return <div className="menu-pagination">
    <div className="menu-page-area" ref={area}>
      <div className="menu-page-measure" ref={measure} aria-hidden="true" inert><MenuMeasureContext.Provider value={true}>{items.map((item, i) => <div className="menu-block" key={i}>{item}</div>)}</MenuMeasureContext.Provider></div>
      <div className="menu-page-items">{pages[current].filter(i => i < items.length).map(i => <div className="menu-block" key={items[i].key}>{items[i]}</div>)}</div>
    </div>
    <nav className="page-arrows" aria-label={t('display.pages')}>
      <button aria-label={t('training.previous')} disabled={current === 0} onClick={() => setPage(current - 1)}>‹</button>
      <span aria-live="polite">{current + 1} / {pages.length}</span>
      <button aria-label={t('training.next')} disabled={current === pages.length - 1} onClick={() => setPage(current + 1)}>›</button>
    </nav>
  </div>;
}
