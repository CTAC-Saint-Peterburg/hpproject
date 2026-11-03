import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { arenaBaseCameraPose, arenaFrontBorder, potionRackPosition } from '../src/modules/Defense/arenaLayout.js';
import { writePotionFlightPose } from '../src/modules/Defense/potionMotion.js';
import { Euler, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { createPotionGeometry, POTION_MODEL_HEIGHT, POTION_MODELS } from '../src/modules/Potions/potionGeometry.js';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) => {
  if (!specifier.startsWith('.')) return statement;
  return 'from ' + JSON.stringify(new URL(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', base).href);
});
const { defenseState, config, potionTypes } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function fixture(first = 'frost') {
  const profile = { mageCards: {}, consumeEntryPotions: () => true, changeStones() {},
    awardMageCard(id) { this.mageCards[id] = (this.mageCards[id] || 0) + 1; } };
  const ids = [first, ...potionTypes.map(potion => potion.id).filter(id => id !== first)].slice(0, 3);
  const store = createStore(defenseState(() => profile, () => .99));
  const s = () => store.getState();
  assert.equal(s().start(ids), true);
  const keepWaveOpen = () => store.setState({ enemies: [{ ...s().enemies[0], x: 7, z: -4,
    hp: 1000, maxHp: 1000, speed: 0, rageAt: 1e9, rageUntil: 0 }], queue: [], projectiles: [] });
  keepWaveOpen(); store.setState({ time: 1 });
  const step = seconds => {
    for (let index = 0; index < Math.ceil(seconds / .05); index++) s().tick(s().lastTick + 50);
  };
  const advanceTo = target => {
    let count = 0;
    while (s().time < target - 1e-7 && !['idle', 'won', 'lost'].includes(s().phase)) {
      assert.ok(count++ < 10000);
      s().tick(s().lastTick + Math.min(50, Math.max(1, Math.ceil((target - s().time) * 1000))));
    }
  };
  const launch = id => { assert.equal(s().usePotion(id), true); assert.equal(s().cast(3), true); return s().potionFlight; };
  return { store, s, profile, ids, step, advanceTo, launch, keepWaveOpen };
}

test('a rack click only selects; gesture three consumes once and each effect starts on landing', () => {
  for (const potion of potionTypes) {
    const f = fixture(potion.id); f.store.setState({ hp: 80 });
    const before = { ...f.s().inventory };
    assert.equal(f.s().usePotion(potion.id), true);
    assert.equal(f.s().selected, 'potion:' + potion.id); assert.equal(f.s().pendingPotion, potion.id);
    assert.deepEqual(f.s().inventory, before); assert.deepEqual(f.s().buffs, {}); assert.equal(f.s().hp, 80);
    assert.equal(f.s().cast(8), false); assert.deepEqual(f.s().inventory, before);
    assert.equal(f.s().cast(3), true);
    const flight = f.s().potionFlight;
    assert.equal(flight.potionId, potion.id); assert.equal(flight.startedAt, f.s().time);
    assert.equal(flight.duration, config.visuals.potionFlightSeconds);
    assert.deepEqual(flight.from, potionRackPosition(potion.id, before));
    assert.deepEqual(flight.to, config.visuals.potionLanding);
    assert.equal(f.s().inventory[potion.id], 0); assert.equal(f.s().pendingPotion, null); assert.equal(f.s().selected, null);
    assert.equal(f.s().cast(3), false); assert.equal(f.s().inventory[potion.id], 0);
    assert.equal(f.s().usePotion(f.ids.find(id => id !== potion.id)), false, 'only one potion can be flying');
    f.advanceTo(flight.startedAt + flight.duration - .005);
    assert.ok(f.s().potionFlight); assert.deepEqual(f.s().buffs, {}); assert.equal(f.s().hp, 80);
    f.advanceTo(flight.startedAt + flight.duration + .001);
    assert.equal(f.s().potionFlight, null);
    if (potion.effect === 'heal') assert.equal(f.s().hp, config.crystal.maxHp);
    else {
      assert.ok(Math.abs(f.s().buffs[potion.effect] - f.s().time - potion.duration) < 1e-8);
      const expires = f.s().buffs[potion.effect]; f.step(.1); assert.equal(f.s().buffs[potion.effect], expires);
    }
    assert.equal(f.s().usePotion(potion.id), false);
  }
});

test('selecting another object cancels a selected potion without spending it', () => {
  for (const target of ['crystal', 'enemy', 'projectile', null, 'unrelated-object']) {
    const f = fixture(); const enemy = f.s().enemies[0];
    f.store.setState({ projectiles: [{ id: 'rack-test-shot', interceptable: true, counterSpell: 2, x: 4, y: 1, z: 0 }] });
    f.s().usePotion('frost');
    f.s().select(target === 'enemy' ? enemy.id : target === 'projectile' ? 'rack-test-shot' : target);
    assert.equal(f.s().pendingPotion, null); assert.equal(f.s().inventory.frost, 1);
    f.s().cast(3); assert.equal(f.s().potionFlight, null); assert.equal(f.s().inventory.frost, 1);
    assert.deepEqual(f.s().buffs, {});
  }
  const f = fixture(); f.s().usePotion('frost'); f.s().usePotion('flame');
  assert.equal(f.s().pendingPotion, 'flame'); assert.equal(f.s().selected, 'potion:flame');
  assert.equal(f.s().inventory.frost, 1); assert.equal(f.s().inventory.flame, 1);
});

test('healing at full health rejects launch without consuming; landing heals current HP and caps it', () => {
  const f = fixture('healing');
  assert.equal(f.s().hp, config.crystal.maxHp);
  f.s().usePotion('healing'); assert.equal(f.s().cast(3), false);
  assert.equal(f.s().inventory.healing, 1); assert.equal(f.s().potionFlight, null);
  f.store.setState({ hp: 90 }); const flight = f.launch('healing');
  assert.equal(f.s().hp, 90); f.store.setState({ hp: 50 });
  f.advanceTo(flight.startedAt + flight.duration + .001);
  assert.equal(f.s().hp, 50 + potionTypes.find(potion => potion.id === 'healing').heal);
  assert.equal(f.s().inventory.healing, 0);
});

test('pause freezes a flight and rejects potion input; landing precedes wave completion and card award', () => {
  const f = fixture(); const flight = f.launch('frost'); f.step(.2);
  f.s().setPaused(true); const time = f.s().time;
  f.step(5); assert.equal(f.s().time, time); assert.deepEqual(f.s().potionFlight, flight);
  assert.equal(f.s().usePotion('flame'), false); assert.equal(f.s().cast(3), false);
  f.s().setPaused(false); f.store.setState({ enemies: [], queue: [], projectiles: [] });
  f.s().finishWave(); assert.equal(f.s().phase, 'wave'); assert.deepEqual(f.profile.mageCards, {});
  f.advanceTo(flight.startedAt + flight.duration - .005); assert.equal(f.s().phase, 'wave');
  f.advanceTo(flight.startedAt + flight.duration + .001);
  assert.equal(f.s().potionFlight, null); assert.ok(f.s().buffs.freeze > f.s().time);
  assert.equal(f.s().phase, 'clear'); assert.equal(f.profile.mageCards[config.waves[0].cardId], 1);
  f.step(.1); assert.equal(f.profile.mageCards[config.waves[0].cardId], 1);
});

test('loss, wave reset, exit and a new run discard flights without applying a stale buff', () => {
  for (const reset of ['loss', 'wave', 'exit']) {
    const f = fixture(); f.launch('frost');
    if (reset === 'loss') { f.store.setState({ hp: 0 }); f.step(.05); assert.equal(f.s().phase, 'lost'); }
    else if (reset === 'wave') assert.equal(f.s().debugWave(2), true);
    else f.s().exit();
    assert.equal(f.s().potionFlight, null); assert.equal(f.s().pendingPotion, null);
    assert.equal(f.s().selected, null); assert.equal(f.s().buffs.freeze, undefined);
    f.s().exit(); assert.equal(f.s().start(f.ids), true); f.keepWaveOpen();
    f.step(config.visuals.potionFlightSeconds + .1);
    assert.equal(f.s().potionFlight, null); assert.equal(f.s().inventory.frost, 1); assert.equal(f.s().buffs.freeze, undefined);
  }
});

test('flight pose follows a raised arc from bottle feet to landing feet without mutating its plan', () => {
  const inventory = { frost: 1, flame: 1, echo: 1 };
  const flight = { startedAt: 10, duration: config.visuals.potionFlightSeconds, arcHeight: config.visuals.potionArcHeight,
    from: potionRackPosition('frost', inventory), to: [...config.visuals.potionLanding] };
  const snapshot = JSON.stringify(flight), out = { position: [0, 0, 0], rotation: [0, 0, 0] };
  assert.equal(writePotionFlightPose(flight, 10, out), out); assert.deepEqual(out.position, flight.from); assert.equal(out.done, false);
  writePotionFlightPose(flight, 10 + flight.duration / 2, out);
  assert.ok(out.position[1] > Math.max(flight.from[1], flight.to[1]) + 1);
  writePotionFlightPose(flight, 10 + flight.duration + .001, out);
  assert.ok(out.position.every((value, axis) => Math.abs(value - flight.to[axis]) < 1e-9));
  assert.equal(out.done, true); assert.equal(JSON.stringify(flight), snapshot);
});

test('the enlarged board and potion rack keep fixed bottle slots after a bottle is consumed', () => {
  assert.equal(config.field.width, 20); assert.equal(config.field.depth, 13);
  const border = arenaFrontBorder();
  assert.equal(border.width, config.field.width); assert.equal(border.depth, 1.2); assert.equal(border.height, .6);
  assert.ok(Math.abs(border.top - .4) < 1e-8);
  const inventory = { frost: 1, flame: 1, echo: 1 };
  for (const id of Object.keys(inventory)) {
    const original = potionRackPosition(id, inventory);
    assert.deepEqual(potionRackPosition(id, { ...inventory, frost: 0 }), original);
    assert.ok(original[1] > border.top); assert.equal(original[2], border.z);
    assert.ok(Math.abs(original[0]) < border.width / 2);
  }
  const wide = arenaBaseCameraPose(16 / 9), portrait = arenaBaseCameraPose(9 / 16);
  assert.deepEqual(wide.target, [0, 0, 0]); assert.equal(wide.position[1], 15.2);
  assert.ok(portrait.position[1] > wide.position[1]);
});

test('all actual bottle silhouettes fit the rack camera on portrait, landscape and ultrawide screens', () => {
  const inventory = { frost: 1, flame: 1, echo: 1, healing: 1 }, point = new Vector3();
  for (const model of POTION_MODELS) {
    const parts = createPotionGeometry(model);
    try {
      for (const aspect of [9 / 21, 9 / 16, 16 / 9, 21 / 9, 32 / 9]) {
        const pose = arenaBaseCameraPose(aspect), camera = new PerspectiveCamera(50, aspect, .1, 1000);
        camera.position.fromArray(pose.position); camera.lookAt(new Vector3(...pose.target)); camera.updateMatrixWorld(true);
        for (const id of Object.keys(inventory)) {
          const feet = new Vector3(...potionRackPosition(id, inventory));
          for (const geometry of Object.values(parts)) {
            const positions = geometry.getAttribute('position');
            for (let index = 0; index < positions.count; index++) {
              point.fromBufferAttribute(positions, index).add(feet).project(camera);
              assert.ok(Math.abs(point.x) < .95 && Math.abs(point.y) < .95 && point.z > -1 && point.z < 1,
                `${model} at ${id} rack slot clips the view at aspect ${aspect}`);
            }
          }
        }
      }
    } finally { Object.values(parts).forEach(geometry => geometry.dispose()); }
  }
});

test('rotating bottle geometry clears the front rim and tabletop for the complete flight from every slot', () => {
  const inventory = { frost: 1, flame: 1, echo: 1, healing: 1 }, border = arenaFrontBorder();
  const matrix = new Matrix4(), point = new Vector3();
  const pose = { position: [0, 0, 0], rotation: [0, 0, 0] };
  for (const model of POTION_MODELS) {
    const parts = createPotionGeometry(model);
    try {
      for (const id of Object.keys(inventory)) {
        const flight = { startedAt: 0, duration: config.visuals.potionFlightSeconds, arcHeight: config.visuals.potionArcHeight,
          from: potionRackPosition(id, inventory), to: [...config.visuals.potionLanding] };
        for (let sample = 0; sample <= 110; sample++) {
          writePotionFlightPose(flight, sample / 110 * flight.duration, pose);
          matrix.makeRotationFromEuler(new Euler(...pose.rotation));
          matrix.setPosition(pose.position[0], pose.position[1] + POTION_MODEL_HEIGHT / 2, pose.position[2]);
          for (const geometry of Object.values(parts)) {
            const positions = geometry.getAttribute('position');
            for (let index = 0; index < positions.count; index++) {
              point.fromBufferAttribute(positions, index); point.y -= POTION_MODEL_HEIGHT / 2;
              point.applyMatrix4(matrix);
              assert.ok(point.y >= .01 - 1e-6, `${model} intersects the tabletop during flight from ${id}`);
              if (Math.abs(point.x) <= border.width / 2 && Math.abs(point.z - border.z) <= border.depth / 2) {
                assert.ok(point.y >= border.top - 1e-6, `${model} intersects the front rim during flight from ${id}`);
              }
            }
          }
        }
      }
    } finally { Object.values(parts).forEach(geometry => geometry.dispose()); }
  }
});
