import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { bestiaryEntries } from './bestiaryCatalog';
import BestiaryModel from './BestiaryModel';
import BestiaryThumbnail from './BestiaryThumbnail';
import SpellHint from '../Pot/SpellHint';
import { theme } from '../../static/theme';

export default function Bestiary() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(bestiaryEntries[0]?.id);
  const visible = bestiaryEntries.filter(entry => category === 'all' || entry.category === category);
  const selected = visible.find(entry => entry.id === selectedId) ?? visible[0];
  return <section className="bestiary" aria-labelledby="bestiary-title">
    <h2 id="bestiary-title">{t('bestiary.title')}</h2>
    <p className="bestiary-intro">{t('bestiary.intro')}</p>
    <nav className="bestiary-filters" aria-label={t('bestiary.category')}>
      {['all', 'brewing', 'defense', 'items'].map(value => <button key={value} type="button"
        aria-pressed={category === value} onClick={() => setCategory(value)}>{t('bestiary.' + value)}</button>)}
    </nav>
    <p className="bestiary-count">{t('bestiary.count', { count: visible.length })}</p>
    <div className="bestiary-layout">
      <nav className="bestiary-list" aria-label={t('bestiary.select')}>
        {visible.map(entry => <button key={entry.id} type="button" className="bestiary-entry"
          aria-pressed={selected?.id === entry.id} aria-controls="bestiary-detail" onClick={() => setSelectedId(entry.id)}>
          <BestiaryThumbnail model={entry.model} />
          <span><strong>{t(entry.name)}</strong><small>{t('bestiary.' + entry.category)}</small></span>
        </button>)}
      </nav>
      {selected ? <article id="bestiary-detail" className="bestiary-detail" aria-labelledby="bestiary-entry-title">
        <span className="bestiary-mode">{t('bestiary.' + selected.category)}</span>
        <h3 id="bestiary-entry-title">{t(selected.name)}</h3>
        <figure className="bestiary-preview" role="img" aria-label={t('bestiary.preview', { name: t(selected.name) })}>
          <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 4.7], fov: 38 }} aria-hidden="true">
            <color attach="background" args={[theme.colors.surface]} />
            <ambientLight intensity={1.2} />
            <directionalLight position={[-3, 5, 4]} intensity={2} />
            <group rotation={[.08, -.28, 0]}><BestiaryModel key={selected.id} model={selected.model} /></group>
          </Canvas>
        </figure>
        <p>{t(selected.description, selected.values)}</p>
        <h4>{t('bestiary.interaction')}</h4>
        <p>{t(selected.interaction, selected.values)}</p>
        <h4>{t('bestiary.works')}</h4>
        {selected.spells.length ? <ul className="bestiary-spells">{selected.spells.map(id => <li key={id}>
          <SpellHint spellId={id} labelKey={'spells.' + id + '.name'} />
          <span>{id} · {t('spells.' + id + '.name')}</span>
        </li>)}</ul> : <p>{t('bestiary.noSpells')}</p>}
        <h4>{t('bestiary.ineffective')}</h4>
        <p>{t(selected.ineffective, selected.values)}</p>
      </article> : <p role="status">{t('bestiary.empty')}</p>}
    </div>
  </section>;
}
