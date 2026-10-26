import assert from 'node:assert/strict';
import test from 'node:test';
import {spellLessons, resampleStroke} from '../src/static/spellLessons.js';
import {recognizeGesture} from '../src/modules/Recognaizer/recognaizer.js';

function transform(points, {angle=0,scale=1,aspect=1,jitter=0,stretch=1,reverse=false}={}) {
  const a=angle*Math.PI/180;
  const stroke=points.map(([px,py],i)=>{
    const x=(px-.5)*scale*2*stretch,y=(.5-py)*scale*2;
    return {x:(x*Math.cos(a)-y*Math.sin(a)+jitter*Math.sin(i*1.7))/aspect+.2,y:x*Math.sin(a)+y*Math.cos(a)+jitter*Math.cos(i*1.3)-.1};
  });
  return reverse?stroke.reverse():stroke;
}

test('all ten spells tolerate tilt, scale, opposite stroke direction and mouse noise',()=>{
  for(const lesson of spellLessons){
    const angles=[3,4,9].includes(lesson.id)?[-15,0,15]:[-35,-25,-15,0,15,25,35];
    for(const angle of angles)for(const scale of [.5,1,1.6])for(const reverse of [false,true]){
      const points=transform(resampleStroke(lesson.points,100),{angle,scale,reverse,jitter:.005,aspect:1.8});
      assert.equal(recognizeGesture(points,{aspectRatio:1.8}),lesson.id,JSON.stringify({id:lesson.id,angle,scale,reverse}));
    }
  }
});

test('circle versus square stays distinct with arbitrary start point, rotation and oval/rectangle proportions',()=>{
  for(const id of [2,5])for(const shift of [0,7,29,65,91])for(const angle of [-80,-30,0,25,75])for(const stretch of [.8,1,1.4]){
    const base=resampleStroke(spellLessons.find(l=>l.id===id).points,129).slice(0,-1);
    const loop=base.slice(shift).concat(base.slice(0,shift));loop.push(loop[0]);
    assert.equal(recognizeGesture(transform(loop,{angle,stretch,jitter:.01})),id,JSON.stringify({id,shift,angle,stretch}));
  }
});

test('pauses, sparse fast strokes and dense slow strokes give the same spell',()=>{
  for(const lesson of spellLessons)for(const count of [12,30,180]){
    const points=resampleStroke(lesson.points,count);
    points.splice(1,0,...Array.from({length:25},()=>[...points[0]]));
    points.push(...Array.from({length:30},()=>[...points.at(-1)]));
    assert.equal(recognizeGesture(transform(points)),lesson.id,lesson.id+' at '+count+' samples');
  }
  assert.equal(recognizeGesture(transform(spellLessons[0].points,{angle:25})),1);
});

test('screen aspect compensation preserves tilted shapes in both portrait and wide layouts',()=>{
  for(const lesson of spellLessons)for(const aspect of [.5,1,1.5,2.4,4]){
    const angle=[3,4,9].includes(lesson.id)?12:25;
    assert.equal(recognizeGesture(transform(resampleStroke(lesson.points,100),{angle,aspect}),{aspectRatio:aspect}),lesson.id,lesson.id+' at aspect '+aspect);
  }
});

test('orientation-specific spells stay different and ambiguous lines or scribbles do not cast',()=>{
  assert.equal(recognizeGesture(transform(resampleStroke(spellLessons[0].points,80),{angle:180})),7);
  assert.equal(recognizeGesture(transform(resampleStroke(spellLessons[3].points,80),{angle:90})),3);
  assert.equal(recognizeGesture(transform(resampleStroke(spellLessons[3].points,80),{angle:22.5})),null);
  for(const invalid of [null,[],[{x:NaN,y:0},{x:0,y:0},{x:1,y:1}],[{x:0,y:0},{x:.01,y:0},{x:.02,y:0}]])assert.equal(recognizeGesture(invalid),null);
  const shapes=[
    [[0,0],[1,1],[-1,1],[1,-1],[-1,-1],[0,0]],
    [[0,0],[1,1],[0,0],[-1,1],[0,0],[1,-1]],
    Array.from({length:100},(_,i)=>[Math.cos(i*.15)*i/100,Math.sin(i*.15)*i/100]),
    Array.from({length:130},(_,i)=>[Math.cos(i*4*Math.PI/129),Math.sin(i*4*Math.PI/129)]),
  ];
  for(const shape of shapes)assert.equal(recognizeGesture(shape.map(([x,y])=>({x,y}))),null);
});

test('short accidental hooks at either end do not spoil an otherwise clear gesture',()=>{
  for(const lesson of spellLessons)for(const angle of [-12,0,12])for(const reverse of [false,true]){
    const points=resampleStroke(lesson.points,100);
    const last=points.at(-1);
    points.push([last[0]+.025,last[1]+.025]);
    assert.equal(recognizeGesture(transform(points,{angle,reverse})),lesson.id,lesson.id+' hook at '+angle);
  }
  const vertical=resampleStroke(spellLessons[2].points,100);
  vertical.unshift([.475,.775]);vertical.push([.525,.225]);
  assert.equal(recognizeGesture(transform(vertical)),3);
});

test('nearly closed squares and circles tolerate a small unpainted final gap',()=>{
  const square=[[.23,.23],[.77,.23],[.77,.77],[.23,.77],[.23,.41]];
  for(const angle of [-30,0,40])for(const reverse of [false,true]){
    assert.equal(recognizeGesture(transform(resampleStroke(square,100),{angle,reverse})),2);
    for(const missing of [.1,.12]){
      const circle=resampleStroke(spellLessons[4].points,120).slice(0,Math.round(120*(1-missing)));
      assert.equal(recognizeGesture(transform(circle,{angle,reverse})),5);
    }
  }
  const unfinished=resampleStroke(spellLessons[4].points,120).slice(0,95);
  assert.equal(recognizeGesture(transform(unfinished)),null);
});

test('elastic alignment accepts uneven W peaks without lowering global thresholds',()=>{
  const forms=[
    [[.18,.24],[.35,.75],[.48,.4],[.67,.7],[.82,.25]],
    [[.18,.24],[.34,.76],[.5,.48],[.66,.76],[.82,.24]],
    [[.18,.24],[.34,.76],[.5,.55],[.66,.76],[.82,.24]],
  ];
  for(const points of forms)for(const angle of [-25,0,25])for(const reverse of [false,true]){
    assert.equal(recognizeGesture(transform(resampleStroke(points,100),{angle,reverse,aspect:1.8,jitter:.003}),{aspectRatio:1.8}),10);
  }
});

test('elastic fallback and trimming preserve incomplete-shape and ambiguity safeguards',()=>{
  const rejected=[
    [[.15,.25],[.5,.62],[.85,.25]],
    [[.27,.2],[.27,.77],[.4,.77]],
    [[.27,.2],[.27,.77],[.33,.77]],
    [[.27,.2],[.27,.77],[.35,.77]],
    [[.27,.2],[.27,.77],[.37,.77]],
    [[.2,.8],[.5,.2],[.8,.8],[.2,.8]],
    [[.2,.8],[.5,.2],[.8,.8],[.3,.8]],
    [[.2,.2],[.8,.2],[.8,.8],[.2,.8]],
    Array.from({length:11},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?.12:.3;return[.5+Math.cos(a)*r,.5+Math.sin(a)*r];}),
  ];
  for(const points of rejected)assert.equal(recognizeGesture(transform(resampleStroke(points,100))),null);
  const mediumL=[[.27,.2],[.27,.77],[.55,.77]];
  assert.equal(recognizeGesture(transform(resampleStroke(mediumL,100))),8);
  const flattenedW=[[.18,.24],[.34,.76],[.5,.72],[.66,.76],[.82,.24]];
  for(const angle of [-15,0,15])assert.ok([null,10].includes(recognizeGesture(transform(resampleStroke(flattenedW,100),{angle}))));
});
