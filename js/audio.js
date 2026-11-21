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
    
    // Real Engine Audio Synthesis Nodes
    this.engineNodes = null;
    this.isRevving = false;
    this.currentRPM = 1000; // Idle 1000 RPM s/d Max 9800 RPM
    this.targetRPM = 1000;
    this.engineTimer = null;
    
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
   * Sound FX: SUARA MESIN MOBIL / MOTOR BALAP NYATA (Real Internal Combustion Engine)
   * Menggunakan sintesis multi-silinder, resonansi knalpot (exhaust manifold),
   * wave-shaper distortion untuk suara mesin gahar, dan rev-limiter redline.
   */
  startEngineRev() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || this.isRevving) return;

    try {
      this.isRevving = true;
      this.currentRPM = 1200;
      this.targetRPM = 1200;
      const t = this.ctx.currentTime;

      // Master Engine Gain
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.01, t);
      masterGain.gain.linearRampToValueAtTime(0.85, t + 0.12);

      // 1. Distortion WaveShaper untuk karakter mechanical crunch mesin asli
      const distortion = this.ctx.createWaveShaper();
      distortion.curve = this.makeDistortionCurve(22);
      distortion.oversample = '4x';

      // 2. Resonansi Knalpot (Exhaust Manifold Bandpass & Lowpass)
      const exhaustResonator = this.ctx.createBiquadFilter();
      exhaustResonator.type = 'bandpass';
      exhaustResonator.frequency.setValueAtTime(260, t);
      exhaustResonator.Q.setValueAtTime(3.5, t);

      const lowpassBody = this.ctx.createBiquadFilter();
      lowpassBody.type = 'lowpass';
      lowpassBody.frequency.setValueAtTime(1400, t);
      lowpassBody.Q.setValueAtTime(1.8, t);

      // 3. Silinder Utama (Sawtooth Engine Pulse)
      const oscCylinder = this.ctx.createOscillator();
      oscCylinder.type = 'sawtooth';
      oscCylinder.frequency.setValueAtTime(45, t); // ~1350 RPM 4-silinder

      // 4. Harmonis Genap Knalpot (Square / Pulse)
      const oscHarmonic = this.ctx.createOscillator();
      oscHarmonic.type = 'square';
      oscHarmonic.frequency.setValueAtTime(90, t);

      const harmGain = this.ctx.createGain();
      harmGain.gain.setValueAtTime(0.35, t);

      // 5. Sub-Bass Rumble (Getaran Mesin Berat)
      const oscSub = this.ctx.createOscillator();
      oscSub.type = 'triangle';
      oscSub.frequency.setValueAtTime(32, t);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.7, t);

      // 6. Air Intake / Turbo Whine Hiss (Noise Filter)
      const noiseBuffer = this.createNoiseBuffer();
      let noiseNode = null;
      let noiseFilter = null;
      let noiseGain = null;
      if (noiseBuffer) {
        noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1200, t);
        noiseFilter.Q.setValueAtTime(4.0, t);

        noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04, t);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseNode.start(t);
      }

      // Wiring Rute Audio
      oscCylinder.connect(distortion);
      oscHarmonic.connect(harmGain);
      harmGain.connect(distortion);

      distortion.connect(exhaustResonator);
      exhaustResonator.connect(lowpassBody);
      lowpassBody.connect(masterGain);

      oscSub.connect(subGain);
      subGain.connect(masterGain);

      masterGain.connect(this.sfxGain);

      oscCylinder.start(t);
      oscHarmonic.start(t);
      oscSub.start(t);

      this.engineNodes = {
        masterGain,
        distortion,
        exhaustResonator,
        lowpassBody,
        oscCylinder,
        oscHarmonic,
        oscSub,
        noiseNode,
        noiseFilter,
        noiseGain
      };
    } catch (e) {
      console.warn('Gagal memulai audio rev mesin nyata:', e);
    }
  }

  /**
   * Update Putaran Mesin (RPM) Secara Real-time Mengikuti Pedal Gas
   * intensity: 0.0 (idle 1200 RPM) s/d 1.0 (redline 9800 RPM)
   */
  updateEngineRev(intensity = 0.5) {
    if (!this.isRevving || !this.ctx || !this.engineNodes) return;
    const t = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, intensity));

    // RPM naik dari 1200 RPM s/d 9800 RPM
    this.targetRPM = 1200 + (clamped * 8600);
    this.currentRPM += (this.targetRPM - this.currentRPM) * 0.25;

    // Firing frequency mesin 4-silinder = RPM / 30
    let firingFreq = this.currentRPM / 30;

    // Efek Rev Limiter "Brap-brap-brap" jika berada di Redline (RPM > 8800)
    let limiterMod = 1.0;
    if (this.currentRPM > 8500) {
      const brap = Math.sin(t * 55) > 0 ? 1.0 : 0.75;
      firingFreq *= brap;
      limiterMod = brap;
    }

    const { oscCylinder, oscHarmonic, oscSub, exhaustResonator, lowpassBody, noiseGain, noiseFilter, masterGain } = this.engineNodes;

    if (oscCylinder) oscCylinder.frequency.setTargetAtTime(firingFreq, t, 0.03);
    if (oscHarmonic) oscHarmonic.frequency.setTargetAtTime(firingFreq * 2.02, t, 0.03);
    if (oscSub) oscSub.frequency.setTargetAtTime(firingFreq * 0.5, t, 0.03);

    // Knalpot membuka frekuensi resonansi saat gas pol
    if (exhaustResonator) {
      const resFreq = 240 + (clamped * 850);
      exhaustResonator.frequency.setTargetAtTime(resFreq, t, 0.04);
    }
    if (lowpassBody) {
      const lpFreq = 1200 + (clamped * 3800);
      lowpassBody.frequency.setTargetAtTime(lpFreq, t, 0.04);
    }

    // Suara desis intake / turbo spool bertambah saat RPM tinggi
    if (noiseGain && noiseFilter) {
      noiseGain.gain.setTargetAtTime(0.03 + (clamped * 0.12), t, 0.05);
      noiseFilter.frequency.setTargetAtTime(1200 + (clamped * 2800), t, 0.05);
    }

    if (masterGain && this.currentRPM > 8500) {
      masterGain.gain.setTargetAtTime(0.75 * limiterMod, t, 0.02);
    }
  }

  /**
   * Hentikan Deru Mesin (Dengan Efek Decel Engine Braking & Pop Knalpot)
   */
  stopEngineRev() {
    if (!this.isRevving || !this.ctx || !this.engineNodes) return;
    this.isRevving = false;
    const t = this.ctx.currentTime;
    const nodes = this.engineNodes;
    this.engineNodes = null;

    try {
      // Suara decel mesin menurun cepat (engine braking)
      if (nodes.oscCylinder) {
        nodes.oscCylinder.frequency.exponentialRampToValueAtTime(35, t + 0.35);
      }
      if (nodes.masterGain) {
        nodes.masterGain.gain.linearRampToValueAtTime(0.001, t + 0.35);
      }

      // Mainkan letupan knalpot (exhaust burble / pop) saat gas dilepas
      this.playExhaustPop();

      setTimeout(() => {
        try {
          if (nodes.oscCylinder) nodes.oscCylinder.stop();
          if (nodes.oscHarmonic) nodes.oscHarmonic.stop();
          if (nodes.oscSub) nodes.oscSub.stop();
          if (nodes.noiseNode) nodes.noiseNode.stop();
        } catch (e) {}
      }, 380);
    } catch (e) {
      console.warn('Error saat stopEngineRev:', e);
    }
  }

  /**
   * Suara Letupan Knalpot Khas Mobil/Motor Balap (Exhaust Burble / Pop)
   */
  playExhaustPop() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    const popCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < popCount; i++) {
      const delay = i * 0.08 + (Math.random() * 0.04);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 60, t + delay);
      osc.frequency.exponentialRampToValueAtTime(30, t + delay + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t + delay);

      gain.gain.setValueAtTime(0.35, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + delay);
      osc.stop(t + delay + 0.07);
    }
  }

  makeDistortionCurve(amount = 20) {
    const k = typeof amount === 'number' ? amount : 20;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
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
