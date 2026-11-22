/**
 * ===================================================================================
 * KRATINGDAENG ENERGY METER - WEB AUDIO API SOUND SYSTEM
 * ===================================================================================
 * Menghasilkan efek suara energetik & BGM Synthwave secara procedural tanpa file eksternal!
 * Keuntungan: 100% Bebas CORS, tanpa delay buffering, dan responsif seketika.
 * ===================================================================================
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    
    // Engine Rev Audio Nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.isRevving = false;
    
    // Sample Audio Resmi dari Pengguna (5 File Audio Balap):
    // 1. off lower
    // 2. off midhigh
    // 3. on high
    // 4. on low
    // 5. on midhigh
    this.samples = {
      onLow: new Audio('assets/audio/on_low.wav'),
      onMidHigh: new Audio('assets/audio/on_midhigh.wav'),
      onHigh: new Audio('assets/audio/on_high.wav'),
      offMidHigh: new Audio('assets/audio/off_midhigh.wav'),
      offLower: new Audio('assets/audio/off_lower.wav')
    };

    // Konfigurasi looping & preloading sample audio
    this.samples.onLow.loop = true;
    this.samples.onMidHigh.loop = true;
    this.samples.onHigh.loop = true;
    this.samples.offMidHigh.loop = false;
    this.samples.offLower.loop = false;

    Object.values(this.samples).forEach(snd => {
      snd.preload = 'auto';
      snd.volume = 0;
    });

    this.offTimer = null;

    // Inisialisasi Audio Context saat interaksi pengguna pertama kali
    this.initAudioContext();
  }

  initAudioContext() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API tidak didukung:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.initAudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    if (this.samples) {
      if (this.isMuted) {
        Object.values(this.samples).forEach(snd => { snd.muted = true; });
      } else {
        Object.values(this.samples).forEach(snd => { snd.muted = false; });
      }
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMute(!this.isMuted);
  }

  /**
   * Sound FX: Ketukan Energetik (Tap Sound)
   * Pitch naik seiring tingginya energi meter!
   */
  playTap(energyPercent = 0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 160 + (energyPercent * 3.5); // 160Hz - 510Hz

    // 1. Punchy Kick Oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.08);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);

    // 2. High-Tech Snap / Click Transient
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();

    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(1200 + energyPercent * 8, t);
    snapOsc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    snapGain.gain.setValueAtTime(0.4, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxGain);

    snapOsc.start(t);
    snapOsc.stop(t + 0.04);
  }

  /**
   * Sound FX: Sweet Spot Hit (Laser Zap & Golden Resonator)
   */
  playSweetSpot() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Laser Synth Sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.22);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.22);

    // Golden Chime Chord
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, t + idx * 0.03);

      chimeGain.gain.setValueAtTime(0.3, t + idx * 0.03);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.sfxGain);

      chimeOsc.start(t + idx * 0.03);
      chimeOsc.stop(t + 0.35);
    });
  }

  /**
   * Sound FX: Ambil Bonus Kaleng Kratingdaeng Emas
   */
  playPowerUp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(0.4, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.18);
    });
  }

  /**
   * Sound FX: OVERCHARGE 100%+ (Siren & Electric Surge)
   */
  playOvercharge() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub Bass Boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(150, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.6);

    subGain.gain.setValueAtTime(0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(t);
    subOsc.stop(t + 0.6);

    // Electric Siren Surge
    const siren = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();

    siren.type = 'sawtooth';
    siren.frequency.setValueAtTime(600, t);
    siren.frequency.linearRampToValueAtTime(1400, t + 0.2);
    siren.frequency.linearRampToValueAtTime(800, t + 0.4);
    siren.frequency.linearRampToValueAtTime(1600, t + 0.6);

    sirenGain.gain.setValueAtTime(0.35, t);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    siren.connect(sirenGain);
    sirenGain.connect(this.sfxGain);

    siren.start(t);
    siren.stop(t + 0.6);
  }

  /**
   * Sound FX: Hitungan Mundur (Countdown Beep)
   */
  playCountdown(isFinal = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.4 : 0.15));

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (isFinal ? 0.4 : 0.15));
  }

  /**
   * ===================================================================================
   * SPIN WHEEL SOUND SEQUENCE (15 DETIK TOTAL)
   * Urutan: off_lower → on_low → on_midhigh → on_high → off_midhigh → off_lower
   *
   * Timeline (15 detik):
   *   0.0s  - 1.5s  : off_lower  (intro idle, mesin dingin menyala)
   *   1.5s  - 4.5s  : on_low     (crossfade masuk, putaran rendah)
   *   4.5s  - 8.0s  : on_midhigh (akselerasi sedang)
   *   8.0s  - 11.5s : on_high    (peak redline / putaran puncak)
   *   11.5s - 13.5s : off_midhigh (lepas gas, perlambatan)
   *   13.5s - 15.0s : off_lower  (jarum berhenti, idle kembali)
   * ===================================================================================
   */
  startSpinSequence() {
    if (this.isMuted) return;
    this.ensureContext();

    // Batalkan sequence sebelumnya jika ada
    this.stopSpinSequence();

    this.isRevving = true;
    this._spinTimers = [];

    const s = this.samples;

    // Hentikan semua dulu & reset
    Object.values(s).forEach(snd => {
      try { snd.pause(); snd.currentTime = 0; snd.volume = 0; } catch (e) {}
    });

    // Helper crossfade volume secara gradual
    const fadeVolume = (track, fromVol, toVol, durationMs, stepMs = 50) => {
      if (!track) return;
      const steps = Math.max(1, Math.round(durationMs / stepMs));
      const delta = (toVol - fromVol) / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const newVol = Math.max(0, Math.min(1, fromVol + delta * step));
        try { track.volume = newVol; } catch (e) {}
        if (step >= steps) clearInterval(timer);
      }, stepMs);
      this._spinTimers.push(timer);
    };

    // --- FASE 0: off_lower (0.0s - 1.5s) mesin idle menyala ---
    try {
      s.offLower.currentTime = 0;
      s.offLower.volume = 0.75;
      s.offLower.loop = true;
      this.playTrackSafe(s.offLower);
    } catch (e) {}

    // --- FASE 1: on_low masuk (1.5s), off_lower fade out ---
    const t1 = setTimeout(() => {
      try {
        s.onLow.currentTime = 0;
        s.onLow.volume = 0;
        s.onLow.loop = true;
        this.playTrackSafe(s.onLow);
        fadeVolume(s.onLow, 0, 0.9, 1200);     // fade in on_low
        fadeVolume(s.offLower, 0.75, 0, 1200); // fade out off_lower
      } catch (e) {}
    }, 1500);
    this._spinTimers.push(t1);

    // --- FASE 2: on_midhigh masuk (4.5s), on_low fade out ---
    const t2 = setTimeout(() => {
      try {
        s.onMidHigh.currentTime = 0;
        s.onMidHigh.volume = 0;
        s.onMidHigh.loop = true;
        this.playTrackSafe(s.onMidHigh);
        fadeVolume(s.onMidHigh, 0, 0.9, 1800);  // fade in on_midhigh
        fadeVolume(s.onLow, 0.9, 0, 1800);      // fade out on_low
      } catch (e) {}
    }, 4500);
    this._spinTimers.push(t2);

    // --- FASE 3: on_high masuk (8.0s), on_midhigh fade out ---
    const t3 = setTimeout(() => {
      try {
        s.onHigh.currentTime = 0;
        s.onHigh.volume = 0;
        s.onHigh.loop = true;
        this.playTrackSafe(s.onHigh);
        fadeVolume(s.onHigh, 0, 1.0, 2000);     // fade in on_high full blast
        fadeVolume(s.onMidHigh, 0.9, 0, 2000);  // fade out on_midhigh
      } catch (e) {}
    }, 8000);
    this._spinTimers.push(t3);

    // --- FASE 4: off_midhigh masuk (11.5s), on_high fade out ---
    const t4 = setTimeout(() => {
      try {
        s.offMidHigh.currentTime = 0;
        s.offMidHigh.volume = 0;
        s.offMidHigh.loop = false;
        this.playTrackSafe(s.offMidHigh);
        fadeVolume(s.offMidHigh, 0, 0.9, 1200);
        fadeVolume(s.onHigh, 1.0, 0, 1200);
      } catch (e) {}
    }, 11500);
    this._spinTimers.push(t4);

    // --- FASE 5: off_lower masuk (13.5s), off_midhigh fade out ---
    const t5 = setTimeout(() => {
      try {
        s.offLower.loop = false;
        s.offLower.currentTime = 0;
        s.offLower.volume = 0;
        this.playTrackSafe(s.offLower);
        fadeVolume(s.offLower, 0, 0.8, 1200);
        fadeVolume(s.offMidHigh, 0.9, 0, 1200);
      } catch (e) {}
    }, 13500);
    this._spinTimers.push(t5);

    // --- BERSIH di 15.5s ---
    const t6 = setTimeout(() => {
      this.isRevving = false;
      Object.values(this.samples).forEach(snd => {
        try { snd.pause(); snd.volume = 0; } catch (e) {}
      });
    }, 15500);
    this._spinTimers.push(t6);
  }

  /**
   * Hentikan sequence spin dan redam semua track
   */
  stopSpinSequence() {
    this.isRevving = false;
    if (this._spinTimers && this._spinTimers.length) {
      this._spinTimers.forEach(t => {
        if (typeof t === 'number') clearTimeout(t);
        else clearInterval(t);
      });
      this._spinTimers = [];
    }
    if (this.samples) {
      Object.values(this.samples).forEach(snd => {
        try { snd.pause(); snd.volume = 0; } catch (e) {}
      });
    }
  }

  /**
   * Alias untuk kompatibilitas: startEngineRev → startSpinSequence
   */
  startEngineRev() {
    this.startSpinSequence();
  }

  /**
   * Update Crossfade tidak digunakan di mode 15s, tetap ada untuk kompatibilitas
   */
  updateEngineRev(intensity = 0.5, speed = 0) {
    // Spin sequence mengatur crossfade sendiri via timeline, tidak perlu di-update per-frame
  }

  /**
   * Stop engine rev → stop spin sequence
   */
  stopEngineRev(speedAtRelease = 100) {
    // Biarkan sequence selesai alami; dipanggil hanya jika game di-cancel
    this.stopSpinSequence();
  }

  playTrackSafe(track) {
    if (!track) return;
    try {
      const p = track.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    } catch (e) {}
  }

  pauseTrackSafe(track) {
    if (!track) return;
    try {
      track.pause();
    } catch (e) {}
  }

  /**
   * Sound FX: Detik Jarum Speedometer (Needle Tick)
   */
  playNeedleTick(pitch = 1.0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(120 * pitch, t + 0.035);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Sound FX: Fanfare Hadiah Lucky Dip Sesuai Tier
   */
  playPrizeWin(tier = 3) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (tier === 1) {
      // Fanfare Megah Tier 1 (Kaos & Topi)
      this.playVictory();
      setTimeout(() => this.playPowerUp(), 300);
    } else if (tier === 2) {
      // Fanfare Tier 2 (Payung / Jas Hujan / Tongkat Tol)
      this.playVictory();
    } else {
      // Tier 3 (Shopping Bag)
      this.playPowerUp();
    }
  }

  /**
   * Sound FX: Fanfare Kemenangan Game Over
   */
  playVictory() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [
      { f: [523.25, 659.25, 783.99], time: 0.0, dur: 0.2 }, // C
      { f: [587.33, 739.99, 880.00], time: 0.22, dur: 0.2 }, // D
      { f: [659.25, 830.61, 987.77], time: 0.44, dur: 0.2 }, // E
      { f: [783.99, 987.77, 1318.51], time: 0.68, dur: 0.6 } // G
    ];

    chords.forEach(c => {
      c.f.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + c.time);

        gain.gain.setValueAtTime(0.25, t + c.time);
        gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t + c.time);
        osc.stop(t + c.time + c.dur);
      });
    });
  }

  /**
   * PROCEDURAL ENERGETIC SYNTHWAVE BGM
   * Rhythmic bassline + 4-on-the-floor electro beat (130 BPM)
   */
  startBGM() {
    if (this.bgmPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.bgmPlaying = true;
    this.bgmStep = 0;
    const intervalMs = (60 / 130 / 4) * 1000; // 16th notes at 130 BPM (~115ms)

    const bassPattern = [
      110, 0, 110, 110,  130.81, 0, 110, 0,
      146.83, 0, 146.83, 0, 164.81, 0, 130.81, 110
    ]; // A2, C3, D3, E3

    this.bgmTimer = setInterval(() => {
      if (this.isMuted || !this.bgmPlaying || !this.ctx) return;
      
      const t = this.ctx.currentTime;
      const step16 = this.bgmStep % 16;
      const beat4 = this.bgmStep % 4;

      // 1. Kick Drum setiap quarter note (beat 0)
      if (beat4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();

        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(130, t);
        kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.12);

        kickGain.gain.setValueAtTime(0.5, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.bgmGain);

        kickOsc.start(t);
        kickOsc.stop(t + 0.12);
      }

      // 2. Hi-Hat di off-beat
      if (beat4 === 2) {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();

        hatOsc.type = 'sawtooth';
        hatOsc.frequency.setValueAtTime(8000, t);

        hatGain.gain.setValueAtTime(0.08, t);
        hatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

        hatOsc.connect(hatGain);
        hatGain.connect(this.bgmGain);

        hatOsc.start(t);
        hatOsc.stop(t + 0.05);
      }

      // 3. Synth Bassline
      const freq = bassPattern[step16];
      if (freq > 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(freq, t);

        bassGain.gain.setValueAtTime(0.18, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(t);
        bassOsc.stop(t + 0.1);
      }

      this.bgmStep++;
    }, intervalMs);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// Instance Singleton
window.soundSystem = new SoundSystem();
