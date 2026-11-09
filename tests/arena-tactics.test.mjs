import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createStore } from 'zustand/vanilla';

const base = new URL('../src/modules/Defense/defenseState.js', import.meta.url);
const source = readFileSync(base, 'utf8').replace(/from '([^']+)'/g, (statement, specifier) =>
  specifier.startsWith('.') ? 'from ' + JSON.stringify(new URL(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', base).href) : statement);
const { defenseState, config } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function fixture(wand = 'wand_default') {
  let randomValue = .99;
  const profile = { stones: 0, mageCards: {}, ownedItems: [wand], equippedItems: { wand },
    consumeEntryPotions: () => true,
    changeStones(amount) { this.stones += amount; },
    awardMageCard(id) { this.mageCards[id] = (this.mageCards[id] ?? 0) + 1; } };
  const store = createStore(defenseState(() => profile, () => randomValue));
  const s = () => store.getState();
  assert.equal(s().start(['frost', 'flame', 'echo']), true);
  store.setState({ enemies: [], queue: [], projectiles: [], time: 1 });
  const make = (type = 'fire', props = {}) => {
    const enemy = s().createEnemy(type);
    assert.ok(enemy);
    store.setState({ serial: s().serial + 1 });
    return { ...enemy, x: 6, z: 0, y: 0, hp: 100, maxHp: 100,
      speed: 0, rageAt: 1e8, rageUntil: 0, nextAttack: 1e8, ...props };
  };
  const install = enemies => store.setState({ enemies, selected: enemies[0]?.id ?? null });
  const step = seconds => {
    for (let index = 0; index < Math.ceil(seconds / .05); index++) s().tick(s().lastTick + 50);
  };
  const advanceTo = target => {
    let count = 0;
    while (s().time < target - 1e-8 && !['won', 'lost', 'idle'].includes(s().phase)) {
      assert.ok(count++ < 10000);
      s().tick(s().lastTick + Math.min(50, Math.max(1, Math.ceil((target - s().time) * 1000))));
    }
  };
  return { store, s, profile, make, install, step, advanceTo, random: value => { randomValue = value; } };
}

test('ordinary cubes lift and drop without damage, even with echo and automatic-counter wands', () => {
  for (const wand of ['wand_default', 'wand_noob']) for (const type of ['fire', 'frost', 'sentinel']) {
    const f = fixture(wand), enemy = f.make(type, { x: 1.4, motion: 'walk', rageUntil: 10, nextAttack: 1.05,
      nextRangedAt: 1.05, windupUntil: type === 'sentinel' ? 1.05 : 0 });
    f.install([enemy]); f.store.setState({ buffs: { multicast: 100 } });
    assert.equal(f.s().cast(config.enemyCarry.liftSpell), true);
    assert.equal(f.s().carriedEnemyId, enemy.id);
    assert.equal(f.s().enemies[0].carried, true);
    assert.equal(f.s().enemies[0].hp, enemy.hp, 'a utility cast must not turn into an attack');
    f.step(.25);
    assert.ok(Math.abs(f.s().enemies[0].y - config.enemyCarry.height) < 1e-8);
    assert.equal(f.s().hp, config.crystal.maxHp);
    f.s().moveCarriedEnemy(100, -100);
    const held = f.s().enemies[0], margin = held.size * .7 + .1;
    assert.ok(Math.abs(held.x) <= config.field.width / 2 - margin + 1e-9);
    assert.ok(Math.abs(held.z) <= config.field.depth / 2 - margin + 1e-9);
    f.s().moveCarriedEnemy(0, 0);
    f.step(.2); f.s().select('crystal');
    assert.equal(f.s().cast(config.enemyCarry.dropSpell), true, 'drop remains available after selecting another object');
    assert.equal(f.s().carriedEnemyId, null);
    assert.equal(f.s().enemies[0].carried, false);
    assert.ok(Math.hypot(f.s().enemies[0].x, f.s().enemies[0].z) >= config.crystal.attackRange + config.enemyCarry.crystalClearance - 1e-9);
    f.advanceTo(f.s().enemies[0].droppingUntil + .001);
    assert.equal(f.s().enemies[0].hp, enemy.hp);
    assert.equal(f.s().enemies[0].droppingUntil, 0);
    assert.ok(Math.abs(f.s().enemies[0].y) < .05, 'only the ordinary ground idle motion can resume after landing');
  }
});

test('large, flying and slime enemies cannot be lifted, and an existing carried cube must be dropped first', () => {
  for (const type of ['giant', 'flyerFire', 'flyerFrost', 'moss']) {
    const f = fixture('wand_noob'), enemy = f.make(type);
    f.install([enemy]); f.store.setState({ buffs: { multicast: 100 } });
    assert.equal(f.s().cast(config.enemyCarry.liftSpell), false);
    assert.equal(f.s().carriedEnemyId, null);
    assert.equal(f.s().enemies[0].hp, enemy.hp);
  }
  const f = fixture(), first = f.make('fire'), second = f.make('frost');
  f.install([first, second]); f.s().cast(3); f.step(.45); f.s().select(second.id);
  assert.equal(f.s().cast(3), false);
  assert.equal(f.s().carriedEnemyId, first.id);
  assert.equal(f.s().enemies.filter(enemy => enemy.carried).length, 1);
});

test('carry obeys pause, keeps damage-over-time active and clears stale targets on death or reset', () => {
  const f = fixture(), enemy = f.make('fire');
  f.install([enemy]); f.s().cast(3); f.step(.2);
  f.s().setPaused(true);
  const frozen = { ...f.s().enemies[0] }, time = f.s().time;
  f.s().moveCarriedEnemy(0, 0); assert.equal(f.s().cast(4), false); f.step(2);
  assert.deepEqual(f.s().enemies[0], frozen); assert.equal(f.s().time, time);
  f.s().setPaused(false);
  f.store.setState({ enemies: [{ ...f.s().enemies[0], hp: 1, burnDps: 100, burnUntil: time + 10 }] });
  f.step(.05);
  assert.equal(f.s().carriedEnemyId, null);
  assert.equal(f.s().enemies.length, 0);
  assert.equal(f.profile.stones, 0, 'a carried enemy still uses the temporary wave reward');
  for (const reset of ['wave', 'exit', 'loss']) {
    const other = fixture(), cube = other.make(); other.install([cube]); other.s().cast(3);
    if (reset === 'wave') other.s().debugWave(2);
    else if (reset === 'exit') other.s().exit();
    else { other.store.setState({ hp: 0 }); other.step(.05); }
    assert.equal(other.s().carriedEnemyId, null, reset);
  }
});

test('HP recovery follows the incoming wave setting, with the last two waves preserving damage and effects', () => {
  assert.deepEqual(config.waves.map(wave => wave.restoreCrystalHp), [true, true, true, true, true, true, true, true, false, false]);
  for (let nextWave = 1; nextWave < config.waves.length; nextWave++) {
    const f = fixture();
    const effects = { burn: { until: 1e8, dps: 1 } };
    f.store.setState({ phase: 'clear', wave: nextWave - 1, hp: 37, crystalEffects: effects, pendingStones: 25, waveSettled: false });
    f.s().next();
    assert.equal(f.s().wave, nextWave);
    assert.equal(f.s().hp, config.waves[nextWave].restoreCrystalHp ? config.crystal.maxHp : 37);
    assert.deepEqual(f.s().crystalEffects, config.waves[nextWave].restoreCrystalHp ? {} : effects);
    assert.equal(f.profile.stones, 25);
  }
  for (const nextWave of [1, 8, 9]) {
    const f = fixture(); f.random(.01);
    f.store.setState({ phase: 'clear', wave: nextWave - 1, hp: 37, pendingStones: 25, waveSettled: false });
    f.s().select('coin'); assert.equal(f.s().cast(5), true);
    f.advanceTo(f.s().coinEnd + .001);
    assert.equal(f.s().wave, nextWave);
    assert.equal(f.s().hp, config.waves[nextWave].restoreCrystalHp ? config.crystal.maxHp : 37);
    assert.equal(f.profile.stones, 50);
  }
});

test('circle disorients exactly the three nearest crystal threats without damage, with pause and cooldown guards', () => {
  for (const wand of ['wand_default', 'wand_noob']) {
    const f = fixture(wand);
    const enemies = [2.7, 1.2, 2, .8].map(x => f.make('fire', { x, hp: 100, rageUntil: 5 }));
    const carried = f.make('frost', { x: .1, carried: true, liftStartedAt: 1, liftFromY: 0 });
    const bomber = f.make('bomber', { x: .2, hp: 1 });
    f.install([...enemies, carried, bomber]); f.s().select('crystal');
    f.store.setState({ crystalEffects: { burn: { until: 100, dps: 1 } } });
    assert.equal(f.s().cast(config.crowdControl.spell), true);
    assert.equal(f.s().lastDisorient, 1);
    const affected = f.s().enemies.filter(enemy => enemy.disorientedUntil > 1);
    assert.deepEqual(affected.map(enemy => enemy.x).sort((a, b) => a - b), [.8, 1.2, 2]);
    for (const enemy of affected) { assert.equal(enemy.disorientedUntil, 1 + config.crowdControl.duration); assert.equal(enemy.hp, 100); assert.equal(enemy.rageUntil, 0); }
    assert.ok(f.s().crystalEffects.burn, 'explicit circle must not become a cleansing auto-counter');
    const hp = f.s().hp;
    f.s().setPaused(true); f.step(2); assert.equal(f.s().time, 1);
    assert.equal(f.s().cast(5), false);
    f.s().setPaused(false); f.step(.45);
    assert.equal(f.s().cast(5), false, 'global cast cooldown ending does not bypass the crowd cooldown');
    assert.ok(f.s().hp <= hp, 'existing crystal burn may continue while enemies are disoriented');
  }
  const f = fixture(); f.install([f.make('fire', { x: 1 }), f.make('frost', { x: 2 }), f.make('fire', { x: 8 })]);
  f.s().select('crystal'); assert.equal(f.s().cast(5), false);
  assert.ok(f.s().enemies.every(enemy => !(enemy.disorientedUntil > f.s().time)));
});

test('bomber spawns only for a dense hostile group and respects its one-at-a-time cooldown', () => {
  const f = fixture(); f.random(0);
  const enemies = Array.from({ length: config.bomberSpawn.threshold }, (_, index) => f.make('fire', { x: 6, z: index * .1 }));
  f.install(enemies.slice(1));
  assert.equal(f.s().trySpawnBomber(), false);
  f.install(enemies); f.store.setState({ nextBomberAt: 0 });
  assert.equal(f.s().trySpawnBomber(), true);
  assert.equal(f.s().enemies.filter(enemy => enemy.type === 'bomber').length, 1);
  assert.equal(f.s().nextBomberAt, f.s().time + config.bomberSpawn.cooldown);
  assert.equal(f.s().trySpawnBomber(), false);
  f.store.setState({ time: f.s().nextBomberAt + .1 });
  assert.equal(f.s().trySpawnBomber(), false, 'a live bomber prevents a second one');
  f.store.setState({ enemies, nextBomberAt: 0 }); f.s().setPaused(true);
  assert.equal(f.s().trySpawnBomber(), false);
  f.s().setPaused(false); f.s().exit();
  assert.equal(f.s().trySpawnBomber(), false);
});

test('any one recognized spell detonates the bomber against enemies only, never the crystal', () => {
  for (let spell = 1; spell <= 10; spell++) {
    const f = fixture('wand_noob');
    const bomber = f.make('bomber', { x: 0, z: 0, hp: 1, maxHp: 1 });
    const killed = f.make('fire', { x: 2, hp: 40 });
    const damaged = f.make('frost', { x: 3, hp: 150 });
    const outside = f.make('fire', { x: 8, hp: 40 });
    f.install([bomber, killed, damaged, outside]); f.store.setState({ hp: 43, buffs: { multicast: 100 } });
    assert.equal(f.s().cast(spell), true);
    assert.equal(f.s().hp, 43);
    assert.equal(f.s().enemies.some(enemy => enemy.id === bomber.id || enemy.id === killed.id), false);
    assert.equal(f.s().enemies.find(enemy => enemy.id === damaged.id).hp, 150 - config.enemies.bomber.explosion.damage);
    assert.equal(f.s().enemies.find(enemy => enemy.id === outside.id).hp, 40);
    assert.equal(f.s().pendingStones, config.enemies.fire.reward);
    assert.equal(f.profile.stones, 0);
    assert.equal(f.s().cast(spell), false, 'a spent bomber cannot award another multikill');
  }
});

test('bomber explosions retain giant splitting, and a harmless remaining bomber cannot hold a cleared wave open', () => {
  const f = fixture();
  const bomber = f.make('bomber', { x: 0, hp: 1, maxHp: 1 });
  const giant = f.make('giant', { x: 1, hp: 50 });
  f.install([bomber, giant]); assert.equal(f.s().cast(4), true);
  assert.equal(f.s().phase, 'wave');
  assert.equal(f.s().enemies.length, config.enemies.giant.split.count);
  assert.ok(f.s().enemies.every(enemy => enemy.type === config.enemies.giant.split.type));
  assert.equal(new Set(f.s().enemies.map(enemy => enemy.id)).size, f.s().enemies.length);
  assert.equal(f.s().pendingStones, config.enemies.giant.reward);
  assert.equal(f.profile.stones, 0);
  const solo = fixture(); solo.install([solo.make('bomber', { hp: 1 })]);
  solo.s().finishWave();
  assert.equal(solo.s().phase, 'clear'); assert.equal(solo.s().enemies.length, 0);
  assert.equal(solo.s().pendingStones, config.waves[0].stonesReward);
});
