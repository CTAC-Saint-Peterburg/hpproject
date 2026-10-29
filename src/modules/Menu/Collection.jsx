import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import achievements from '../../static/achievements.json';
import { cards } from '../../static/themedConfigs';

export default function Collection(){
 const {t}=useTranslation();
 const unlocked=useGameStore(s=>s.unlocked), owned=useGameStore(s=>s.mageCards);
 const [tab,setTab]=useState('achievements'),[opened,setOpened]=useState(null);
 useEffect(()=>{
  if(!opened)return;
  const key=e=>{if(e.code==='Escape'){e.stopImmediatePropagation();setOpened(null);}};
  window.addEventListener('keydown',key,true);
  return()=>window.removeEventListener('keydown',key,true);
 },[opened]);
 return <section className="collection"><h2>{t('menu.achievements')}</h2>
 <div className="training-actions"><button onClick={()=>setTab('achievements')}>{t('collection.achievements')}</button>
 <button onClick={()=>setTab('cards')}>{t('collection.cards')} ({cards.filter(card=>owned[card.id]>0).length}/10)</button></div>
 {tab==='achievements'?achievements.map(a=><article key={a.id}><strong>{unlocked.includes(a.id)?'🏆':'🔒'} {t(a.name)}</strong><p>{t(a.description)}</p></article>):
 <div className="card-grid">{cards.map(card=><button className="mage-card" disabled={!owned[card.id]} key={card.id} onClick={()=>setOpened(card)}>
 <span className="mage-diamond" style={{background:card.color}}>✦</span><strong>{t(card.name)}</strong>
 <span>{owned[card.id]?t('collection.copies',{count:owned[card.id]}):t('collection.locked',{wave:card.wave})}</span></button>)}</div>}
 {opened&&<div className="card-modal" role="dialog" aria-modal="true" aria-labelledby="mage-card-title" onKeyDown={e=>{if(e.key==='Tab'){e.preventDefault();e.currentTarget.querySelector('button').focus();}}}>
 <button autoFocus className="card-close" onClick={()=>setOpened(null)}>{t('collection.close')} · Esc</button>
 <span className="mage-diamond large" style={{background:opened.color}}>✦</span>
 <h2 id="mage-card-title">{t(opened.name)}</h2><p>{t(opened.description)}</p><p>{t('collection.copies',{count:owned[opened.id]})}</p>
 </div>}
 </section>;
}
