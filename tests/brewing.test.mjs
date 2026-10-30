import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStoreSource } from './loadGameStore.mjs';
import { potionCount } from '../src/modules/Stores/potionInventory.js';
import { brewingActions } from '../src/modules/RecipeStages/brewingActions.js';
import { ingredientFlightPose, ingredientFlightSeconds, ingredientRefillProgress } from '../src/modules/Ingredients/ingredientAnimation.js';
import { readFileSync } from 'node:fs';

const animation = JSON.parse(readFileSync(new URL('../src/static/brewing.json', import.meta.url))).ingredientAnimation;

let serial = 0;
test('ingredient rises above the rim, shrinks and falls into the cauldron; refill fades in smoothly', () => {
  const from = [.7, .2, 0];
  const start = ingredientFlightPose(from, 0, animation);
  assert.deepEqual(start.position, from);
  assert.equal(start.scale, 1);
  const apex = ingredientFlightPose(from, animation.riseSeconds, animation);
  assert.deepEqual(apex.position, [0, animation.liftHeight, 0]);
  assert.ok(apex.scale < 1 && apex.scale > .5);
  assert.deepEqual(ingredientFlightPose(from, animation.riseSeconds + animation.hoverSeconds, animation).position, apex.position);
  const landing = ingredientFlightPose(from, ingredientFlightSeconds(animation), animation);
  assert.deepEqual(landing.position, [0, -.15, 0]);
  assert.ok(landing.scale < apex.scale && landing.scale > 0);
  assert.equal(landing.opacity, 0);
  assert.equal(ingredientRefillProgress(0, animation), 0);
  assert.equal(ingredientRefillProgress(animation.refillSeconds / 2, animation), .5);
  assert.equal(ingredientRefillProgress(animation.refillSeconds, animation), 1);
  assert.equal(ingredientRefillProgress(100, animation), 1);
});

test('contact starts one flight, awards nothing early and resolves once after landing, including across pause', async () => {
  const { store, s } = await fixture();
  const originalNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  try {
    s().beginMission('level_01'); store.setState({ nextEnemyAt: null });
    assert.equal(s().beginIngredientDrop(1, [.7, 0, 0]), false);
    s().selectIngredient(1); s().setCurrentSpell(3);
    assert.equal(s().beginIngredientDrop(1, [2, 0, 0]), false);
    assert.equal(s().beginIngredientDrop(1, [NaN, 0, 0]), false);
    assert.equal(s().beginIngredientDrop(1, [.7, 0, 0]), true);
    assert.equal(s().score, 0); assert.equal(s().currentStage, 0);
    assert.equal(s().heldIngredientId, null); assert.equal(s().selectedIngredientId, null);
    assert.equal(s().ingredientRefills[1], now);
    const started = now;
    assert.equal(s().beginIngredientDrop(1, [.7, 0, 0]), false);
    s().selectIngredient(2); assert.equal(s().selectedIngredientId, null);
    s().addIngredient(1); assert.equal(s().currentStage, 0);
    now += 300; s().tick(now); s().setPaused(true);
    now += 10000; s().tick(now);
    assert.equal(s().currentStage, 0); assert.ok(s().ingredientFlight);
    s().setPaused(false);
    assert.equal(s().ingredientFlight.startedAt, started + 10000);
    assert.equal(s().ingredientRefills[1], started + 10000);
    now = started + 10000 + ingredientFlightSeconds(animation) * 1000 - 1;
    s().tick(now); assert.equal(s().currentStage, 0);
    now += 2; s().tick(now);
    assert.equal(s().ingredientFlight, null); assert.equal(s().currentStage, 1);
    const score = s().score;
    assert.equal(score, s().mission.stages[0].points_add);
    now += 2000; s().tick(now); assert.equal(s().score, score);
    s().selectIngredient(1); assert.equal(s().selectedIngredientId, 1);
  } finally { Date.now = originalNow; }
});

test('landing checks current conditions once; timeout, debug, exit and retry discard pending flights', async () => {
  const { store, s } = await fixture();
  const originalNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  const launch = () => {
    s().selectIngredient(1); s().setCurrentSpell(3);
    assert.equal(s().beginIngredientDrop(1, [.7, 0, 0]), true);
  };
  try {
    s().beginMission('level_01'); store.setState({ nextEnemyAt: null }); launch();
    store.setState({ potTemperature: 90 });
    now += 1300; s().tick(now);
    assert.equal(s().currentStage, 0); assert.equal(s().mistakes, 1);
    assert.equal(s().message, 'messages.wrongTemperature');
    now += 500; s().tick(now); assert.equal(s().mistakes, 1);
    launch(); s().debugAdvance(); assert.equal(s().ingredientFlight, null);
    now += 1300; s().tick(now); assert.equal(s().currentStage, 1);
    s().beginMission('level_01'); launch();
    store.setState({ deadline: now + 500, remaining: .5 });
    now += 1300; s().tick(now);
    assert.equal(s().status, 'lost'); assert.equal(s().ingredientFlight, null); assert.equal(s().score, 0);
    s().beginMission('level_01'); launch(); s().exitToMenu();
    assert.equal(s().ingredientFlight, null); assert.deepEqual(s().ingredientRefills, {});
    s().beginMission('level_01'); launch(); s().beginMission('level_01');
    assert.equal(s().ingredientFlight, null); assert.deepEqual(s().ingredientRefills, {});
    now += 1300; s().tick(now); assert.equal(s().score, 0);
  } finally { Date.now = originalNow; }
});
test('preparation hints follow the current temperature and stirring requirements', () => {
  const stage = { temperature: { min: 40, max: 60 }, stirring: { min: 20, max: 80 } };
  const names = (temperature, agitation) => brewingActions(stage, temperature, agitation).map(action => action.name);
  assert.deepEqual(names(20, 0), ['brewing.nextHeat', 'brewing.nextStir']);
  assert.deepEqual(names(50, 0), ['brewing.nextStir']);
  assert.deepEqual(names(70, 90), ['brewing.nextCool', 'brewing.nextSettle']);
  assert.deepEqual(names(40, 20), []);
  assert.deepEqual(names(60, 80), []);
  assert.deepEqual(brewingActions(undefined, 20, 0), []);
  assert.deepEqual(brewingActions({ temperature: stage.temperature }, 50, 0), []);
});

test('pause freezes brewing and input, then shifts deadlines and enemy clocks on resume', async () => {
  const { store, s } = await fixture();
  const originalNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  try {
    s().beginMission('level_01');
    s().spawnEnemy('enemycold', true);
    store.setState({ deadline: now + 30000, remaining: 30, nextEnemyAt: now + 10000,
      heatLevel: 1, agitation: 50, stirUntil: now + 1500,
      projectiles: [{ id: 'test', type: 'enemycold', bornAt: now, launchedAt: now, impactAt: now + 1000 }] });
    s().setPaused(true);
    const frozen = s();
    now += 60000;
    s().tick(now); s().updateEnemies(now); s().addIngredient(1);
    s().selectIngredient(2); s().togglePotSelected(); s().setCurrentSpell(5);
    s().changePotTemperature(1); s().selectEnemy(frozen.enemies[0].id); s().debugAdvance();
    assert.equal(s(), frozen);
    assert.equal(s().spawnEnemy('enemyfire', true), false);
    s().setPaused(false);
    assert.equal(s().paused, false);
    assert.equal(s().deadline, now + 30000);
    assert.equal(s().nextEnemyAt, now + 10000);
    assert.equal(s().stirUntil, now + 1500);
    assert.equal(s().enemies[0].bornAt, frozen.enemies[0].bornAt + 60000);
    assert.equal(s().enemies[0].nextShotAt, frozen.enemies[0].nextShotAt + 60000);
    assert.equal(s().projectiles[0].impactAt, now + 1000);
    s().tick(now + 500);
    assert.equal(s().remaining, 29.5);
    assert.ok(s().potTemperature > frozen.potTemperature);
    assert.equal(s().agitation, 50 - (s().mission.stirring?.decayPerSecond ?? 2) * .5);
    s().setPaused(true); s().exitToMenu(); assert.equal(s().paused, false);
    s().beginMission('level_01'); assert.equal(s().paused, false);
    assert.equal(s().deadline, null);
  } finally {
    Date.now = originalNow;
  }
});
async function fixture(savedState) {
  const saved = new Map();
  if (savedState) saved.set('hpproject-save-v1', JSON.stringify({ state: savedState, version: 0 }));
  globalThis.window = { localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,v) } };
  let source = prepareStoreSource()
    .replace("'zustand'", JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace("'zustand/middleware'", JSON.stringify(new URL('../node_modules/zustand/esm/middleware.mjs', import.meta.url).href));
  const { useGameStore: store } = await import('data:text/javascript;base64,' + Buffer.from(source + '\n// fixture ' + serial++).toString('base64'));
  return { store, s: () => store.getState(), saved };
}

test('first visit is persisted immediately, never refills on reload and never adds stones to old saves', async () => {
  const f = await fixture();
  const profile = JSON.parse(f.saved.get('hpproject-save-v1')).state;
  assert.equal(profile.firstVisitGranted, true);
  assert.equal(profile.stones, 0);
  assert.equal(potionCount(profile.potionInventory, 'healing'), 1);
  const next = await fixture(profile);
  assert.equal(next.s().showFirstVisitWelcome, false);
  assert.equal(potionCount(next.s().potionInventory, 'frost'), 1);
  const old = await fixture({ stones: 139, potionInventory: { frost: 5 } });
  assert.equal(old.s().stones, 139);
  assert.equal(potionCount(old.s().potionInventory, 'frost'), 5);
  assert.equal(potionCount(old.s().potionInventory, 'flame'), 0);
});

test('lift and drop require selection, reset cleanly and first ignition hint stays dismissed after rehydration', async () => {
  const f = await fixture(), { store, s } = f;
  s().beginMission('level_01'); store.setState({ nextEnemyAt: null });
  s().setCurrentSpell(3); assert.equal(s().heldIngredientId, null);
  s().selectIngredient(2); s().setCurrentSpell(3);
  assert.equal(s().heldIngredientId, 2);
  s().setCurrentSpell(4); assert.equal(s().heldIngredientId, null);
  s().selectIngredient(1); s().setCurrentSpell(3);
  s().spawnEnemy('enemycold', true); s().selectEnemy(s().enemies[0].id);
  assert.equal(s().heldIngredientId, null); assert.equal(s().selectedIngredientId, null);
  store.setState({ enemies: [], selectedEnemyId: null });
  s().selectIngredient(1); s().setCurrentSpell(3);
  s().togglePotSelected(); assert.equal(s().heldIngredientId, null);
  s().setCurrentSpell(1); assert.equal(s().heatLevel, 1); assert.equal(s().fireHintSeen, true);
  const profile = JSON.parse(f.saved.get('hpproject-save-v1')).state;
  const reload = await fixture(profile);
  assert.equal(reload.s().fireHintSeen, true);
  reload.s().beginMission('level_01');
  assert.equal(reload.s().agitation, 0); assert.equal(reload.s().heldIngredientId, null);
});

test('stirring uses mission settings, decays over time, blocks out-of-range ingredients and stops at the level end', async () => {
  const { store, s } = await fixture();
  s().beginMission('level_01');
  store.setState({ nextEnemyAt: null, mission: { ...s().mission, stirring: { perCast: 30, decayPerSecond: 2, swaySeconds: 2 } } });
  s().setCurrentSpell(5); assert.equal(s().agitation, 0);
  s().togglePotSelected(); s().setCurrentSpell(5);
  assert.ok(s().agitation > 29); assert.ok(s().stirUntil > Date.now());
  s().tick(s().lastTick + 5000); assert.ok(s().agitation > 19 && s().agitation <= 20);
  store.setState({ lastTick: Date.now(), agitation: 0 });
  s().addIngredient(1); assert.equal(s().currentStage, 1);
  s().addIngredient(2); assert.equal(s().currentStage, 1); assert.equal(s().message, 'messages.wrongStirring');
  assert.equal(s().mistakes, 1);
  s().setCurrentSpell(5); s().addIngredient(2); assert.equal(s().currentStage, 2);
  assert.equal(s().heldIngredientId, null);
  for (let i = 0; i < 5; i++) s().setCurrentSpell(5);
  assert.equal(s().agitation, 100);
  s().finish(false); const agitation = s().agitation;
  s().tick(s().lastTick + 5000); assert.equal(s().agitation, agitation); assert.equal(s().stirUntil, 0);
});

test('three ratings produce distinct persisted potion qualities once, while failures and debug runs add none', async () => {
  const { store, s, saved } = await fixture({ potionInventory: {}, stones: 0 });
  for (const [ratio, quality] of [[.5,'basic'],[.7,'fine'],[1,'masterwork']]) {
    s().beginMission('level_01');
    const max = s().mission.stages.reduce((sum,stage) => sum + stage.points_add, 0);
    store.setState({ score: max * ratio }); s().finish(true); s().finish(true);
    assert.equal(s().resultQuality, quality);
    assert.equal(s().potionInventory.frost[quality], 1);
  }
  assert.equal(potionCount(s().potionInventory, 'frost'), 3);
  s().beginMission('level_01'); s().finish(false);
  assert.equal(potionCount(s().potionInventory, 'frost'), 3);
  s().beginMission('level_01'); store.setState({ debugUsed: true }); s().finish(true);
  assert.equal(potionCount(s().potionInventory, 'frost'), 3);
  assert.deepEqual(JSON.parse(saved.get('hpproject-save-v1')).state.potionInventory.frost, { basic:1, fine:1, masterwork:1 });
});
