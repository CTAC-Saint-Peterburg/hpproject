import { defenseConfig as config, potionTypes } from '../../static/themedConfigs';
import { createCoinToss } from './coinMotion.js';
import { MAX_REWARD_EVENTS, rewardVisualDuration } from './rewardMotion.js';
import { createArenaEnemy, advanceArenaEnemy, advanceArenaProjectiles, rangedDelay } from './enemyBehavior.js';
import { potionRackPosition } from './arenaLayout.js';
import { equippedArenaItem, wandEffects, enemyDistance } from './arenaEquipment.js';

export { config, potionTypes };
export function defenseState(profile, random = Math.random) {
  return (set, get) => ({
    phase: 'idle', wave: 0, hp: config.crystal.maxHp, time: 0, lastTick: 0, paused: false,
    enemies: [], projectiles: [], projectileSerial: 0, queue: [], serial: 0, selected: null, score: 0, runStones: 0,
    inventory: {}, buffs: {}, crystalEffects: {}, pendingPotion: null, potionFlight: null, spawnAt: 0,
    coinSelected: false, coinResult: null, coinEnd: 0, debugUsed: false, lastCast: -99,
    coinToss: null, coinStartedAt: 0, coinResolved: false,
    rewardEvents: [], rewardSerial: 0, rewardCollectedSerial: 0,
    message: 'arena.instructions', fx: null, fxSerial: 0,
    wandId: 'wand_default', crystalSkinId: 'crystal_default',
    start: ids => {
      if (get().phase !== 'idle' || !profile().consumeEntryPotions(ids)) return false;
      set({ phase:'wave', wave:0, hp:config.crystal.maxHp, time:0, lastTick:Date.now(), paused:false,
        wandId:equippedArenaItem(profile(),'wand')?.id??'wand_default',
        crystalSkinId:equippedArenaItem(profile(),'crystal')?.id??'crystal_default',
        enemies:[], projectiles:[], projectileSerial:0, queue:[], serial:0, selected:null, score:0, runStones:0,
        inventory:Object.fromEntries(ids.map(id=>[id,1])), buffs:{}, crystalEffects:{},
        pendingPotion:null, potionFlight:null, coinSelected:false, coinResult:null, debugUsed:false, lastCast:-99, fx:null, fxSerial:0,
        coinToss:null,coinStartedAt:0,coinResolved:false,coinEnd:0,rewardEvents:[],rewardSerial:0,rewardCollectedSerial:0,
        message:'arena.instructions' });
      get().beginWave(0);
      return true;
    },
    exit: () => set({phase:'idle',enemies:[],projectiles:[],projectileSerial:0,queue:[],buffs:{},crystalEffects:{},pendingPotion:null,potionFlight:null,selected:null,fx:null,
      coinSelected:false,coinResult:null,coinToss:null,coinStartedAt:0,coinResolved:false,coinEnd:0,rewardEvents:[]}),
    setPaused: paused => set({paused,lastTick:Date.now()}),
    select: target => {
      const s=get();
      if (s.paused || !['wave','clear'].includes(s.phase)) return;
      if (typeof target==='string' && target.startsWith('potion:')) return get().usePotion(target.slice(7));
      if (s.pendingPotion) set({pendingPotion:null,selected:null,message:'arena.instructions'});
      if (target === 'coin' && s.phase === 'clear') set({selected:s.coinSelected?null:'coin',coinSelected:!s.coinSelected,
        message:s.coinSelected?'arena.waveClear':'arena.coinHint'});
      else if (s.phase === 'wave' && (target === 'crystal' || s.enemies.some(e=>e.id===target) ||
        s.projectiles.some(shot=>shot.id===target && shot.interceptable))) set({selected:target,coinSelected:false});
      else if (target===null) set({selected:null,coinSelected:false,message:s.phase==='clear'?'arena.waveClear':'arena.instructions'});
    },
    beginWave: index => {
      if (!Number.isInteger(index) || index<0 || index>=config.waves.length || get().phase==='idle') return false;
      const wave=config.waves[index];
      const queue=wave.groups.flatMap(group=>Array.from({length:group.count},()=>({...group})));
      set({phase:'wave',wave:index,enemies:[],projectiles:[],queue,selected:null,spawnAt:get().time,
        coinSelected:false,coinResult:null,coinToss:null,coinStartedAt:0,coinResolved:false,coinEnd:0,pendingPotion:null,potionFlight:null,message:'arena.instructions'});
      get().spawnFromQueue();
      return true;
    },
    next: () => {
      const s=get();
      if (!['clear','coin'].includes(s.phase)) return;
      if (s.paused || s.phase === 'coin' && (!s.coinResolved || s.time < s.coinEnd)) return;
      if (s.wave === config.waves.length-1) set({phase:'won',selected:null,coinSelected:false,coinToss:null,
        coinResult:null,coinResolved:false,coinStartedAt:0,coinEnd:0,rewardEvents:[],message:'arena.victory'});
      else get().beginWave(s.wave+1);
    },
    finishWave: () => {
      const s=get();
      if (s.phase!=='wave' || s.enemies.length || s.queue.length || s.projectiles.length || s.potionFlight) return;
      if (!s.debugUsed) profile().awardMageCard(config.waves[s.wave].cardId);
      set({phase:'clear',selected:null,pendingPotion:null,coinSelected:false,message:'arena.waveClear'});
    },
    createEnemy: (type, group={}) => {
      const s=get();
      return createArenaEnemy(config,type,group,s.time,s.serial+1,random);
    },
    spawnFromQueue: () => {
      const s=get(), wave=config.waves[s.wave];
      if (s.phase!=='wave' || !s.queue.length || s.enemies.length>=wave.maxConcurrent) return;
      const [group,...queue]=s.queue, enemy=get().createEnemy(group.type,group);
      if (enemy) set({queue,enemies:[...s.enemies,enemy],serial:s.serial+1,spawnAt:s.time+wave.spawnInterval});
    },
    debugSpawn: type => {
      const s=get();
      if (s.phase!=='wave' || !config.enemies[type] || s.enemies.length>=config.waves[s.wave].maxConcurrent) return false;
      const enemy=get().createEnemy(type);
      set({enemies:[...s.enemies,enemy],serial:s.serial+1,debugUsed:true,message:'arena.debug'});
      return true;
    },
    debugWave: number => {
      if (get().phase==='idle' || !Number.isInteger(number) || number<1 || number>config.waves.length) return false;
      set({debugUsed:true,hp:config.crystal.maxHp,crystalEffects:{},paused:false,lastTick:Date.now()});
      get().beginWave(number-1);
      set({message:'arena.debug'});
      return true;
    },
    awardKills: dead => {
      if (!dead.length) return;
      const s=get(), stones=dead.reduce((sum,e)=>sum+config.enemies[e.type].reward,0);
      if (!s.debugUsed) profile().changeStones(stones);
      const events=dead.map((enemy,index)=>({id:s.rewardSerial+index+1,time:s.time,
        position:[enemy.x,(enemy.size??1)*.6+(enemy.y??0),enemy.z],color:config.enemies[enemy.type].color,
        stones:s.debugUsed?0:config.enemies[enemy.type].reward}));
      // Spawn children before checking wave completion, sharing the normal enemy ID sequence.
      const children=[];
      let serial=s.serial;
      for (const enemy of dead) {
        const split=config.enemies[enemy.type].split;
        if (!split) continue;
        const startAngle=random()*Math.PI*2;
        for (let index=0;index<split.count;index++) {
          const angle=startAngle+index*Math.PI*2/split.count, base=config.enemies[split.type];
          const margin=base.size*.7+.1;
          const x=Math.max(-config.field.width/2+margin,Math.min(config.field.width/2-margin,enemy.x+Math.cos(angle)*split.distance));
          const z=Math.max(-config.field.depth/2+margin,Math.min(config.field.depth/2-margin,enemy.z+Math.sin(angle)*split.distance));
          const child=createArenaEnemy(config,split.type,enemy.spawnGroup??{},s.time,++serial,random,{x,z});
          if (child) children.push(child);
        }
      }
      set({score:s.score+stones*10,runStones:s.runStones+(s.debugUsed?0:stones),serial,enemies:[...s.enemies,...children],
        rewardEvents:[...s.rewardEvents,...events].slice(-MAX_REWARD_EVENTS),rewardSerial:s.rewardSerial+events.length});
    },
    usePotion: id => {
      const s=get(), potion=potionTypes.find(p=>p.id===id);
      if (!potion || s.phase!=='wave' || s.paused || s.potionFlight || !(s.inventory[id]>0)) return false;
      set({pendingPotion:id,selected:'potion:'+id,coinSelected:false,message:'arena.potionSelected'});
      return true;
    },
    resolvePotion: () => {
      const s=get(), flight=s.potionFlight;
      if (s.paused || s.phase!=='wave' || !flight || s.time+1e-9<flight.startedAt+flight.duration || s.hp<=0) return false;
      const potion=potionTypes.find(p=>p.id===flight.potionId);
      if (!potion) {set({potionFlight:null});return false;}
      const heal=potion.effect==='heal';
      set({potionFlight:null,...(heal?{hp:Math.min(config.crystal.maxHp,s.hp+potion.heal)}:
        {buffs:{...s.buffs,[potion.effect]:s.time+potion.duration}}),message:heal?'arena.healed':'arena.buffActive',
        fx:{id:s.fxSerial+1,time:s.time,color:potion.color,target:[flight.to[0],flight.to[1]+.18,flight.to[2]],
          spellId:({freeze:2,burn:1,multicast:6,heal:5})[potion.effect]??3,kind:'potionImpact'},fxSerial:s.fxSerial+1});
      return true;
    },
    cast: spell => {
      let s=get();
      if (!Number.isInteger(spell) || spell<1 || spell>10 || s.paused) return false;
      if (s.phase==='clear' && s.selected==='coin' && s.coinSelected) {
        const won=random()<config.coin.winChance;
        const toss=createCoinToss();
        set({phase:'coin',coinResult:won,coinToss:toss,coinStartedAt:s.time,coinResolved:false,
          coinEnd:s.time+toss.duration+config.coin.resultSeconds,
          selected:null,coinSelected:false,message:'arena.coinTossing',
          fx:{id:s.fxSerial+1,time:s.time,spellId:spell,target:[0,1.6,2.3],kind:'cast'},fxSerial:s.fxSerial+1});
        return true;
      }
      if (s.phase!=='wave' || s.time-s.lastCast<config.player.castCooldown) return false;
      const wand=wandEffects(s.wandId);
      const target=s.enemies.find(e=>e.id===s.selected);
      const projectile=s.projectiles.find(shot=>shot.id===s.selected && shot.interceptable);
      let castSpell=spell;
      if (wand.autoCounter) {
        if (s.pendingPotion && s.selected==='potion:'+s.pendingPotion) castSpell=3;
        else if (target) castSpell=config.enemies[target.type].counterSpell;
        else if (projectile) castSpell=projectile.counterSpell;
        else if (s.selected==='crystal') castSpell=s.crystalEffects.burn?2:s.crystalEffects.freeze?1:spell;
      }
      if (s.pendingPotion && s.selected==='potion:'+s.pendingPotion) {
        if (castSpell!==3) {set({message:'arena.potionGesture'});return false;}
        const potion=potionTypes.find(p=>p.id===s.pendingPotion);
        if (!potion || s.potionFlight || !(s.inventory[potion.id]>0)) return false;
        if (potion.effect==='heal' && s.hp>=config.crystal.maxHp) {set({message:'arena.fullHealth'});return false;}
        const from=potionRackPosition(potion.id,s.inventory);
        set({pendingPotion:null,selected:null,lastCast:s.time,inventory:{...s.inventory,[potion.id]:s.inventory[potion.id]-1},
          potionFlight:{id:s.fxSerial+1,potionId:potion.id,startedAt:s.time,duration:config.visuals.potionFlightSeconds,
            arcHeight:config.visuals.potionArcHeight,from,to:[...config.visuals.potionLanding]},message:'arena.potionFlying',
          fx:{id:s.fxSerial+1,time:s.time,spellId:3,target:[from[0],from[1]+.5,from[2]],kind:'cast'},fxSerial:s.fxSerial+1});
        return true;
      }
      const multi=s.buffs.multicast>s.time;
      const spells=multi?[...new Set([castSpell,...potionTypes.find(p=>p.effect==='multicast').spells])]:[castSpell];
      if (s.selected==='crystal') {
        const effects={...s.crystalEffects};
        if (wand.autoCounter) {
          if (effects.burn && !spells.includes(2)) spells.push(2);
          if (effects.freeze && !spells.includes(1)) spells.push(1);
        }
        if (spells.includes(2)) delete effects.burn;
        if (spells.includes(1)) delete effects.freeze;
        set({crystalEffects:effects,lastCast:s.time,message:'arena.cleansed',
          fx:{id:s.fxSerial+1,time:s.time,spellId:castSpell,target:'crystal',kind:'cast'},fxSerial:s.fxSerial+1});
        return true;
      }
      if (projectile) {
        const hit=spells.includes(projectile.counterSpell);
        set({lastCast:s.time,message:hit?'arena.projectileDestroyed':'arena.wrongSpell',
          ...(hit?{projectiles:s.projectiles.filter(shot=>shot.id!==projectile.id),selected:null,
            fx:{id:s.fxSerial+1,time:s.time,spellId:castSpell,target:[projectile.x,projectile.y,projectile.z],kind:'cast'},fxSerial:s.fxSerial+1}:{})});
        get().finishWave();
        return hit;
      }
      if (!target) {set({message:'arena.selectTarget'});return false;}
      const echo=potionTypes.find(p=>p.effect==='multicast');
      const targets=[target,...(multi?s.enemies.filter(e=>e.id!==target.id && Math.hypot(e.x-target.x,e.z-target.z)<=echo.chainRadius)
        .sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)).slice(0,echo.targets-1):[])];
      const ids=new Set(targets.map(e=>e.id));
      const matches=enemy=>(config.enemies[enemy.type].counterSpells??[config.enemies[enemy.type].counterSpell]).some(id=>spells.includes(id));
      const splash=wand.splashRadius>0 && wand.splashMultiplier>0 && matches(target);
      let hits=0, interrupted=false, executed=false;
      const enemies=s.enemies.map(enemy=>{
        const base=config.enemies[enemy.type];
        const direct=ids.has(enemy.id) && matches(enemy);
        const area=splash && enemy.id!==target.id && enemyDistance(enemy,target)<=wand.splashRadius+1e-9;
        if (!direct && !area) return enemy;
        hits++;
        const instant=wand.instantKillChance>0 && random()<wand.instantKillChance;
        const critical=!instant && random()<config.waves[s.wave].playerCritChance;
        const damage=(config.player.damage+wand.damageBonus)*(critical?config.player.criticalMultiplier:1)*(direct?1:wand.splashMultiplier);
        const e={...enemy,hp:instant?0:enemy.hp-damage};
        if (instant) executed=true;
        if (base.ranged?.countdown) {
          if (e.windupUntil>s.time) interrupted=true;
          e.windupUntil=0;
          e.nextRangedAt=s.time+rangedDelay(base.ranged,random);
        }
        if (s.buffs.freeze>s.time) e.frozenUntil=s.time+potionTypes.find(p=>p.effect==='freeze').onHitDuration;
        if (s.buffs.burn>s.time) {
          const p=potionTypes.find(p=>p.effect==='burn');e.burnUntil=s.time+p.onHitDuration;e.burnDps=p.dps;
        }
        return e;
      });
      const dead=enemies.filter(e=>e.hp<=0), alive=enemies.filter(e=>e.hp>0);
      set({enemies:alive,lastCast:s.time,selected:alive.some(e=>e.id===s.selected)?s.selected:null,
        message:executed?'arena.wandInstantKill':interrupted?'arena.interrupted':hits?(castSpell!==spell?'arena.wandAutoCounter':'arena.hit'):'arena.wrongSpell',
        fx:hits?{id:s.fxSerial+1,time:s.time,spellId:castSpell,target:[target.x,target.y+target.size*.6,target.z],
          ...(splash?{splashRadius:wand.splashRadius}:{}),kind:'cast'}:s.fx,
        fxSerial:s.fxSerial+(hits?1:0)});
      get().awardKills(dead);get().finishWave();
      return hits>0;
    },
    tick: now => {
      let s=get();
      if (s.phase==='idle' || s.phase==='won' || s.phase==='lost') return;
      if (s.paused) {set({lastTick:now});return;}
      const dt=Math.max(0,Math.min(.2,(now-s.lastTick)/1000)), time=s.time+dt;
      const rewardEvents=s.rewardEvents.filter(event=>time<event.time+rewardVisualDuration(event));
      const collected=s.rewardEvents.some(event=>event.stones>0 && time>=event.time+rewardVisualDuration(event));
      set({time,lastTick:now,rewardEvents,rewardCollectedSerial:s.rewardCollectedSerial+(collected?1:0)});
      if (s.phase==='coin') {
        if (!s.coinResolved && s.coinToss && time>=s.coinStartedAt+s.coinToss.duration) {
          set({coinResolved:true,score:s.coinResult?s.score*2:0,message:s.coinResult?'arena.coinWin':'arena.coinLose'});
        }
        if(time>=s.coinEnd)get().next();
        return;
      }
      if (s.phase!=='wave') return;
      s=get();
      const effects=Object.fromEntries(Object.entries(s.crystalEffects).filter(([,effect])=>effect.until>time));
      const combat={hp:s.hp,effects,projectiles:[...s.projectiles],projectileSerial:s.projectileSerial};
      for(const effect of Object.values(effects))combat.hp-=effect.dps*dt;
      const enemies=s.enemies.map(enemy=>advanceArenaEnemy(enemy,config,potionTypes,time,dt,random,combat));
      const projectiles=advanceArenaProjectiles(combat.projectiles,time,dt,combat);
      const dead=enemies.filter(e=>e.hp<=0), alive=enemies.filter(e=>e.hp>0);
      set({hp:Math.max(0,combat.hp),crystalEffects:effects,enemies:alive,projectiles,projectileSerial:combat.projectileSerial,
        selected:s.selected==='crystal'?'crystal':s.pendingPotion&&s.selected==='potion:'+s.pendingPotion||alive.some(e=>e.id===s.selected)||projectiles.some(shot=>shot.id===s.selected&&shot.interceptable)?s.selected:null});
      get().awardKills(dead);
      if(combat.hp<=0){set({phase:'lost',enemies:[],projectiles:[],queue:[],selected:null,pendingPotion:null,potionFlight:null,rewardEvents:[],
        coinSelected:false,coinToss:null,coinResult:null,coinResolved:false,coinEnd:0,message:'arena.defeat'});return;}
      get().resolvePotion();
      if(time>=get().spawnAt)get().spawnFromQueue();
      get().finishWave();
    },
  });
}
