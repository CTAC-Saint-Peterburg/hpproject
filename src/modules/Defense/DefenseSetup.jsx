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
  const valid=selected.length>=3 && selected.length<=slots && selected.every(id=>potionCount(inventory,id)>0);
  return <section className="defense-setup">
    <h2>{t('arena.title')}</h2><p>{t('arena.entryUpgraded',{range:slots===3?'3':'3–4',copies})}</p>
    <p>{t('arena.loadout',{slots,copies})}</p>
    <p>{t('arena.inventoryHint')}</p>
    <div className="potion-grid">{potions.map(p=>{
      const qualities=potionQualities(inventory,p.id);
      const quality=POTION_QUALITIES.find(quality=>qualities[quality]>0)??'basic';
      return <article key={p.id} className={'potion-card '+(selected.includes(p.id)?'chosen':'')}>
      <span className="potion-symbol" style={{color:p.color}}>{p.icon}</span><h3>{t(p.name)}</h3><p>{t(p.description,potionEffect(p,quality))}</p>
      <p>{t('arena.quantity',{count:potionCount(inventory,p.id)})}</p>
      <p>{t('inventory.qualities', { value: POTION_QUALITIES.map(quality => t('potion.quality.'+quality)+' × '+qualities[quality]).join(' · ') })}</p>
      {potionCount(inventory,p.id)>0 && <p>{t('arena.entryQuality',{quality:t('potion.quality.'+quality)})}</p>}
      <label><input type="checkbox" checked={selected.includes(p.id)} disabled={!(potionCount(inventory,p.id)>0)||(!selected.includes(p.id)&&selected.length>=slots)}
        onChange={()=>setSelected(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id])}/>{t('arena.take')}</label>
    </article>;})}</div>
    <p>{t('arena.selectedPotionsUpgraded',{count:selected.length,slots})}</p>
    <button disabled={!valid} onClick={()=>setError(!useDefenseStore.getState().start(selected))}>{t('arena.start')}</button>
    {error&&<p role="alert">{t('arena.entryError')}</p>}
    <p>{t('arena.instructions')}</p><p>{t('arena.coinRules')}</p>
  </section>;
}
