/**
 * Host-only background music, fully synthesized with the Web Audio API — so
 * it's 100% original and royalty-free (no external tracks, nothing to license).
 * A gentle, upbeat I–V–vi–IV loop (C–G–Am–F) plus a short celebratory sting.
 *
 * Never imported by the player route, so it only ever plays on the host screen.
 */

type ChordVoicing = { bass: number; pad: number[]; arp: number[] };

// C major · G major · A minor · F major (roots + soft pad + arp tones)
const CHORDS: ChordVoicing[] = [
  { bass: 130.81, pad: [261.63, 392.0], arp: [261.63, 329.63, 392.0, 523.25] },
  { bass: 98.0, pad: [196.0, 293.66], arp: [196.0, 246.94, 293.66, 392.0] },
  { bass: 110.0, pad: [220.0, 329.63], arp: [220.0, 261.63, 329.63, 440.0] },
  { bass: 87.31, pad: [174.61, 261.63], arp: [174.61, 220.0, 261.63, 349.23] },
];
const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 0, 1];
const STEP_DUR = 0.25; // eighth note @ 120 BPM
const STEPS_PER_BAR = 8;
const TOTAL_STEPS = STEPS_PER_BAR * CHORDS.length;
const VOLUME = 0.13;

class MusicEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private running = false;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  constructor() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600; // warm off the harsh highs
    this.master.connect(filter);
    filter.connect(this.ctx.destination);
  }

  isRunning() {
    return this.running;
  }

  private tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    attack = 0.01,
  ) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.03);
  }

  private scheduleStep(step: number, time: number) {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    const ch = CHORDS[bar];
    if (inBar % 2 === 0) this.tone(ch.bass, time, 0.45, "triangle", 0.1); // bass on the beat
    if (inBar === 0)
      ch.pad.forEach((f) =>
        this.tone(f, time, STEP_DUR * STEPS_PER_BAR * 0.95, "sine", 0.035, 0.15),
      ); // sustained pad
    this.tone(ch.arp[ARP_PATTERN[inBar]], time, 0.22, "triangle", 0.06); // plucky lead
  }

  private scheduler = () => {
    if (!this.running) return;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += STEP_DUR;
      this.step = (this.step + 1) % TOTAL_STEPS;
    }
    this.timer = window.setTimeout(this.scheduler, 25);
  };

  async start() {
    if (this.running) return;
    await this.ctx.resume(); // must be called from a user gesture
    this.running = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
    this.master.gain.linearRampToValueAtTime(VOLUME, t + 0.4); // fade in
    this.nextTime = t + 0.08;
    this.step = 0;
    this.scheduler();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0.0001, t + 0.25); // fade out
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** A short celebratory fanfare over the loop (podium). */
  sting() {
    if (!this.running) return;
    const t0 = this.ctx.currentTime + 0.02;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, t0 + i * 0.11, 0.5, "triangle", 0.11),
    );
    [523.25, 659.25, 783.99].forEach((f) =>
      this.tone(f, t0 + 0.44, 1.1, "triangle", 0.06, 0.02),
    );
  }
}

let engine: MusicEngine | null = null;

/** Lazily create the engine (call from a click so the AudioContext can start). */
export function getMusicEngine(): MusicEngine | null {
  if (typeof window === "undefined") return null;
  try {
    if (!engine) engine = new MusicEngine();
    return engine;
  } catch {
    return null;
  }
}

/** Fire the podium sting only if music is already playing (no autoplay). */
export function stingIfPlaying() {
  if (engine?.isRunning()) engine.sting();
}
