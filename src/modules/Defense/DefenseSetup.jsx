import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from './DefenseStore';
import { potionTypes as potions } from '../../static/themedConfigs';
import { POTION_QUALITIES, potionCount, potionQualities } from '../Stores/potionInventory';
import { arenaLoadoutSettings } from '../Stores/arenaUpgrades';
import { potionEffect } from './potionEffects';

export default function DefenseSetup() {
  const {t}=useTranslation();
  const inventory=useGameStore(s=>s.potionInventory);
  const ownedItems=useGameStore(s=>s.ownedItems);
  const {slots,copies}=arenaLoadoutSettings({ownedItems});
  const [selected,setSelected]=useState(()=>potions.filter(p=>potionCount(inventory,p.id)>0).slice(0,slots).map(p=>p.id));
  const [error,setError]=useState(false);
  const [slide,setSlide]=useState(0);
  const [help,setHelp]=useState(false);
  const [chosenQualities,setChosenQualities]=useState({});
  const qualityFor=id=>chosenQualities[id]??POTION_QUALITIES.find(q=>potionQualities(inventory,id)[q]>0)??'basic';
  const valid=selected.length>=3 && selected.length<=slots && selected.every(id=>potionQualities(inventory,id)[qualityFor(id)]>0);
  return <section className="defense-setup">
    <header className="setup-heading"><h2>{t('arena.title')}</h2><button className="small-help" aria-expanded={help} aria-controls="setup-help" aria-label={t('menu.help')} onClick={()=>setHelp(!help)}>?</button></header>
    {help && <aside id="setup-help" className="setup-help"><p>{t('arena.entryUpgraded',{range:slots===3?'3':'3–4',copies})}</p>
    <p>{t('arena.loadout',{slots,copies})}</p>
    <p>{t('arena.inventoryHint')}</p><p>{t('arena.instructions')}</p><p>{t('arena.coinRules')}</p></aside>}
    <nav className="page-arrows" aria-label={t('potion.chooseQuality')}><button aria-label={t('training.previous')} disabled={slide===0} onClick={()=>setSlide(slide-1)}>‹</button><span aria-live="polite">{slide+1} / {potions.length}</span><button aria-label={t('training.next')} disabled={slide===potions.length-1} onClick={()=>setSlide(slide+1)}>›</button></nav>
    <div className="potion-carousel">{potions.slice(slide,slide+1).map(p=>{
      const qualities=potionQualities(inventory,p.id);
      const quality=qualityFor(p.id);
      return <article key={p.id} className={'potion-card '+(selected.includes(p.id)?'chosen':'')}>
      <div className="potion-details"><span className="potion-symbol" style={{color:p.color}}>{p.icon}</span><h3>{t(p.name)}</h3><p>{t(p.description,potionEffect(p,quality))}</p>
      <p>{t('arena.quantity',{count:potionCount(inventory,p.id)})}</p>
      <p>{t('inventory.qualities', { value: POTION_QUALITIES.map(quality => t('potion.quality.'+quality)+' × '+qualities[quality]).join(' · ') })}</p>
      </div><div className="potion-choice"><label>{t('potion.chooseQuality')}<select value={quality} disabled={!potionCount(inventory,p.id)}
        onChange={event=>setChosenQualities(previous=>({...previous,[p.id]:event.target.value}))}>
        {POTION_QUALITIES.map((q,index)=><option key={q} value={q} disabled={!qualities[q]}>{'★'.repeat(index+1)} · {t('potion.quality.'+q)} ×{qualities[q]}</option>)}
      </select></label>
      <button className="potion-select-button" aria-pressed={selected.includes(p.id)} disabled={!(potionCount(inventory,p.id)>0)||(!selected.includes(p.id)&&selected.length>=slots)}
        onClick={()=>setSelected(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id])}>{selected.includes(p.id)?'✓ ':''}{t('arena.take')}</button></div>
    </article>;})}</div>
    <p>{t('arena.selectedPotionsUpgraded',{count:selected.length,slots})}</p>
    <div className="loadout-summary">{selected.map(id=><button key={id} onClick={()=>setSlide(potions.findIndex(p=>p.id===id))}>{t(potions.find(p=>p.id===id).name)} · {'★'.repeat(POTION_QUALITIES.indexOf(qualityFor(id))+1)}</button>)}</div>
    <button disabled={!valid} onClick={()=>setError(!useDefenseStore.getState().start(selected.map(id=>({id,quality:qualityFor(id)}))))}>{t('arena.start')}</button>
    {error&&<p role="alert">{t('arena.entryError')}</p>}
  </section>;
}
