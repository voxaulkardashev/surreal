import type { Mood } from './destinations';

/**
 * A small generative ambient engine.
 *
 * Nothing is streamed — there are no audio files in this repository. Every
 * sound is synthesised in the browser: a six-voice drone, a bed of filtered
 * noise, occasional bells, and a reverb built from decaying noise. Each
 * destination picks a mood, and the mood picks a chord.
 */

interface MoodSpec {
  /** Root frequency in Hz. */
  root: number;
  /** Semitone offsets stacked over the root for the drone. */
  chord: number[];
  /** Semitone offsets the bells are drawn from. */
  bells: number[];
  /** Lowpass cutoff for the drone, in Hz. */
  cutoff: number;
  /** Bell density: mean seconds between strikes. */
  spacing: number;
  /** Noise-bed level. */
  air: number;
}

const MOODS: Record<Mood, MoodSpec> = {
  calm: { root: 65.41, chord: [0, 7, 12, 16, 19, 24], bells: [12, 16, 19, 24, 28], cutoff: 900, spacing: 9, air: 0.02 },
  wonder: { root: 49.0, chord: [0, 7, 12, 14, 19, 26], bells: [14, 19, 21, 26, 31], cutoff: 1400, spacing: 7, air: 0.025 },
  vast: { root: 32.7, chord: [0, 12, 19, 24, 26, 31], bells: [19, 24, 26, 31, 36], cutoff: 700, spacing: 13, air: 0.035 },
  dark: { root: 55.0, chord: [0, 3, 7, 10, 12, 15], bells: [10, 12, 15, 19, 22], cutoff: 520, spacing: 14, air: 0.03 },
  warm: { root: 43.65, chord: [0, 5, 7, 12, 17, 19], bells: [12, 17, 19, 24, 26], cutoff: 800, spacing: 8, air: 0.022 },
  crystal: { root: 73.42, chord: [0, 7, 12, 19, 21, 26], bells: [19, 21, 26, 28, 33], cutoff: 2200, spacing: 6, air: 0.015 },
  ancient: { root: 41.2, chord: [0, 5, 10, 12, 17, 22], bells: [10, 12, 17, 22, 24], cutoff: 620, spacing: 12, air: 0.04 },
};

const semitone = (root: number, steps: number) => root * 2 ** (steps / 12);

type Ctor = typeof AudioContext;

function audioContextCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export const audioSupported = (): boolean => audioContextCtor() !== null;

interface Voice {
  osc: OscillatorNode;
  sub: OscillatorNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  step: number;
}

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padBus: GainNode | null = null;
  private wet: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  private voices: Voice[] = [];
  private bellTimer: ReturnType<typeof setTimeout> | null = null;

  private mood: Mood = 'calm';
  private level = 0.6;
  private running = false;

  get isRunning() {
    return this.running;
  }

  get volume() {
    return this.level;
  }

  /**
   * Build the graph. Must be called from a user gesture — browsers will not
   * let an AudioContext make noise otherwise.
   */
  async start(mood: Mood = this.mood): Promise<boolean> {
    const Ctor = audioContextCtor();
    if (!Ctor) return false;

    if (!this.ctx) {
      const ctx = new Ctor();
      this.ctx = ctx;
      this.build(ctx);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.mood = mood;
    this.applyMood(mood, 0.4);
    this.running = true;
    this.fadeMaster(this.level, 2.5);
    this.scheduleBell();
    return true;
  }

  /** Fade out and park the context. The graph is kept for a fast restart. */
  async stop() {
    if (!this.ctx || !this.master) return;
    this.running = false;
    this.fadeMaster(0, 1.2);
    if (this.bellTimer) clearTimeout(this.bellTimer);
    this.bellTimer = null;
  }

  async toggle(mood: Mood = this.mood): Promise<boolean> {
    if (this.running) {
      await this.stop();
      return false;
    }
    return this.start(mood);
  }

  setVolume(value: number) {
    this.level = Math.max(0, Math.min(1, value));
    if (this.running) this.fadeMaster(this.level, 0.25);
  }

  /** Re-tune the drone. Called whenever the destination changes. */
  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.ctx) this.applyMood(mood, 4);
  }

  /** A filtered noise sweep, used under page transitions. */
  whoosh(intensity = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.running) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 2);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.1;
    band.frequency.setValueAtTime(180, now);
    band.frequency.exponentialRampToValueAtTime(2600, now + 0.55);
    band.frequency.exponentialRampToValueAtTime(220, now + 1.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.085 * intensity, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    src.connect(band).connect(g);
    g.connect(this.master);
    if (this.wet) g.connect(this.wet);
    src.start(now);
    src.stop(now + 1.8);
  }

  /** A single soft bell, used for confirmations. */
  chime(steps = 19) {
    this.strike(steps, 0.05);
  }

  destroy() {
    if (this.bellTimer) clearTimeout(this.bellTimer);
    this.voices.forEach((v) => {
      try {
        v.osc.stop();
        v.sub.stop();
        v.lfo.stop();
      } catch {
        /* already stopped */
      }
    });
    this.voices = [];
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.running = false;
  }

  /* ---------------------------------------------------------------- */

  private build(ctx: AudioContext) {
    const master = ctx.createGain();
    master.gain.value = 0.0001;

    // A gentle limiter so stacked voices never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.02;
    comp.release.value = 0.4;

    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulseResponse(ctx, 4.5, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.6;

    const padBus = ctx.createGain();
    padBus.gain.value = 0.16;

    padBus.connect(filter);
    filter.connect(master);
    filter.connect(wet);
    wet.connect(convolver);
    convolver.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);

    // The air: very quiet low-passed noise, the room tone of space.
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 6);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 380;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    this.ctx = ctx;
    this.master = master;
    this.padBus = padBus;
    this.filter = filter;
    this.wet = wet;
    this.convolver = convolver;
    this.noiseGain = noiseGain;

    const spec = MOODS[this.mood];
    spec.chord.forEach((step, i) => this.voices.push(this.makeVoice(ctx, padBus, spec, step, i)));
  }

  private makeVoice(ctx: AudioContext, bus: GainNode, spec: MoodSpec, step: number, index: number): Voice {
    const freq = semitone(spec.root, step);
    const gain = ctx.createGain();
    gain.gain.value = 0.14 / (1 + index * 0.28);

    const osc = ctx.createOscillator();
    osc.type = index % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = (index - 2.5) * 4;

    // A second oscillator a hair off pitch gives the drone its slow beating.
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq;
    sub.detune.value = 7 - index * 3;

    // Each voice breathes on its own slow LFO so the pad never sits still.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.03 + index * 0.017;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = gain.gain.value * 0.6;
    lfo.connect(lfoGain).connect(gain.gain);

    osc.connect(gain);
    sub.connect(gain);
    gain.connect(bus);
    osc.start();
    sub.start();
    lfo.start();

    return { osc, sub, gain, lfo, lfoGain, step };
  }

  private applyMood(mood: Mood, seconds: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const spec = MOODS[mood];
    const now = ctx.currentTime;

    this.voices.forEach((v, i) => {
      const step = spec.chord[i % spec.chord.length];
      const freq = semitone(spec.root, step);
      v.step = step;
      v.osc.frequency.cancelScheduledValues(now);
      v.sub.frequency.cancelScheduledValues(now);
      v.osc.frequency.setTargetAtTime(freq, now, seconds / 3);
      v.sub.frequency.setTargetAtTime(freq, now, seconds / 3);
    });

    this.filter?.frequency.setTargetAtTime(spec.cutoff, now, seconds / 3);
    this.noiseGain?.gain.setTargetAtTime(spec.air, now, seconds / 3);
  }

  private fadeMaster(target: number, seconds: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(Math.max(0.0001, target), now + seconds);
  }

  private scheduleBell() {
    if (this.bellTimer) clearTimeout(this.bellTimer);
    const spec = MOODS[this.mood];
    const delay = (spec.spacing * 0.55 + Math.random() * spec.spacing) * 1000;
    this.bellTimer = setTimeout(() => {
      if (!this.running) return;
      const steps = spec.bells[Math.floor(Math.random() * spec.bells.length)];
      this.strike(steps, 0.035 + Math.random() * 0.03);
      this.scheduleBell();
    }, delay);
  }

  private strike(steps: number, peak: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const spec = MOODS[this.mood];
    const now = ctx.currentTime;
    const freq = semitone(spec.root, steps + 12);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // A quiet inharmonic partial keeps it from sounding like a test tone.
    const partial = ctx.createOscillator();
    partial.type = 'sine';
    partial.frequency.value = freq * 2.76;

    const pGain = ctx.createGain();
    pGain.gain.value = 0.12;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

    osc.connect(g);
    partial.connect(pGain).connect(g);
    g.connect(this.master);
    if (this.wet) g.connect(this.wet);

    osc.start(now);
    partial.start(now);
    osc.stop(now + 6);
    partial.stop(now + 6);
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      // Paul Kellet's pink-noise approximation: warmer than white noise.
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.16;
      }
    }
    return buffer;
  }

  private impulseResponse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i += 1) {
        const t = i / length;
        // A short fade-in stops the reverb sounding like a gated snare.
        const attack = Math.min(1, t * 60);
        data[i] = (Math.random() * 2 - 1) * attack * (1 - t) ** decay;
      }
    }
    return buffer;
  }
}

let singleton: AmbientEngine | null = null;

export function getEngine(): AmbientEngine {
  if (!singleton) singleton = new AmbientEngine();
  return singleton;
}
