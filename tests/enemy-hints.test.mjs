import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleEnemyHints, enemyHintPhase, enemyStatusHints } from '../src/modules/Defense/enemyHintLayout.js';

test('status rows preserve concurrent effects independently of the rotating rune',()=>{
 const enemy={disorientedUntil:12,frozenUntil:14,burnUntil:15,rageUntil:20,windupUntil:0,carried:true};
 const statuses=enemyStatusHints(enemy,{},10,false);
 assert.deepEqual(statuses.map(s=>s.key),['arena.disoriented','arena.enemyFrozen','arena.enemyBurning','arena.enemyCarried']);
 assert.equal(statuses[0].seconds,2);
 assert.deepEqual(enemyStatusHints({...enemy,carried:false}, {},21,false),[]);
 assert.equal(enemyStatusHints({disorientedUntil:0,windupUntil:8,rageUntil:0}, {},5,false)[0].key,'arena.windup');
});
test('special enemy instructions return for bombers and selected multi-counter enemies',()=>{
 assert.equal(enemyStatusHints({}, {hostile:false},0,false)[0].key,'arena.bomberAnySpell');
 assert.equal(enemyStatusHints({}, {counterSpells:[1,2,6]},0,true)[0].key,'arena.anyAttack');
 assert.deepEqual(enemyStatusHints({}, {counterSpells:[1,2,6]},0,false),[]);
});
test('collision checks include wider and taller status blocks',()=>{
 const a={id:'selected',x:0,y:0,distance:1,priority:3,width:156,height:68};
 const b={id:'nearby',x:70,y:30,distance:2,priority:0,width:56,height:28};
 assert.deepEqual([...visibleEnemyHints([a,b],56,28)],['selected']);
 assert.deepEqual([...visibleEnemyHints([a,{...b,x:120}],56,28)],['selected','nearby']);
});

test('overlapping hints prefer selected, imminent threats, giants, then the closest enemy',()=>{
 const near={id:'near',x:0,y:0,priority:0,distance:2};
 const far={id:'far',x:1,y:1,priority:0,distance:10};
 const distant={id:'separate',x:100,y:0,priority:0,distance:20};
 const pick=items=>[...visibleEnemyHints(items,56,28)];
 assert.deepEqual(pick([far,near,distant]),['near','separate']);
 assert.deepEqual(pick([near,{...far,priority:1}]),['far']);
 assert.deepEqual(pick([{...near,priority:2},{...far,priority:1}]),['near']);
 assert.deepEqual(pick([{...near,priority:2},{...far,priority:3}]),['far']);
 assert.deepEqual(pick([{...near,clipped:true},far]),['far']);
 assert.deepEqual(pick([near,{...far,y:40}]),['near','far']);
});

test('hint rotation gives the rune most time and fades at boundaries without wall-clock timers',()=>{
 const settings={spellSeconds:5,barSeconds:2.5,numberSeconds:2.5,fadeSeconds:.4};
 assert.deepEqual(enemyHintPhase(1,settings),{phase:0,opacity:1});
 assert.equal(enemyHintPhase(4.9,settings).phase,0);
 assert.ok(enemyHintPhase(4.9,settings).opacity<.3);
 assert.deepEqual(enemyHintPhase(5,settings),{phase:1,opacity:0});
 assert.deepEqual(enemyHintPhase(6,settings),{phase:1,opacity:1});
 assert.deepEqual(enemyHintPhase(8,settings),{phase:2,opacity:1});
 assert.deepEqual(enemyHintPhase(11,settings),enemyHintPhase(1,settings));
});
