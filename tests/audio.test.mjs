import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AudioManager } from '../src/modules/Audio/audioEngine.js';
import { soundAssetUrls } from '../src/modules/Audio/soundAssets.js';

const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class FakeParam {
  constructor(value = 1) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push({ type: 'set', value, time }); return this; }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push({ type: 'ramp', value, time }); return this; }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push({ type: 'target', value, time, constant }); return this; }
  cancelScheduledValues(time) { this.events.push({ type: 'cancel', time }); return this; }
  cancelAndHoldAtTime(time) { this.events.push({ type: 'hold', time }); return this; }
}
class FakeGain {
  constructor() { this.gain = new FakeParam(); this.connections = []; this.disconnected = false; }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnected = true; }
}
class FakeSource {
  constructor(context) {
    this.context = context; this.connections = []; this.starts = []; this.stops = [];
    this.loop = false; this.buffer = null; this.onended = null; this.ended = false; this.disconnected = false;
  }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnected = true; }
  start(time = 0) { assert.equal(this.starts.length, 0, 'a source may start only once'); assert.ok(this.buffer); this.starts.push(time); }
  stop(time = 0) { this.stops.push(time); if (time <= this.context.currentTime) this.end(); }
  end() { if (this.ended) return; this.ended = true; this.onended?.(); }
}
class FakeContext {
  constructor() { this.state = 'suspended'; this.currentTime = 10; this.destination = {}; this.gains = []; this.sources = []; this.decoded = []; this.resumes = 0; this.closes = 0; }
  createGain() { const gain = new FakeGain(); this.gains.push(gain); return gain; }
  createBufferSource() { const source = new FakeSource(this); this.sources.push(source); return source; }
  async decodeAudioData(bytes) { this.decoded.push(bytes); return { duration: 2, marker: new Uint8Array(bytes)[0] }; }
  async resume() { this.resumes++; this.state = 'running'; }
  async close() { this.closes++; this.state = 'closed'; for (const source of this.sources) source.end(); }
  advance(seconds) {
    this.currentTime += seconds;
    for (const source of this.sources) if (!source.ended && source.stops.some(time => time <= this.currentTime)) source.end();
  }
}

function fixture(options = {}) {
  const config = {
    master: { enabled: true, volume: .7 }, transition: { fadeOutSeconds: .08, maxEffects: 3 },
    sounds: [
      { name: 'Room', code: 'menu.ambient', file: 'ambient.ogg', value: .25, fadePrevious: false, loop: true },
      { name: 'First', code: 'spell.1', file: 'shared.ogg', value: .6, fadePrevious: true, loop: false },
      { name: 'Second', code: 'spell.2', file: 'shared.ogg', value: .4, fadePrevious: true, loop: false },
      { name: 'Slow', code: 'spell.3', file: 'slow.ogg', value: .8, fadePrevious: true, loop: false },
      { name: 'Click', code: 'ui.select', file: 'click.ogg', value: .3, fadePrevious: true, loop: false },
    ],
  };
  const assetUrls = Object.fromEntries(config.sounds.map(entry => [entry.file, '/sounds/' + entry.file]));
  const context = new FakeContext(), requests = [];
  let creations = 0;
  const bytes = marker => new Uint8Array([marker, 0, 0, 0]).buffer;
  const fetchAudio = options.fetchAudio ?? (async url => bytes(url.includes('ambient') ? 1 : url.includes('slow') ? 3 : url.includes('click') ? 4 : 2));
  const manager = new AudioManager({ config, assetUrls,
    createContext: () => { creations++; return options.createContext ? options.createContext(context) : context; },
    fetchAudio: url => { requests.push(url); return fetchAudio(url, bytes); },
  });
  const alive = () => context.sources.filter(source => !source.ended);
  return { manager, context, config, requests, alive, bytes, creations: () => creations };
}

test('a zero-volume configured cue stays silent without fetching or fading an audible effect', async () => {
  const f=fixture();
  f.config.sounds.find(entry=>entry.code==='ui.select').value=0;
  f.config.sounds.find(entry=>entry.code==='menu.ambient').value=0;
  await f.manager.unlock();
  assert.equal(await f.manager.play('spell.1'),true);
  const voice=f.alive()[0],requests=f.requests.length;
  assert.equal(await f.manager.play('ui.select'),false);
  f.manager.setAmbient(true);await flush();
  assert.equal(f.requests.length,requests);assert.deepEqual(voice.stops,[]);
  assert.equal(f.alive().length,1);
  await f.manager.dispose();
});

test('autoplay is lazy, pre-unlock effects are dropped, and concurrent unlocks share a context and one ambient loop', async () => {
  const f = fixture();
  f.manager.setAmbient(true);
  assert.equal(await f.manager.play('spell.1'), false); assert.equal(await f.manager.play('spell.2'), false);
  assert.equal(f.creations(), 0); assert.deepEqual(f.requests, []);
  assert.deepEqual(await Promise.all([f.manager.unlock(), f.manager.unlock()]), [true, true]); await flush();
  assert.equal(f.creations(), 1); assert.equal(f.context.sources.length, 1);
  assert.equal(f.context.sources[0].loop, true); assert.equal(f.context.sources[0].buffer.marker, 1);
  f.manager.setAmbient(true); await f.manager.unlock(); await flush();
  assert.equal(f.context.sources.length, 1, 'repeated unlock and mode notifications must not duplicate ambience');
  await f.manager.dispose();
});

test('files are loaded and decoded once across aliases; each new source starts at its own configured gain', async () => {
  const f = fixture(); await f.manager.unlock();
  assert.equal(await f.manager.play('spell.1'), true);
  const initialFirstGain = f.context.sources[0].connections[0].gain.value;
  assert.equal(await f.manager.play('spell.2'), true);
  assert.deepEqual(f.requests, ['/sounds/shared.ogg']); assert.equal(f.context.decoded.length, 1);
  assert.equal(f.context.sources[0].buffer, f.context.sources[1].buffer);
  assert.equal(initialFirstGain, .6); assert.equal(f.context.sources[1].connections[0].gain.value, .4);
  const master = f.context.gains.find(gain => gain.connections.includes(f.context.destination));
  assert.ok(master); assert.equal(f.context.sources[1].connections[0].connections[0], master);
  assert.equal(master.gain.value, .7);
  await f.manager.dispose();
});

test('a new effect fades only interruptible voices and schedules their stop after the fade, preserving ambient', async () => {
  const f = fixture(); await f.manager.unlock(); f.manager.setAmbient(true); await flush();
  assert.equal(await f.manager.play('spell.1'), true);
  const ambient = f.context.sources[0], first = f.context.sources[1], at = f.context.currentTime;
  assert.equal(await f.manager.play('spell.2'), true);
  const ramp = first.connections[0].gain.events.find(event => event.type === 'ramp' && event.value === 0);
  assert.ok(ramp); assert.ok(Math.abs(ramp.time - at - .08) < 1e-8);
  assert.equal(first.stops.length, 1); assert.ok(first.stops[0] >= ramp.time);
  assert.ok(first.stops[0] > at); assert.equal(first.ended, false); assert.deepEqual(ambient.stops, []);
  f.context.advance(.1);
  assert.equal(first.ended, true); assert.equal(first.disconnected, true); assert.equal(first.connections[0].disconnected, true);
  assert.equal(ambient.ended, false); await f.manager.dispose();
});

test('slow old effects never override a newer request and pending protected ambient remains independent', async () => {
  const slow = deferred(), ambient = deferred();
  const f = fixture({ fetchAudio: (url, bytes) => url.includes('slow') ? slow.promise : url.includes('ambient') ? ambient.promise : Promise.resolve(bytes(2)) });
  await f.manager.unlock(); f.manager.setAmbient(true); await flush();
  const old = f.manager.play('spell.3'); await flush();
  assert.equal(await f.manager.play('spell.1'), true);
  const latest = f.context.sources[0];
  slow.resolve(f.bytes(3)); assert.equal(await old, false); assert.equal(f.context.sources.length, 1); assert.deepEqual(latest.stops, []);
  ambient.resolve(f.bytes(1)); await flush();
  assert.equal(f.context.sources.length, 2); assert.equal(f.context.sources[1].loop, true);
  await f.manager.dispose();
});

test('master settings clamp independently, muted requests do not fetch, and re-enabling never replays dropped effects', async () => {
  const f = fixture(); await f.manager.unlock();
  f.manager.setSettings({ enabled: false, volume: .3 });
  assert.equal(await f.manager.play('spell.1'), false); assert.deepEqual(f.requests, []);
  const master = f.context.gains.find(gain => gain.connections.includes(f.context.destination));
  assert.equal(master.gain.value, 0);
  f.manager.setSettings({ enabled: true, volume: 0 });
  assert.equal(await f.manager.play('spell.1'), false); assert.deepEqual(f.requests, []);
  f.manager.setSettings({ enabled: true, volume: 9 }); assert.equal(master.gain.value, 1);
  assert.equal(await f.manager.play('spell.1'), true); assert.equal(f.context.sources.length, 1);
  assert.equal(f.context.sources[0].connections[0].gain.value, .6);
  f.manager.setSettings({ enabled: true, volume: -2 }); assert.equal(master.gain.value, 0);
  await f.manager.dispose();
});

test('pause cancels pending gameplay audio, permits UI clicks, and resumes ambience only while it remains desired', async () => {
  const slow = deferred();
  const f = fixture({ fetchAudio: (url, bytes) => url.includes('slow') ? slow.promise : Promise.resolve(bytes(url.includes('ambient') ? 1 : 4)) });
  await f.manager.unlock(); f.manager.setAmbient(true); await flush();
  const old = f.manager.play('spell.3'); await flush(); f.manager.setPaused(true);
  slow.resolve(f.bytes(3)); assert.equal(await old, false);
  assert.equal(await f.manager.play('spell.1'), false); assert.equal(await f.manager.play('ui.select'), true);
  f.context.advance(.1); assert.ok(f.alive().every(source => !source.loop));
  f.manager.setPaused(false); await flush(); assert.equal(f.alive().filter(source => source.loop).length, 1);
  f.manager.setPaused(true); f.manager.setAmbient(false); f.context.advance(.1);
  f.manager.setPaused(false); await flush(); assert.equal(f.alive().filter(source => source.loop).length, 0);
  await f.manager.dispose();
});

test('a bounded effects pool rejects excess rapid voices without abruptly cutting fade tails', async () => {
  const f = fixture(); await f.manager.unlock(); f.manager.setAmbient(true); await flush();
  for (let index = 0; index < 3; index++) assert.equal(await f.manager.play('spell.1'), true);
  assert.equal(await f.manager.play('spell.1'), false);
  assert.equal(f.alive().filter(source => !source.loop).length, 3); assert.equal(f.alive().filter(source => source.loop).length, 1);
  assert.ok(f.context.sources.every(source => source.stops.every(time => time > f.context.currentTime)));
  f.context.advance(.1); assert.equal(await f.manager.play('spell.2'), true);
  assert.ok(f.alive().filter(source => !source.loop).length <= 3);
  await f.manager.dispose();
});

test('muting and disposal invalidate slow loads; repeated cleanup closes once and leaves no connected sources', async () => {
  for (const mode of ['mute', 'dispose']) {
    const slow = deferred(), f = fixture({ fetchAudio: () => slow.promise }); await f.manager.unlock();
    const play = f.manager.play('spell.3'); await flush();
    if (mode === 'mute') f.manager.setSettings({ enabled: false, volume: .7 });
    else await f.manager.dispose();
    slow.resolve(f.bytes(3)); assert.equal(await play, false); assert.equal(f.context.sources.length, 0);
    await f.manager.dispose(); await f.manager.dispose(); assert.equal(f.context.closes, 1);
  }
  const active = fixture(); await active.manager.unlock(); await active.manager.play('spell.1'); await active.manager.dispose();
  assert.ok(active.context.sources.every(source => source.ended && source.disconnected));
  assert.ok(active.context.gains.every(gain => gain.disconnected));
});

test('unknown cues, failed loads and unavailable Web Audio fail quietly and allow subsequent valid playback', async () => {
  let fail = true;
  const f = fixture({ fetchAudio: async (url, bytes) => { if (fail) throw new Error('offline'); return bytes(2); } });
  await f.manager.unlock(); assert.equal(await f.manager.play('unknown'), false); assert.deepEqual(f.requests, []);
  assert.equal(await f.manager.play('spell.1'), false); fail = false;
  assert.equal(await f.manager.play('spell.1'), true); assert.equal(f.context.sources.length, 1);
  await f.manager.dispose();
  const unavailable = fixture({ createContext: () => { throw new Error('unsupported'); } });
  assert.equal(await unavailable.manager.unlock(), false); assert.equal(await unavailable.manager.play('spell.1'), false);
  await unavailable.manager.dispose();
});

test('configured sounds have unique complete codes, bounded gains and all ten distinct spell mappings', () => {
  const config = JSON.parse(readFileSync(new URL('../src/static/sounds.json', import.meta.url), 'utf8'));
  assert.equal(typeof config.master.enabled, 'boolean'); assert.ok(config.master.volume >= 0 && config.master.volume <= 1);
  assert.equal(config.transition.fadeOutSeconds, .08); assert.equal(config.transition.maxEffects, 8);
  const codes = new Set();
  for (const sound of config.sounds) {
    assert.ok(sound.name.trim()); assert.ok(sound.code.trim()); assert.ok(!codes.has(sound.code)); codes.add(sound.code);
    assert.ok(Number.isFinite(sound.value) && sound.value >= 0 && sound.value <= 1);
    assert.equal(typeof sound.fadePrevious, 'boolean'); assert.equal(typeof sound.loop, 'boolean'); assert.ok(sound.file);
  }
  const spells = Array.from({ length: 10 }, (_, index) => config.sounds.find(sound => sound.code === 'spell.' + (index + 1)));
  assert.ok(spells.every(Boolean)); assert.equal(new Set(spells.map(sound => sound.file)).size, 10);
  const ambient = config.sounds.find(sound => sound.code === 'menu.ambient');
  assert.equal(ambient.loop, true); assert.equal(ambient.fadePrevious, false);
});

test('runtime assets are small valid Vorbis streams, match their metadata and leave original WAV sources intact', () => {
  const config = JSON.parse(readFileSync(new URL('../src/static/sounds.json', import.meta.url), 'utf8'));
  const metadata = JSON.parse(readFileSync(new URL('../src/assets/sounds/optimized/metadata.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(soundAssetUrls).sort(), config.sounds.map(sound => sound.file).sort());
  assert.equal(metadata.optimized.length, config.sounds.length);
  let total = 0, originalTotal = 0;
  for (const sound of config.sounds) {
    const bytes = readFileSync(new URL(soundAssetUrls[sound.file]));
    const item = metadata.optimized.find(entry => entry.file === sound.file);
    assert.ok(item); assert.match(sound.file, /\.ogg$/); assert.equal(bytes.toString('ascii', 0, 4), 'OggS');
    assert.equal(bytes.length, item.bytes); total += bytes.length;
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    const packet = 27 + bytes[26];
    assert.equal(bytes[packet], 1); assert.equal(bytes.toString('ascii', packet + 1, packet + 7), 'vorbis');
    assert.equal(bytes[packet + 11], item.channels); assert.equal(bytes.readUInt32LE(packet + 12), item.sampleRate);
    assert.ok(item.sampleRate <= 32000 && item.channels <= 2);
    assert.ok(item.seconds > 0 && item.decodedPeak > 0 && item.decodedPeak < 1 && item.rms > 0);
    let offset = 0, finalGranule = 0n;
    while (offset < bytes.length) {
      assert.equal(bytes.toString('ascii', offset, offset + 4), 'OggS');
      const segments = bytes[offset + 26], header = 27 + segments;
      let payload = 0;
      for (let index = 0; index < segments; index++) payload += bytes[offset + 27 + index];
      const granule = bytes.readBigInt64LE(offset + 6);
      if (granule >= 0) finalGranule = granule;
      offset += header + payload;
    }
    assert.equal(offset, bytes.length); assert.ok(Math.abs(Number(finalGranule) / item.sampleRate - item.seconds) < .001);
  }
  for (const original of metadata.originals) {
    const bytes = readFileSync(new URL('../src/assets/sounds/' + original.file, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.equal(bytes.length, original.bytes); originalTotal += bytes.length;
    assert.equal(createHash('sha256').update(bytes).digest('hex'), original.sha256);
  }
  assert.equal(total, metadata.summary.optimizedBytes); assert.equal(originalTotal, metadata.summary.originalBytes);
  assert.ok(total < originalTotal * .1, 'runtime audio should remain far smaller than the editing sources');
});
