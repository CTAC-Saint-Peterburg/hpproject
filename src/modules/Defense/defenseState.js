import config from '../../static/defense.json';
import potionTypes from '../../static/potions.json';

export { config, potionTypes };
export function defenseState(profile, random = Math.random) {
  return (set, get) => ({
    phase: 'idle', wave: 0, hp: config.crystal.maxHp, time: 0, lastTick: 0, paused: false,
    enemies: [], queue: [], serial: 0, selected: null, score: 0, runStones: 0,
    inventory: {}, buffs: {}, crystalEffects: {}, pendingPotion: null, spawnAt: 0,
    coinSelected: false, coinResult: null, coinEnd: 0, debugUsed: false, lastCast: -99,
    message: 'arena.instructions', fx: null, fxSerial: 0,
    start: ids => {
      if (get().phase !== 'idle' || !profile().consumeEntryPotions(ids)) return false;
      set({ phase:'wave', wave:0, hp:config.crystal.maxHp, time:0, lastTick:Date.now(), paused:false,
        enemies:[], queue:[], serial:0, selected:null, score:0, runStones:0,
        inventory:Object.fromEntries(ids.map(id=>[id,1])), buffs:{}, crystalEffects:{},
        pendingPotion:null, coinSelected:false, coinResult:null, debugUsed:false, lastCast:-99, fx:null, fxSerial:0,
        message:'arena.instructions' });
      get().beginWave(0);
      return true;
    },
    exit: () => set({phase:'idle',enemies:[],queue:[],buffs:{},crystalEffects:{},pendingPotion:null,selected:null,fx:null}),
    setPaused: paused => set({paused,lastTick:Date.now()}),
    select: target => {
      const s=get();
      if (s.paused || !['wave','clear'].includes(s.phase)) return;
      if (target === 'crystal' && s.pendingPotion === 'healing') { get().usePotion('healing',true); return; }
      if (target === 'coin' && s.phase === 'clear') set({selected:'coin',coinSelected:true,message:'arena.coinHint'});
      else if (s.phase === 'wave' && (target === 'crystal' || s.enemies.some(e=>e.id===target))) set({selected:target,coinSelected:false});
    },
    beginWave: index => {
      if (!Number.isInteger(index) || index<0 || index>=config.waves.length || get().phase==='idle') return false;
      const wave=config.waves[index];
      const queue=wave.groups.flatMap(group=>Array.from({length:group.count},()=>({...group})));
      set({phase:'wave',wave:index,enemies:[],queue,selected:null,spawnAt:get().time,
        coinSelected:false,coinResult:null,pendingPotion:null,message:'arena.instructions'});
      get().spawnFromQueue();
      return true;
    },
    next: () => {
      const s=get();
      if (!['clear','coin'].includes(s.phase)) return;
      if (s.wave === config.waves.length-1) set({phase:'won',selected:null,coinSelected:false,message:'arena.victory'});
      else get().beginWave(s.wave+1);
    },
    finishWave: () => {
      const s=get();
      if (s.phase!=='wave' || s.enemies.length || s.queue.length) return;
      if (!s.debugUsed) profile().awardMageCard(config.waves[s.wave].cardId);
      set({phase:'clear',selected:null,coinSelected:false,message:'arena.waveClear'});
    },
    createEnemy: (type, group={}) => {
      const s=get(), base=config.enemies[type];
      if (!base) return null;
      const edge=Math.floor(random()*4), w=config.field.width/2-.5, d=config.field.depth/2-.5;
      const x=edge<2?(edge===0?-w:w):(random()*2-1)*w;
      const z=edge>=2?(edge===2?-d:d):(random()*2-1)*d;
      const maxHp=base.hp*(group.hpMultiplier??1);
      return {id:'arena-enemy-'+(s.serial+1),type,x,z,y:0,hp:maxHp,maxHp,
        size:base.size*((group.sizeMin??1)+random()*((group.sizeMax??1)-(group.sizeMin??1))),
        attack:base.attack*(group.attackMultiplier??1),speed:base.speed*(group.speedMultiplier??1),
        critChance:group.critChance??base.critChance,specialChance:group.specialChance??base.special.chance,
        rageAt:s.time+base.rageInterval*(.6+random()*.5),rageUntil:0,nextAttack:0,
        frozenUntil:0,burnUntil:0,burnDps:0,motion:['walk','dash','jump'][Math.floor(random()*3)],seed:random()*6.28};
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
      set({score:s.score+stones*10,runStones:s.runStones+(s.debugUsed?0:stones)});
    },
    usePotion: (id, thrown=false) => {
      const s=get(), potion=potionTypes.find(p=>p.id===id);
      if (!potion || s.phase!=='wave' || s.paused || !(s.inventory[id]>0)) return false;
      if (potion.effect==='heal') {
        if (!thrown) { set({pendingPotion:id,selected:null,message:'arena.throwHeal'}); return true; }
        if (s.hp>=config.crystal.maxHp) {set({message:'arena.fullHealth'});return false;}
        set({hp:Math.min(config.crystal.maxHp,s.hp+potion.heal),pendingPotion:null,
          inventory:{...s.inventory,[id]:s.inventory[id]-1},message:'arena.healed',
          fx:{id:s.fxSerial+1,time:s.time,color:potion.color,target:'crystal',kind:'potion'},fxSerial:s.fxSerial+1});
      } else set({inventory:{...s.inventory,[id]:s.inventory[id]-1},
        buffs:{...s.buffs,[potion.effect]:s.time+potion.duration},message:'arena.buffActive'});
      return true;
    },
    cast: spell => {
      let s=get();
      if (!Number.isInteger(spell) || spell<1 || spell>10 || s.paused) return false;
      if (s.phase==='clear' && s.selected==='coin' && s.coinSelected) {
        const won=random()<config.coin.winChance;
        set({phase:'coin',coinResult:won,score:won?s.score*2:0,coinEnd:s.time+config.coin.resultSeconds,
          selected:null,coinSelected:false,message:won?'arena.coinWin':'arena.coinLose',
          fx:{id:s.fxSerial+1,time:s.time,spellId:spell,target:[0,1.6,2.3],kind:'cast'},fxSerial:s.fxSerial+1});
        return true;
      }
      if (s.phase!=='wave' || s.time-s.lastCast<config.player.castCooldown) return false;
      const multi=s.buffs.multicast>s.time;
      const spells=multi?[...new Set([spell,...potionTypes.find(p=>p.effect==='multicast').spells])]:[spell];
      if (s.selected==='crystal') {
        const effects={...s.crystalEffects};
        if (spells.includes(2)) delete effects.burn;
        if (spells.includes(1)) delete effects.freeze;
        set({crystalEffects:effects,lastCast:s.time,message:'arena.cleansed',
          fx:{id:s.fxSerial+1,time:s.time,spellId:spell,target:'crystal',kind:'cast'},fxSerial:s.fxSerial+1});
        return true;
      }
      const target=s.enemies.find(e=>e.id===s.selected);
      if (!target) {set({message:'arena.selectTarget'});return false;}
      const echo=potionTypes.find(p=>p.effect==='multicast');
      const targets=[target,...(multi?s.enemies.filter(e=>e.id!==target.id && Math.hypot(e.x-target.x,e.z-target.z)<=echo.chainRadius)
        .sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)).slice(0,echo.targets-1):[])];
      const ids=new Set(targets.map(e=>e.id));
      let hits=0;
      const enemies=s.enemies.map(enemy=>{
        if (!ids.has(enemy.id) || !spells.includes(config.enemies[enemy.type].counterSpell)) return enemy;
        hits++;
        const critical=random()<config.waves[s.wave].playerCritChance;
        const e={...enemy,hp:enemy.hp-config.player.damage*(critical?config.player.criticalMultiplier:1)};
        if (s.buffs.freeze>s.time) e.frozenUntil=s.time+potionTypes.find(p=>p.effect==='freeze').onHitDuration;
        if (s.buffs.burn>s.time) {
          const p=potionTypes.find(p=>p.effect==='burn');e.burnUntil=s.time+p.onHitDuration;e.burnDps=p.dps;
        }
        return e;
      });
      const dead=enemies.filter(e=>e.hp<=0), alive=enemies.filter(e=>e.hp>0);
      set({enemies:alive,lastCast:s.time,selected:alive.some(e=>e.id===s.selected)?s.selected:null,
        message:hits?'arena.hit':'arena.wrongSpell',
        fx:hits?{id:s.fxSerial+1,time:s.time,spellId:spell,target:[target.x,.5,target.z],kind:'cast'}:s.fx,
        fxSerial:s.fxSerial+(hits?1:0)});
      get().awardKills(dead);get().finishWave();
      return hits>0;
    },
    tick: now => {
      let s=get();
      if (s.phase==='idle' || s.phase==='won' || s.phase==='lost') return;
      if (s.paused) {set({lastTick:now});return;}
      const dt=Math.max(0,Math.min(.2,(now-s.lastTick)/1000)), time=s.time+dt;
      set({time,lastTick:now});
      if (s.phase==='coin') {if(time>=s.coinEnd)get().next();return;}
      if (s.phase!=='wave') return;
      s=get();
      let hp=s.hp;
      const effects=Object.fromEntries(Object.entries(s.crystalEffects).filter(([,effect])=>effect.until>time));
      for(const effect of Object.values(effects))hp-=effect.dps*dt;
      const enemies=s.enemies.map(original=>{
        const e={...original}, base=config.enemies[e.type];
        if(e.burnUntil>time)e.hp-=e.burnDps*dt;
        if(e.hp<=0)return e;
        if(time>=e.rageAt && time>=e.rageUntil){e.rageUntil=time+base.rageDuration;e.rageAt=time+base.rageDuration+base.rageInterval;}
        const rage=time<e.rageUntil, distance=Math.hypot(e.x,e.z)||.001;
        const slow=e.frozenUntil>time?potionTypes.find(p=>p.effect==='freeze').slowMultiplier:1;
        const dash=rage || (e.motion==='dash' && Math.sin(time*2+e.seed)>.8);
        const speed=e.speed*slow*(dash?base.rageSpeed:.35);
        if(rage || distance>3){
          const step=Math.min(Math.max(0,distance-config.crystal.attackRange),speed*dt);
          e.x-=e.x/distance*step;e.z-=e.z/distance*step;
        } else {
          const angle=speed*dt/Math.max(distance,1), x=e.x;
          e.x=x*Math.cos(angle)-e.z*Math.sin(angle);e.z=x*Math.sin(angle)+e.z*Math.cos(angle);
        }
        if(rage && slow>0 && Math.hypot(e.x,e.z)<=config.crystal.attackRange+.05 && time>=e.nextAttack){
          e.nextAttack=time+base.attackInterval/Math.max(slow,.25);
          hp-=e.attack*(random()<e.critChance?base.criticalMultiplier:1);
          if(random()<e.specialChance){
            hp-=base.special.damage;
            if(base.special.effect!=='extra')effects[base.special.effect]={until:time+base.special.duration,dps:base.special.dps};
          }
        }
        e.y=slow===0?original.y:e.motion==='jump'?Math.max(0,Math.sin(time*(rage?5:2)+e.seed))*.65:Math.sin(time*4+e.seed)*.04;
        return e;
      });
      const dead=enemies.filter(e=>e.hp<=0), alive=enemies.filter(e=>e.hp>0);
      set({hp:Math.max(0,hp),crystalEffects:effects,enemies:alive,selected:s.selected==='crystal'?'crystal':alive.some(e=>e.id===s.selected)?s.selected:null});
      get().awardKills(dead);
      if(hp<=0){set({phase:'lost',enemies:[],queue:[],selected:null,message:'arena.defeat'});return;}
      if(time>=get().spawnAt)get().spawnFromQueue();
      get().finishWave();
    },
  });
}
