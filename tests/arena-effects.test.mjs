import assert from 'node:assert/strict';
import test from 'node:test';
import { arenaEffectState } from '../src/modules/Defense/arenaEffectState.js';

test('arena casts use the common spell event format and retain world targets', () => {
  const fx = { kind:'cast', id:4, spellId:2, time:12, target:[3,.5,-2] };
  const state = arenaEffectState({phase:'wave',paused:false,fx});
  assert.equal(state.status,'playing');
  assert.deepEqual(state.spellCast,{sequence:4,spellId:2,at:12,target:{kind:'world',position:[3,.5,-2],rotation:[-Math.PI/2,0,0]}});
  fx.target[0]=100;
  assert.equal(state.spellCast.target.position[0],3);
  const repeated=arenaEffectState({phase:'wave',fx:{...fx,id:5}});
  assert.equal(repeated.spellCast.spellId,2);
  assert.equal(repeated.spellCast.sequence,5);
  const crystal=arenaEffectState({phase:'wave',fx:{...fx,target:'crystal'}},[0,0,0]);
  assert.deepEqual(crystal.spellCast.target.position,[0,1.1,0]);
  assert.deepEqual(crystal.spellCast.target.rotation,[0,0,0]);
});

test('common renderer stays active between waves, freezes on pause and ignores potion events', () => {
  for(const phase of ['wave','clear','coin']) assert.equal(arenaEffectState({phase}).status,'playing');
  for(const phase of ['idle','lost','won']) assert.equal(arenaEffectState({phase}).status,'idle');
  assert.equal(arenaEffectState({phase:'wave',paused:true}).paused,true);
  assert.equal(arenaEffectState({phase:'wave',fx:{kind:'potion',id:1}}).spellCast,null);
  assert.equal(arenaEffectState({phase:'clear',fx:null}).spellCast,null);
});

test('a potion impact reuses a world-space spell burst with its own recipe color', () => {
  const fx={kind:'potionImpact',id:12,time:4.5,spellId:5,color:'#7fd083',target:[0,.21,2]};
  const event=arenaEffectState({phase:'clear',paused:false,fx}).spellCast;
  assert.equal(event.sequence,12);assert.equal(event.at,4.5);assert.equal(event.spellId,5);
  assert.equal(event.color,fx.color);assert.deepEqual(event.target.position,[0,.21,2]);
  fx.target[1]=10;assert.equal(event.target.position[1],.21);
});

test('splash wand casts reuse the existing horizontal ring at their configured radius', () => {
  const event=arenaEffectState({phase:'wave',fx:{kind:'cast',id:20,time:2,spellId:2,target:[2,.5,1],splashRadius:2.2}}).spellCast;
  assert.equal(event.flashRingRadius,2.2);assert.deepEqual(event.target.rotation,[-Math.PI/2,0,0]);
  assert.deepEqual(event.target.position,[2,.5,1]);
});
