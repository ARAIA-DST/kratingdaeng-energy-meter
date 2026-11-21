/**
 * ===================================================================================
 * KRATINGDAENG SPEEDOMETER LUCKY DIP 180° - CORE GAME LOGIC
 * ===================================================================================
 * Mekanik:
 * 1. Odometer / Speedometer 180 Derajat (-90° s/d +90°)
 * 2. PRESS & HOLD (Tekan & Tahan Pedal Gas)
 * 3. Jarum berputar 180° secara acak saat di-hold untuk menentukan hadiah TIER LUCKY DIP:
 *    - Tier 1 — 10%: Kaos dan Topi (1:1).
 *    - Tier 2 — 30%: Payung Lipat, Jas Hujan, Tongkat Tol (RA) / Cover Tas (Pelabuhan) (2:3:4).
 *    - Tier 3 — 60%: Shopping Bag saja.
 * ===================================================================================
 */

class KratingdaengGame {
  constructor() {
    // State Game
    this.state = 'INIT'; // INIT, COUNTDOWN, PLAYING, DECELERATING, GAMEOVER
    this.playerName = 'Jagoan Kratingdaeng';
    this.location = 'RA'; // 'RA' atau 'Pelabuhan'

    // Speedometer 180° State
    // Sudut jarum: -90° (0 KM/H, kiri) s/d +90° (180 KM/H, kanan)
    this.currentAngle = -90;
    this.currentSpeed = 0; // 0 - 180 KM/H
    this.peakSpeed = 0;
    this.odometerMileage = 18400; // Kilometrage dasar
    this.lastTickSpeed = 0;

    // Press & Hold State
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdDuration = 0;
    this.minHoldTime = 0.8; // detik minimal hold agar sah
    this.maxHoldTime = 3.8; // detik maksimal hold (auto release)

    // Deceleration & Prize Landing State
    this.decelStartTime = 0;
    this.decelDuration = 2200; // ms perlambatan suspensi
    this.decelStartAngle = 0;
    this.targetAngle = 0;
    this.targetSpeed = 0;
    this.activePrize = null;

    // Loop & Timers
    this.loopRaf = null;
    this.lastLoopTime = 0;

    // DOM Elements Cache
    this.initDOMElements();

    // Particle System
    this.particles = new ParticleSystem(this.dom.canvas);
    this.particles.start();

    // Bind Event Listeners
    this.bindEvents();
    this.updateLeaderboardDisplay();
  }

  initDOMElements() {
    this.dom = {
      // Screens & Overlays
      startScreen: document.getElementById('start-screen'),
      gameScreen: document.getElementById('game-screen'),
      gameOverScreen: document.getElementById('game-over-screen'),
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),

      // Inputs & Buttons
      nameInput: document.getElementById('player-name-input'),
      startBtn: document.getElementById('btn-start-game'),
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

      // HUD
      hudPlayerDisplay: document.getElementById('hud-player-display'),
      hudLocationBadge: document.getElementById('hud-location-badge'),
      hudGasStatus: document.getElementById('hud-gas-status'),
      overchargeBanner: document.getElementById('overcharge-banner'),

      // Speedometer & Odometer Elements
      needleGroup: document.getElementById('speedometer-needle-group'),
      speedDigitalVal: document.getElementById('speed-digital-val'),
      odoDigits: [
        document.getElementById('odo-d1'),
        document.getElementById('odo-d2'),
        document.getElementById('odo-d3'),
        document.getElementById('odo-d4'),
        document.getElementById('odo-d5')
      ],
      liveZoneStatus: document.getElementById('live-zone-status'),

      // Press & Hold Controls
      holdChargeBar: document.getElementById('hold-charge-bar'),
      holdDurationText: document.getElementById('hold-duration-text'),
      holdStatusInstruction: document.getElementById('hold-status-instruction'),
      holdPedalBtn: document.getElementById('btn-hold-gas'),
      pedalBtnTitle: document.getElementById('pedal-btn-title'),
      pedalBtnSubtitle: document.getElementById('pedal-btn-subtitle'),

      // Result Elements
      resPrizeIconBox: document.getElementById('res-prize-icon-box'),
      resPrizeName: document.getElementById('res-prize-name'),
      resTierBadge: document.getElementById('res-tier-badge'),
      resTierDesc: document.getElementById('res-tier-desc'),
      resFinalSpeed: document.getElementById('res-final-speed'),
      resHoldTime: document.getElementById('res-hold-time'),
      resBoothLoc: document.getElementById('res-booth-loc'),
      sheetSyncStatus: document.getElementById('sheet-sync-status'),
      certLinkContainer: document.getElementById('cert-link-container'),
      certLinkBtn: document.getElementById('btn-view-cert'),
      leaderboardBody: document.getElementById('leaderboard-rows'),
      refreshLbBtn: document.getElementById('btn-refresh-leaderboard'),
      shareBtn: document.getElementById('btn-share-result'),

      // Dynamic chip di start screen
      tier2DynamicItem: document.getElementById('tier2-dynamic-item'),

      // Canvas
      canvas: document.getElementById('fx-canvas')
    };

    if (this.dom.scriptUrlInput) {
      this.dom.scriptUrlInput.value = window.apiService.getScriptUrl();
    }
  }

  bindEvents() {
    // Tombol Mulai Game
    this.dom.startBtn.addEventListener('click', () => this.initAudioAndStart());

    this.dom.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.initAudioAndStart();
    });

    // Pemilihan Lokasi Booth (Rest Area vs Pelabuhan)
    document.querySelectorAll('.location-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.location-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.location = pill.dataset.location || 'RA';
        
        // Update label dynamic item pada kartu Tier 2 di start screen
        if (this.dom.tier2DynamicItem) {
          if (this.location === 'RA') {
            this.dom.tier2DynamicItem.textContent = 'Tongkat Tol (Khusus RA)';
          } else {
            this.dom.tier2DynamicItem.textContent = 'Cover Tas (Khusus Pelabuhan)';
          }
        }
      });
    });

    // Tombol Main Lagi
    this.dom.restartBtn.addEventListener('click', () => this.showStartScreen());

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

    // Pengaturan Modal Google Sheet
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

    if (this.dom.refreshLbBtn) {
      this.dom.refreshLbBtn.addEventListener('click', () => this.updateLeaderboardDisplay());
    }

    if (this.dom.shareBtn) {
      this.dom.shareBtn.addEventListener('click', () => this.shareScore());
    }

    // =========================================================================
    // MEKANIK INTERAKSI: PRESS & HOLD PEDAL GAS (MOUSE, TOUCH, KEYBOARD)
    // =========================================================================
    const onHoldStart = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.startHolding();
    };

    const onHoldEnd = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.stopHolding();
    };

    // Pointer & Touch Events pada tombol pedal
    this.dom.holdPedalBtn.addEventListener('pointerdown', onHoldStart);
    this.dom.holdPedalBtn.addEventListener('pointerup', onHoldEnd);
    this.dom.holdPedalBtn.addEventListener('pointercancel', onHoldEnd);
    this.dom.holdPedalBtn.addEventListener('mouseleave', () => {
      if (this.isHolding) this.stopHolding();
    });

    // Touch events fallback
    this.dom.holdPedalBtn.addEventListener('touchstart', onHoldStart, { passive: false });
    this.dom.holdPedalBtn.addEventListener('touchend', onHoldEnd, { passive: false });

    // Keyboard Space / Enter hold support
    window.addEventListener('keydown', (e) => {
      if (this.state === 'PLAYING' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp')) {
        if (!e.repeat && !this.isHolding) {
          e.preventDefault();
          this.startHolding();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.state === 'PLAYING' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp')) {
        if (this.isHolding) {
          e.preventDefault();
          this.stopHolding();
        }
      }
    });
  }

  initAudioAndStart() {
    window.soundSystem.ensureContext();
    const name = this.dom.nameInput.value.trim();
    this.playerName = name ? name : 'Jagoan Kratingdaeng';
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
        void this.dom.countdownText.offsetWidth;
        this.dom.countdownText.classList.add('pop');
        window.soundSystem.playCountdown(false);
      } else if (count === 0) {
        this.dom.countdownText.textContent = 'GAS!';
        this.dom.countdownText.style.color = '#ffd700';
        window.soundSystem.playCountdown(true);
      } else {
        clearInterval(countInterval);
        this.dom.countdownOverlay.classList.add('hidden');
        this.startMatch();
      }
    }, 850);
  }

  startMatch() {
    this.state = 'PLAYING';
    this.isHolding = false;
    this.holdDuration = 0;
    this.peakSpeed = 0;
    this.currentAngle = -90;
    this.currentSpeed = 0;
    this.lastTickSpeed = 0;

    // Reset Visual Display
    this.dom.hudPlayerDisplay.textContent = this.playerName;
    this.dom.hudLocationBadge.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';
    this.dom.hudGasStatus.textContent = 'SIAP GAS!';
    this.dom.overchargeBanner.textContent = 'TEKAN & TAHAN PEDAL GAS UNTUK MEMUTAR JARUM!';
    this.dom.holdChargeBar.style.width = '0%';
    this.dom.holdDurationText.textContent = '0.0s';
    this.dom.holdStatusInstruction.textContent = 'TAHAN PEDAL GAS UNTUK MEMUTAR JARUM';
    this.dom.pedalBtnTitle.textContent = 'TEKAN & TAHAN';
    this.dom.pedalBtnSubtitle.textContent = 'TAHAN PEDAL GAS (ATAU SPASI)';
    this.dom.needleGroup.classList.remove('decelerating');

    this.updateSpeedometerVisual(-90, 0);

    // Audio BGM
    window.soundSystem.startBGM();
    this.dom.bgmBtn.classList.add('active');

    // Physics RAF Loop
    this.lastLoopTime = performance.now();
    if (this.loopRaf) cancelAnimationFrame(this.loopRaf);
    this.loopRaf = requestAnimationFrame((t) => this.gameLoop(t));
  }

  // =========================================================================
  // LOGIKA PRESS & HOLD PEDAL GAS
  // =========================================================================
  startHolding() {
    if (this.state !== 'PLAYING' || this.isHolding) return;

    this.isHolding = true;
    this.holdStartTime = performance.now();
    this.holdDuration = 0;

    this.dom.holdPedalBtn.classList.add('pressing');
    this.dom.hudGasStatus.textContent = 'GAS POL!';
    this.dom.hudGasStatus.style.color = '#ff1744';
    this.dom.pedalBtnTitle.textContent = 'GAS AKTIF!';
    this.dom.pedalBtnSubtitle.textContent = 'TERUS TAHAN HINGGA PUTARAN PENUH...';
    this.dom.overchargeBanner.textContent = 'JARUM SPEEDOMETER BERPUTAR KENCANG 180°!';
    this.dom.needleGroup.classList.remove('decelerating');

    // Mulai deru mesin
    window.soundSystem.startEngineRev();
  }

  stopHolding() {
    if (!this.isHolding || this.state !== 'PLAYING') return;

    this.isHolding = false;
    this.dom.holdPedalBtn.classList.remove('pressing');
    window.soundSystem.stopEngineRev(this.currentSpeed);

    // Cek apakah pemain menahan cukup lama (minimal 0.8 detik)
    if (this.holdDuration < this.minHoldTime) {
      this.dom.overchargeBanner.textContent = 'TAHAN PEDAL LEBIH LAMA AGAR JARUM BERPUTAR PENUH!';
      this.dom.holdStatusInstruction.textContent = 'TEKAN & TAHAN MINIMAL 1 DETIK!';
      this.dom.hudGasStatus.textContent = 'KURANG LAMA!';
      this.dom.hudGasStatus.style.color = '#f59e0b';
      this.dom.pedalBtnTitle.textContent = 'TEKAN & TAHAN';
      this.dom.pedalBtnSubtitle.textContent = 'COBA LAGI, TAHAN LEBIH LAMA';

      // Kembalikan jarum ke posisi 0 km/h secara halus
      this.currentAngle = -90;
      this.currentSpeed = 0;
      this.updateSpeedometerVisual(-90, 0);
      return;
    }

    // Jika sudah cukup lama, KUNCI HADIAH LUCKY DIP & MULAI PERLAMBATAN
    this.beginDecelerationToPrize();
  }

  // =========================================================================
  // RASIO KEBERUNTUNGAN LUCKY DIP (TIER 1 10%, TIER 2 30%, TIER 3 60%)
  // =========================================================================
  rollLuckyDipPrize() {
    const rand = Math.random() * 100;

    // 1. TIER 1 — 10%: Kaos dan Topi (1:1)
    if (rand < 10) {
      const subRand = Math.random();
      const prizeItem = subRand < 0.5 ? 'Kaos Eksklusif Kratingdaeng' : 'Topi Kratingdaeng';
      const prizeType = subRand < 0.5 ? 'tshirt' : 'cap';
      // Jarum mendarat di zona merah (162 - 180 KM/H, sudut +72° s/d +90°)
      const targetSpeed = 164 + Math.random() * 14; // 164 - 178 KM/H
      const targetAngle = ((targetSpeed / 180) * 180) - 90; // +74° s/d +88°

      return {
        tier: 1,
        tierName: 'Tier 1 (10%)',
        prizeName: prizeItem,
        prizeType: prizeType,
        targetSpeed: Math.round(targetSpeed),
        targetAngle: targetAngle,
        badgeClass: 'tier-1',
        desc: 'Luar Biasa! Pemenang Hadiah Utama Tier 1 Kratingdaeng!'
      };
    }

    // 2. TIER 2 — 30%: Payung Lipat, Jas Hujan, Tongkat Tol (RA) / Cover Tas (Pelabuhan) (2:3:4)
    if (rand < 40) { // 10% + 30% = 40%
      const subWeight = Math.random() * 9; // Total bobot = 2 + 3 + 4 = 9
      let prizeItem = '';
      let prizeType = '';

      if (subWeight < 2) {
        // Bobot 2: Payung Lipat
        prizeItem = 'Payung Lipat Kratingdaeng';
        prizeType = 'umbrella';
      } else if (subWeight < 5) {
        // Bobot 3: Jas Hujan
        prizeItem = 'Jas Hujan Kratingdaeng';
        prizeType = 'raincoat';
      } else {
        // Bobot 4: Tongkat Tol khusus RA / Cover Tas khusus pelabuhan
        if (this.location === 'RA') {
          prizeItem = 'Tongkat Tol Kratingdaeng (Khusus RA)';
          prizeType = 'tolstick';
        } else {
          prizeItem = 'Cover Tas Kratingdaeng (Khusus Pelabuhan)';
          prizeType = 'bagcover';
        }
      }

      // Jarum mendarat di zona biru (108 - 162 KM/H, sudut +18° s/d +72°)
      const targetSpeed = 112 + Math.random() * 46; // 112 - 158 KM/H
      const targetAngle = ((targetSpeed / 180) * 180) - 90; // +22° s/d +68°

      return {
        tier: 2,
        tierName: 'Tier 2 (30%)',
        prizeName: prizeItem,
        prizeType: prizeType,
        targetSpeed: Math.round(targetSpeed),
        targetAngle: targetAngle,
        badgeClass: 'tier-2',
        desc: 'Hebat! Anda berhasil memenangkan Hadiah Menarik Tier 2!'
      };
    }

    // 3. TIER 3 — 60%: Shopping Bag saja (100% dari Tier 3)
    const targetSpeed = 20 + Math.random() * 82; // 20 - 102 KM/H
    const targetAngle = ((targetSpeed / 180) * 180) - 90; // -70° s/d +12°

    return {
      tier: 3,
      tierName: 'Tier 3 (60%)',
      prizeName: 'Shopping Bag Kratingdaeng',
      prizeType: 'shoppingbag',
      targetSpeed: Math.round(targetSpeed),
      targetAngle: targetAngle,
      badgeClass: 'tier-3',
      desc: 'Bagus! Anda mendapatkan Shopping Bag Eksklusif Kratingdaeng!'
    };
  }

  beginDecelerationToPrize() {
    this.state = 'DECELERATING';
    this.activePrize = this.rollLuckyDipPrize();
    this.decelStartTime = performance.now();
    this.decelStartAngle = this.currentAngle;
    this.targetAngle = this.activePrize.targetAngle;
    this.targetSpeed = this.activePrize.targetSpeed;

    this.dom.hudGasStatus.textContent = 'MENGUNCI...';
    this.dom.hudGasStatus.style.color = '#ffd700';
    this.dom.overchargeBanner.textContent = 'JARUM MELAMBAT... MENCARI TARGET HADIAH LUCKY DIP!';
    this.dom.pedalBtnTitle.textContent = 'MENGUNCI...';
    this.dom.pedalBtnSubtitle.textContent = 'JARUM SEDANG MENDARAT DI TARGET';
    this.dom.needleGroup.classList.add('decelerating');
  }

  // =========================================================================
  // MAIN PHYSICS LOOP (60 FPS)
  // =========================================================================
  gameLoop(currentTime) {
    if (this.state !== 'PLAYING' && this.state !== 'DECELERATING') return;

    const dt = Math.min(0.1, (currentTime - this.lastLoopTime) / 1000);
    this.lastLoopTime = currentTime;

    // FASE 1: PEMAIN SEDANG TEKAN & TAHAN GAS (HOLDING)
    if (this.isHolding && this.state === 'PLAYING') {
      this.holdDuration += dt;

      // Update Charge Bar
      const chargePct = Math.min(100, (this.holdDuration / 2.0) * 100);
      this.dom.holdChargeBar.style.width = `${chargePct}%`;
      this.dom.holdDurationText.textContent = `${this.holdDuration.toFixed(1)}s`;

      // Jarum berputar 180 derajat secara dinamis & acak
      const t = currentTime / 1000;
      // Perpaduan gelombang frekuensi tinggi untuk getaran dan ayunan 180° penuh
      const swing = Math.sin(t * 12) * 58 + Math.sin(t * 24) * 24 + (Math.random() - 0.5) * 16;
      this.currentAngle = Math.max(-90, Math.min(90, swing));
      this.currentSpeed = Math.round(((this.currentAngle + 90) / 180) * 180);

      if (this.currentSpeed > this.peakSpeed) {
        this.peakSpeed = this.currentSpeed;
      }

      // Odometer Digital bertambah cepat (efek putaran roda berkecepatan tinggi)
      if (Math.random() > 0.4) {
        this.odometerMileage += Math.floor(Math.random() * 3) + 1;
      }

      // Suara deru mesin naik seiring kecepatan (crossfade multi-layer on_low, on_midhigh, on_high)
      window.soundSystem.updateEngineRev(this.currentSpeed / 180, this.currentSpeed);

      // Partikel percikan dari ujung jarum
      if (Math.random() > 0.4) {
        this.emitNeedleSparks();
      }

      // Banner teks interaktif saat putaran sudah matang
      if (this.holdDuration >= 1.2) {
        this.dom.holdStatusInstruction.textContent = 'PUTARAN MAKSIMAL! LEPASKAN UNTUK KUNCI HADIAH!';
        this.dom.pedalBtnSubtitle.textContent = 'LEPASKAN SEKARANG UNTUK MENGUNCI!';
      }

      // Auto-trigger release jika pemain menahan terlalu lama (3.8s)
      if (this.holdDuration >= this.maxHoldTime) {
        this.stopHolding();
      }

      this.updateSpeedometerVisual(this.currentAngle, this.currentSpeed);
    }

    // FASE 2: PERLAMBATAN DRAMATIS (DECELERATION SUSPENSE)
    else if (this.state === 'DECELERATING') {
      const elapsed = currentTime - this.decelStartTime;
      const progress = Math.min(1.0, elapsed / this.decelDuration);

      // Easing Cubic Out yang mulus dengan sedikit goyangan inersia (spring settling)
      const ease = 1 - Math.pow(1 - progress, 3);
      const remainingProgress = 1 - progress;
      const wobble = Math.sin(progress * Math.PI * 4) * (remainingProgress * 14);

      this.currentAngle = this.decelStartAngle + ((this.targetAngle - this.decelStartAngle) * ease) + wobble;
      this.currentSpeed = Math.round(((this.currentAngle + 90) / 180) * 180);

      // Bunyi Tik Jarum saat melintasi batas speed
      if (Math.abs(this.currentSpeed - this.lastTickSpeed) >= 15) {
        window.soundSystem.playNeedleTick(0.8 + (this.currentSpeed / 180) * 0.6);
        this.lastTickSpeed = this.currentSpeed;
      }

      this.updateSpeedometerVisual(this.currentAngle, this.currentSpeed);

      // Selesai mendarat di target
      if (progress >= 1.0) {
        this.currentAngle = this.targetAngle;
        this.currentSpeed = this.targetSpeed;
        this.updateSpeedometerVisual(this.currentAngle, this.currentSpeed);
        this.finishRound();
        return;
      }
    }

    this.loopRaf = requestAnimationFrame((t) => this.gameLoop(t));
  }

  // =========================================================================
  // UPDATE VISUAL SPEEDOMETER & ODOMETER
  // =========================================================================
  updateSpeedometerVisual(angle, speed) {
    // 1. Putar Jarum SVG (Origin di 190px 190px)
    if (this.dom.needleGroup) {
      this.dom.needleGroup.setAttribute('style', `transform-origin: 190px 190px; transform: rotate(${angle.toFixed(1)}deg);`);
    }

    // 2. Angka Digital Speed
    if (this.dom.speedDigitalVal) {
      this.dom.speedDigitalVal.textContent = Math.max(0, Math.min(180, speed));
    }

    // 3. Tampilan Odometer Digital (5 Digit)
    const odoStr = this.odometerMileage.toString().padStart(5, '0');
    for (let i = 0; i < 5; i++) {
      if (this.dom.odoDigits[i]) {
        this.dom.odoDigits[i].textContent = odoStr[i] || '0';
      }
    }

    // 4. Update Badge Zona Aktif
    if (this.dom.liveZoneStatus) {
      if (speed >= 162) {
        this.dom.liveZoneStatus.className = 'zone-status-badge zone-tier1';
        this.dom.liveZoneStatus.textContent = 'ZONA: TIER 1 (KAOS / TOPI)';
      } else if (speed >= 108) {
        this.dom.liveZoneStatus.className = 'zone-status-badge zone-tier2';
        this.dom.liveZoneStatus.textContent = 'ZONA: TIER 2 (PAYUNG / JAS / TONGKAT)';
      } else if (speed >= 1) {
        this.dom.liveZoneStatus.className = 'zone-status-badge zone-tier3';
        this.dom.liveZoneStatus.textContent = 'ZONA: TIER 3 (SHOPPING BAG)';
      } else {
        this.dom.liveZoneStatus.className = 'zone-status-badge zone-idle';
        this.dom.liveZoneStatus.textContent = 'ZONA: SIAP GAS';
      }
    }
  }

  emitNeedleSparks() {
    // Hitung posisi ujung jarum di layar
    const rect = this.dom.needleGroup ? this.dom.needleGroup.getBoundingClientRect() : null;
    if (rect) {
      const x = rect.left + rect.width / 2;
      const y = rect.top + 20;
      this.particles.createSparks(x, y, 6, this.currentSpeed >= 162);
    }
  }

  // =========================================================================
  // SELESAI PUTARAN & TAMPILKAN HADIAH (PRIZE REVEAL)
  // =========================================================================
  async finishRound() {
    this.state = 'GAMEOVER';
    if (this.loopRaf) cancelAnimationFrame(this.loopRaf);
    window.soundSystem.stopBGM();
    window.soundSystem.stopEngineRev();

    const prize = this.activePrize;

    // Bunyikan Fanfare Kemenangan Sesuai Tier
    window.soundSystem.playPrizeWin(prize.tier);

    // Ledakan Confetti & Bintang
    this.particles.createOverchargeExplosion();
    this.triggerScreenShake(7);

    // Tampilkan Data Hadiah di Screen Game Over
    this.dom.resPrizeName.textContent = prize.prizeName;
    this.dom.resTierBadge.textContent = prize.tierName;
    this.dom.resTierBadge.className = `tier-badge ${prize.badgeClass}`;
    this.dom.resTierDesc.textContent = prize.desc;
    this.dom.resFinalSpeed.textContent = `${prize.targetSpeed} KM/H`;
    this.dom.resHoldTime.textContent = `${this.holdDuration.toFixed(1)}s`;
    this.dom.resBoothLoc.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';

    // Artwork SVG Hadiah
    this.dom.resPrizeIconBox.innerHTML = this.getPrizeArtworkSvg(prize.prizeType);

    // Beralih Layar
    setTimeout(() => {
      this.dom.gameScreen.classList.add('hidden');
      this.dom.gameOverScreen.classList.remove('hidden');
    }, 400);

    // Simpan ke Google Sheet & LocalStorage
    await this.syncScoreToBackend(prize);
  }

  // =========================================================================
  // VECTOR ARTWORK SVG UNTUK HADIAH
  // =========================================================================
  getPrizeArtworkSvg(type) {
    switch (type) {
      case 'tshirt':
        // Kaos Eksklusif Kratingdaeng
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <path d="M18 12 L26 18 Q32 22 38 18 L46 12 L56 22 L49 28 L46 25 L46 54 L18 54 L18 25 L15 28 L8 22 Z" fill="#ffd700" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
            <path d="M26 18 Q32 22 38 18" stroke="#e60000" stroke-width="3" fill="none"/>
            <circle cx="32" cy="34" r="7" fill="#e60000"/>
            <path d="M28 34 L36 34" stroke="#ffd700" stroke-width="2"/>
          </svg>`;

      case 'cap':
        // Topi Kratingdaeng
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <ellipse cx="28" cy="36" rx="20" ry="14" fill="#e60000" stroke="#ffd700" stroke-width="2"/>
            <path d="M20 40 Q40 40 56 36 Q44 46 22 46 Z" fill="#ffd700" stroke="#b45309" stroke-width="1.5"/>
            <circle cx="28" cy="22" r="3" fill="#ffd700"/>
            <path d="M20 32 Q28 26 36 32" stroke="#fff" stroke-width="2" fill="none"/>
          </svg>`;

      case 'umbrella':
        // Payung Lipat
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <path d="M32 12 Q12 28 14 36 L50 36 Q52 28 32 12 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <path d="M32 36 L32 50 Q32 54 28 54 Q24 54 24 50" stroke="#ffd700" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M24 36 Q32 32 40 36" stroke="#fff" stroke-width="1.5" fill="none"/>
            <line x1="32" y1="8" x2="32" y2="12" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`;

      case 'raincoat':
        // Jas Hujan
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <path d="M26 12 Q32 6 38 12 L44 18 L54 26 L48 32 L44 28 L44 56 L20 56 L20 28 L16 32 L10 26 L20 18 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <circle cx="32" cy="12" r="7" stroke="#38bdf8" stroke-width="2" fill="none"/>
            <line x1="32" y1="20" x2="32" y2="56" stroke="#ffd700" stroke-width="2"/>
          </svg>`;

      case 'tolstick':
        // Tongkat Tol (Khusus RA)
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <rect x="22" y="10" width="20" height="14" rx="2" fill="#ffd700" stroke="#b45309" stroke-width="1.5"/>
            <rect x="25" y="13" width="6" height="4" rx="1" fill="#0284c7"/>
            <line x1="32" y1="24" x2="32" y2="56" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
            <rect x="29" y="44" width="6" height="12" rx="2" fill="#e60000"/>
          </svg>`;

      case 'bagcover':
        // Cover Tas (Khusus Pelabuhan)
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <ellipse cx="32" cy="34" rx="18" ry="22" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <path d="M20 24 Q32 16 44 24" stroke="#ffd700" stroke-width="2" fill="none"/>
            <path d="M22 44 Q32 50 42 44" stroke="#ffd700" stroke-width="2" fill="none"/>
            <path d="M26 34 L38 34" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`;

      case 'shoppingbag':
      default:
        // Shopping Bag
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <rect x="16" y="24" width="32" height="34" rx="3" fill="#059669" stroke="#34d399" stroke-width="2"/>
            <path d="M24 24 L24 16 Q32 10 40 16 L40 24" stroke="#ffd700" stroke-width="3" fill="none" stroke-linecap="round"/>
            <circle cx="32" cy="40" r="7" fill="#ffd700"/>
            <path d="M28 40 L36 40" stroke="#e60000" stroke-width="2"/>
          </svg>`;
    }
  }

  // =========================================================================
  // INTEGRASI GOOGLE APPS SCRIPT & LOCAL STORAGE
  // =========================================================================
  async syncScoreToBackend(prize) {
    this.dom.sheetSyncStatus.innerHTML = `
      <span class="spinner"></span> Menyimpan data pemenang ke Google Sheet & Drive...
    `;
    this.dom.sheetSyncStatus.className = 'status-pill pending';
    this.dom.certLinkContainer.classList.add('hidden');

    const payload = {
      name: this.playerName,
      score: prize.targetSpeed,
      tier: `${prize.tierName}: ${prize.prizeName}`,
      peakRpm: prize.targetSpeed,
      duration: parseFloat(this.holdDuration.toFixed(1)),
      maxPercent: `${prize.targetSpeed} KM/H`,
      device: `${window.innerWidth < 768 ? 'Mobile' : 'Desktop'} (${this.location === 'RA' ? 'Booth RA' : 'Booth Pelabuhan'})`
    };

    try {
      const result = await window.apiService.submitScore(payload);

      this.dom.sheetSyncStatus.className = 'status-pill success';
      this.dom.sheetSyncStatus.innerHTML = `
        ${result.message || 'Tercatat di Google Sheet!'} <strong>(Peringkat #${result.rank || 1})</strong>
      `;

      if (result.certificateUrl && result.certificateUrl !== '#') {
        this.dom.certLinkContainer.classList.remove('hidden');
        this.dom.certLinkBtn.href = result.certificateUrl;
      }
    } catch (e) {
      this.dom.sheetSyncStatus.className = 'status-pill error';
      this.dom.sheetSyncStatus.textContent = 'Data tersimpan di penyimpanan browser lokal (Offline).';
    }

    this.updateLeaderboardDisplay();
  }

  async updateLeaderboardDisplay() {
    if (!this.dom.leaderboardBody) return;
    this.dom.leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Memuat Riwayat...</td></tr>';

    const scores = await window.apiService.getLeaderboard();

    if (!scores || scores.length === 0) {
      this.dom.leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada riwayat pemenang. Jadilah yang pertama!</td></tr>';
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

      rowsHtml += `
        <tr class="${idx < 3 ? 'top-rank' : ''}">
          <td class="rank-col">${rankBadge}</td>
          <td class="name-col"><strong>${this.escapeHtml(entry.name)}</strong></td>
          <td class="score-col">${(entry.score || 0)} KM/H</td>
          <td class="tier-col">${this.escapeHtml(entry.tier || '')}</td>
        </tr>
      `;
    });

    this.dom.leaderboardBody.innerHTML = rowsHtml;
  }

  shareScore() {
    if (!this.activePrize) return;
    const text = `Saya baru saja memutar Speedometer Lucky Dip Kratingdaeng dan memenangkan ${this.activePrize.prizeName} (${this.activePrize.tierName}) dengan kecepatan ${this.activePrize.targetSpeed} KM/H! Gas pol sekarang!`;

    if (navigator.share) {
      navigator.share({
        title: 'Kratingdaeng Speedometer Lucky Dip',
        text: text,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Teks berhasil disalin ke clipboard! Bagikan ke temanmu.');
      });
    }
  }

  triggerScreenShake(intensity = 6) {
    const mainWrap = document.getElementById('app-container');
    if (!mainWrap) return;
    mainWrap.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
    setTimeout(() => {
      mainWrap.style.transform = 'translate(0, 0)';
    }, 60);
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

// Inisialisasi Game saat dokumen siap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new KratingdaengGame();
});
