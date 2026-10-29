import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStoreSource } from './loadGameStore.mjs';
import { potionCount } from '../src/modules/Stores/potionInventory.js';

let serial = 0;
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
