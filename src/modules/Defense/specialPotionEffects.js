import { createArenaEnemy } from './enemyBehavior.js';

export function specialPotionImpact(state, effect, config, random = Math.random) {
  const time = state.time;
  if (effect.effect === 'coins') return { pendingStones: state.pendingStones + (state.debugUsed ? 0 : effect.stones) };
  if (effect.effect === 'replacement') {
    const targets = state.enemies.filter(e=>e.hp>0 && config.enemies[e.type].hostile!==false)
      .sort((a,b)=>b.hp-a.hp || Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z)).slice(0,effect.targets);
    const ids = new Set(targets.map(e=>e.id));
    let serial = state.serial;
    return { serial: serial + targets.length,
      enemies: state.enemies.map(enemy=>ids.has(enemy.id) ? createArenaEnemy(config,'bomber',{},time,++serial,random,{x:enemy.x,z:enemy.z}) : enemy),
      projectiles: state.projectiles.filter(shot=>!ids.has(shot.sourceId)),
      selected: ids.has(state.selected) ? null : state.selected,
      carriedEnemyId: ids.has(state.carriedEnemyId) ? null : state.carriedEnemyId };
  }
  if (effect.effect === 'repel') return { carriedEnemyId:null, enemies:state.enemies.map((enemy,index)=>{
    const angle=Math.hypot(enemy.x,enemy.z)>.01 ? Math.atan2(enemy.z,enemy.x) : index*2.399963;
    const x=Math.cos(angle),z=Math.sin(angle),margin=enemy.size*.7+.1;
    const radius=Math.min((config.field.width/2-margin)/Math.max(.0001,Math.abs(x)),(config.field.depth/2-margin)/Math.max(.0001,Math.abs(z)));
    return {...enemy,carried:false,droppingStartedAt:null,droppingUntil:0,windupUntil:0,rageUntil:0,
      knockbackFrom:[enemy.x,enemy.z],knockbackTo:[x*radius,z*radius],knockbackStart:time,knockbackUntil:time+effect.travelSeconds,
      disorientedUntil:Math.max(enemy.disorientedUntil??0,time+effect.travelSeconds+effect.disorientSeconds),
      y:config.enemies[enemy.type].orbit?.height??0};
  }) };
  if (effect.effect === 'poison') return {enemies:state.enemies.map(enemy=>config.enemies[enemy.type].hostile===false?enemy:{...enemy,
    poisonUntil:Math.max(enemy.poisonUntil??0,time+effect.duration),
    poisonNextAt:enemy.poisonUntil>time?enemy.poisonNextAt:time+effect.tickEvery,
    poisonEvery:effect.tickEvery,poisonDamage:Math.max(enemy.poisonUntil>time?enemy.poisonDamage??0:0,effect.tickDamage)})};
  if (effect.effect === 'madness') return {enemies:state.enemies.map(enemy=>config.enemies[enemy.type].hostile===false?enemy:{...enemy,
    madnessUntil:Math.max(enemy.madnessUntil??0,time+effect.duration),
    madnessDamage:Math.max(enemy.madnessUntil>time?enemy.madnessDamage??0:0,effect.enemyDamage),
    madnessInterval:effect.attackEvery,nextMadnessAttack:enemy.madnessUntil>time?enemy.nextMadnessAttack:time+effect.attackEvery,
    windupUntil:0,rageUntil:0})};
  return {};
}
