import { theme } from '../../static/theme';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useTranslation } from 'react-i18next';
import { useDefenseStore } from './DefenseStore';
import { config, potionTypes } from './defenseState';
import { useGameStore } from '../Stores/GameStore';
import { FrameCounter } from '../GameHud';
import { recognizeGesture } from '../Recognaizer/recognaizer';
import ArenaHandWand from './ArenaHandWand';
import { settings } from '../Wand/effectSettings';
import { useCheatUiStore } from '../Cheats/cheatUiStore';
import CastleRoom from '../Room/CastleRoom';
import ArenaCamera from './ArenaCamera';
import ArenaCoin from './ArenaCoin';
import ArenaRewards from './ArenaRewards';
import { pendingRewardStones } from './rewardMotion';
import ArenaEnemy from './ArenaEnemy';
import ArenaProjectiles from './ArenaProjectiles';
function Crystal({selected,effects}){
 const mesh=useRef();
 useFrame((_,delta)=>{if(mesh.current&&!useDefenseStore.getState().paused)mesh.current.rotation.y+=delta*.4;});
 const color=effects.burn?theme.colors.crystalBurn:effects.freeze?theme.colors.crystalFreeze:theme.colors.crystal;
 return <group><mesh position={[0,.18,0]}><cylinderGeometry args={[1.1,1.3,.35,8]}/><meshStandardMaterial color={theme.colors.crystalBase} metalness={.5} roughness={.4}/></mesh>
 <mesh ref={mesh} position={[0,1.1,0]} onClick={e=>{e.stopPropagation();useDefenseStore.getState().select('crystal');}}>
 <octahedronGeometry args={[.85,0]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.8} metalness={.3} roughness={.1}/>
 {selected&&<mesh scale={1.13} raycast={()=>null}><octahedronGeometry args={[.85,0]}/><meshBasicMaterial color={theme.colors.crystalSelected} wireframe/></mesh>}
 </mesh><pointLight position={[0,2,0]} color={color} intensity={10} distance={8}/></group>;
}
function ThrownPotion({fx,tip}){
 const object=useRef(),from=useRef(new Vector3()),captured=useRef(false);
 useFrame(()=>{
  if(!object.current)return;
  if(!captured.current){from.current.copy(tip.current);captured.current=true;}
  const age=useDefenseStore.getState().time-fx.time;
  const progress=Math.max(0,Math.min(1,age/config.visuals.potionFlightSeconds));
  object.current.visible=progress<1;
  object.current.position.set(from.current.x*(1-progress),from.current.y+(1.1-from.current.y)*progress+Math.sin(progress*Math.PI)*.5,from.current.z*(1-progress));
 });
 return <group ref={object}>
 <mesh raycast={()=>null}><sphereGeometry args={[.18,12,8]}/><meshStandardMaterial color={fx.color} transparent opacity={.8}/></mesh>
 <mesh position={[0,.2,0]} raycast={()=>null}><cylinderGeometry args={[.07,.08,.15,8]}/><meshStandardMaterial color={theme.colors.potionStopper}/></mesh>
 </group>;
}
function Board({walletRef}){
 const s=useDefenseStore();
 const tip=useRef(new Vector3());
 const w=config.field.width,d=config.field.depth;
 return <><ArenaCamera/><color attach="background" args={[theme.colors.roomBackground]}/><ambientLight intensity={1.2}/>
 <directionalLight position={[4,10,6]} intensity={2.2}/><FrameCounter/>
 <CastleRoom variant="arena" lighting={false} furniture={false}/>
 <mesh position={[0,-.18,0]}><boxGeometry args={[w,.35,d]}/><meshStandardMaterial color={theme.colors.arenaWood} roughness={.85}/></mesh>
 {Array.from({length:10},(_,i)=><mesh key={i} position={[0,.005,-d/2+i*d/10]}><boxGeometry args={[w,.01,.025]}/><meshBasicMaterial color={theme.colors.arenaWoodLine}/></mesh>)}
 {[-1,1].map(sign=><group key={sign}>
 <mesh position={[sign*(w/2+.1),.1,0]}><boxGeometry args={[.2,.5,d+.4]}/><meshStandardMaterial color={theme.colors.arenaWoodBorder}/></mesh>
 <mesh position={[0,.1,sign*(d/2+.1)]}><boxGeometry args={[w,.5,.2]}/><meshStandardMaterial color={theme.colors.arenaWoodBorder}/></mesh></group>)}
 <Crystal selected={s.selected==='crystal'} effects={s.crystalEffects}/>
 {s.enemies.map(enemy=><ArenaEnemy key={enemy.id} enemy={enemy} selected={s.selected===enemy.id} time={s.time}/>)}
 <ArenaProjectiles projectiles={s.projectiles} selected={s.selected} time={s.time}/>
 {['clear','coin'].includes(s.phase)&&<ArenaCoin selected={s.coinSelected} result={s.coinResult} time={s.time}
   toss={s.coinToss} startedAt={s.coinStartedAt} resolved={s.coinResolved}/>}
 <ArenaRewards events={s.rewardEvents} time={s.time} paused={s.paused} walletRef={walletRef}/>
 <ArenaHandWand tip={tip}/>{s.fx?.kind==='potion'&&<ThrownPotion key={s.fx.id} fx={s.fx} tip={tip}/>}
 </>;
}
export default function DefenseScene(){
 const {t}=useTranslation();
 const s=useDefenseStore(),stones=useGameStore(state=>state.stones),fps=useGameStore(state=>state.fps);
 const showFps=useCheatUiStore(s=>s.showFps);
 const [debug,setDebug]=useState(false),[wave,setWave]=useState(1),[enemyType,setEnemyType]=useState('fire');
 const draw=useRef(null),[stroke,setStroke]=useState([]);
 const walletRef=useRef(null);
 const pendingStones=pendingRewardStones(s.rewardEvents,s.time);
 useEffect(()=>{
  const timer=setInterval(()=>useDefenseStore.getState().tick(Date.now()),50);
  const key=e=>{
   if(e.repeat||e.target.isContentEditable||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
   const state=useDefenseStore.getState();
   if(e.code==='Escape')state.exit();
   if(e.code==='KeyP'&&!e.altKey)state.setPaused(!state.paused);
   if(e.code==='F9'){e.preventDefault();setDebug(value=>!value);}
   if(e.altKey&&e.shiftKey){
    const digit=/^Digit([1-9])$/.exec(e.code);
    const type=digit?Object.keys(config.enemies)[Number(digit[1])-1]:null;
    if(type){e.preventDefault();state.debugSpawn(type);}
   }
  };
  const visibility=()=>{if(document.hidden)useDefenseStore.getState().setPaused(true);};
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{clearInterval(timer);window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const point=(e,element=e.currentTarget)=>{const r=element.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2};};
 return <section className="defense-game">
 <div className="defense-canvas" onPointerDown={e=>{
  if(e.button!==0||e.isPrimary===false||draw.current||s.paused||!['wave','clear'].includes(s.phase))return;
  e.target.setPointerCapture(e.pointerId);draw.current={id:e.pointerId,points:[point(e)]};setStroke([]);
 }} onPointerMove={e=>{if(draw.current?.id!==e.pointerId)return;const samples=e.nativeEvent.getCoalescedEvents?.();if(samples?.length)for(const sample of samples)draw.current.points.push(point(sample,e.currentTarget));else draw.current.points.push(point(e));setStroke([...draw.current.points]);}}
 onPointerUp={e=>{if(draw.current?.id!==e.pointerId)return;const rect=e.currentTarget.getBoundingClientRect();const points=[...draw.current.points,point(e)];draw.current=null;setStroke([]);const spell=recognizeGesture(points,{aspectRatio:rect.width/rect.height});if(spell)useDefenseStore.getState().cast(spell);}}
 onPointerCancel={()=>{draw.current=null;setStroke([]);}}>
 <Canvas camera={{position:[0,12,11],fov:50}}><Board walletRef={walletRef}/></Canvas>
 <svg className="arena-gesture" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={stroke.map((p,i)=>(i?'L':'M')+(p.x+1)*50+','+(1-p.y)*50).join(' ')} fill="none" stroke={settings.drawing.color} strokeWidth={settings.drawing.lineWidth} opacity={settings.drawing.opacity} vectorEffect="non-scaling-stroke"/></svg>
 </div>
 <header className="arena-top"><strong>{t('arena.wave',{wave:s.wave+1})}</strong>
 <div><span>{t('arena.crystal')} {Math.ceil(s.hp)}/{config.crystal.maxHp}</span><div className="arena-health"><i style={{width:100*s.hp/config.crystal.maxHp+'%'}}/></div></div>
 <span>{t('arena.points',{score:s.score})}</span><span key={s.rewardCollectedSerial} ref={walletRef}
   className={s.rewardCollectedSerial?'arena-wallet arena-wallet-collected':'arena-wallet'} aria-live="polite">
   💎 {Math.max(0,stones-pendingStones)} (+{Math.max(0,s.runStones-pendingStones)})</span>
 <button onClick={()=>s.setPaused(!s.paused)}>{t(s.paused?'arena.resume':'arena.pause')}</button><button onClick={s.exit}>{t('menu.return')}</button></header>
 {showFps&&<div className="fps">{fps}</div>}
 <aside className="arena-hints"><p>{t(s.message)}</p>
 <p>{t('arena.enemiesLeft',{count:s.enemies.length+s.queue.length})}</p>
 {s.projectiles.length>0&&<p>{t('arena.projectilesLeft',{count:s.projectiles.length})}</p>}
 {Object.entries(s.crystalEffects).map(([kind,effect])=><span key={kind}>{kind==='burn'?'🔥':'❄️'} {t('time.seconds',{value:Math.ceil(effect.until-s.time)})} · {t('arena.cleanse')}</span>)}
 {s.debugUsed&&<p>{t('arena.debug')}</p>}</aside>
 <footer className="arena-potions">{potionTypes.filter(p=>s.inventory[p.id]).map(p=><button key={p.id} disabled={s.phase!=='wave'||s.paused} className={s.pendingPotion===p.id?'chosen':''} onClick={()=>s.usePotion(p.id)}>
 {p.icon} {t(p.name)} × {s.inventory[p.id]}</button>)}
 {potionTypes.filter(p=>s.buffs[p.effect]>s.time).map(p=><span key={p.id}>{p.icon} {t('time.seconds',{value:Math.ceil(s.buffs[p.effect]-s.time)})}</span>)}</footer>
 {s.phase==='clear'&&!s.coinSelected&&<aside className="arena-between"><h2>{t(s.debugUsed?'arena.debug':'arena.waveClear')}</h2><p>{t('arena.coinRules')}</p>
 <p>{t('arena.coinChance',{value:Math.round(config.coin.winChance*100)})}</p>
 <button onClick={()=>s.select('coin')}>{t('arena.selectCoin')}</button><button onClick={s.next}>{t(s.wave===9?'arena.finish':'arena.next')}</button></aside>}
 {s.paused&&!['won','lost'].includes(s.phase)&&<div className="result"><h2>{t('arena.paused')}</h2><button onClick={()=>s.setPaused(false)}>{t('arena.resume')}</button><button onClick={s.exit}>{t('menu.return')}</button></div>}
 {['won','lost'].includes(s.phase)&&<div className="result"><h2>{t(s.phase==='won'?'arena.victory':'arena.defeat')}</h2><p>{t('arena.points',{score:s.score})}</p>
 <p>{t('arena.earned',{stones:s.runStones})}</p><button onClick={s.exit}>{t('arena.restock')}</button></div>}
 {debug&&<aside className="arena-debug"><strong>{t('arena.debugTitle')}</strong>
 <label>{t('arena.waveLabel')}<select value={wave} onChange={e=>setWave(Number(e.target.value))}>{config.waves.map(w=><option key={w.id} value={w.id}>{w.id}</option>)}</select></label>
 <button onClick={()=>s.debugWave(wave)}>{t('arena.jumpWave')}</button>
 <label>{t('arena.enemyLabel')}<select value={enemyType} onChange={e=>setEnemyType(e.target.value)}>{Object.entries(config.enemies).map(([id,e])=><option key={id} value={id}>{t(e.name)}</option>)}</select></label>
 <button onClick={()=>s.debugSpawn(enemyType)}>{t('arena.spawn')}</button><button onClick={()=>setDebug(false)}>{t('collection.close')}</button></aside>}
 </section>;
}
