/**
 * ===================================================================================
 * KRATINGDAENG ENERGY METER - CORE GAME LOGIC & INTERACTION ENGINE
 * ===================================================================================
 * Mengatur siklus permainan, fisika pengisian energi, sweet spot combo,
 * item booster terbang, pencatatan statistik, dan integrasi UI.
 * ===================================================================================
 */

class KratingdaengGame {
  constructor() {
    // State Game
    this.state = 'INIT'; // INIT, COUNTDOWN, PLAYING, GAMEOVER
    this.playerName = 'Banteng Juara';
    this.duration = 15; // default 15s
    this.timeLeft = 15;
    this.timerInterval = null;
    this.loopRaf = null;

    // Energi & Skor
    this.energy = 0;           // 0 - 150%
    this.score = 0;
    this.multiplier = 1.0;
    this.comboStreak = 0;
    this.lastTapTime = 0;
    this.maxEnergyReached = 0;
    this.overchargeTime = 0;   // detik dalam overcharge (>=100%)

    // Statistik Tap & RPM
    this.totalTaps = 0;
    this.tapTimestamps = [];
    this.peakRpm = 0; // Taps per detik tertinggi

    // Sweet Spot Mechanic (Bulls-Eye Timing)
    this.sweetSpotActive = false;
    this.sweetSpotPosition = 0; // 0.0 - 1.0
    this.sweetSpotSpeed = 1.8;
    this.sweetSpotDirection = 1;

    // Floating Bonus Can / Booster
    this.booster = {
      active: false,
      x: 50,
      y: 50,
      vx: 2,
      vy: 1.5,
      type: 'can', // 'can' atau 'lightning'
      timer: null
    };

    // DOM Elements Cache
    this.initDOMElements();

    // Inisialisasi Particle System
    this.particles = new ParticleSystem(this.dom.canvas);
    this.particles.start();

    // Pasang Event Listeners
    this.bindEvents();
    this.updateLeaderboardDisplay();
  }

  initDOMElements() {
    this.dom = {
      // Screens
      startScreen: document.getElementById('start-screen'),
      gameScreen: document.getElementById('game-screen'),
      gameOverScreen: document.getElementById('game-over-screen'),
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),

      // Inputs & Controls
      nameInput: document.getElementById('player-name-input'),
      startBtn: document.getElementById('btn-start-game'),
      tapBtn: document.getElementById('btn-tap-energy'),
      restartBtn: document.getElementById('btn-play-again'),
      muteBtn: document.getElementById('btn-toggle-mute'),
      bgmBtn: document.getElementById('btn-toggle-bgm'),
      settingsBtn: document.getElementById('btn-open-settings'),
      settingsModal: document.getElementById('settings-modal'),
      closeSettingsBtn: document.getElementById('btn-close-settings'),
      saveSettingsBtn: document.getElementById('btn-save-settings'),
      testApiBtn: document.getElementById('btn-test-api'),
      scriptUrlInput: document.getElementById('appscript-url-input'),
      apiStatusMsg: document.getElementById('api-status-msg'),

      // HUD & Game Displays
      timerText: document.getElementById('hud-timer-text'),
      timerBar: document.getElementById('hud-timer-bar'),
      scoreText: document.getElementById('hud-score-text'),
      multiplierBadge: document.getElementById('hud-multiplier-badge'),
      rpmText: document.getElementById('hud-rpm-text'),
      
      // Energy Meter Elements
      energyPercentText: document.getElementById('energy-percent-text'),
      gaugeNeedle: document.getElementById('gauge-needle'),
      bottleLiquid: document.getElementById('bottle-liquid-fill'),
      bottleAura: document.getElementById('bottle-aura'),
      sweetSpotIndicator: document.getElementById('sweet-spot-indicator'),
      sweetSpotZone: document.getElementById('sweet-spot-zone'),
      overchargeBanner: document.getElementById('overcharge-banner'),

      // Floating Booster
      floatingBooster: document.getElementById('floating-booster'),

      // Canvas
      canvas: document.getElementById('fx-canvas'),

      // Result Displays
      finalScore: document.getElementById('res-final-score'),
      finalTier: document.getElementById('res-tier-badge'),
      finalTaps: document.getElementById('res-total-taps'),
      finalRpm: document.getElementById('res-peak-rpm'),
      finalOvercharge: document.getElementById('res-overcharge-pct'),
      sheetSyncStatus: document.getElementById('sheet-sync-status'),
      certLinkContainer: document.getElementById('cert-link-container'),
      certLinkBtn: document.getElementById('btn-view-cert'),
      leaderboardBody: document.getElementById('leaderboard-rows'),
      refreshLbBtn: document.getElementById('btn-refresh-leaderboard'),
      shareBtn: document.getElementById('btn-share-result')
    };

    // Set initial value URL Apps Script jika tersimpan
    if (this.dom.scriptUrlInput) {
      this.dom.scriptUrlInput.value = window.apiService.getScriptUrl();
    }
  }

  bindEvents() {
    // Tombol Mulai
    this.dom.startBtn.addEventListener('click', () => {
      this.initAudioAndStart();
    });

    // Enter di input nama langsung mulai
    this.dom.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.initAudioAndStart();
    });

    // Tombol Main Lagi
    this.dom.restartBtn.addEventListener('click', () => {
      this.showStartScreen();
    });

    // Audio & Mute Controls
    this.dom.muteBtn.addEventListener('click', () => {
      const isMuted = window.soundSystem.toggleMute();
      this.dom.muteBtn.innerHTML = isMuted 
        ? '<span class="icon">🔇</span> MUTE' 
        : '<span class="icon">🔊</span> SUARA ON';
      this.dom.muteBtn.classList.toggle('active', !isMuted);
    });

    this.dom.bgmBtn.addEventListener('click', () => {
      window.soundSystem.ensureContext();
      if (window.soundSystem.bgmPlaying) {
        window.soundSystem.stopBGM();
        this.dom.bgmBtn.classList.remove('active');
        this.dom.bgmBtn.innerHTML = '<span class="icon">🎵</span> MUSIK OFF';
      } else {
        window.soundSystem.startBGM();
        this.dom.bgmBtn.classList.add('active');
        this.dom.bgmBtn.innerHTML = '<span class="icon">🎶</span> MUSIK ON';
      }
    });

    // Pengaturan Modal
    this.dom.settingsBtn.addEventListener('click', () => {
      this.dom.scriptUrlInput.value = window.apiService.getScriptUrl();
      this.dom.apiStatusMsg.textContent = '';
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.closeSettingsBtn.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.saveSettingsBtn.addEventListener('click', () => {
      window.apiService.setScriptUrl(this.dom.scriptUrlInput.value);
      this.dom.apiStatusMsg.textContent = '✅ URL tersimpan!';
      this.dom.apiStatusMsg.style.color = '#10b981';
      setTimeout(() => {
        this.dom.settingsModal.classList.add('hidden');
        this.updateLeaderboardDisplay();
      }, 700);
    });

    this.dom.testApiBtn.addEventListener('click', async () => {
      this.dom.apiStatusMsg.textContent = 'Menguji koneksi...';
      this.dom.apiStatusMsg.style.color = '#ffd700';
      const res = await window.apiService.testConnection(this.dom.scriptUrlInput.value);
      this.dom.apiStatusMsg.textContent = res.message;
      this.dom.apiStatusMsg.style.color = res.success ? '#10b981' : '#ef4444';
    });

    // Refresh Leaderboard Button
    if (this.dom.refreshLbBtn) {
      this.dom.refreshLbBtn.addEventListener('click', () => this.updateLeaderboardDisplay());
    }

    // Share Score Button
    if (this.dom.shareBtn) {
      this.dom.shareBtn.addEventListener('click', () => this.shareScore());
    }

    // --- INTERAKSI TAP / MASHING ENERGI ---
    // Multi-touch friendly: prevent default zoom & scroll pada tombol energi
    const handleTap = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (this.state === 'PLAYING') {
        const rect = this.dom.tapBtn.getBoundingClientRect();
        const clientX = e && e.touches && e.touches[0] ? e.touches[0].clientX : (e ? e.clientX : rect.left + rect.width / 2);
        const clientY = e && e.touches && e.touches[0] ? e.touches[0].clientY : (e ? e.clientY : rect.top + rect.height / 2);
        this.triggerEnergyTap(clientX, clientY);
      }
    };

    this.dom.tapBtn.addEventListener('touchstart', handleTap, { passive: false });
    this.dom.tapBtn.addEventListener('mousedown', handleTap);

    // Keyboard support: Spacebar, Enter, ArrowUp
    window.addEventListener('keydown', (e) => {
      if (this.state === 'PLAYING' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp')) {
        e.preventDefault();
        const rect = this.dom.tapBtn.getBoundingClientRect();
        this.triggerEnergyTap(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    });

    // Floating Booster Click/Tap
    this.dom.floatingBooster.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.claimBooster(e.clientX, e.clientY);
    });

    // Durasi Selector Buttons
    document.querySelectorAll('.duration-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.duration-pill').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.duration = parseInt(btn.dataset.duration, 10) || 15;
      });
    });
  }

  initAudioAndStart() {
    window.soundSystem.ensureContext();
    const name = this.dom.nameInput.value.trim();
    this.playerName = name ? name : 'Banteng Juara';
    this.startCountdown();
  }

  showStartScreen() {
    this.state = 'INIT';
    this.dom.gameOverScreen.classList.add('hidden');
    this.dom.gameScreen.classList.add('hidden');
    this.dom.startScreen.classList.remove('hidden');
    this.updateLeaderboardDisplay();
  }

  startCountdown() {
    this.state = 'COUNTDOWN';
    this.dom.startScreen.classList.add('hidden');
    this.dom.gameScreen.classList.remove('hidden');
    this.dom.countdownOverlay.classList.remove('hidden');

    let count = 3;
    this.dom.countdownText.textContent = count;
    window.soundSystem.playCountdown(false);

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.dom.countdownText.textContent = count;
        this.dom.countdownText.classList.remove('pop');
        void this.dom.countdownText.offsetWidth; // trigger reflow
        this.dom.countdownText.classList.add('pop');
        window.soundSystem.playCountdown(false);
      } else if (count === 0) {
        this.dom.countdownText.textContent = 'SURGE!';
        this.dom.countdownText.style.color = '#ffd700';
        window.soundSystem.playCountdown(true);
      } else {
        clearInterval(countInterval);
        this.dom.countdownOverlay.classList.add('hidden');
        this.startMatch();
      }
    }, 900);
  }

  startMatch() {
    this.state = 'PLAYING';
    this.timeLeft = this.duration;
    this.energy = 20; // Mulai dari 20%
    this.score = 0;
    this.multiplier = 1.0;
    this.comboStreak = 0;
    this.totalTaps = 0;
    this.tapTimestamps = [];
    this.peakRpm = 0;
    this.maxEnergyReached = 20;
    this.overchargeTime = 0;

    // Mulai background music jika belum jalan
    window.soundSystem.startBGM();
    this.dom.bgmBtn.classList.add('active');
    this.dom.bgmBtn.innerHTML = '<span class="icon">🎶</span> MUSIK ON';

    // Timer Interval Game (per detik)
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();

      if (this.timeLeft <= 0) {
        this.endMatch();
      }
    }, 1000);

    // Booster Spawner Loop
    this.scheduleNextBooster();

    // Main Game Physics Loop (60 FPS)
    this.lastLoopTime = performance.now();
    this.loopRaf = requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Main Physics & Animation Loop (60 FPS)
   */
  gameLoop(currentTime) {
    if (this.state !== 'PLAYING') return;

    const dt = (currentTime - this.lastLoopTime) / 1000;
    this.lastLoopTime = currentTime;

    // 1. Natural Energy Decay: energi turun seiring waktu jika tidak ditap
    // Decay lebih kencang saat energi berada di atas 80% (menantang!)
    const decayRate = 8 + (this.energy * 0.22); // 8% - 41% per detik
    this.energy = Math.max(0, this.energy - (decayRate * dt));

    // 2. Combo Streak Decay jika berhenti tap lebih dari 0.65 detik
    const now = Date.now();
    if (now - this.lastTapTime > 650 && this.comboStreak > 0) {
      this.comboStreak = Math.max(0, this.comboStreak - Math.ceil(dt * 15));
      this.calculateMultiplier();
    }

    // 3. Sweet Spot Oscillator (Garis Target Timing)
    this.sweetSpotPosition += this.sweetSpotSpeed * this.sweetSpotDirection * dt;
    if (this.sweetSpotPosition >= 1.0) {
      this.sweetSpotPosition = 1.0;
      this.sweetSpotDirection = -1;
    } else if (this.sweetSpotPosition <= 0) {
      this.sweetSpotPosition = 0;
      this.sweetSpotDirection = 1;
    }

    // Sweet Spot Zone berada di 0.70 - 0.85 (70%-85%)
    this.sweetSpotActive = (this.sweetSpotPosition >= 0.68 && this.sweetSpotPosition <= 0.86);

    // 4. Overcharge Check
    if (this.energy >= 100) {
      this.overchargeTime += dt;
      this.score += Math.round(75 * dt * this.multiplier); // Bonus pasif score saat overcharge
      this.dom.overchargeBanner.classList.remove('hidden');
      this.dom.bottleAura.classList.add('overcharged');
      
      // Random micro sparks
      if (Math.random() < 0.3) {
        const rect = this.dom.bottleLiquid.getBoundingClientRect();
        this.particles.createSparks(rect.left + rect.width * Math.random(), rect.top + rect.height * Math.random(), 3, true);
      }
    } else {
      this.dom.overchargeBanner.classList.add('hidden');
      this.dom.bottleAura.classList.remove('overcharged');
    }

    // Catat Max Energy
    if (this.energy > this.maxEnergyReached) {
      this.maxEnergyReached = Math.round(this.energy);
    }

    // 5. Update Floating Booster Posisi (jika aktif)
    this.updateBooster(dt);

    // 6. Update Semua Visual Meter
    this.updateVisualMeters();

    this.loopRaf = requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Pemain menekan tombol Tap / Spacebar
   */
  triggerEnergyTap(clientX, clientY) {
    const now = Date.now();
    this.lastTapTime = now;
    this.totalTaps++;

    // Hitung Realtime Taps/detik (RPM)
    this.tapTimestamps.push(now);
    const oneSecAgo = now - 1000;
    this.tapTimestamps = this.tapTimestamps.filter(t => t > oneSecAgo);
    const currentRpm = this.tapTimestamps.length;
    if (currentRpm > this.peakRpm) {
      this.peakRpm = currentRpm;
    }

    // Cek apakah mengenai Sweet Spot (Bull's Eye)
    const isCrit = this.sweetSpotActive;
    let energyGain = isCrit ? 7.5 : 3.8;
    let points = isCrit ? 150 : 50;

    // Update Combo Streak
    this.comboStreak++;
    this.calculateMultiplier();

    // Akumulasi Poin
    const earnedScore = Math.round(points * this.multiplier);
    this.score += earnedScore;

    // Tambah Energi
    this.energy = Math.min(150, this.energy + energyGain);

    // Audio SFX
    if (isCrit) {
      window.soundSystem.playSweetSpot();
      this.particles.createSparks(clientX, clientY, 20, true);
      this.particles.addFloatingText(`CRITICAL x${this.multiplier.toFixed(1)}!`, clientX, clientY - 30, '#ffd700', true);
      this.triggerScreenShake(8);
    } else {
      window.soundSystem.playTap(this.energy);
      this.particles.createSparks(clientX, clientY, 10, false);
      this.particles.addFloatingText(`+${earnedScore}`, clientX, clientY - 20, '#ffffff', false);
      this.triggerScreenShake(3);
    }

    // Jika baru saja menembus 100% pertama kali
    if (this.energy >= 100 && this.energy - energyGain < 100) {
      window.soundSystem.playOvercharge();
      this.particles.createOverchargeExplosion();
      this.particles.addFloatingText(`⚡ BULL OVERCHARGE! ⚡`, window.innerWidth / 2, window.innerHeight / 2 - 50, '#ff1744', true);
    }

    // Tombol Animation Feedback
    this.dom.tapBtn.classList.remove('tap-pulse');
    void this.dom.tapBtn.offsetWidth;
    this.dom.tapBtn.classList.add('tap-pulse');
  }

  calculateMultiplier() {
    if (this.comboStreak >= 35) {
      this.multiplier = 4.0;
    } else if (this.comboStreak >= 20) {
      this.multiplier = 3.0;
    } else if (this.comboStreak >= 10) {
      this.multiplier = 2.0;
    } else if (this.comboStreak >= 5) {
      this.multiplier = 1.5;
    } else {
      this.multiplier = 1.0;
    }
  }

  /**
   * Floating Booster (Kaleng Emas / Petir Kratingdaeng)
   */
  scheduleNextBooster() {
    if (this.state !== 'PLAYING') return;
    const delay = Math.random() * 4000 + 3500; // setiap 3.5 - 7.5 detik

    this.booster.timer = setTimeout(() => {
      if (this.state !== 'PLAYING') return;
      this.spawnBooster();
    }, delay);
  }

  spawnBooster() {
    this.booster.active = true;
    this.booster.type = Math.random() > 0.5 ? 'can' : 'lightning';
    this.booster.x = Math.random() * (window.innerWidth - 120) + 60;
    this.booster.y = Math.random() * (window.innerHeight - 300) + 100;
    this.booster.vx = (Math.random() * 3 + 1.5) * (Math.random() > 0.5 ? 1 : -1);
    this.booster.vy = (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1);

    this.dom.floatingBooster.className = `floating-booster ${this.booster.type}`;
    this.dom.floatingBooster.innerHTML = this.booster.type === 'can' 
      ? '🥫 <span class="booster-label">+500 ENERGI</span>' 
      : '⚡ <span class="booster-label">MEGA BOOST</span>';
    this.dom.floatingBooster.style.display = 'flex';

    // Hilang otomatis dalam 3.2 detik jika tidak diklik
    setTimeout(() => {
      if (this.booster.active) {
        this.dismissBooster();
      }
    }, 3200);
  }

  updateBooster(dt) {
    if (!this.booster.active) return;
    this.booster.x += this.booster.vx * 60 * dt;
    this.booster.y += this.booster.vy * 60 * dt;

    // Bounce off walls
    if (this.booster.x <= 20 || this.booster.x >= window.innerWidth - 100) this.booster.vx *= -1;
    if (this.booster.y <= 80 || this.booster.y >= window.innerHeight - 150) this.booster.vy *= -1;

    this.dom.floatingBooster.style.left = `${this.booster.x}px`;
    this.dom.floatingBooster.style.top = `${this.booster.y}px`;
  }

  claimBooster(clientX, clientY) {
    if (!this.booster.active) return;
    this.booster.active = false;
    this.dom.floatingBooster.style.display = 'none';

    // Reward
    this.energy = Math.min(150, this.energy + 25);
    const bonusScore = 500 * this.multiplier;
    this.score += bonusScore;

    window.soundSystem.playPowerUp();
    this.particles.createSparks(clientX, clientY, 35, true);
    this.particles.addFloatingText(`🥫 +${bonusScore} BONUS SURGE!`, clientX, clientY - 40, '#ffd700', true);

    this.scheduleNextBooster();
  }

  dismissBooster() {
    this.booster.active = false;
    this.dom.floatingBooster.style.display = 'none';
    this.scheduleNextBooster();
  }

  /**
   * Update Tampilan Visual (Speedometer Gauge, Kratingdaeng Bottle Liquid, HUD)
   */
  updateVisualMeters() {
    const displayEnergy = Math.round(this.energy);
    this.dom.energyPercentText.textContent = `${displayEnergy}%`;

    // 1. Speedometer Needle Rotation: -90deg (0%) sampai +90deg (100%), hingga +120deg (150%)
    const clampedEnergy = Math.min(150, Math.max(0, this.energy));
    const needleDeg = -90 + (clampedEnergy / 100) * 180;
    this.dom.gaugeNeedle.style.transform = `rotate(${needleDeg}deg)`;

    // 2. Kratingdaeng Bottle Liquid Height: 0% sampai 100%
    const liquidPercent = Math.min(100, clampedEnergy);
    this.dom.bottleLiquid.style.height = `${liquidPercent}%`;

    // 3. Sweet Spot Indicator
    const indicatorPct = this.sweetSpotPosition * 100;
    this.dom.sweetSpotIndicator.style.left = `${indicatorPct}%`;
    this.dom.sweetSpotIndicator.classList.toggle('active', this.sweetSpotActive);

    // 4. HUD Text
    this.dom.scoreText.textContent = this.score.toLocaleString('id-ID');
    this.dom.multiplierBadge.textContent = `${this.multiplier.toFixed(1)}x`;
    this.dom.multiplierBadge.className = `multiplier-badge mult-${this.multiplier.toFixed(1).replace('.', '-')}`;
    this.dom.rpmText.textContent = this.tapTimestamps.length;
  }

  updateTimerDisplay() {
    this.dom.timerText.textContent = `${this.timeLeft}s`;
    const pct = (this.timeLeft / this.duration) * 100;
    this.dom.timerBar.style.width = `${pct}%`;

    if (this.timeLeft <= 5) {
      this.dom.timerBar.classList.add('urgent');
      window.soundSystem.playCountdown(false);
    }
  }

  triggerScreenShake(intensity = 5) {
    const mainWrap = document.getElementById('app-container');
    mainWrap.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
    setTimeout(() => {
      mainWrap.style.transform = 'translate(0, 0)';
    }, 45);
  }

  /**
   * Akhir Pertandingan (Game Over & Victory)
   */
  async endMatch() {
    this.state = 'GAMEOVER';
    clearInterval(this.timerInterval);
    if (this.booster.timer) clearTimeout(this.booster.timer);
    if (this.loopRaf) cancelAnimationFrame(this.loopRaf);
    this.dom.floatingBooster.style.display = 'none';

    window.soundSystem.stopBGM();
    window.soundSystem.playVictory();

    // Hitung Gelar Stamina (Tier)
    const tier = this.determineTier(this.score);

    // Tampilkan Data di Layar Hasil
    this.dom.finalScore.textContent = this.score.toLocaleString('id-ID');
    this.dom.finalTier.textContent = tier;
    this.dom.finalTaps.textContent = this.totalTaps;
    this.dom.finalRpm.textContent = `${this.peakRpm} taps/s`;
    this.dom.finalOvercharge.textContent = `${this.maxEnergyReached}%`;

    this.dom.gameScreen.classList.add('hidden');
    this.dom.gameOverScreen.classList.remove('hidden');

    // Ledakan Confetti
    this.particles.createOverchargeExplosion();

    // Simpan ke Google Sheet & Google Drive
    await this.syncScoreToBackend(tier);
  }

  determineTier(score) {
    if (score >= 14000) return '⚡ BULL OVERCHARGE GOD ⚡';
    if (score >= 10000) return '🔥 Sang Juara Kratingdaeng 🔥';
    if (score >= 7000)  return '💪 Pejuang Stamina Tinggi 💪';
    if (score >= 4000)  return '⚡ Kratingdaeng Active Booster ⚡';
    return '🌱 Stamina Pemula (Ayo Minum Kratingdaeng!)';
  }

  async syncScoreToBackend(tier) {
    this.dom.sheetSyncStatus.innerHTML = `
      <span class="spinner"></span> Menyimpan skor ke Google Sheet & membuat sertifikat di Google Drive...
    `;
    this.dom.sheetSyncStatus.className = 'status-pill pending';
    this.dom.certLinkContainer.classList.add('hidden');

    const payload = {
      name: this.playerName,
      score: this.score,
      tier: tier,
      peakRpm: this.peakRpm,
      duration: this.duration,
      maxPercent: this.maxEnergyReached,
      device: window.innerWidth < 768 ? 'Mobile' : 'Desktop'
    };

    try {
      const result = await window.apiService.submitScore(payload);
      
      this.dom.sheetSyncStatus.className = 'status-pill success';
      this.dom.sheetSyncStatus.innerHTML = `
        ✅ ${result.message || 'Berhasil dicatat!'} <strong>(Peringkat #${result.rank || 1})</strong>
      `;

      // Jika ada sertifikat Google Drive
      if (result.certificateUrl && result.certificateUrl !== '#') {
        this.dom.certLinkContainer.classList.remove('hidden');
        this.dom.certLinkBtn.href = result.certificateUrl;
      }

    } catch (e) {
      this.dom.sheetSyncStatus.className = 'status-pill error';
      this.dom.sheetSyncStatus.textContent = 'Tersimpan di Penyimpanan Lokal (Offline).';
    }

    // Refresh Leaderboard
    this.updateLeaderboardDisplay();
  }

  async updateLeaderboardDisplay() {
    if (!this.dom.leaderboardBody) return;
    this.dom.leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Memuat Leaderboard...</td></tr>';

    const scores = await window.apiService.getLeaderboard();
    
    if (!scores || scores.length === 0) {
      this.dom.leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada skor tercatat. Jadilah yang pertama!</td></tr>';
      return;
    }

    let rowsHtml = '';
    scores.forEach((entry, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      const isTop3 = idx < 3 ? 'top-rank' : '';
      rowsHtml += `
        <tr class="${isTop3}">
          <td class="rank-col">${medal}</td>
          <td class="name-col"><strong>${this.escapeHtml(entry.name)}</strong></td>
          <td class="score-col">${(entry.score || 0).toLocaleString('id-ID')}</td>
          <td class="tier-col">${this.escapeHtml(entry.tier || '')}</td>
        </tr>
      `;
    });

    this.dom.leaderboardBody.innerHTML = rowsHtml;
  }

  shareScore() {
    const text = `🐂⚡ Saya baru saja meraih skor ${this.score.toLocaleString('id-ID')} PTS dengan gelar "${this.determineTier(this.score)}" di Kratingdaeng Energy Meter Rush! Bisakah kamu mengalahkan staminaku?`;
    if (navigator.share) {
      navigator.share({
        title: 'Kratingdaeng Energy Meter Rush',
        text: text,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Teks skor berhasil disalin ke clipboard! Bagikan ke temanmu.');
      });
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Inisialisasi saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new KratingdaengGame();
});
