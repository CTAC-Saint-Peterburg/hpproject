import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { fitGameFrame, DISPLAY_PRESETS } from '../src/modules/Display/displaySettings.js';
import { paginateHeights } from '../src/modules/Menu/paginateHeights.js';
import { brewingCameraDepth } from '../src/modules/Ingredients/ingredientPointer.js';

test('game frame fits short, wide, tablet and portrait viewports without stretching', () => {
  for (const [w,h] of [[568,320],[640,360],[740,360],[844,390],[1280,575],[1024,768],[2560,1080],[320,568]]) {
    for (const preset of DISPLAY_PRESETS) {
      const frame = fitGameFrame(w,h,preset), aspect=frame.width/frame.height;
      assert.ok(frame.width<=w+.001 && frame.height<=h+.001);
      assert.ok(aspect>=1.5-.001 && aspect<=1.8+.001);
      if(preset==='standard') assert.ok(Math.abs(aspect-1.6)<.001);
      if(preset==='wide') assert.ok(Math.abs(aspect-16/9)<.001);
    }
  }
});

test('closer mobile camera keeps every ingredient and cauldron inside all frame presets', () => {
  const {scene}=JSON.parse(readFileSync(new URL('../src/static/brewing.json',import.meta.url),'utf8'));
  for (const [width,height] of [[568,320],[844,390],[1280,575],[1024,768]]) {
    for (const preset of DISPLAY_PRESETS) {
      const frame=fitGameFrame(width,height,preset), aspect=frame.width/frame.height;
      const camera=new PerspectiveCamera(scene.cameraFov,aspect,.1,100);
      camera.position.set(0,0,brewingCameraDepth(scene,aspect,true));camera.updateMatrixWorld();
      for (const [x,y] of [[2,1],[4,1],[6,1],[2,3],[4,3],[6,3],[0,0]]) {
        const p=new Vector3(x+.3,y+.3,0).project(camera);
        assert.ok(Math.abs(p.x)<.95 && Math.abs(p.y)<.95,`${width}x${height}/${preset}: ${x},${y}`);
      }
    }
  }
});

test('menu pagination never loses, duplicates or reorders blocks on resize', () => {
  const heights=[72,108,68,48,44,44,44,44,66,44,44,44];
  for (const available of [90,140,240,380,700]) {
    const pages=paginateHeights(heights,available);
    assert.deepEqual(pages.flat(),heights.map((_,i)=>i));
    assert.ok(pages.every(page=>page.length>0));
    for(const page of pages) if(page.length>1) assert.ok(page.reduce((sum,i)=>sum+heights[i],0)+(page.length-1)*8<=available);
  }
});

test('pagination handles translated multiline controls at exact page boundary', () => {
  assert.deepEqual(paginateHeights([44,68,44],120),[[0,1],[2]]);
  assert.deepEqual(paginateHeights([44,68,44],119),[[0],[1],[2]]);
  assert.deepEqual(paginateHeights([],300),[[]]);
});

test('rotation and display prompts exist in every supported language', () => {
  for (const locale of ['ru','en','es','fr','zh']) {
    const data=JSON.parse(readFileSync(new URL(`../src/translate/${locale}.json`,import.meta.url),'utf8'));
    for(const key of ['rotate','rotateHint','selectTarget','auto','standard','wide','description','pages']) assert.ok(data['display.'+key]?.length>0);
  }
});
