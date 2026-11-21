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
   * Sound FX: Suara Mesin Menderu (Engine Rev) saat Tekan & Tahan Gas
   * Menggunakan 3 Layer Sample Audio Nyata: on_low, on_midhigh, on_high
   */
  startEngineRev() {
    if (this.isMuted) return;
    this.ensureContext();
    this.isRevving = true;

    // Hentikan suara deselerasi (off sounds) jika sedang berputar
    if (this.offTimer) {
      clearTimeout(this.offTimer);
      this.offTimer = null;
    }
    if (this.samples) {
      this.pauseTrackSafe(this.samples.offMidHigh);
      this.pauseTrackSafe(this.samples.offLower);

      // Mulai putar 3 layer on audio
      try {
        this.samples.onLow.currentTime = 0;
        this.samples.onMidHigh.currentTime = 0;
        this.samples.onHigh.currentTime = 0;
        
        this.samples.onLow.volume = 0.85;
        this.samples.onMidHigh.volume = 0.05;
        this.samples.onHigh.volume = 0.0;

        this.playTrackSafe(this.samples.onLow);
        this.playTrackSafe(this.samples.onMidHigh);
        this.playTrackSafe(this.samples.onHigh);
      } catch (e) {
        console.warn('Gagal memutar sample engine on:', e);
      }
    }
  }

  /**
   * Update Crossfade & Pitch Sample Mesin berdasarkan Kecepatan KM/H (0 - 180 KM/H)
   */
  updateEngineRev(intensity = 0.5, speed = 0) {
    if (!this.isRevving) return;

    if (this.samples && !this.isMuted) {
      const spd = typeof speed === 'number' && speed > 0 ? speed : intensity * 180;

      // 1. Crossfade dinamis 3 layer sample:
      // on_low: dominan di 0 - 65 km/h
      // on_midhigh: dominan di 65 - 135 km/h
      // on_high: dominan di 135 - 180 km/h (redline)
      let volLow = 0;
      let volMid = 0;
      let volHigh = 0;

      if (spd <= 65) {
        const ratio = spd / 65;
        volLow = 0.9 - (ratio * 0.35); // 0.9 -> 0.55
        volMid = ratio * 0.7;          // 0.0 -> 0.7
        volHigh = 0;
      } else if (spd <= 135) {
        const ratio = (spd - 65) / 70;
        volLow = Math.max(0, 0.55 - (ratio * 0.55)); // 0.55 -> 0.0
        volMid = 0.9 - (ratio * 0.2);               // 0.9 -> 0.7
        volHigh = ratio * 0.85;                     // 0.0 -> 0.85
      } else {
        const ratio = (spd - 135) / 45;
        volLow = 0;
        volMid = Math.max(0.1, 0.7 - (ratio * 0.6)); // 0.7 -> 0.1
        volHigh = 0.85 + (ratio * 0.15);            // 0.85 -> 1.0 (scream!)
      }

      this.samples.onLow.volume = Math.max(0, Math.min(1, volLow));
      this.samples.onMidHigh.volume = Math.max(0, Math.min(1, volMid));
      this.samples.onHigh.volume = Math.max(0, Math.min(1, volHigh));

      // 2. Halus pitch rate bending (0.92x s/d 1.18x) untuk akselerasi organik
      const rate = 0.92 + (spd / 180) * 0.26;
      try {
        this.samples.onLow.playbackRate = rate;
        this.samples.onMidHigh.playbackRate = rate;
        this.samples.onHigh.playbackRate = rate;
      } catch (e) {}
    }
  }

  /**
   * Hentikan Putaran Gas (Throttle Off / Deceleration)
   * Memainkan sample nyata: off_midhigh.wav lalu off_lower.wav
   */
  stopEngineRev(speedAtRelease = 100) {
    if (!this.isRevving) return;
    this.isRevving = false;

    // Segera redam & hentikan semua layer ON
    if (this.samples) {
      this.pauseTrackSafe(this.samples.onLow);
      this.pauseTrackSafe(this.samples.onMidHigh);
      this.pauseTrackSafe(this.samples.onHigh);

      if (!this.isMuted) {
        const spd = typeof speedAtRelease === 'number' ? speedAtRelease : 100;

        if (spd >= 80) {
          // Lepas gas di kecepatan tinggi/sedang: Mainkan off_midhigh dulu
          try {
            this.samples.offMidHigh.currentTime = 0;
            this.samples.offMidHigh.volume = 0.9;
            this.playTrackSafe(this.samples.offMidHigh);

            // Transisi ke off_lower saat jarum melambat (~1.2 detik kemudian)
            this.offTimer = setTimeout(() => {
              try {
                this.samples.offLower.currentTime = 0;
                this.samples.offLower.volume = 0.85;
                this.playTrackSafe(this.samples.offLower);
              } catch (e) {}
            }, 1200);
          } catch (e) {
            console.warn('Gagal memutar off_midhigh:', e);
          }
        } else {
          // Lepas gas di kecepatan rendah: Langsung mainkan off_lower
          try {
            this.samples.offLower.currentTime = 0;
            this.samples.offLower.volume = 0.85;
            this.playTrackSafe(this.samples.offLower);
          } catch (e) {
            console.warn('Gagal memutar off_lower:', e);
          }
        }
      }
    }
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
