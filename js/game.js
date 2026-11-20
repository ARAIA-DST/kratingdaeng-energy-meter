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

    // Ketupat Splitting Mechanics & RNG Winning Ratios
    // 10% Tier 1 (Terbelah 100%)
    // 30% Tier 2 (Terbelah 70%)
    // 60% Tier 3 (Terbelah 30%)
    this.splitPercent = 0;
    this.roundTargetTier = 3;
    this.maxPossibleSplit = 30;
    this.roundTierTitle = 'Tier 3: Terbelah 30%';
    this.hasTriggered30 = false;
    this.hasTriggered70 = false;
    this.hasTriggered100 = false;

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
      type: 'can',
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
      
      // Ketupat Arena Elements
      energyPercentText: document.getElementById('energy-percent-text'),
      ketupatSplitStatus: document.getElementById('ketupat-split-status'),
      ketupatProgressFill: document.getElementById('ketupat-progress-fill'),
      ketupatStage: document.getElementById('ketupat-stage'),
      ketupatLeft: document.getElementById('ketupat-half-left'),
      ketupatRight: document.getElementById('ketupat-half-right'),
      ketupatCore: document.getElementById('ketupat-inner-core'),
      marker30: document.querySelector('.milestone-marker.m-30'),
      marker70: document.querySelector('.milestone-marker.m-70'),
      marker100: document.querySelector('.milestone-marker.m-100'),
      sweetSpotIndicator: document.getElementById('sweet-spot-indicator'),
      sweetSpotZone: document.getElementById('sweet-spot-zone'),
      overchargeBanner: document.getElementById('overcharge-banner'),

      // Floating Booster
      floatingBooster: document.getElementById('floating-booster'),

      // Canvas
      canvas: document.getElementById('fx-canvas'),

      // Result Displays
      finalSplit: document.getElementById('res-final-split'),
      finalScore: document.getElementById('res-final-score'),
      finalTier: document.getElementById('res-tier-badge'),
      finalTierDesc: document.getElementById('res-tier-desc'),
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
        ? `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> <span>MUTE</span>`
        : `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg> <span>SUARA ON</span>`;
      this.dom.muteBtn.classList.toggle('active', !isMuted);
    });

    this.dom.bgmBtn.addEventListener('click', () => {
      window.soundSystem.ensureContext();
      if (window.soundSystem.bgmPlaying) {
        window.soundSystem.stopBGM();
        this.dom.bgmBtn.classList.remove('active');
        this.dom.bgmBtn.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <span>MUSIK OFF</span>`;
      } else {
        window.soundSystem.startBGM();
        this.dom.bgmBtn.classList.add('active');
        this.dom.bgmBtn.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <span>MUSIK ON</span>`;
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
      this.dom.apiStatusMsg.textContent = 'URL berhasil disimpan.';
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
    this.score = 0;
    this.multiplier = 1.0;
    this.comboStreak = 0;
    this.totalTaps = 0;
    this.tapTimestamps = [];
    this.peakRpm = 0;
    this.overchargeTime = 0;

    // Roll Target Tier & Cap sesuai rasio kemenangan (10% Tier 1, 30% Tier 2, 60% Tier 3)
    this.rollRoundTier();

    // Mulai background music jika belum jalan
    window.soundSystem.startBGM();
    this.dom.bgmBtn.classList.add('active');
    this.dom.bgmBtn.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <span>MUSIK ON</span>`;

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

  rollRoundTier() {
    // 1. 10% Tier 1 terbelah 100%
    // 2. 30% Tier 2 terbelah 70%
    // 3. 60% Tier 3 terbelah 30%
    const rand = Math.random() * 100;
    if (rand < 10) {
      this.roundTargetTier = 1;
      this.maxPossibleSplit = 100;
      this.roundTierTitle = 'Tier 1: Terbelah 100%';
    } else if (rand < 40) { // 10% + 30% = 40%
      this.roundTargetTier = 2;
      this.maxPossibleSplit = 70;
      this.roundTierTitle = 'Tier 2: Terbelah 70%';
    } else { // 60% sisa
      this.roundTargetTier = 3;
      this.maxPossibleSplit = 30;
      this.roundTierTitle = 'Tier 3: Terbelah 30%';
    }

    this.splitPercent = 0;
    this.energy = 0;
    this.hasTriggered30 = false;
    this.hasTriggered70 = false;
    this.hasTriggered100 = false;

    if (this.dom.marker30) this.dom.marker30.classList.remove('achieved');
    if (this.dom.marker70) this.dom.marker70.classList.remove('achieved');
    if (this.dom.marker100) this.dom.marker100.classList.remove('achieved');
  }

  /**
   * Main Physics & Animation Loop (60 FPS)
   */
  gameLoop(currentTime) {
    if (this.state !== 'PLAYING') return;

    const dt = (currentTime - this.lastLoopTime) / 1000;
    this.lastLoopTime = currentTime;

    // 1. Retensi Belahan: Belahan tetap bertahan di pos checkpoint (30%, 70%, 100%)
    let minFloor = 0;
    if (this.splitPercent >= 100) minFloor = 100;
    else if (this.splitPercent >= 70) minFloor = 70;
    else if (this.splitPercent >= 30) minFloor = 30;

    if (this.splitPercent > minFloor) {
      this.splitPercent = Math.max(minFloor, this.splitPercent - (2.5 * dt));
    }
    this.energy = this.splitPercent;

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

    // 4. Overcharge Banner Status
    if (this.splitPercent >= 100) {
      this.dom.overchargeBanner.textContent = 'TIER 1 TERCAPAI: KETUPAT TERBELAH 100%!';
      this.dom.overchargeBanner.classList.remove('hidden');
    } else if (this.splitPercent >= 70) {
      this.dom.overchargeBanner.textContent = 'TIER 2 TERCAPAI: KETUPAT TERBELAH 70%!';
      this.dom.overchargeBanner.classList.remove('hidden');
    } else if (this.splitPercent >= 30) {
      this.dom.overchargeBanner.textContent = 'TIER 3 TERCAPAI: KETUPAT TERBELAH 30%!';
      this.dom.overchargeBanner.classList.remove('hidden');
    } else {
      this.dom.overchargeBanner.classList.add('hidden');
    }

    // 5. Update Floating Booster Posisi (jika aktif)
    this.updateBooster(dt);

    // 6. Update Semua Visual Meter
    this.updateVisualMeters();

    this.loopRaf = requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Pemain menekan tombol Tap / Spacebar (Ketuk Ketupat)
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
    let splitGain = isCrit ? 2.6 : 1.3;
    let points = isCrit ? 150 : 50;

    // Update Combo Streak
    this.comboStreak++;
    this.calculateMultiplier();

    // Akumulasi Poin
    const earnedScore = Math.round(points * this.multiplier);
    this.score += earnedScore;

    // Tambah Progres Belahan Ketupat (Dibatasi oleh target tier putaran ini)
    this.splitPercent = Math.min(this.maxPossibleSplit, this.splitPercent + splitGain);
    this.energy = this.splitPercent;

    // Efek Getaran Fisik Ketupat (Recoil)
    if (this.dom.ketupatStage) {
      this.dom.ketupatStage.classList.remove('hit-recoil');
      void this.dom.ketupatStage.offsetWidth;
      this.dom.ketupatStage.classList.add('hit-recoil');
    }

    // Audio SFX & Partikel
    if (isCrit) {
      window.soundSystem.playSweetSpot();
      this.particles.createSparks(clientX, clientY, 20, true);
      this.particles.addFloatingText(`CRITICAL x${this.multiplier.toFixed(1)}!`, clientX, clientY - 30, '#ffd700', true);
      this.triggerScreenShake(8);
    } else {
      window.soundSystem.playTap(this.splitPercent);
      this.particles.createSparks(clientX, clientY, 10, false);
      this.particles.addFloatingText(`+${earnedScore}`, clientX, clientY - 20, '#ffffff', false);
      this.triggerScreenShake(3);
    }

    // Cek Pencapaian Milestone Belahan
    if (this.splitPercent >= 30 && !this.hasTriggered30) {
      this.hasTriggered30 = true;
      if (this.dom.marker30) this.dom.marker30.classList.add('achieved');
      this.particles.addFloatingText('TIER 3 (30%) TERBELAH!', clientX, clientY - 50, '#8bc34a', true);
      window.soundSystem.playSweetSpot();
    }
    if (this.splitPercent >= 70 && !this.hasTriggered70) {
      this.hasTriggered70 = true;
      if (this.dom.marker70) this.dom.marker70.classList.add('achieved');
      this.particles.addFloatingText('TIER 2 (70%) TERBELAH!', clientX, clientY - 50, '#00e5ff', true);
      window.soundSystem.playSweetSpot();
    }
    if (this.splitPercent >= 100 && !this.hasTriggered100) {
      this.hasTriggered100 = true;
      if (this.dom.marker100) this.dom.marker100.classList.add('achieved');
      window.soundSystem.playOvercharge();
      this.particles.createOverchargeExplosion();
      this.particles.addFloatingText('TIER 1 (100%) TERBELAH SEMPURNA!', window.innerWidth / 2, window.innerHeight / 2 - 50, '#ffd700', true);
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
      ? '<span class="booster-label">+500 ENERGI</span>' 
      : '<span class="booster-label">MEGA BOOST</span>';
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
    this.particles.addFloatingText(`+${bonusScore} BONUS SURGE!`, clientX, clientY - 40, '#ffd700', true);

    this.scheduleNextBooster();
  }

  dismissBooster() {
    this.booster.active = false;
    this.dom.floatingBooster.style.display = 'none';
    this.scheduleNextBooster();
  }

  /**
   * Update Tampilan Visual (Ketupat Progress, Pemisahan Belahan Ketupat, Core Reveal, HUD)
   */
  updateVisualMeters() {
    const displaySplit = Math.round(this.splitPercent);
    if (this.dom.energyPercentText) {
      this.dom.energyPercentText.textContent = `${displaySplit}%`;
    }

    // 1. Progress Bar Fill
    if (this.dom.ketupatProgressFill) {
      this.dom.ketupatProgressFill.style.width = `${displaySplit}%`;
    }

    // 2. Status Label Teks
    if (this.dom.ketupatSplitStatus) {
      if (displaySplit >= 100) {
        this.dom.ketupatSplitStatus.textContent = 'TERBELAH SEMPURNA (100%)';
        this.dom.ketupatSplitStatus.style.color = '#ffd700';
      } else if (displaySplit >= 70) {
        this.dom.ketupatSplitStatus.textContent = 'TERBELAH LEBAR (70%)';
        this.dom.ketupatSplitStatus.style.color = '#00e5ff';
      } else if (displaySplit >= 30) {
        this.dom.ketupatSplitStatus.textContent = 'TERBELAH (30%)';
        this.dom.ketupatSplitStatus.style.color = '#8bc34a';
      } else {
        this.dom.ketupatSplitStatus.textContent = 'UTUH';
        this.dom.ketupatSplitStatus.style.color = '#cbd5e1';
      }
    }

    // 3. Pemisahan Fisik Kedua Belahan Ketupat (Transform Left & Right)
    // 0% = 0px, 100% = 85px separasi & 16 derajat rotasi
    const separation = (this.splitPercent / 100) * 85;
    const rotation = (this.splitPercent / 100) * 16;
    if (this.dom.ketupatLeft && this.dom.ketupatRight) {
      this.dom.ketupatLeft.style.transform = `translateX(-${separation}px) rotate(-${rotation}deg)`;
      this.dom.ketupatRight.style.transform = `translateX(${separation}px) rotate(${rotation}deg)`;
    }

    // 4. Inti Hadiah / Logo Kratingdaeng di dalam Ketupat
    if (this.dom.ketupatCore) {
      if (this.splitPercent >= 20) {
        const scale = 0.6 + (this.splitPercent / 100) * 0.55;
        const opacity = Math.min(1, (this.splitPercent - 15) / 45);
        this.dom.ketupatCore.style.opacity = opacity;
        this.dom.ketupatCore.style.transform = `translate(-50%, -50%) scale(${scale})`;
      } else {
        this.dom.ketupatCore.style.opacity = '0';
        this.dom.ketupatCore.style.transform = 'translate(-50%, -50%) scale(0.6)';
      }
    }

    // 5. Sweet Spot Indicator
    const indicatorPct = this.sweetSpotPosition * 100;
    this.dom.sweetSpotIndicator.style.left = `${indicatorPct}%`;
    this.dom.sweetSpotIndicator.classList.toggle('active', this.sweetSpotActive);

    // 6. HUD Text
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

    // Hitung Gelar Stamina & Hasil Belahan Ketupat
    const tierInfo = this.determineTier();

    // Tampilkan Data di Layar Hasil
    this.dom.finalScore.textContent = this.score.toLocaleString('id-ID');
    this.dom.finalTier.textContent = tierInfo.tier;
    this.dom.finalTier.className = `tier-badge ${tierInfo.badgeClass}`;
    if (this.dom.finalSplit) {
      this.dom.finalSplit.textContent = `KETUPAT TERBELAH ${Math.round(this.splitPercent)}%`;
    }
    if (this.dom.finalTierDesc) {
      this.dom.finalTierDesc.textContent = tierInfo.desc;
    }
    this.dom.finalTaps.textContent = this.totalTaps;
    this.dom.finalRpm.textContent = `${this.peakRpm} taps/s`;
    this.dom.finalOvercharge.textContent = `${Math.round(this.splitPercent)}%`;

    this.dom.gameScreen.classList.add('hidden');
    this.dom.gameOverScreen.classList.remove('hidden');

    // Ledakan Confetti
    this.particles.createOverchargeExplosion();

    // Simpan ke Google Sheet & Google Drive
    await this.syncScoreToBackend(tierInfo.tier);
  }

  determineTier() {
    const split = Math.round(this.splitPercent);
    if (split >= 100) {
      return {
        tier: 'Tier 1: Terbelah 100%',
        badgeClass: 'tier-1',
        desc: 'Luar Biasa! Ketupat Terbelah Sempurna 100%! Pemenang Hadiah Utama!'
      };
    } else if (split >= 70) {
      return {
        tier: 'Tier 2: Terbelah 70%',
        badgeClass: 'tier-2',
        desc: 'Hebat! Ketupat Berhasil Terbelah 70%! Pukulan Anda Sangat Bertenaga!'
      };
    } else if (split >= 30) {
      return {
        tier: 'Tier 3: Terbelah 30%',
        badgeClass: 'tier-3',
        desc: 'Bagus! Ketupat Berhasil Terbelah 30%! Stamina Pejuang Terbukti!'
      };
    }
    return {
      tier: 'Stamina Pemula',
      badgeClass: 'tier-starter',
      desc: 'Ketukan belum cukup cepat untuk membelah ketupat. Ayo coba lagi!'
    };
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
      maxPercent: Math.round(this.splitPercent),
      device: window.innerWidth < 768 ? 'Mobile' : 'Desktop'
    };

    try {
      const result = await window.apiService.submitScore(payload);
      
      this.dom.sheetSyncStatus.className = 'status-pill success';
      this.dom.sheetSyncStatus.innerHTML = `
        ${result.message || 'Berhasil dicatat!'} <strong>(Peringkat #${result.rank || 1})</strong>
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
      const rankBadge = idx === 0 
        ? '<span class="rank-badge rank-1">1</span>' 
        : idx === 1 
        ? '<span class="rank-badge rank-2">2</span>' 
        : idx === 2 
        ? '<span class="rank-badge rank-3">3</span>' 
        : `<span class="rank-badge">${idx + 1}</span>`;
      const isTop3 = idx < 3 ? 'top-rank' : '';
      rowsHtml += `
        <tr class="${isTop3}">
          <td class="rank-col">${rankBadge}</td>
          <td class="name-col"><strong>${this.escapeHtml(entry.name)}</strong></td>
          <td class="score-col">${(entry.score || 0).toLocaleString('id-ID')}</td>
          <td class="tier-col">${this.escapeHtml(entry.tier || '')}</td>
        </tr>
      `;
    });

    this.dom.leaderboardBody.innerHTML = rowsHtml;
  }

  shareScore() {
    const tierInfo = this.determineTier();
    const text = `Saya baru saja bermain Ketuk Ketupat Rush Kratingdaeng dan berhasil membuat ketupat terbelah ${Math.round(this.splitPercent)}% (${tierInfo.tier}) dengan skor ${this.score.toLocaleString('id-ID')} PTS! Bisakah kamu membelah 100%?`;
    if (navigator.share) {
      navigator.share({
        title: 'Kratingdaeng Ketuk Ketupat Rush',
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
