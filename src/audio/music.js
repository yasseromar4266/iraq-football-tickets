// Calm ambient background tune, generated live with the Web Audio API (no audio files).
// Slow four-chord pad + a few soft bell notes with echo. Starts only after a user tap (browser rule).
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[38, 50, 57, 60, 65], [34, 46, 53, 57, 62], [41, 53, 57, 60, 64], [36, 48, 55, 62, 64]];   // Dm7 · B♭maj7 · Fmaj7 · Cadd9
const SCALE = [62, 65, 67, 69, 72, 74, 77, 79];                                                           // D minor pentatonic
const BAR = 8, LEVEL = 0.16;

export class Music {
  constructor() { this.on = false; this.ctx = null; this.bar = 0; }
  get supported() { return !!(window.AudioContext || window.webkitAudioContext); }
  start() {
    if (this.on || !this.supported) return this.on;
    try {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext; const ctx = (this.ctx = new C());
        this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
        this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 1500; this.tone.connect(this.master);
        this.echo = ctx.createDelay(1); this.echo.delayTime.value = 0.42; const fb = ctx.createGain(); fb.gain.value = 0.34; const wet = ctx.createGain(); wet.gain.value = 0.3;
        this.echo.connect(fb); fb.connect(this.echo); this.echo.connect(wet); wet.connect(this.tone);
      }
      const ctx = this.ctx; ctx.resume();
      const now = ctx.currentTime; this.master.gain.cancelScheduledValues(now); this.master.gain.setValueAtTime(this.master.gain.value, now); this.master.gain.linearRampToValueAtTime(LEVEL, now + 3);
      this.next = now + 0.1; this.timer = setInterval(() => this.schedule(), 400); this.schedule(); this.on = true;
    } catch { this.on = false; }
    return this.on;
  }
  stop() {
    if (!this.on) return; this.on = false; clearInterval(this.timer);
    const ctx = this.ctx, now = ctx.currentTime; this.master.gain.cancelScheduledValues(now); this.master.gain.setValueAtTime(this.master.gain.value, now); this.master.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(() => { if (!this.on) ctx.suspend(); }, 800);
  }
  toggle() { if (this.on) this.stop(); else this.start(); return this.on; }
  schedule() { while (this.next < this.ctx.currentTime + 1.5) { this.playBar(this.next); this.next += BAR; } }
  voice(freq, type, t, attack, hold, release, peak, dest) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.setValueAtTime(peak, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + attack + hold + release + 0.1);
  }
  playBar(t) {
    const chord = CHORDS[this.bar++ % CHORDS.length];
    chord.forEach((m, i) => {                                       // pad: slow swell, overlaps the next bar
      this.voice(mtof(m), i < 2 ? 'sine' : 'triangle', t, 2.6, 3.4, 3.6, i < 2 ? 0.11 : 0.045, this.tone);
      if (i >= 2) this.voice(mtof(m) * 1.004, 'sine', t, 3, 3, 3.6, 0.03, this.tone);                    // gentle chorus
    });
    [1.2, 3.1, 4.9, 6.4].forEach((off) => {                         // soft bells
      if (Math.random() > 0.68) return; const m = SCALE[Math.floor(Math.random() * SCALE.length)], tt = t + off + Math.random() * 0.3;
      this.voice(mtof(m), 'sine', tt, 0.03, 0.05, 2.6, 0.07, this.tone); this.voice(mtof(m), 'sine', tt, 0.03, 0.05, 1.6, 0.05, this.echo);
    });
  }
}
