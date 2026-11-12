import { theme } from '../../static/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useTranslation } from 'react-i18next';
import { useDefenseStore } from './DefenseStore';
import { config, potionTypes } from './defenseState';
import { useGameStore } from '../Stores/GameStore';
import { FrameCounter } from '../GameHud';
import { recognizeGesture } from '../Recognaizer/recognaizer';
import ArenaHandWand from './ArenaHandWand';
import { useCheatUiStore } from '../Cheats/cheatUiStore';
import CastleRoom from '../Room/CastleRoom';
import ArenaCamera from './ArenaCamera';
import ArenaCoin from './ArenaCoin';
import ArenaRewards from './ArenaRewards';
import { pendingRewardStones } from './rewardMotion';
import ArenaEnemy from './ArenaEnemy';
import ArenaProjectiles from './ArenaProjectiles';
import ArenaPotions from './ArenaPotions';
import ArenaCrystal from './ArenaCrystal';
import ArenaCrystalStatus from './ArenaCrystalStatus';
import ArenaEnemyCarry from './ArenaEnemyCarry';
import { arenaBaseCameraPose, arenaFrontBorder } from './arenaLayout';
import MagicGestureTrail from '../Gestures/MagicGestureTrail';
import { useInputStore } from '../Input/inputStore';
import { createPointerInput, isTouchInput } from '../Input/pointerInput';
import { isSelectionClick } from '../Input/selectionClick';

const initialCameraPosition=arenaBaseCameraPose(16/9).position;

function Board({walletRef,gestureRef,inputBridge,onHeldTest}){
 const s=useDefenseStore();
 const tip=useRef(new Vector3());
 const w=config.field.width,d=config.field.depth;
 const front=arenaFrontBorder();
 return <><ArenaCamera/><color attach="background" args={[theme.colors.roomBackground]}/><ambientLight intensity={1.2}/>
 <directionalLight position={[4,10,6]} intensity={2.2}/><FrameCounter/>
 <CastleRoom variant="arena" lighting={false} furniture={false}/>
 <group onClick={event=>{if(!isSelectionClick(event,gestureRef.current))return;event.stopPropagation();useDefenseStore.getState().select(null);}}>
 <mesh position={[0,-.18,0]}><boxGeometry args={[w,.35,d]}/><meshStandardMaterial color={theme.colors.arenaWood} roughness={.85}/></mesh>
 {Array.from({length:10},(_,i)=><mesh key={i} position={[0,.005,-d/2+i*d/10]}><boxGeometry args={[w,.01,.025]}/><meshBasicMaterial color={theme.colors.arenaWoodLine}/></mesh>)}
 {[-1,1].map(sign=><group key={sign}>
 <mesh position={[sign*(w/2+.1),.1,(front.depth-.2)/2]}><boxGeometry args={[.2,.5,d+front.depth+.2]}/><meshStandardMaterial color={theme.colors.arenaWoodBorder}/></mesh></group>)}
 <mesh position={[0,.1,-d/2-.1]}><boxGeometry args={[w,.5,.2]}/><meshStandardMaterial color={theme.colors.arenaWoodBorder}/></mesh>
 <mesh position={[0,front.y,front.z]}><boxGeometry args={[front.width,front.height,front.depth]}/><meshStandardMaterial color={theme.colors.arenaWoodBorder} roughness={.8}/></mesh>
 </group>
 <ArenaPotions gestureRef={gestureRef}/>
 <ArenaCrystalStatus gestureRef={gestureRef}/>
 <ArenaEnemyCarry inputBridge={inputBridge} onHeldTest={onHeldTest}/>
 <ArenaCrystal selected={s.selected==='crystal'} effects={s.crystalEffects} gestureRef={gestureRef}/>
 {s.enemies.map(enemy=><ArenaEnemy key={enemy.id} enemy={enemy} selected={s.selected===enemy.id} time={s.time} gestureRef={gestureRef}/>)}
 <ArenaProjectiles projectiles={s.projectiles} selected={s.selected} time={s.time} gestureRef={gestureRef}/>
 {['clear','coin'].includes(s.phase)&&<ArenaCoin selected={s.coinSelected} result={s.coinResult} time={s.time}
   toss={s.coinToss} startedAt={s.coinStartedAt} resolved={s.coinResolved} gestureRef={gestureRef}/>}
 <ArenaRewards events={s.rewardEvents} time={s.time} paused={s.paused} walletRef={walletRef}/>
 <ArenaHandWand tip={tip}/>
 </>;
}
export default function DefenseScene(){
 const {t}=useTranslation();
 const s=useDefenseStore(),stones=useGameStore(state=>state.stones),fps=useGameStore(state=>state.fps);
 const showFps=useCheatUiStore(s=>s.showFps);
 const mode=useInputStore(state=>state.mode);
 const [debug,setDebug]=useState(false),[wave,setWave]=useState(1),[enemyType,setEnemyType]=useState('fire');
 const [stroke,setStroke]=useState([]);
 const gestureRef=useRef({suppressed:false,pointerId:null});
 const inputBridge=useRef({role:null,touch:false,point:{x:0,y:0}});
 const capture=useRef(null);
 const input=useRef(null);
 const registerHeldTest=useCallback(test=>{inputBridge.current.isNearHeld=test;},[]);
 useEffect(()=>{
  input.current=createPointerInput({
  getMode:()=>useInputStore.getState().mode,
  isEnabled:()=>{const state=useDefenseStore.getState();return !state.paused&&['wave','clear'].includes(state.phase);},
  isNearHeld:(point,_event,rect)=>inputBridge.current.isNearHeld?.(point,rect)??false,
  onStroke:setStroke,
  onPosition:(point,event,role)=>{const bridge=inputBridge.current;bridge.touch=input.current?.getSession()?.touch??isTouchInput(event,useInputStore.getState().mode);bridge.role=role;if(role==='drag')bridge.point=point;},
  onDrag:point=>{inputBridge.current.point=point;},
  onCast:({points,aspectRatio})=>{const spell=recognizeGesture(points,{aspectRatio});if(spell)useDefenseStore.getState().cast(spell);},
  onSuppressClick:(suppressed,pointerId)=>{gestureRef.current={suppressed,pointerId};},
  onCancel:()=>{inputBridge.current.role=null;},
  });
  return()=>{input.current?.reset();input.current=null;};
 },[]);
 const releaseCapture=()=>{const held=capture.current;capture.current=null;if(held?.target.hasPointerCapture?.(held.id))held.target.releasePointerCapture(held.id);};
 useEffect(()=>{
  const reset=()=>{input.current?.reset();inputBridge.current.role=null;const held=capture.current;capture.current=null;if(held?.target.hasPointerCapture?.(held.id))held.target.releasePointerCapture(held.id);};
  reset();inputBridge.current.touch=mode==='touch';
  window.addEventListener('blur',reset);
  return()=>{window.removeEventListener('blur',reset);reset();};
 },[mode,s.paused,s.phase]);
 const walletRef=useRef(null);
 const visualPending=pendingRewardStones(s.rewardEvents,s.time);
 const activePotions=potionTypes.filter(potion=>s.buffs[potion.effect]>s.time);
 useEffect(()=>{
  const timer=setInterval(()=>useDefenseStore.getState().tick(Date.now()),50);
  const key=e=>{
   if(e.repeat||e.target.isContentEditable||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
   const state=useDefenseStore.getState();
   if(e.code==='Escape')state.exit();
   if(e.code==='KeyP'&&!e.altKey)state.setPaused(!state.paused);
   if(useInputStore.getState().mode==='touch')return;
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
 return <section className="defense-game">
 <div className="defense-canvas" onPointerDown={e=>{
  const session=input.current?.down(e,e.currentTarget.getBoundingClientRect());if(!session)return;
  e.target.setPointerCapture?.(e.pointerId);capture.current={target:e.target,id:e.pointerId};
 }} onPointerMove={e=>{
  input.current?.move(e,e.currentTarget.getBoundingClientRect());
 }}
 onPointerUp={e=>{
  if(input.current?.getSession()?.id!==e.pointerId)return;
  input.current.up(e,e.currentTarget.getBoundingClientRect());inputBridge.current.role=null;releaseCapture();
 }}
 onPointerCancel={e=>{if(input.current?.cancel(e)){inputBridge.current.role=null;releaseCapture();}}}
 onLostPointerCapture={e=>{if(input.current?.cancel(e)){inputBridge.current.role=null;capture.current=null;}}}>
 <Canvas camera={{position:initialCameraPosition,fov:50}} onPointerMissed={event=>{
  if(event.type==='click'&&isSelectionClick(event,gestureRef.current))useDefenseStore.getState().select(null);
 }}><Board walletRef={walletRef} gestureRef={gestureRef} inputBridge={inputBridge} onHeldTest={registerHeldTest}/></Canvas>
 <MagicGestureTrail points={stroke} paused={s.paused} enabled={['wave','clear'].includes(s.phase)}/>
 </div>
 <header className="arena-top"><strong>{t('arena.wave',{wave:s.wave+1})}</strong>
 <div><span>{t('arena.crystal')} {Math.ceil(s.hp)}/{config.crystal.maxHp}</span><div className="arena-health"><i style={{width:100*s.hp/config.crystal.maxHp+'%'}}/></div></div>
 <span>{t('arena.balance',{stones})}</span><span key={s.rewardCollectedSerial} ref={walletRef}
   className={s.rewardCollectedSerial?'arena-wallet arena-wallet-collected':'arena-wallet'} aria-live="polite">
   {t('arena.pending',{stones:Math.max(0,s.pendingStones-visualPending)})}</span>
 <button onClick={()=>s.setPaused(!s.paused)}>{t(s.paused?'arena.resume':'arena.pause')}</button><button onClick={s.exit}>{t('menu.return')}</button></header>
 {showFps&&mode==='desktop'&&<div className="fps">{fps}</div>}
 <aside className="arena-hints"><p>{t(s.message)}</p>
 <p>{t('arena.enemiesLeft',{count:s.enemies.length+s.queue.length})}</p>
 {s.projectiles.length>0&&<p>{t('arena.projectilesLeft',{count:s.projectiles.length})}</p>}
 {Object.entries(s.crystalEffects).map(([kind,effect])=><span key={kind}>{kind==='burn'?'🔥':'❄️'} {t('time.seconds',{value:Math.ceil(effect.until-s.time)})} · {t('arena.cleanse')}</span>)}
 {s.debugUsed&&<p>{t('arena.debug')}</p>}</aside>
 {activePotions.length>0&&<footer className="arena-buffs">{activePotions.map(p=><span key={p.id}>{p.icon} {t(p.name)} · {t('time.seconds',{value:Math.ceil(s.buffs[p.effect]-s.time)})}</span>)}</footer>}
 {s.phase==='clear'&&!s.coinSelected&&<aside className="arena-between"><h2>{t(s.debugUsed?'arena.debug':'arena.waveClear')}</h2><p>{t('arena.coinRules')}</p>
 <p>{t('arena.waveReward',{stones:s.debugUsed?0:config.waves[s.wave].stonesReward??0})}</p><p>{t('arena.pending',{stones:s.pendingStones})}</p>
 <p>{t('arena.coinChance',{value:Math.round(config.coin.winChance*100)})}</p>
 <button onClick={()=>s.select('coin')}>{t('arena.selectCoin')}</button><button onClick={s.next}>{t(s.wave===9?'arena.finish':'arena.next')}</button></aside>}
 {s.paused&&!['won','lost'].includes(s.phase)&&<div className="result"><h2>{t('arena.paused')}</h2><button onClick={()=>s.setPaused(false)}>{t('arena.resume')}</button><button onClick={s.exit}>{t('menu.return')}</button></div>}
 {['won','lost'].includes(s.phase)&&<div className="result"><h2>{t(s.phase==='won'?'arena.victory':'arena.defeat')}</h2>{s.phase==='lost'&&<p>{t('arena.pendingLost')}</p>}
 <p>{t('arena.earned',{stones:s.runStones})}</p><button onClick={s.exit}>{t('arena.restock')}</button></div>}
 {debug&&mode==='desktop'&&<aside className="arena-debug"><strong>{t('arena.debugTitle')}</strong>
 <label>{t('arena.waveLabel')}<select value={wave} onChange={e=>setWave(Number(e.target.value))}>{config.waves.map(w=><option key={w.id} value={w.id}>{w.id}</option>)}</select></label>
 <button onClick={()=>s.debugWave(wave)}>{t('arena.jumpWave')}</button>
 <label>{t('arena.enemyLabel')}<select value={enemyType} onChange={e=>setEnemyType(e.target.value)}>{Object.entries(config.enemies).map(([id,e])=><option key={id} value={id}>{t(e.name)}</option>)}</select></label>
 <button onClick={()=>s.debugSpawn(enemyType)}>{t('arena.spawn')}</button><button onClick={()=>setDebug(false)}>{t('collection.close')}</button></aside>}
 </section>;
}
