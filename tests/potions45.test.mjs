import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { Vector3 } from 'three';
import { potionEffect } from '../src/modules/Defense/potionEffects.js';
import { potionPrice } from '../src/modules/Potions/potionCatalog.js';
import { consumePotionEntry, addPotionInventory } from '../src/modules/Stores/potionInventory.js';
import { brewingRating } from '../src/modules/Pot/brewingRating.js';
import { createCauldronStarGeometry, STAR_PLACEMENTS } from '../src/modules/Pot/cauldronStarsGeometry.js';
import { CAULDRON } from '../src/modules/Pot/cauldronGeometry.js';
const base=new URL('../src/modules/Defense/defenseState.js',import.meta.url);
const source=readFileSync(base,'utf8').replace(/from '([^']+)'/g,(statement,specifier)=>specifier.startsWith('.')?'from '+JSON.stringify(new URL(specifier.endsWith('.js')?specifier:specifier+'.js',base).href):statement);
const {defenseState,config,potionTypes}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const qualities=['basic','fine','masterwork'];
function fixture(id,quality='basic',random=()=>.99){
 const profile={stones:0,consumeEntryPotions:()=>({qualities:{[id]:quality}}),awardMageCard:()=>{},changeStones(n){this.stones+=n;}};
 const store=createStore(defenseState(()=>profile,random)),s=()=>store.getState();
 const ids=[id,...['frost','flame','echo'].filter(other=>other!==id)].slice(0,3);
 assert.equal(s().start(ids),true);
 const make=(type='fire',overrides={})=>{const enemy=s().createEnemy(type);store.setState({serial:s().serial+1});return {...enemy,hp:1000,maxHp:1000,x:5,z:2,speed:0,disorientedUntil:0,rageAt:1e9,rageUntil:0,nextRangedAt:1e9,...overrides};};
 store.setState({enemies:[make()],queue:[],spawnAt:1e9,nextBomberAt:1e9});
 const step=seconds=>{for(let i=0;i<Math.round(seconds/.05);i++)s().tick(s().lastTick+50);};
 const launch=()=>{s().usePotion(id);assert.equal(s().cast(3),true);};
 const land=()=>{launch();step(.55);assert.equal(s().potionFlight,null);};
 return {store,s,make,step,launch,land,profile};
}
test('explicit mixed qualities consume exactly the chosen bottles and invalid choices are atomic',()=>{
 let inventory=addPotionInventory({},['frost','flame','echo'],'basic');
 inventory=addPotionInventory(inventory,['frost','echo'],'masterwork');
 const selection=[{id:'frost',quality:'masterwork'},{id:'flame',quality:'basic'},{id:'echo',quality:'masterwork'}];
 const entry=consumePotionEntry(inventory,selection);
 assert.deepEqual(entry.qualities,{frost:'masterwork',flame:'basic',echo:'masterwork'});
 assert.equal(entry.inventory.frost.basic,1);assert.equal(entry.inventory.frost.masterwork,0);
 assert.equal(inventory.frost.masterwork,1);
 assert.equal(consumePotionEntry(inventory,[selection[0],{id:'flame',quality:'fine'},selection[2]]),null);
 assert.equal(consumePotionEntry(inventory,[selection[0],{id:'flame',quality:'unknown'},selection[2]]),null);
});
test('every recipe has escalating quality characteristics and prices; coin purchase is not free profit',()=>{
 assert.equal(potionTypes.length,11);
 for(const potion of potionTypes){
  const effects=qualities.map(q=>potionEffect(potion,q)),prices=qualities.map(q=>potionPrice(potion,q));
  assert.ok(prices[0]<prices[1]&&prices[1]<prices[2]);
  for(let i=1;i<3;i++){
   const fields=Object.keys(potion.qualityEffects[qualities[i]]);
   assert.ok(fields.some(field=>field==='travelSeconds'?effects[i][field]<effects[i-1][field]:effects[i][field]>effects[i-1][field]),potion.id);
   for(const field of fields)assert.ok(field==='travelSeconds'?effects[i][field]<=effects[i-1][field]:effects[i][field]>=effects[i-1][field]);
  }
  if(potion.effect==='coins')for(let i=0;i<3;i++)assert.ok(prices[i]>effects[i].stones*2);
 }
});
test('replacement preserves population, removes old projectiles and awards no transformation kills',()=>{
 for(const [index,quality]of qualities.entries()){
  const f=fixture('replacement',quality);
  const enemies=Array.from({length:8},(_,i)=>f.make(i===0?'giant':'fire',{hp:1000+i,x:4+i*.1}));
  f.store.setState({enemies,projectiles:[{id:'old-shot',sourceId:enemies[7].id,x:9,y:1,z:4,speed:0,size:.1,damage:1}]});
  f.land();
  assert.equal(f.s().enemies.length,8);assert.equal(new Set(f.s().enemies.map(e=>e.id )).size,8);
  assert.equal(f.s().enemies.filter(e=>e.type==='bomber').length,[3,5,6][index]);
  assert.equal(f.s().pendingStones,0);assert.equal(f.s().projectiles.length,0);
  assert.equal(f.s().phase,'wave');
 }
});
test('critical potion only executes on matching attacks, begins on impact and expires',()=>{
 const f=fixture('critical','basic',()=>.05);f.land();f.step(.5);
 const victim=f.s().enemies[0];f.s().select(victim.id);
 assert.equal(f.s().cast(1),false);assert.equal(f.s().enemies[0].hp,1000);
 f.step(.5);assert.equal(f.s().cast(2),true);assert.equal(f.s().enemies.length,0);
 const expired=fixture('critical','masterwork',()=>.05);expired.land();expired.step(18.1);
 expired.s().select(expired.s().enemies[0].id);expired.s().cast(2);assert.ok(expired.s().enemies[0].hp>0);
});
test('repulsion moves all types smoothly to legal table edges and releases carried enemies',()=>{
 const f=fixture('repulsion','masterwork');
 const enemies=Object.keys(config.enemies).map((type,i)=>f.make(type,{x:i*.1,z:0,carried:i===0}));
 f.store.setState({enemies,carriedEnemyId:enemies[0].id});f.land();
 assert.equal(f.s().carriedEnemyId,null);assert.ok(f.s().enemies.every(e=>!e.carried));
 f.step(.5);
 for(const e of f.s().enemies){
  const margin=e.size*.7+.1;
  assert.ok(Math.abs(e.x)<=config.field.width/2-margin+1e-6&&Math.abs(e.z)<=config.field.depth/2-margin+1e-6);
  assert.ok(Math.abs(e.x)>config.field.width/2-margin-.05 || Math.abs(e.z)>config.field.depth/2-margin-.05);
 }
});
test('invulnerability absorbs all crystal damage without healing and freezes its duration on pause',()=>{
 const f=fixture('invulnerability','masterwork');f.store.setState({hp:42});f.land();
 f.store.setState({crystalEffects:{burn:{until:100,dps:30}},projectiles:[{id:'hit',x:0,y:1.1,z:0,size:1,speed:10,damage:999}]});
 f.step(.1);assert.equal(f.s().hp,42);
 const time=f.s().time;f.s().setPaused(true);f.step(10);assert.equal(f.s().time,time);assert.equal(f.s().hp,42);
 f.s().setPaused(false);f.step(7.3);assert.equal(f.s().hp,42);
 f.step(.3);assert.ok(f.s().hp<42);
});
test('coin potion funds temporary balance once, banks on victory and is forfeited on loss or debug',()=>{
 for(const quality of qualities){
  const f=fixture('coins',quality),amount=potionEffect(potionTypes.find(p=>p.id==='coins'),quality).stones;
  f.launch();f.step(.5);assert.equal(f.s().pendingStones,0);f.step(.05);
  assert.equal(f.s().pendingStones,amount);assert.equal(f.profile.stones,0);f.s().resolvePotion();assert.equal(f.s().pendingStones,amount);
  f.store.setState({enemies:[]});f.s().finishWave();f.s().next();assert.equal(f.profile.stones,amount+config.waves[0].stonesReward);
 }
 const lost=fixture('coins');lost.land();lost.store.setState({hp:0});lost.step(.05);assert.equal(lost.s().pendingStones,0);assert.equal(lost.profile.stones,0);
 const debug=fixture('coins');debug.store.setState({debugUsed:true});debug.land();assert.equal(debug.s().pendingStones,0);
});
test('poison deals exactly four delayed ticks, with quality damage and normal kill credit',()=>{
 for(const [index,quality]of qualities.entries()){
  const f=fixture('poison',quality);f.land();const hp=f.s().enemies[0].hp;
  f.step(1.95);assert.equal(f.s().enemies[0].hp,hp);
  f.step(.05);assert.equal(f.s().enemies[0].hp,hp-[18,27,36][index]);
  f.step(6);assert.equal(f.s().enemies[0].hp,hp-[72,108,144][index]);
  f.step(2);assert.equal(f.s().enemies[0].hp,hp-[72,108,144][index]);
 }
 const f=fixture('poison');f.store.setState({enemies:[f.make('fire',{hp:10})]});f.land();f.step(2);
 assert.equal(f.s().phase,'clear');assert.equal(f.s().pendingStones,config.enemies.fire.reward+config.waves[0].stonesReward);
});
test('madness damages other enemies while suppressing their crystal attacks, then expires',()=>{
 const f=fixture('madness');
 f.store.setState({enemies:[f.make('fire',{x:1.4,z:0,attack:50}),f.make('frost',{x:1.5,z:0,attack:50})]});f.land();
 f.step(1.5);assert.equal(f.s().hp,100);assert.ok(f.s().enemies.every(e=>e.hp===985));
 f.s().setPaused(true);const snapshot=structuredClone(f.s().enemies);f.step(3);assert.deepEqual(f.s().enemies,snapshot);f.s().setPaused(false);
 f.step(8);const hp=f.s().enemies.map(e=>e.hp);f.step(2);assert.deepEqual(f.s().enemies.map(e=>e.hp),hp);
});
test('all eleven recipes have explicit mistake allowances, a matching potion and difficulty ordering',()=>{
 const missions=JSON.parse(readFileSync(new URL('../src/static/missions.json',import.meta.url)));
 assert.equal(Object.keys(missions).length,11);
 for(const potion of potionTypes){
  const mission=Object.values(missions).find(m=>m.rewardPotion===potion.id);assert.ok(mission);
  assert.equal(mission.difficulty,potion.difficulty);assert.ok(mission.rating.threeStarMistakes>=1);
  assert.equal(brewingRating(mission,mission.rating.threeStarMistakes),3);
  assert.equal(brewingRating(mission,mission.rating.threeStarMistakes+1),2);
  assert.equal(brewingRating(mission,mission.rating.twoStarMistakes+1),1);
  assert.ok(mission.stages.length>=4);
 }
 assert.deepEqual(potionTypes.map(p=>p.difficulty),Array.from({length:11},(_,i)=>i+1));
});
test('three low-poly stars stay outside the entire cauldron belly and selected shell',()=>{
 const geometry=createCauldronStarGeometry();
 assert.ok(geometry.attributes.position.count/3<=40);
 const maxRadius=Math.max(...CAULDRON.profile.map(p=>p[0]))*1.035;
 for(const placement of STAR_PLACEMENTS){
  assert.ok(Math.cos(placement.angle)>.7,'every star faces the camera-facing hemisphere');
  for(let i=0;i<geometry.attributes.position.count;i++){
   const point=new Vector3().fromBufferAttribute(geometry.attributes.position,i).applyAxisAngle(new Vector3(0,1,0),placement.angle).add(new Vector3(...placement.position));
   assert.ok(Math.hypot(point.x,point.z)>maxRadius);
   assert.ok(point.y>-.5&&point.y<.25);
  }
 }
 geometry.dispose();
});
