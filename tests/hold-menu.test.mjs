import test from 'node:test';
import assert from 'node:assert/strict';
import { createHoldAction } from '../src/modules/Menu/holdAction.js';

test('menu requires three continuous seconds and fires only once',()=>{
 const values=[];let exits=0;
 const hold=createHoldAction(()=>exits++,value=>values.push(value));
 hold.start(1,100);hold.tick(1099);assert.equal(exits,0);
 hold.tick(1100);hold.tick(2100);hold.tick(3099);assert.equal(exits,0);
 hold.tick(3100);hold.tick(9999);assert.equal(exits,1);
 assert.deepEqual(values,[3,2,1,null]);
});
test('release, pointer departure and focus loss cancel without carrying time into another hold',()=>{
 let exits=0;const hold=createHoldAction(()=>exits++,()=>{});
 hold.start(1,0);hold.tick(2900);hold.cancel(1);hold.tick(5000);assert.equal(exits,0);
 hold.start(2,6000);hold.tick(8999);assert.equal(exits,0);
 hold.cancel();hold.tick(10000);assert.equal(exits,0);
 hold.start('keyboard',11000);hold.tick(14000);assert.equal(exits,1);
});
test('secondary pointers cannot restart or cancel the first hold',()=>{
 let exits=0;const hold=createHoldAction(()=>exits++,()=>{});
 assert.equal(hold.start(1,0),true);assert.equal(hold.start(2,1000),false);
 hold.cancel(2);hold.tick(3000);assert.equal(exits,1);
});
