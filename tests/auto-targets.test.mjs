import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTarget, nearestEnemies } from '../src/modules/Input/autoTargets.js';

test('target button cycles all candidates and keeps a single target selected', () => {
  const targets=[{key:'pot'},{key:'ingredient:1'},{key:'enemy:1'}];
  assert.equal(nextTarget(targets,null),targets[0]);
  assert.equal(nextTarget(targets,'pot'),targets[1]);
  assert.equal(nextTarget(targets,'ingredient:1'),targets[2]);
  assert.equal(nextTarget(targets,'enemy:1'),targets[0]);
  assert.equal(nextTarget([targets[0]],'pot'),targets[0]);
  assert.equal(nextTarget([],null),null);
});
test('removed targets do not leave the selection cycle stuck', () => {
  assert.equal(nextTarget([{key:'pot'}],'dead-enemy').key,'pot');
});
test('arena chooses enemies nearest the crystal, excluding dead and friendly units', () => {
  const enemies=[{id:'far',x:8,z:0,hp:20,type:'cube'}, {id:'near',x:1,z:1,hp:20,type:'cube'},
    {id:'friend',x:0,z:0,hp:20,type:'helper'}, {id:'dead',x:0,z:0,hp:0,type:'cube'}];
  assert.deepEqual(nearestEnemies(enemies,{cube:{},helper:{hostile:false}}).map(e=>e.id),['near','far']);
  assert.equal(enemies[0].id,'far');
});
