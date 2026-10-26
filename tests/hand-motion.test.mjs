import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Group, Object3D, Vector3} from 'three';
import {createHandMotion, stepHandMotion} from '../src/modules/Wand/handMotion.js';

const config=JSON.parse(readFileSync(new URL('../src/static/spellEffects.json',import.meta.url),'utf8')).handRig;

test('shared hand spring settles without overshoot and is consistent at 30/60/144 FPS',()=>{
 const results=[];
 for(const fps of [30,60,144]){
  const state=createHandMotion();let previous=0;
  for(let i=0;i<fps;i++){
   stepHandMotion(state,{x:1,y:-.7},1/fps,config);
   assert.ok(state.x>=previous-1e-12&&state.x<=1);previous=state.x;
  }
  assert.ok(Math.abs(state.x-1)<.001);results.push(state);
 }
 for(const state of results.slice(1))for(const key of ['x','y','vx','vy'])assert.ok(Math.abs(state[key]-results[0][key])<1e-9,key);
});

test('rapid direction changes and a long frame keep wrist sway finite and bounded',()=>{
 const state=createHandMotion();
 for(let i=0;i<1000;i++){
  const pose=stepHandMotion(state,{x:Math.sin(i*.5)*4,y:Math.cos(i*.7)*3},i===500?10:1/60,config);
  Object.values(pose).forEach(value=>assert.ok(Number.isFinite(value)));
  assert.ok(Math.abs(pose.roll)<=config.tracking.maxTilt+config.sway.idleAmplitude+config.sway.moveAmplitude+1e-8);
  assert.ok(Math.abs(pose.bob)<=config.sway.bob*1.25+1e-8);
 }
});

test('wand stays embedded in the hand under joint motion and scaled arena transforms; tip stays exact',()=>{
 const parent=new Group(),joint=new Group(),mount=new Group(),wand=new Object3D();
 parent.add(joint);joint.add(mount);mount.add(wand);
 mount.position.set(...config.grip);mount.rotation.set(...config.gripRotation);
 wand.position.set(0,config.wandLength/2-config.gripDepth,0);
 for(let i=0;i<50;i++){
  parent.position.set(3,4,5);parent.rotation.set(.8,.2,.1);parent.scale.setScalar(.3+i*.02);
  joint.rotation.set(Math.sin(i)*.8,Math.cos(i)*.7,Math.sin(i*.7)*.2);
  joint.position.set(...config.position);parent.updateMatrixWorld(true);
  const base=wand.localToWorld(new Vector3(0,-config.wandLength/2,0));
  const insideHand=joint.worldToLocal(base.clone());
  config.handSize.forEach((size,axis)=>assert.ok(Math.abs(insideHand.getComponent(axis))<size/2,'grip inside hand'));
  const actualTip=wand.localToWorld(new Vector3(0,config.wandLength/2,0));
  const expectedTip=mount.localToWorld(new Vector3(0,config.wandLength-config.gripDepth,0));
  assert.ok(actualTip.distanceTo(expectedTip)<1e-10);
 }
});
