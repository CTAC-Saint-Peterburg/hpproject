import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';
import { shopItems } from '../src/static/themedConfigs.js';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) => {
  if (!specifier.startsWith('.')) return statement;
  return 'from ' + JSON.stringify(new URL(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', base).href);
});
const { defenseState, config } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function fixture(wandId = 'wand_default', options = {}) {
  let random = () => .99, calls = 0;
  const crystalId = options.crystalId ?? 'crystal_default';
  const profile = {
    stones: 0, mageCards: {},
    ownedItems: ['wand_default', 'pot_default', 'crystal_default', wandId, crystalId],
    equippedItems: { wand: wandId, crystal: crystalId },
    consumeEntryPotions: () => true,
    changeStones(amount) { this.stones += amount; },
    awardMageCard(id) { this.mageCards[id] = (this.mageCards[id] || 0) + 1; },
  };
  if (Object.hasOwn(options, 'ownedItems')) profile.ownedItems = options.ownedItems;
  if (Object.hasOwn(options, 'equippedItems')) profile.equippedItems = options.equippedItems;
  const store = createStore(defenseState(() => profile, () => { calls++; return random(); }));
  const s = () => store.getState();
  assert.equal(s().start(['frost', 'flame', 'echo']), true);
  store.setState({ enemies: [], queue: [], projectiles: [], hp: 1000, time: 1 });
  const make = (type = 'fire', overrides = {}) => {
    const enemy = s().createEnemy(type);
    assert.ok(enemy); store.setState({ serial: s().serial + 1 });
    return { ...enemy, x: 2, y: 0, z: 0, size: .6, hp: 200, maxHp: 200,
      speed: 0, rageAt: 1e9, rageUntil: 0, motion: 'walk', ...overrides };
  };
  const install = enemies => store.setState({ enemies, selected: enemies[0]?.id ?? null });
  const step = seconds => { for (let index = 0; index < Math.ceil(seconds / .05); index++) s().tick(s().lastTick + 50); };
  const setRandom = value => { calls = 0; random = typeof value === 'function' ? value : () => value; };
  return { store, s, profile, make, install, step, setRandom, calls: () => calls };
}

test('force wands add their configured bonus only to matching hits; criticals multiply the full boosted hit', () => {
  for (const [id, bonus] of [['wand_force_minor', 4], ['wand_force_medium', 9], ['wand_force_major', 16]]) {
    const f = fixture(id), enemy = f.make(); f.install([enemy]);
    assert.equal(shopItems.find(item => item.id === id).effects.damageBonus, bonus);
    assert.equal(f.s().cast(1), false); assert.equal(f.s().enemies[0].hp, 200);
    f.step(.5); assert.equal(f.s().cast(2), true);
    assert.equal(f.s().enemies[0].hp, 200 - config.player.damage - bonus);
    const critical = fixture(id), victim = critical.make(); critical.install([victim]); critical.setRandom(0);
    assert.equal(critical.s().cast(2), true);
    assert.ok(Math.abs(critical.s().enemies[0].hp - (200 - (config.player.damage + bonus) * config.player.criticalMultiplier)) < 1e-9);
  }
});

test('owned gear must be selected; missing, unowned, malformed and wrong-type selections fall back safely', () => {
  const unownedSkin = shopItems.find(item => item.type === 'crystal' && !item.default).id;
  for (const options of [
    { ownedItems: ['wand_default', 'wand_force_major'], equippedItems: { wand: 'wand_default' } },
    { ownedItems: ['wand_default'], equippedItems: { wand: 'wand_force_major' } },
    { ownedItems: ['wand_default', 'pot_jade'], equippedItems: { wand: 'pot_jade' } },
    { ownedItems: [], equippedItems: { wand: 'missing' } },
    { ownedItems: null, equippedItems: { wand: 'wand_force_major' } },
    { ownedItems: {}, equippedItems: { wand: 'wand_force_major' } },
    { ownedItems: 'wand_force_major', equippedItems: { wand: 'wand_force_major' } },
    { equippedItems: null },
    { ownedItems: ['wand_default'], equippedItems: { wand: 'wand_default', crystal: unownedSkin } },
    { ownedItems: ['wand_default'], equippedItems: { wand: 'wand_default', crystal: 'wand_default' } },
  ]) {
    const f = fixture('wand_default', options), enemy = f.make(); f.install([enemy]);
    assert.equal(f.s().wandId, 'wand_default'); assert.equal(f.s().crystalSkinId, 'crystal_default');
    assert.equal(f.s().cast(2), true); assert.equal(f.s().enemies[0].hp, 200 - config.player.damage);
  }
});

test('wand and crystal skin are snapshots for one run and refresh only on the next start', () => {
  const skin = shopItems.find(item => item.type === 'crystal' && !item.default);
  assert.ok(skin);
  const f = fixture('wand_force_major', { crystalId: skin.id });
  assert.equal(f.s().wandId, 'wand_force_major'); assert.equal(f.s().crystalSkinId, skin.id);
  f.profile.ownedItems.push('wand_noob');
  f.profile.equippedItems = { wand: 'wand_noob', crystal: 'crystal_default' };
  const enemy = f.make(); f.install([enemy]);
  assert.equal(f.s().cast(1), false); f.step(.5); assert.equal(f.s().cast(2), true);
  assert.equal(f.s().enemies[0].hp, 200 - config.player.damage - 16);
  assert.equal(f.s().wandId, 'wand_force_major'); assert.equal(f.s().crystalSkinId, skin.id);
  f.s().exit(); assert.equal(f.s().start(['frost', 'flame', 'echo']), true);
  assert.equal(f.s().wandId, 'wand_noob'); assert.equal(f.s().crystalSkinId, 'crystal_default');
});

test('execution chance is checked on correct direct hits at the configured threshold and rewards only once', () => {
  assert.equal(shopItems.find(item => item.id === 'wand_execution').effects.instantKillChance, .08);
  for (const value of [.079, .08, .99]) {
    const f = fixture('wand_execution'), enemy = f.make(); f.install([enemy]); f.setRandom(value);
    assert.equal(f.s().cast(2), true);
    if (value < .08) {
      assert.equal(f.s().enemies.length, 0); assert.equal(f.profile.stones, 0);
      assert.equal(f.s().pendingStones, config.enemies.fire.reward + config.waves[0].stonesReward);
      assert.equal(f.s().rewardSerial, 1); f.step(.5);
      assert.equal(f.profile.stones, 0); assert.equal(f.s().pendingStones, config.enemies.fire.reward + config.waves[0].stonesReward); assert.equal(f.s().rewardSerial, 1);
    } else {
      assert.equal(f.s().enemies[0].hp, 200 - config.player.damage); assert.equal(f.profile.stones, 0);
    }
  }
});

test('execution does not roll on wrong gestures, paused or invalid casts, missing selections or burn ticks', () => {
  for (const mode of ['wrong', 'paused', 'invalid-zero', 'invalid-eleven', 'unselected', 'burn']) {
    const f = fixture('wand_execution'), enemy = f.make(); f.install([enemy]); f.setRandom(0);
    if (mode === 'paused') f.s().setPaused(true);
    if (mode === 'unselected') f.store.setState({ selected: null });
    if (mode === 'burn') {
      f.store.setState({ enemies: [{ ...enemy, burnUntil: 100, burnDps: 1 }] }); f.step(.05);
      assert.equal(f.s().enemies.length, 1); assert.ok(f.s().enemies[0].hp > 199.9);
    } else {
      const spell = mode === 'wrong' ? 1 : mode === 'invalid-zero' ? 0 : mode === 'invalid-eleven' ? 11 : 2;
      assert.equal(f.s().cast(spell), false); assert.equal(f.s().enemies[0].hp, 200);
    }
    assert.equal(f.calls(), 0); assert.equal(f.profile.stones, 0);
  }
});

test('execution rolls independently across echo targets and still splits a giant into two unpaid children', () => {
  let partial = 0;
  for (let run = 1; run <= 32; run++) {
    const f = fixture('wand_execution');
    const enemies = ['fire', 'frost', 'moss'].map((type, index) => f.make(type, { x: 2 + index * .3 }));
    f.install(enemies); f.store.setState({ buffs: { multicast: 100 } });
    let seed = run;
    f.setRandom(() => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; });
    assert.equal(f.s().cast(2), true);
    const dead = enemies.filter(enemy => !f.s().enemies.some(alive => alive.id === enemy.id));
    if (dead.length > 0 && dead.length < 3) partial++;
    assert.equal(f.profile.stones, 0);
    assert.equal(f.s().pendingStones, dead.reduce((sum, enemy) => sum + config.enemies[enemy.type].reward, 0) + (dead.length===enemies.length?config.waves[0].stonesReward:0));
    assert.equal(f.s().rewardSerial, dead.length);
  }
  assert.ok(partial > 0, 'echo must allow a kill on one target without executing every target');
  const f = fixture('wand_execution'), giant = f.make('giant'); f.install([giant]); f.setRandom(.079);
  assert.equal(f.s().cast(2), true); assert.equal(f.s().enemies.length, 2);
  assert.ok(f.s().enemies.every(enemy => enemy.type === 'fire' && enemy.hp > 0));
  assert.equal(new Set(f.s().enemies.map(enemy => enemy.id)).size, 2);
  assert.equal(f.profile.stones, 0); assert.equal(f.s().pendingStones, config.enemies.giant.reward); assert.equal(f.s().rewardSerial, 1);
  f.step(.1); assert.equal(f.profile.stones, 0); assert.equal(f.s().pendingStones, config.enemies.giant.reward);
});

test('splash hits every nearby element once at half damage using full 3D distance, after a matching primary hit', () => {
  const f = fixture('wand_splash');
  const enemies = [f.make('fire'), f.make('frost', { x: 3 }), f.make('frost', { x: 4.2 }),
    f.make('frost', { x: 4.21 }), f.make('frost', { x: 2, y: 2.3 })];
  f.install(enemies); assert.equal(f.s().cast(2), true);
  assert.deepEqual(f.s().enemies.map(enemy => enemy.hp), [176, 188, 188, 200, 200]);
  assert.equal(f.s().fx.splashRadius, 2.2);
  const wrong = fixture('wand_splash'); wrong.install([wrong.make('fire'), wrong.make('frost', { x: 3 })]);
  assert.equal(wrong.s().cast(1), false); assert.deepEqual(wrong.s().enemies.map(enemy => enemy.hp), [200, 200]);
});

test('echo and splash form a union without double damage, and bonus damage also scales splash correctly', () => {
  const f = fixture('wand_splash');
  f.install([f.make('fire'), f.make('frost', { x: 2.3 }), f.make('moss', { x: 2.6 }),
    f.make('frost', { x: 3.5 }), f.make('frost', { x: 6 })]);
  f.store.setState({ buffs: { multicast: 100 } }); assert.equal(f.s().cast(2), true);
  assert.deepEqual(f.s().enemies.map(enemy => enemy.hp), [176, 176, 176, 188, 200]);
  const item = shopItems.find(entry => entry.id === 'wand_splash'), original = item.effects;
  item.effects = { ...original, damageBonus: 9 };
  try {
    const boosted = fixture('wand_splash'); boosted.install([boosted.make('fire'), boosted.make('frost', { x: 3 })]);
    assert.equal(boosted.s().cast(2), true);
    assert.deepEqual(boosted.s().enemies.map(enemy => enemy.hp), [167, 183.5]);
  } finally { item.effects = original; }
});

test('noob wand turns every valid enemy gesture into its counterspell, including echo companions', () => {
  for (let spell = 1; spell <= 10; spell++) {
    const f = fixture('wand_noob'), enemy = f.make(); f.install([enemy]);
    assert.equal(f.s().cast(spell), true); assert.equal(f.s().enemies[0].hp, 176); assert.equal(f.s().fx.spellId, 2);
    assert.equal(f.s().cast(spell), false); assert.equal(f.s().enemies[0].hp, 176);
  }
  const f = fixture('wand_noob');
  f.install(['fire', 'frost', 'moss'].map((type, index) => f.make(type, { x: 2 + index * .3 })));
  f.store.setState({ buffs: { multicast: 100 } }); assert.equal(f.s().cast(9), true);
  assert.deepEqual(f.s().enemies.map(enemy => enemy.hp), [176, 176, 176]); assert.equal(f.s().fx.spellId, 2);
});

test('noob wand counters slow projectiles and crystal effects but cannot select or destroy an uninterruptible shot', () => {
  const f = fixture('wand_noob'), enemy = f.make(); f.install([enemy]);
  f.store.setState({ projectiles: [{ id: 'slow', interceptable: true, counterSpell: 1, x: 4, y: 1, z: 0 }] });
  f.s().select('slow'); assert.equal(f.s().cast(7), true); assert.deepEqual(f.s().projectiles, []);
  assert.equal(f.s().fx.spellId, 1); assert.equal(f.profile.stones, 0);
  for (const kinds of [['burn'], ['freeze'], ['burn', 'freeze']]) {
    const cleanse = fixture('wand_noob');
    cleanse.store.setState({ selected: 'crystal', crystalEffects: Object.fromEntries(kinds.map(kind => [kind, { until: 100, dps: 1 }])) });
    assert.equal(cleanse.s().cast(9), true); assert.deepEqual(cleanse.s().crystalEffects, {});
    assert.equal(cleanse.s().fx.spellId, kinds.includes('burn') ? 2 : 1);
  }
  const fast = fixture('wand_noob'); fast.install([fast.make()]);
  fast.store.setState({ selected: null, projectiles: [{ id: 'fast', interceptable: false, counterSpell: 2, x: 4, y: 1, z: 0 }] });
  fast.s().select('fast'); assert.equal(fast.s().selected, null); assert.equal(fast.s().cast(9), false);
  assert.equal(fast.s().projectiles.length, 1); assert.equal(fast.profile.stones, 0);
});

test('noob wand keeps invalid, pause, selection, potion consumption and coin rules strict', () => {
  const f = fixture('wand_noob');
  assert.equal(f.s().cast(5), false);
  f.s().usePotion('frost'); assert.equal(f.s().cast(0), false); assert.equal(f.s().cast(11), false);
  f.s().setPaused(true); assert.equal(f.s().cast(8), false); assert.equal(f.s().inventory.frost, 1);
  f.s().setPaused(false); assert.equal(f.s().cast(8), true);
  assert.equal(f.s().fx.spellId, 3); assert.equal(f.s().inventory.frost, 0); assert.equal(f.s().potionFlight.potionId, 'frost');
  assert.equal(f.s().cast(8), false); assert.equal(f.s().inventory.frost, 0); assert.deepEqual(f.s().buffs, {});
  const heal = fixture('wand_noob');
  heal.store.setState({ hp: config.crystal.maxHp, inventory: { ...heal.s().inventory, healing: 1 } });
  heal.s().usePotion('healing'); assert.equal(heal.s().cast(9), false); assert.equal(heal.s().inventory.healing, 1);
  const coin = fixture('wand_noob'); coin.store.setState({ phase: 'clear', pendingStones: 100 }); coin.s().select('coin');
  assert.equal(coin.s().cast(7), true); assert.equal(coin.s().coinResult, false); assert.equal(coin.s().pendingStones, 100);
  assert.equal(coin.s().fx.spellId, 7);
});
