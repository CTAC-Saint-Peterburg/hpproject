import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createStore} from 'zustand/vanilla';
import { potionCount, addPotionInventory, consumePotionEntry } from '../src/modules/Stores/potionInventory.js';
import { prepareStoreSource } from './loadGameStore.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(read('src/static/defense.json'));
const potions=JSON.parse(read('src/static/potions.json'));
let source=read('src/modules/Defense/defenseState.js')
 .replace("'../../static/themedConfigs'", JSON.stringify(new URL('../src/static/themedConfigs.js',import.meta.url).href));
const {defenseState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(random=()=>.99, realProfile=null){
 const profile=realProfile||{potionInventory:addPotionInventory(addPotionInventory(addPotionInventory({},['frost','flame','echo','healing']),['frost','flame','echo','healing']),['frost','flame','echo','healing']),stones:0,mageCards:{},entries:0,
 consumeEntryPotions(ids){const entry=consumePotionEntry(this.potionInventory,ids);if(!entry)return false;this.potionInventory=entry.inventory;this.entries++;return true;},
 changeStones(n){this.stones+=n;},awardMageCard(id){this.mageCards[id]=(this.mageCards[id]||0)+1;}};
 const store=createStore(defenseState(()=>profile,random)),s=()=>store.getState();
 const start=()=>s().start(['frost','flame','echo']);
 const step=seconds=>{for(let i=0;i<Math.ceil(seconds/.05);i++)s().tick(s().lastTick+50);};
 return {store,s,profile,start,step};
}
test('ten configurable waves, enemy parameters, cards and valid potion recipes',()=>{
 assert.equal(config.waves.length,10);
 for(const [i,w]of config.waves.entries()){
  assert.equal(w.id,i+1);assert.ok(w.maxConcurrent>0&&w.spawnInterval>0);
  for(const group of w.groups){assert.ok(config.enemies[group.type]);assert.ok(group.count>0);assert.ok(group.critChance>=0&&group.critChance<=1);}
 }
 const missions=JSON.parse(read('src/static/missions.json'));
 for(const potion of potions)assert.ok(Object.values(missions).some(m=>m.rewardPotion===potion.id));
});
test('entry consumes three unique potions exactly once and restart charges again',()=>{
 const f=fixture();
 assert.equal(f.s().start(['frost','frost','echo']),false);
 assert.equal(f.profile.entries,0);assert.equal(f.start(),true);
 assert.equal(potionCount(f.profile.potionInventory,'frost'),2);
 assert.equal(f.start(),false);assert.equal(f.profile.entries,1);
 f.s().exit();assert.equal(f.start(),true);assert.equal(f.profile.entries,2);
 f.s().exit();f.profile.potionInventory.echo=0;assert.equal(f.start(),false);
});
test('counterspells, cooldown, kill currency and one card per cleared wave',()=>{
 const f=fixture();f.start();
 const enemy={...f.s().enemies[0],type:'fire',hp:48,maxHp:48};
 f.store.setState({enemies:[enemy],queue:[],selected:enemy.id,time:1});
 assert.equal(f.s().cast(1),false);assert.equal(f.s().enemies[0].hp,48);
 f.store.setState({time:2});assert.equal(f.s().cast(2),true);
 assert.equal(f.s().cast(2),false);assert.equal(f.s().enemies[0].hp,24);
 f.store.setState({time:3});f.s().cast(2);
 assert.equal(f.s().phase,'clear');assert.equal(f.profile.stones,5);assert.equal(f.profile.mageCards.mage_1,1);
 f.s().finishWave();assert.equal(f.profile.mageCards.mage_1,1);
 const score=f.s().score;f.s().next();assert.equal(f.s().wave,1);assert.equal(f.s().score,score);
 assert.equal(f.profile.entries,1);
});
test('coin resolves once, doubles or clears points, keeps currency and auto advances',()=>{
 for(const heads of [true,false]){
  const f=fixture(()=>heads?.01:.99);f.start();
  f.store.setState({phase:'clear',score:150,enemies:[],queue:[]});f.profile.stones=40;
  assert.equal(f.s().cast(1),false);f.s().select('coin');
  assert.equal(f.s().cast(5),true);assert.equal(f.s().coinResult,heads);
  assert.equal(f.s().score,heads?300:0);assert.equal(f.s().cast(5),false);assert.equal(f.profile.stones,40);
  assert.equal(f.s().fx.spellId,5);assert.deepEqual(f.s().fx.target,[0,1.6,2.3]);
  f.step(2);assert.equal(f.s().phase,'wave');assert.equal(f.s().wave,1);assert.equal(f.profile.entries,1);
 }
});
test('rage attacks, criticals, special DOT and opposite cleansing spells',()=>{
 const f=fixture(()=>0);f.start();
 const enemy={...f.s().enemies[0],type:'fire',x:1.4,z:0,rageUntil:100,rageAt:100,nextAttack:0,critChance:1,specialChance:1};
 f.store.setState({enemies:[enemy],queue:[],time:1});
 f.step(.1);assert.ok(f.s().hp<90);assert.ok(f.s().crystalEffects.burn);
 const hp=f.s().hp;f.step(.2);assert.ok(f.s().hp<hp);
 f.s().select('crystal');f.s().cast(2);assert.equal(f.s().crystalEffects.burn,undefined);
 f.store.setState({time:3,crystalEffects:{freeze:{until:10,dps:1}}});
 f.s().cast(1);assert.deepEqual(f.s().crystalEffects,{});
 f.store.setState({hp:1,crystalEffects:{burn:{until:20,dps:100}}});f.step(.1);
 assert.equal(f.s().phase,'lost');assert.equal(f.s().hp,0);assert.equal(f.s().enemies.length,0);
 assert.equal(f.profile.mageCards.mage_1,undefined);
});
test('potions are single use, echo hits multiple types, heal is thrown and capped',()=>{
 const f=fixture();f.s().start(['frost','echo','healing']);
 assert.equal(f.s().usePotion('healing'),true);assert.equal(f.s().pendingPotion,'healing');
 f.s().select('crystal');assert.equal(f.s().inventory.healing,1);
 f.store.setState({hp:80});f.s().select('crystal');
 assert.equal(f.s().hp,100);assert.equal(f.s().inventory.healing,0);assert.equal(f.s().fx.kind,'potion');
 assert.equal(f.s().usePotion('healing'),false);
 f.s().usePotion('frost');assert.equal(f.s().usePotion('frost'),false);
 f.s().usePotion('echo');f.store.setState({inventory:{...f.s().inventory,flame:1}});
 f.s().usePotion('flame');
 const enemies=['fire','frost','moss'].map((type,i)=>({...f.s().enemies[0],id:'test-'+i,type,x:2+i*.3,z:0,hp:100,maxHp:100}));
 f.store.setState({enemies,queue:[],selected:'test-0',time:1});
 f.s().cast(9);
 for(const e of f.s().enemies){assert.equal(e.hp,76);assert.ok(e.frozenUntil>1);assert.ok(e.burnUntil>1);}
 const frozen={...f.s().enemies[0],x:1.4,z:0,rageUntil:100,rageAt:100,nextAttack:0,specialChance:1};
 f.store.setState({enemies:[frozen],hp:100});f.step(.2);
 assert.equal(f.s().hp,100);assert.equal(f.s().enemies[0].x,1.4);
});
test('burn kills grant currency once; pause and simultaneous spawn limits work',()=>{
 const f=fixture();f.start();
 const enemy={...f.s().enemies[0],hp:.1,burnUntil:10,burnDps:4};
 f.store.setState({enemies:[enemy],queue:[]});f.step(.1);
 assert.equal(f.profile.stones,5);f.step(.5);assert.equal(f.profile.stones,5);
 f.s().debugWave(10);f.step(20);
 assert.ok(f.s().enemies.length<=config.waves[9].maxConcurrent);
 const time=f.s().time, hp=f.s().hp;f.s().setPaused(true);f.step(10);
 assert.equal(f.s().time,time);assert.equal(f.s().hp,hp);
});
test('debug jumps disable new rewards, ten normal clears award ten cards and finish',()=>{
 const f=fixture();f.start();
 assert.equal(f.s().debugWave(0),false);assert.equal(f.s().debugWave(11),false);
 f.s().debugWave(8);assert.equal(f.s().wave,7);assert.equal(f.s().debugUsed,true);
 f.store.setState({enemies:[],queue:[]});f.s().finishWave();assert.deepEqual(f.profile.mageCards,{});
 const normal=fixture();normal.start();
 for(let i=0;i<10;i++){normal.store.setState({enemies:[],queue:[]});normal.s().finishWave();normal.s().next();}
 assert.equal(normal.s().phase,'won');assert.equal(Object.keys(normal.profile.mageCards).length,10);
 normal.s().next();assert.equal(normal.profile.entries,1);
});
test('real brewing inventory and cards persist, failed and debug recipes grant no potions',async()=>{
 let code=prepareStoreSource();
 code=code.replace("'zustand'",JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs',import.meta.url).href))
 .replace("'zustand/middleware'",JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs',import.meta.url).href))
 ;
 const saved=new Map();globalThis.window={localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)}};
 const {useGameStore:game}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const g=()=>game.getState();
 assert.equal(g().stones,0);
 for(const id of ['frost','flame','echo','healing'])assert.equal(potionCount(g().potionInventory,id),1);
 game.setState({potionInventory:{}});
 g().beginMission('level_01');g().finish(false);assert.deepEqual(g().potionInventory,{});
 g().beginMission('level_01');g().debugAdvance();g().finish(true);assert.deepEqual(g().potionInventory,{});
 g().beginMission('level_01');for(const stage of g().mission.stages){
  game.setState({potTemperature:(stage.temperature.min+stage.temperature.max)/2,agitation:((stage.stirring?.min??0)+(stage.stirring?.max??100))/2});
  g().addIngredient(stage.id);
 }
 assert.equal(potionCount(g().potionInventory,'frost'),1);g().finish(true);assert.equal(potionCount(g().potionInventory,'frost'),1);
 g().exitToMenu();g().addPotions(['flame','echo']);
 assert.equal(g().consumeEntryPotions(['frost','frost','echo']),false);
 const arena=createStore(defenseState(()=>g(),()=>.99));
 assert.equal(arena.getState().start(['frost','flame','echo']),true);
 assert.equal(potionCount(g().potionInventory,'frost'),0);
 arena.setState({enemies:[],queue:[]});arena.getState().finishWave();assert.equal(g().mageCards.mage_1,1);
 const snapshot=saved.get('hpproject-save-v1');
 game.setState({potionInventory:{},mageCards:{}});saved.set('hpproject-save-v1',snapshot);await game.persist.rehydrate();
 assert.equal(g().mageCards.mage_1,1);assert.equal(potionCount(g().potionInventory,'frost'),0);
 assert.equal(g().showFirstVisitWelcome,false);
 saved.set('hpproject-save-v1',JSON.stringify({state:{stones:37,potionInventory:{frost:7,flame:2}},version:0}));
 const {useGameStore:legacy}=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// legacy quality migration').toString('base64'));
 assert.equal(legacy.getState().stones,37);
 assert.deepEqual(legacy.getState().potionInventory.frost,{basic:0,fine:7,masterwork:0});
 assert.equal(potionCount(legacy.getState().potionInventory,'echo'),0);
 assert.equal(legacy.getState().showFirstVisitWelcome,false);
});

test('seeded full run can clear all ten waves using counterspells, buffs and healing',()=>{
 let seed=55;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const f=fixture(random);f.s().start(['frost','echo','healing']);
 let steps=0;
 while(!['lost','won'].includes(f.s().phase)&&steps++<18000){
  f.step(.05);
  if(f.s().phase==='clear'){f.s().next();continue;}
  if(f.s().phase!=='wave')continue;
  if(f.s().hp<65&&f.s().inventory.healing){f.s().usePotion('healing');f.s().select('crystal');}
  if(f.s().wave>=5){if(f.s().inventory.echo)f.s().usePotion('echo');if(f.s().inventory.frost)f.s().usePotion('frost');}
  if(f.s().time-f.s().lastCast<=config.player.castCooldown)continue;
  if(Object.keys(f.s().crystalEffects).length){f.s().select('crystal');f.s().cast(f.s().crystalEffects.burn?2:1);}
  else{
   const enemy=[...f.s().enemies].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];
   if(enemy){f.s().select(enemy.id);f.s().cast(config.enemies[enemy.type].counterSpell);}
  }
 }
 assert.equal(f.s().phase,'won');assert.equal(Object.keys(f.profile.mageCards).length,10);
 assert.ok(f.s().hp>0);assert.ok(f.profile.stones>0);assert.equal(f.profile.entries,1);
});
