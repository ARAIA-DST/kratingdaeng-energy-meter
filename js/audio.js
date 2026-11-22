/**
 * ===================================================================================
 * KRATINGDAENG SPEEDOMETER SPIN WHEEL - AUDIO SYSTEM
 * ===================================================================================
 * Menggunakan Sound Resmi: Audi V8 Acceleration Sound (assets/audio/acceleration.mp3)
 * Mendukung Mute toggle, AudioContext unlocking, dan Victory fanfare.
 * ===================================================================================
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;

    // Suara Utama: Audi V8 Acceleration Sound
    this.accelerationSound = new Audio('assets/audio/acceleration.mp3');
    this.accelerationSound.preload = 'auto';
    this.accelerationSound.loop = false;
    this.accelerationSound.volume = 1.0;

    // Inisialisasi Audio Context saat interaksi pengguna pertama kali
    this.initAudioContext();
  }

  initAudioContext() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.9, this.ctx.currentTime);
    }
    if (this.accelerationSound) {
      this.accelerationSound.muted = this.isMuted;
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMute(!this.isMuted);
  }

  /**
   * Main Engine Audio: Audi V8 Acceleration Sound
   * Dipicu saat tombol spin ditekan satu kali
   */
  startSpinSequence() {
    this.ensureContext();
    if (!this.accelerationSound) return;

    try {
      this.accelerationSound.muted = this.isMuted;
      this.accelerationSound.currentTime = 0;
      const playPromise = this.accelerationSound.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn('Autoplay diblokir oleh browser atau file belum siap:', e);
        });
      }
    } catch (err) {
      console.warn('Gagal memutar suara akselerasi:', err);
    }
  }

  stopSpinSequence() {
    if (this.accelerationSound) {
      try {
        this.accelerationSound.pause();
        this.accelerationSound.currentTime = 0;
      } catch (e) {}
    }
  }

  updateEngineRev(intensity, speedKm) {
    // Dipanggil selama animasi perputaran jarum jika ada modulasi tambahan
  }

  /**
   * Sound FX: Bunyi Tik Jarum Speedometer melintasi garis / pin
   */
  playNeedleTick(pitch = 1.0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(110 * pitch, t + 0.03);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.03);
    } catch (e) {}
  }

  /**
   * Sound FX: Hitung Mundur 3-2-1
   */
  playCountdown(isGo = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'sawtooth' : 'sine';
      const freq = isGo ? 987.77 : 440; // B5 jika Go, A4 jika hitungan

      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(isGo ? 0.35 : 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.35 : 0.18));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + (isGo ? 0.35 : 0.18));
    } catch (e) {}
  }

  /**
   * Sound FX: Fanfare Hadiah Lucky Dip Sesuai Tier
   */
  playPrizeWin(tier = 3) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const chords = tier === 1
        ? [
            { f: [523.25, 659.25, 783.99], time: 0.0, dur: 0.22 },
            { f: [587.33, 739.99, 880.00], time: 0.22, dur: 0.22 },
            { f: [659.25, 830.61, 987.77], time: 0.44, dur: 0.25 },
            { f: [783.99, 1046.50, 1318.51, 1567.98], time: 0.70, dur: 0.8 }
          ]
        : [
            { f: [523.25, 659.25], time: 0.0, dur: 0.2 },
            { f: [659.25, 783.99], time: 0.2, dur: 0.2 },
            { f: [783.99, 1046.50], time: 0.4, dur: 0.5 }
          ];

      chords.forEach(c => {
        c.f.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + c.time);

          gain.gain.setValueAtTime(0.2, t + c.time);
          gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(t + c.time);
          osc.stop(t + c.time + c.dur);
        });
      });
    } catch (e) {}
  }

  startBGM() {
    // Tidak memutar BGM synthwave agar suara Audi V8 terdengar jernih dan dominan
  }

  stopBGM() {
    // Kosong untuk kompatibilitas
  }
}

// Instance Singleton
window.soundSystem = new SoundSystem();
