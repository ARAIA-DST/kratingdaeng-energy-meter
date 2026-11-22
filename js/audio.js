/**
 * SISTEM SUARA BARU - sintesis Web Audio (tanpa file audio, jadi ringan & offline-ready)
 *  - Mesin balap: naik-turun mengikuti jarum (updateEngineRev)
 *  - Tik pin roda saat sektor berpindah (playNeedleTick)
 *  - Countdown, backfire, fanfare per tier, musik latar synthwave pelan
 * API publik sama dengan versi lama, jadi game.js tidak perlu berubah banyak.
 */
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.eng = null;
    this._bgmTimer = null;
    this._bgmStep = 0;
    this._bgmNext = 0;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (!this.isMuted) this.ctx.resume();
    });
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const c = this.ctx = new AC();
      this.master = c.createGain();
      this.master.gain.value = this.isMuted ? 0 : 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.bgm = c.createGain(); this.bgm.gain.value = 0.16; this.bgm.connect(this.master);
      const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = n;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setMute(m) {
    this.isMuted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
    return this.isMuted;
  }
  toggleMute() { return this.setMute(!this.isMuted); }
  _ok() { return !this.isMuted && this.ensureContext(); }

  // --- helper ---
  _tone(f, t, dur, type = 'triangle', vol = 0.25, dest = this.sfx, f2 = null) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  _noise(t, dur, vol, type, freq, dest = this.sfx, freq2 = null) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }

  // --- countdown ---
  playCountdown(isFinal = false) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    if (!isFinal) { this._tone(660, t, 0.16, 'square', 0.12); this._tone(660, t, 0.16, 'sine', 0.2); }
    else {
      this._tone(880, t, 0.5, 'sawtooth', 0.12, this.sfx, 1760);
      this._tone(1320, t + 0.05, 0.5, 'sine', 0.22);
      this._noise(t, 0.4, 0.15, 'highpass', 3000);
    }
  }

  // --- tik pin roda ---
  playNeedleTick(pitch = 1) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.025, 0.28, 'highpass', 2500 * pitch);
    this._tone(1100 * pitch, t, 0.05, 'triangle', 0.18, this.sfx, 320 * pitch);
  }

  // --- mesin balap ---
  startSpinSequence() {
    if (!this._ok()) return;
    this.stopSpinSequence(true);
    const c = this.ctx, t = c.currentTime;
    const out = c.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.5, t + 0.3);
    const trem = c.createGain(); trem.gain.value = 0.85;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.value = 500;
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = 'square';
    const g1 = c.createGain(); g1.gain.value = 0.5;
    const g2 = c.createGain(); g2.gain.value = 0.25;
    const whine = c.createOscillator(); whine.type = 'sine';
    const gw = c.createGain(); gw.gain.value = 0;
    const lfo = c.createOscillator(); lfo.frequency.value = 26;
    const lg = c.createGain(); lg.gain.value = 0.12;
    o1.connect(g1); g1.connect(lp); o2.connect(g2); g2.connect(lp);
    lp.connect(trem); trem.connect(out); whine.connect(gw); gw.connect(out);
    lfo.connect(lg); lg.connect(trem.gain);
    out.connect(this.sfx);
    [o1, o2, whine, lfo].forEach(o => o.start(t));
    this.eng = { out, o1, o2, lp, whine, gw, lfo };
    this.updateEngineRev(0.05);
  }

  updateEngineRev(intensity = 0.5) {
    if (!this.eng || !this.ctx) return;
    const i = Math.max(0, Math.min(1, intensity)), t = this.ctx.currentTime, e = this.eng, k = 0.05;
    const f = 48 + i * 235;
    e.o1.frequency.setTargetAtTime(f, t, k);
    e.o2.frequency.setTargetAtTime(f * 0.5, t, k);
    e.lp.frequency.setTargetAtTime(350 + i * i * 2800, t, k);
    e.whine.frequency.setTargetAtTime(700 + i * 2400, t, k);
    e.gw.gain.setTargetAtTime(i * i * 0.05, t, k);
    e.lfo.frequency.setTargetAtTime(22 + i * 22, t, k);
  }

  playBackfire() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 4; k++) this._noise(t + k * 0.09 + Math.random() * 0.04, 0.09, 0.35, 'bandpass', 900, this.sfx, 160);
  }

  stopSpinSequence(immediate = false) {
    const e = this.eng; if (!e || !this.ctx) return;
    this.eng = null;
    const t = this.ctx.currentTime, d = immediate ? 0.05 : 0.5;
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setValueAtTime(e.out.gain.value, t);
    e.out.gain.linearRampToValueAtTime(0, t + d);
    [e.o1, e.o2, e.whine, e.lfo].forEach(o => { try { o.stop(t + d + 0.05); } catch (x) {} });
  }
  startEngineRev() { this.startSpinSequence(); }
  stopEngineRev() { this.stopSpinSequence(); }

  // --- fanfare hadiah ---
  playPrizeWin(tier = 3) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime, c4 = 523.25;
    const arp = (notes, step, type, vol) => notes.forEach((f, i) => this._tone(f, t + i * step, 0.35, type, vol));
    const chord = (at, fs, dur, vol) => fs.forEach(f => { this._tone(f, at, dur, 'sawtooth', vol * 0.5); this._tone(f * 2, at, dur, 'sine', vol); });
    if (tier === 1) {
      arp([c4, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093], 0.075, 'square', 0.1);
      chord(t + 0.6, [c4, 659.25, 783.99, 1046.5], 1.6, 0.14);
      this._noise(t, 0.9, 0.18, 'bandpass', 600, this.sfx, 6000);
      for (let k = 0; k < 10; k++) this._tone(1800 + Math.random() * 2400, t + 0.7 + k * 0.1, 0.18, 'sine', 0.07);
    } else if (tier === 2) {
      arp([c4, 659.25, 783.99, 1046.5], 0.11, 'triangle', 0.22);
      chord(t + 0.5, [c4, 659.25, 783.99], 1.1, 0.12);
    } else {
      arp([c4, 659.25, 783.99], 0.12, 'triangle', 0.22);
      this._tone(1046.5, t + 0.4, 0.6, 'sine', 0.2);
    }
  }

  // --- musik latar pelan ---
  startBGM() {
    if (this.bgmPlaying || !this.ensureContext()) return;
    this.bgmPlaying = true; this._bgmStep = 0; this._bgmNext = this.ctx.currentTime + 0.1;
    this._bgmTimer = setInterval(() => this._bgmSchedule(), 100);
  }
  stopBGM() {
    this.bgmPlaying = false;
    if (this._bgmTimer) { clearInterval(this._bgmTimer); this._bgmTimer = null; }
  }
  _bgmSchedule() {
    if (!this.ctx) return;
    const roots = [110, 87.31, 130.81, 98], third = [1.2, 1.26, 1.26, 1.26], sp = 0.25;
    while (this._bgmNext < this.ctx.currentTime + 0.3) {
      const s = this._bgmStep, t = this._bgmNext, chord = Math.floor(s / 8) % 4, r = roots[chord];
      this._tone(r * (s % 4 === 3 ? 2 : 1), t, 0.2, 'sawtooth', 0.35, this.bgm);
      if (s % 2 === 1) this._noise(t, 0.04, 0.12, 'highpass', 7000, this.bgm);
      if (s % 8 === 0) [1, third[chord], 1.5].forEach(m => this._tone(r * 2 * m, t, 2, 'triangle', 0.22, this.bgm));
      this._bgmStep++; this._bgmNext += sp;
    }
  }
}
window.soundSystem = new SoundSystem();
