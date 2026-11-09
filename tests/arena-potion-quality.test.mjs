import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { potionEffect } from '../src/modules/Defense/potionEffects.js';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) => {
  if (!specifier.startsWith('.')) return statement;
  return 'from ' + JSON.stringify(new URL(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', base).href);
});
const { defenseState, config, potionTypes } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const potion = id => potionTypes.find(item => item.id === id);

function fixture(quality = 'basic', first = 'frost', options = {}) {
  const ids = options.ids ?? [first, ...potionTypes.map(item => item.id).filter(id => id !== first)].slice(0, 3);
  const qualities = Object.fromEntries(ids.map(id => [id, quality]));
  const profile = {
    ownedItems: options.ownedItems ?? [],
    consumeEntryPotions: () => options.legacy ? true : { qualities },
    changeStones() {}, awardMageCard() {},
  };
  const store = createStore(defenseState(() => profile, () => .99)), s = () => store.getState();
  assert.equal(s().start(ids), true);
  store.setState({ time: 1, enemies: [], queue: [], projectiles: [] });
  const make = (type = 'fire', overrides = {}) => {
    const enemy = s().createEnemy(type);
    store.setState({ serial: s().serial + 1 });
    return { ...enemy, x: 7, z: -4, hp: 1000, maxHp: 1000, speed: 0,
      rageAt: 1e9, rageUntil: 0, nextRangedAt: 1e9, ...overrides };
  };
  store.setState({ enemies: [make()] });
  const advanceTo = target => {
    let steps = 0;
    while (s().time < target - 1e-7 && !['idle', 'lost', 'won'].includes(s().phase)) {
      assert.ok(steps++ < 10000);
      s().tick(s().lastTick + Math.min(50, Math.max(1, Math.ceil((target - s().time) * 1000))));
    }
  };
  const launch = id => {
    assert.equal(s().usePotion(id), true); assert.equal(s().cast(3), true);
    return s().potionFlight;
  };
  const land = id => {
    const flight = launch(id);
    advanceTo(flight.startedAt + flight.duration + .001);
    return flight;
  };
  return { store, s, ids, profile, qualities, make, launch, land, advanceTo };
}

test('entry quality is snapshotted into every upgraded copy and into the launched bottle', () => {
  const f = fixture('fine', 'frost', { ids: ['frost', 'flame', 'echo', 'healing'],
    ownedItems: ['upgrade_potion_slot', 'upgrade_potion_copies_2', 'upgrade_potion_copies_3'] });
  assert.deepEqual(f.s().inventory, { frost: 3, flame: 3, echo: 3, healing: 3 });
  assert.deepEqual(f.s().potionQualities, { frost: 'fine', flame: 'fine', echo: 'fine', healing: 'fine' });
  f.qualities.frost = 'basic';
  assert.equal(f.s().potionQualities.frost, 'fine', 'profile changes must not change the already started run');
  const flight = f.launch('frost');
  assert.equal(flight.quality, 'fine'); assert.equal(f.s().inventory.frost, 2);
  f.advanceTo(flight.startedAt + flight.duration + .001);
  assert.equal(f.s().buffEffects.freeze.quality, 'fine');
  const legacy = fixture('masterwork', 'frost', { legacy: true });
  assert.equal(legacy.s().potionQualities.frost, 'basic');
  assert.equal(legacy.launch('frost').quality, 'basic');
});

test('quality healing applies only on landing, uses current crystal health and respects the cap', () => {
  for (const quality of ['basic', 'fine', 'masterwork']) {
    const f = fixture(quality, 'healing');
    f.store.setState({ hp: 80 });
    const flight = f.launch('healing');
    f.advanceTo(flight.startedAt + flight.duration - .005);
    assert.equal(f.s().hp, 80);
    f.store.setState({ hp: 10 });
    f.advanceTo(flight.startedAt + flight.duration + .001);
    assert.equal(f.s().hp, 10 + potionEffect(potion('healing'), quality).heal);
    f.advanceTo(f.s().time + .1);
    assert.equal(f.s().hp, 10 + potionEffect(potion('healing'), quality).heal, 'landing cannot heal twice');
    const cap = fixture(quality, 'healing'); cap.store.setState({ hp: 90 }); cap.land('healing');
    assert.equal(cap.s().hp, config.crystal.maxHp);
  }
});

test('frost and fire land on all current enemies and retain stronger quality enchantments for future targets', () => {
  for (const id of ['frost', 'flame']) for (const quality of ['fine', 'masterwork']) {
    const f = fixture(quality, id), effect = potionEffect(potion(id), quality);
    f.store.setState({ enemies: Object.keys(config.enemies).map(type => f.make(type)) });
    const flight = f.launch(id);
    f.advanceTo(flight.startedAt + flight.duration - .005);
    assert.ok(f.s().enemies.every(enemy => enemy.frozenUntil === 0 && enemy.burnUntil === 0));
    f.advanceTo(flight.startedAt + flight.duration + .001);
    assert.equal(f.s().buffEffects[effect.effect].quality, quality);
    assert.ok(Math.abs(f.s().buffs[effect.effect] - f.s().time - effect.duration) < .002);
    if (id === 'frost') {
      assert.ok(f.s().enemies.every(enemy => Math.abs(enemy.frozenUntil - f.s().time - effect.impactDuration) < .002));
      const positions = f.s().enemies.map(enemy => [enemy.x, enemy.y, enemy.z]);
      f.advanceTo(f.s().time + .2);
      assert.deepEqual(f.s().enemies.map(enemy => [enemy.x, enemy.y, enemy.z]), positions);
    } else {
      assert.ok(f.s().enemies.every(enemy => enemy.burnDps === effect.dps));
      assert.ok(f.s().enemies.every(enemy => Math.abs(enemy.burnUntil - f.s().time - effect.impactDuration) < .002));
      const health = f.s().enemies.map(enemy => enemy.hp);
      f.advanceTo(f.s().time + .2);
      assert.ok(f.s().enemies.every((enemy, index) => enemy.hp < health[index]));
    }
    const fresh = f.make('fire');
    f.store.setState({ enemies: [...f.s().enemies, fresh] });
    assert.equal(fresh.frozenUntil, 0); assert.equal(fresh.burnUntil, 0);
    f.s().select(fresh.id); assert.equal(f.s().cast(2), true);
    const hit = f.s().enemies.find(enemy => enemy.id === fresh.id);
    if (id === 'frost') assert.ok(Math.abs(hit.frozenUntil - f.s().time - effect.onHitDuration) < 1e-8);
    else {
      assert.equal(hit.burnDps, effect.dps);
      assert.ok(Math.abs(hit.burnUntil - f.s().time - effect.onHitDuration) < 1e-8);
    }
    const expires = f.s().buffs[effect.effect];
    f.advanceTo(expires + .05);
    const after = f.make('fire'); f.store.setState({ enemies: [after] });
    f.s().select(after.id); assert.equal(f.s().cast(2), true);
    assert.equal(f.s().enemies[0].frozenUntil, 0); assert.equal(f.s().enemies[0].burnUntil, 0);
  }
});

test('echo quality expands duration, chain radius and number of actual damaged targets', () => {
  for (const quality of ['basic', 'fine', 'masterwork']) {
    const f = fixture(quality, 'echo'), effect = potionEffect(potion('echo'), quality);
    f.land('echo');
    assert.equal(f.s().buffEffects.multicast.targets, effect.targets);
    assert.equal(f.s().buffEffects.multicast.chainRadius, effect.chainRadius);
    assert.ok(Math.abs(f.s().buffs.multicast - f.s().time - effect.duration) < .002);
    const enemies = [0, 1, 2, 3, 7.5, 9.5].map(x => f.make('moss', { x, z: 0 }));
    f.store.setState({ enemies });
    f.s().select(enemies[0].id);
    assert.equal(f.s().cast(7), true, 'Echo adds the moss counterspell to a normally incorrect non-utility gesture');
    const damaged = f.s().enemies.filter(enemy => enemy.hp < 1000);
    assert.equal(damaged.length, effect.targets);
    assert.equal(f.s().enemies.find(enemy => enemy.id === enemies[5].id).hp, 1000);
    assert.equal(f.s().enemies.find(enemy => enemy.id === enemies[4].id).hp < 1000, quality === 'masterwork');
    f.advanceTo(f.s().buffs.multicast + .05);
    f.store.setState({ enemies: f.s().enemies.map(enemy => ({ ...enemy, hp: 1000 })) });
    f.s().select(enemies[0].id); assert.equal(f.s().cast(6), true);
    assert.equal(f.s().enemies.filter(enemy => enemy.hp < 1000).length, 1);
  }
});
