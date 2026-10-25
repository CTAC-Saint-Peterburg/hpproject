import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const config = JSON.parse(read('src/static/spellEffects.json'));
const source = read('src/modules/Wand/effectSettings.js').replace(/import settings from .*?;/, 'const settings = ' + JSON.stringify(config) + ';');
const { spellEffect, advanceParticle } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('ten distinct spell colors and complete, bounded effect profiles', () => {
  assert.equal(Object.keys(config.spells).length, 10);
  assert.equal(new Set(Object.values(config.spells).map(profile => profile.color)).size, 10);
  assert.ok(config.capacity >= config.maxBurstParticles);
  for (let id = 1; id <= 10; id++) {
    const profile = spellEffect(id);
    for (const kind of ['trail', 'burst']) {
      for (const key of ['speed', 'size', 'lifetime', 'spread', 'gravity', 'swirl']) {
        assert.ok(Number.isFinite(profile[kind][key]) && profile[kind][key] >= 0, id + ': ' + kind + '.' + key);
      }
      assert.match(profile[kind].color, /^#[0-9a-f]{6}$/i);
      assert.ok(['burst', 'fountain', 'drift', 'spiral'].includes(profile[kind].motion));
    }
    assert.ok(profile.flash.duration > 0 && profile.flash.intensity > 0);
    assert.ok(profile.burst.count <= config.maxBurstParticles);
  }
  assert.equal(spellEffect(null).trail.color, config.trail.color);
  assert.equal(spellEffect(1).trail.emitRate, config.trail.emitRate);
});

test('particle movement uses seconds and spiral preserves horizontal speed', () => {
  const create = () => ({ position: [0,0,0], velocity: [2,1,0], age:0, gravity:0, swirl:4, motion:'drift' });
  const slow = create(), fast = create();
  for (let i=0; i<30; i++) advanceParticle(slow, 1/30);
  for (let i=0; i<120; i++) advanceParticle(fast, 1/120);
  for (let axis=0; axis<3; axis++) assert.ok(Math.abs(slow.position[axis] - fast.position[axis]) < 1e-8);
  const spiral = {...create(), motion:'spiral'};
  advanceParticle(spiral, .25);
  assert.ok(Math.abs(Math.hypot(spiral.velocity[0], spiral.velocity[2]) - 2) < 1e-8);
  assert.notEqual(spiral.velocity[2], 0);
});
