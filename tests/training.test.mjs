import { prepareStoreSource } from './loadGameStore.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { matchesLesson, recognizeLessonGesture, resampleStroke, spellLessons } from '../src/static/spellLessons.js';

test('all ten lesson shapes accept a full trace and tolerate small hand movement', () => {
  for (const lesson of spellLessons) {
    const exact = resampleStroke(lesson.points, 120);
    assert.ok(matchesLesson(exact, lesson), lesson.name);
    const jitter = exact.map(([x, y], i) => [x + Math.sin(i) * .008, y + Math.cos(i) * .008]);
    assert.ok(matchesLesson(jitter, lesson), lesson.name + ' jitter');
    assert.equal(recognizeLessonGesture(exact.map(([x, y]) => ({ x: x * 2 - 1, y: 1 - y * 2 }))), lesson.id, lesson.name + ' in game');
  }
});

test('empty, incomplete, reversed, misplaced and unrelated strokes do not count', () => {
  for (const lesson of spellLessons) {
    const exact = resampleStroke(lesson.points, 100);
    assert.equal(matchesLesson([], lesson), false);
    assert.equal(matchesLesson([[.5,.5],[.5,.5],[.5,.5]], lesson), false);
    assert.equal(matchesLesson(exact.slice(0, 30), lesson), false);
    assert.equal(matchesLesson([...exact].reverse(), lesson), false);
    assert.equal(matchesLesson(exact.map(([x,y]) => [x + .3,y]), lesson), false);
  }
  assert.equal(recognizeLessonGesture([{x:0,y:0},{x:.01,y:0},{x:.02,y:0}]), null);
  assert.equal(matchesLesson([[NaN,0],[0,0],[1,1]], spellLessons[0]), false);
});

test('tutorial repeats persist, cap at two and never gate playing', async () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  let source = read('src/modules/Stores/GameStore.js');
  source = source.replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href))
    .replace("'../../static/enemies'", JSON.stringify(new URL('../src/static/enemies.js', import.meta.url).href))
    .replace(/import missions from .*?;/, 'const missions = ' + read('src/static/missions.json') + ';')
    .replace(/import achievements from .*?;/, 'const achievements = ' + read('src/static/achievements.json') + ';');
  const saved = new Map();
  source = source.replace(/import shopItems from .*?;/, 'const shopItems = ' + read('src/static/shop.json') + ';');
  globalThis.window = { localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,v) } };
  const { useGameStore: store } = await import('data:text/javascript;base64,' + Buffer.from(prepareStoreSource(source)).toString('base64'));
  const s = () => store.getState();
  s().beginMission('level_01');
  assert.equal(s().startGame, true);
  assert.deepEqual(s().tutorialProgress, {});
  s().exitToMenu();
  s().recordTraining(1); s().recordTraining(1); s().recordTraining(1);
  s().recordTraining(0); s().recordTraining(11);
  assert.deepEqual(s().tutorialProgress, {1:2});
  const save = saved.get('hpproject-save-v1');
  store.setState({tutorialProgress:{}});
  saved.set('hpproject-save-v1', save);
  await store.persist.rehydrate();
  assert.deepEqual(s().tutorialProgress, {1:2});
  s().beginMission('level_01');
  assert.equal(s().startGame, true);
  assert.deepEqual(s().tutorialProgress, {1:2});
});
