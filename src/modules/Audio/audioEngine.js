const clamp = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const defaultFetch = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Audio asset unavailable');
  return response.arrayBuffer();
};

export class AudioManager {
  constructor({ config, assetUrls, createContext, fetchAudio = defaultFetch }) {
    this.config = config;
    this.entries = new Map(config.sounds.map(entry => [entry.code, entry]));
    this.assetUrls = assetUrls;
    this.createContext = createContext ?? (() => {
      const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      return Context ? new Context() : null;
    });
    this.fetchAudio = fetchAudio;
    this.enabled = config.master.enabled !== false;
    this.volume = clamp(config.master.volume, .7);
    this.paused = false;
    this.unlocked = false;
    this.disposed = false;
    this.context = null;
    this.masterGain = null;
    this.voices = new Set();
    this.buffers = new Map();
    this.loading = new Map();
    this.effectRequest = 0;
    this.ambientRequest = 0;
    this.ambientWanted = false;
    this.ambientVoice = null;
    this.unlocking = null;
  }

  unlock() {
    if (this.disposed) return Promise.resolve(false);
    if (this.unlocking) return this.unlocking;
    this.unlocking = this._unlock().finally(() => { this.unlocking = null; });
    return this.unlocking;
  }

  async _unlock() {
    try {
      if (!this.context) {
        const context = this.createContext();
        if (!context) return false;
        this.context = context;
        this.masterGain = context.createGain();
        this.masterGain.gain.value = this.enabled ? this.volume : 0;
        this.masterGain.connect(context.destination);
      }
      if (this.context.state !== 'running') await this.context.resume();
      if (this.disposed || this.context.state !== 'running') return false;
      this.unlocked = true;
      this._syncAmbient();
      return true;
    } catch { return false; }
  }

  _ready(code) {
    return !this.disposed && this.unlocked && this.context?.state === 'running' && this.enabled && this.volume > 0 &&
      (!this.paused || code === 'ui.select');
  }

  async _buffer(entry) {
    if (this.buffers.has(entry.file)) return this.buffers.get(entry.file);
    if (!this.loading.has(entry.file)) {
      const url = this.assetUrls[entry.file];
      if (!url) throw new Error('Unknown audio asset');
      const context = this.context;
      const promise = this.fetchAudio(url).then(data => {
        if (this.disposed || context !== this.context) throw new Error('Audio disposed');
        return context.decodeAudioData(data);
      }).then(buffer => {
        if (this.disposed) throw new Error('Audio disposed');
        this.buffers.set(entry.file, buffer);
        return buffer;
      }).finally(() => this.loading.delete(entry.file));
      this.loading.set(entry.file, promise);
    }
    return this.loading.get(entry.file);
  }

  _hold(parameter, now) {
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
    else {
      const value = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(value, now);
    }
  }

  _fade(voice) {
    if (voice.fading) return;
    voice.fading = true;
    const now = this.context.currentTime;
    const fade = Math.max(.015, Math.min(.5, this.config.transition.fadeOutSeconds ?? .08));
    this._hold(voice.gain.gain, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + fade);
    voice.source.stop(now + fade + .005);
    if (this.ambientVoice === voice) this.ambientVoice = null;
  }

  _start(entry, buffer, ambient = false) {
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = entry.loop === true;
    gain.gain.value = clamp(entry.value, 1);
    source.connect(gain);
    gain.connect(this.masterGain);
    const voice = { source, gain, entry, ambient, fading: false };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      if (this.ambientVoice === voice) this.ambientVoice = null;
      source.disconnect();
      gain.disconnect();
    };
    try { source.start(); }
    catch { source.onended(); return null; }
    return voice;
  }

  async play(code) {
    const entry = this.entries.get(code);
    if (!entry || clamp(entry.value, 1) === 0 || !this._ready(code)) return false;
    if (entry.loop) { this.setAmbient(true); return true; }
    const request = ++this.effectRequest;
    try {
      const buffer = await this._buffer(entry);
      if (request !== this.effectRequest || !this._ready(code)) return false;
      if (entry.fadePrevious !== false) {
        for (const voice of this.voices) if (voice.entry.fadePrevious !== false) this._fade(voice);
      }
      const max = Math.max(1, Math.min(32, Math.trunc(this.config.transition.maxEffects ?? 8)));
      if ([...this.voices].filter(voice => !voice.ambient).length >= max) return false;
      return !!this._start(entry, buffer);
    } catch { return false; }
  }

  setSettings({ enabled = this.enabled, volume = this.volume }) {
    const wasAudible = this.enabled && this.volume > 0;
    this.enabled = enabled !== false;
    this.volume = clamp(volume, this.volume);
    const audible = this.enabled && this.volume > 0;
    if (!audible) {
      this.effectRequest++;
      this.ambientRequest++;
      for (const voice of this.voices) this._fade(voice);
    }
    if (this.masterGain) {
      const now = this.context.currentTime;
      this._hold(this.masterGain.gain, now);
      this.masterGain.gain.linearRampToValueAtTime(audible ? this.volume : 0, now + .035);
    }
    if (audible && !wasAudible) this._syncAmbient();
  }

  setAmbient(active) {
    const wanted = active === true;
    if (wanted === this.ambientWanted) return;
    this.ambientWanted = wanted;
    this.ambientRequest++;
    if (!wanted && this.ambientVoice) this._fade(this.ambientVoice);
    else if (wanted) this._syncAmbient();
  }

  async _syncAmbient() {
    const entry = this.entries.get('menu.ambient');
    if (!entry || clamp(entry.value, 1) === 0 || !this.ambientWanted || this.ambientVoice || !this._ready(entry.code)) return;
    const request = ++this.ambientRequest;
    try {
      const buffer = await this._buffer(entry);
      if (request !== this.ambientRequest || !this.ambientWanted || this.ambientVoice || !this._ready(entry.code)) return;
      this.ambientVoice = this._start(entry, buffer, true);
    } catch { /* Failed audio never interrupts gameplay. */ }
  }

  setPaused(paused) {
    if (this.paused === paused || this.disposed) return;
    this.paused = paused;
    this.effectRequest++;
    this.ambientRequest++;
    if (paused) for (const voice of this.voices) this._fade(voice);
    else this._syncAmbient();
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.effectRequest++;
    this.ambientRequest++;
    this.ambientWanted = false;
    for (const voice of this.voices) this._fade(voice);
    if (this.context) {
      await new Promise(resolve => setTimeout(resolve, Math.max(.015, Math.min(.5, this.config.transition.fadeOutSeconds ?? .08)) * 1000 + 10));
      // Explicitly end after the fade even if the context clock was suspended.
      for (const voice of this.voices) {
        try { voice.source.stop(); } catch { /* Already ended. */ }
        voice.source.disconnect();
        voice.gain.disconnect();
      }
      try { await this.context.close(); } catch { /* Already closed. */ }
      this.masterGain.disconnect();
    }
    this.voices.clear();
    this.buffers.clear();
    this.loading.clear();
    this.ambientVoice = null;
    this.unlocked = false;
  }
}
