/**
 * ===================================================================================
 * KRATINGDAENG ENERGI PIT - ENERGY FUEL GAUGE & TACHOMETER LUCKY DIP
 * ===================================================================================
 * Desain: Persis Dashboard Balap Kratingdaeng Energi Pit (Chassis Carbon & Chrome)
 * Audio: Sintesis Mesin Multi-Silinder Realistis (Internal Combustion Engine + Exhaust)
 * Mekanik: PRESS & HOLD Pedal Gas / Refuel
 *
 * Probabilitas Hadiah:
 * - Tier 1 — 10%: Kaos dan Topi (1:1)
 * - Tier 2 — 30%: Payung Lipat, Jas Hujan, Tongkat Tol (RA) / Cover Tas (Pelabuhan) (2:3:4)
 * - Tier 3 — 60%: Shopping Bag saja
 * ===================================================================================
 */

class KratingdaengGame {
  constructor() {
    this.state = 'INIT'; // INIT, COUNTDOWN, PLAYING, DECELERATING, GAMEOVER
    this.playerName = 'Jagoan Kratingdaeng';
    this.location = 'RA'; // 'RA' atau 'Pelabuhan'

    // Tachometer State: 0 RPM s/d 10 RPM (Angle: -125° s/d +125°)
    this.currentAngle = -125;
    this.currentRPM = 0;
    this.peakRPM = 0;
    this.lastTickRPM = 0;

    // Press & Hold State
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdDuration = 0;
    this.minHoldTime = 0.8;
    this.maxHoldTime = 3.6;

    // Deceleration Physics State
    this.decelStartTime = 0;
    this.decelDuration = 2200; // ms perlambatan suspensi
    this.decelStartAngle = -125;
    this.targetAngle = -125;
    this.targetRPM = 0;
    this.activePrize = null;

    // Loop
    this.loopRaf = null;
    this.lastLoopTime = 0;

    // Cache DOM
    this.initDOMElements();

    // Particle FX
    this.particles = new ParticleSystem(this.dom.canvas);
    this.particles.start();

    // Events
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

      // Tachometer Gauge Elements
      needleGroup: document.getElementById('tachometer-needle-group'),
      dialCenterPrompt: document.getElementById('dial-center-prompt'),
      slot6DynamicLabel: document.getElementById('slot6-dynamic-label'),
      tier2DynamicItem: document.getElementById('tier2-dynamic-item'),

      // Prize Slot Wedges (8 Segmen di sekeliling gauge)
      prizeSlots: [
        document.getElementById('prize-slot-0'),
        document.getElementById('prize-slot-1'),
        document.getElementById('prize-slot-2'),
        document.getElementById('prize-slot-3'),
        document.getElementById('prize-slot-4'),
        document.getElementById('prize-slot-5'),
        document.getElementById('prize-slot-6'),
        document.getElementById('prize-slot-7')
      ],

      // Fuel LED Segments (12 Bar)
      fuelLeds: Array.from({ length: 12 }, (_, i) => document.getElementById(`f-led-${i + 1}`)),

      // Press & Hold Button
      holdPedalBtn: document.getElementById('btn-hold-gas'),

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

      // Canvas
      canvas: document.getElementById('fx-canvas')
    };

    if (this.dom.scriptUrlInput) {
      this.dom.scriptUrlInput.value = window.apiService.getScriptUrl();
    }
  }

  bindEvents() {
    this.dom.startBtn.addEventListener('click', () => this.initAudioAndStart());

    this.dom.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.initAudioAndStart();
    });

    // Pilihan Lokasi Booth
    document.querySelectorAll('.location-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.location-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.location = pill.dataset.location || 'RA';

        // Update teks segmen 6 dan preview chip
        if (this.dom.slot6DynamicLabel) {
          this.dom.slot6DynamicLabel.textContent = this.location === 'RA' ? 'Tongkat Tol' : 'Cover Tas';
        }
        if (this.dom.tier2DynamicItem) {
          this.dom.tier2DynamicItem.textContent = this.location === 'RA' ? 'Tongkat Tol (Khusus RA)' : 'Cover Tas (Khusus Pelabuhan)';
        }
      });
    });

    this.dom.restartBtn.addEventListener('click', () => this.showStartScreen());

    // Audio & Mute
    this.dom.muteBtn.addEventListener('click', () => {
      const isMuted = window.soundSystem.toggleMute();
      this.dom.muteBtn.innerHTML = isMuted 
        ? `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> <span>MUTE</span>`
        : `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg> <span>SUARA ON</span>`;
      this.dom.muteBtn.classList.toggle('active', !isMuted);
    });

    this.dom.bgmBtn.addEventListener('click', () => {
      window.soundSystem.ensureContext();
      if (window.soundSystem.bgmPlaying) {
        window.soundSystem.stopBGM();
        this.dom.bgmBtn.classList.remove('active');
        this.dom.bgmBtn.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <span>MUSIK OFF</span>`;
      } else {
        window.soundSystem.startBGM();
        this.dom.bgmBtn.classList.add('active');
        this.dom.bgmBtn.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <span>MUSIK ON</span>`;
      }
    });

    // Modal Settings
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
    // PRESS & HOLD PEDAL GAS (MOUSE, TOUCH, KEYBOARD)
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

    this.dom.holdPedalBtn.addEventListener('pointerdown', onHoldStart);
    this.dom.holdPedalBtn.addEventListener('pointerup', onHoldEnd);
    this.dom.holdPedalBtn.addEventListener('pointercancel', onHoldEnd);
    this.dom.holdPedalBtn.addEventListener('mouseleave', () => {
      if (this.isHolding) this.stopHolding();
    });

    this.dom.holdPedalBtn.addEventListener('touchstart', onHoldStart, { passive: false });
    this.dom.holdPedalBtn.addEventListener('touchend', onHoldEnd, { passive: false });

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
        this.dom.countdownText.textContent = 'GAS POL!';
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
    this.peakRPM = 0;
    this.currentAngle = -125;
    this.currentRPM = 0;
    this.lastTickRPM = 0;

    // Reset HUD & Dial
    this.dom.hudPlayerDisplay.textContent = this.playerName;
    this.dom.hudLocationBadge.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';
    this.dom.hudGasStatus.textContent = 'IDLE (1000 RPM)';
    this.dom.dialCenterPrompt.textContent = 'PRESS TO REFUEL!';
    this.dom.needleGroup.classList.remove('decelerating');

    if (this.dom.slot6DynamicLabel) {
      this.dom.slot6DynamicLabel.textContent = this.location === 'RA' ? 'Tongkat Tol' : 'Cover Tas';
    }

    this.clearAllSlotHighlights();
    this.setFuelLeds(0);
    this.updateGaugeVisual(-125, 0);

    window.soundSystem.startBGM();
    this.dom.bgmBtn.classList.add('active');

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
    this.dom.dialCenterPrompt.textContent = 'GAS POL! REVVING...';
    this.dom.needleGroup.classList.remove('decelerating');

    // Mulai suara mesin balap nyata
    window.soundSystem.startEngineRev();
  }

  stopHolding() {
    if (!this.isHolding || this.state !== 'PLAYING') return;

    this.isHolding = false;
    this.dom.holdPedalBtn.classList.remove('pressing');
    window.soundSystem.stopEngineRev();

    // Jika belum cukup lama
    if (this.holdDuration < this.minHoldTime) {
      this.dom.hudGasStatus.textContent = 'TAHAN LEBIH LAMA!';
      this.dom.dialCenterPrompt.textContent = 'TAHAN MINIMAL 1 DETIK!';
      this.currentAngle = -125;
      this.currentRPM = 0;
      this.setFuelLeds(0);
      this.updateGaugeVisual(-125, 0);
      return;
    }

    // Kunci Hadiah Lucky Dip & Mulai Perlambatan Mesin
    this.beginDecelerationToPrize();
  }

  // =========================================================================
  // RASIO KEBERUNTUNGAN LUCKY DIP (10% : 30% : 60%)
  // =========================================================================
  rollLuckyDipPrize() {
    const rand = Math.random() * 100;

    // 1. TIER 1 — 10%: Kaos dan Topi (1:1)
    if (rand < 10) {
      const sub = Math.random() < 0.5;
      if (sub) {
        // Kaos: Segmen 2 (Angle ~ -48°, RPM ~ 3.1)
        return {
          tier: 1,
          tierName: 'Tier 1 (10%)',
          prizeName: 'Kaos Eksklusif Kratingdaeng',
          prizeType: 'tshirt',
          slotIndex: 2,
          targetAngle: -48 + (Math.random() * 10 - 5),
          targetRPM: 3.1,
          badgeClass: 'tier-1',
          desc: 'Luar Biasa! Anda memenangkan Hadiah Utama Kaos Eksklusif Kratingdaeng!'
        };
      } else {
        // Topi: Segmen 1 (Angle ~ -80°, RPM ~ 1.8) atau Segmen 3 (Angle ~ -15°, RPM ~ 4.4)
        const slot = Math.random() < 0.5 ? 1 : 3;
        const angle = slot === 1 ? -80 + (Math.random() * 10 - 5) : -15 + (Math.random() * 10 - 5);
        return {
          tier: 1,
          tierName: 'Tier 1 (10%)',
          prizeName: 'Topi Kratingdaeng',
          prizeType: 'cap',
          slotIndex: slot,
          targetAngle: angle,
          targetRPM: slot === 1 ? 1.8 : 4.4,
          badgeClass: 'tier-1',
          desc: 'Hebat! Anda memenangkan Topi Eksklusif Kratingdaeng!'
        };
      }
    }

    // 2. TIER 2 — 30%: Payung Lipat, Jas Hujan, Tongkat Tol (RA) / Cover Tas (Pelabuhan) (2:3:4)
    if (rand < 40) { // 10% + 30% = 40%
      const subWeight = Math.random() * 9;
      if (subWeight < 2) {
        // Bobot 2: Payung Lipat (Segmen 4, Angle ~ +15°, RPM ~ 5.6)
        return {
          tier: 2,
          tierName: 'Tier 2 (30%)',
          prizeName: 'Payung Lipat Kratingdaeng',
          prizeType: 'umbrella',
          slotIndex: 4,
          targetAngle: 15 + (Math.random() * 12 - 6),
          targetRPM: 5.6,
          badgeClass: 'tier-2',
          desc: 'Keren! Anda memenangkan Payung Lipat Kratingdaeng!'
        };
      } else if (subWeight < 5) {
        // Bobot 3: Jas Hujan (Segmen 5, Angle ~ +48°, RPM ~ 6.9)
        return {
          tier: 2,
          tierName: 'Tier 2 (30%)',
          prizeName: 'Jas Hujan Kratingdaeng',
          prizeType: 'raincoat',
          slotIndex: 5,
          targetAngle: 48 + (Math.random() * 12 - 6),
          targetRPM: 6.9,
          badgeClass: 'tier-2',
          desc: 'Mantap! Anda memenangkan Jas Hujan Kratingdaeng!'
        };
      } else {
        // Bobot 4: Tongkat Tol (RA) / Cover Tas (Pelabuhan) (Segmen 6, Angle ~ +80°, RPM ~ 8.2)
        const isRA = this.location === 'RA';
        return {
          tier: 2,
          tierName: 'Tier 2 (30%)',
          prizeName: isRA ? 'Tongkat Tol Kratingdaeng (Khusus RA)' : 'Cover Tas Kratingdaeng (Khusus Pelabuhan)',
          prizeType: isRA ? 'tolstick' : 'bagcover',
          slotIndex: 6,
          targetAngle: 80 + (Math.random() * 10 - 5),
          targetRPM: 8.2,
          badgeClass: 'tier-2',
          desc: `Selamat! Anda memenangkan ${isRA ? 'Tongkat Tol' : 'Cover Tas'} Kratingdaeng!`
        };
      }
    }

    // 3. TIER 3 — 60%: Shopping Bag saja (Segmen 0 atau Segmen 7)
    const slot = Math.random() < 0.5 ? 0 : 7;
    const angle = slot === 0 ? -110 + (Math.random() * 8 - 4) : 110 + (Math.random() * 8 - 4);

    return {
      tier: 3,
      tierName: 'Tier 3 (60%)',
      prizeName: 'Shopping Bag Kratingdaeng',
      prizeType: 'shoppingbag',
      slotIndex: slot,
      targetAngle: angle,
      targetRPM: slot === 0 ? 0.6 : 9.4,
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
    this.targetRPM = this.activePrize.targetRPM;

    this.dom.hudGasStatus.textContent = 'MENGUNCI TARGET...';
    this.dom.dialCenterPrompt.textContent = 'LOCKING PRIZE...';
    this.dom.needleGroup.classList.add('decelerating');
  }

  // =========================================================================
  // MAIN PHYSICS LOOP (60 FPS)
  // =========================================================================
  gameLoop(currentTime) {
    if (this.state !== 'PLAYING' && this.state !== 'DECELERATING') return;

    const dt = Math.min(0.1, (currentTime - this.lastLoopTime) / 1000);
    this.lastLoopTime = currentTime;

    // FASE 1: TAHAN GAS (HOLDING)
    if (this.isHolding && this.state === 'PLAYING') {
      this.holdDuration += dt;

      // Jarum berputar 250 derajat (-125° s/d +125°) dengan getaran mesin balap
      const t = currentTime / 1000;
      const swing = Math.sin(t * 14) * 88 + Math.sin(t * 28) * 32 + (Math.random() - 0.5) * 16;
      this.currentAngle = Math.max(-125, Math.min(125, swing));

      // Konversi Sudut ke RPM (0 s/d 10)
      this.currentRPM = Math.max(0, Math.min(10, ((this.currentAngle + 125) / 250) * 10));
      if (this.currentRPM > this.peakRPM) this.peakRPM = this.currentRPM;

      // Update Suara Mesin Nyata
      window.soundSystem.updateEngineRev(this.currentRPM / 10);

      // Update LED Meter Bensin Berdasarkan Putaran Gas
      const litLeds = Math.min(12, Math.floor((this.currentRPM / 10) * 12) + 1);
      this.setFuelLeds(litLeds);

      // Sorot Segmen Hadiah yang Dilewati Jarum
      this.highlightSlotUnderAngle(this.currentAngle);

      // Percikan Api dari Ujung Jarum
      if (Math.random() > 0.45) {
        this.emitNeedleSparks();
      }

      if (this.holdDuration >= 1.2) {
        this.dom.dialCenterPrompt.textContent = 'PUTARAN PENUH! LEPASKAN!';
      }

      // Auto release jika terlalu lama
      if (this.holdDuration >= this.maxHoldTime) {
        this.stopHolding();
      }

      this.updateGaugeVisual(this.currentAngle, this.currentRPM);
    }

    // FASE 2: PERLAMBATAN DRAMATIS (DECELERATION)
    else if (this.state === 'DECELERATING') {
      const elapsed = currentTime - this.decelStartTime;
      const progress = Math.min(1.0, elapsed / this.decelDuration);

      // Easing Cubic Out dengan settling spring inertia
      const ease = 1 - Math.pow(1 - progress, 3);
      const remainingProgress = 1 - progress;
      const wobble = Math.sin(progress * Math.PI * 4.5) * (remainingProgress * 15);

      this.currentAngle = this.decelStartAngle + ((this.targetAngle - this.decelStartAngle) * ease) + wobble;
      this.currentRPM = Math.max(0, Math.min(10, ((this.currentAngle + 125) / 250) * 10));

      // Bunyi Tik Jarum
      if (Math.abs(this.currentRPM - this.lastTickRPM) >= 0.8) {
        window.soundSystem.playNeedleTick(0.8 + (this.currentRPM / 10) * 0.5);
        this.lastTickRPM = this.currentRPM;
      }

      // Update LED Bar
      const litLeds = Math.min(12, Math.floor((this.currentRPM / 10) * 12) + 1);
      this.setFuelLeds(litLeds);

      // Sorot slot aktif
      this.highlightSlotUnderAngle(this.currentAngle);
      this.updateGaugeVisual(this.currentAngle, this.currentRPM);

      if (progress >= 1.0) {
        this.currentAngle = this.targetAngle;
        this.currentRPM = this.targetRPM;
        this.updateGaugeVisual(this.currentAngle, this.currentRPM);
        this.highlightSpecificSlot(this.activePrize.slotIndex);
        this.finishRound();
        return;
      }
    }

    this.loopRaf = requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateGaugeVisual(angle, rpm) {
    if (this.dom.needleGroup) {
      this.dom.needleGroup.setAttribute('style', `transform-origin: 230px 220px; transform: rotate(${angle.toFixed(1)}deg);`);
    }
  }

  setFuelLeds(count) {
    if (!this.dom.fuelLeds) return;
    this.dom.fuelLeds.forEach((led, idx) => {
      if (led) {
        led.classList.toggle('active', idx < count);
      }
    });
  }

  highlightSlotUnderAngle(angle) {
    // Tentukan index slot (0 s/d 7) berdasarkan sudut jarum
    let idx = 0;
    if (angle < -95) idx = 0;
    else if (angle < -65) idx = 1;
    else if (angle < -30) idx = 2; // Kaos
    else if (angle < 0) idx = 3;
    else if (angle < 30) idx = 4;
    else if (angle < 65) idx = 5;
    else if (angle < 95) idx = 6;
    else idx = 7;

    this.highlightSpecificSlot(idx);
  }

  highlightSpecificSlot(idx) {
    this.dom.prizeSlots.forEach((slot, i) => {
      if (slot) {
        slot.classList.toggle('active-slot', i === idx);
      }
    });
  }

  clearAllSlotHighlights() {
    this.dom.prizeSlots.forEach(slot => {
      if (slot) slot.classList.remove('active-slot');
    });
    // Tetap beri highlight awal pada slot Kaos (slot 2) persis seperti di gambar referensi
    if (this.dom.prizeSlots[2]) {
      this.dom.prizeSlots[2].classList.add('active-slot');
    }
  }

  emitNeedleSparks() {
    const rect = this.dom.needleGroup ? this.dom.needleGroup.getBoundingClientRect() : null;
    if (rect) {
      const x = rect.left + rect.width / 2;
      const y = rect.top + 30;
      this.particles.createSparks(x, y, 6, this.currentRPM >= 7);
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

    // Fanfare Kemenangan
    window.soundSystem.playPrizeWin(prize.tier);

    // Ledakan Confetti
    this.particles.createOverchargeExplosion();
    this.triggerScreenShake(7);

    // Tampilkan Hasil
    this.dom.resPrizeName.textContent = prize.prizeName;
    this.dom.resTierBadge.textContent = prize.tierName;
    this.dom.resTierBadge.className = `tier-badge ${prize.badgeClass}`;
    this.dom.resTierDesc.textContent = prize.desc;
    this.dom.resFinalSpeed.textContent = `${prize.targetRPM.toFixed(1)} x1000 RPM`;
    this.dom.resHoldTime.textContent = `${this.holdDuration.toFixed(1)}s`;
    this.dom.resBoothLoc.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';

    // Artwork Vektor Hadiah
    this.dom.resPrizeIconBox.innerHTML = this.getPrizeArtworkSvg(prize.prizeType);

    setTimeout(() => {
      this.dom.gameScreen.classList.add('hidden');
      this.dom.gameOverScreen.classList.remove('hidden');
    }, 450);

    // Kirim Skor & Hadiah ke Google Sheet
    await this.syncScoreToBackend(prize);
  }

  getPrizeArtworkSvg(type) {
    switch (type) {
      case 'tshirt':
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <path d="M18 12 L26 18 Q32 22 38 18 L46 12 L56 22 L49 28 L46 25 L46 54 L18 54 L18 25 L15 28 L8 22 Z" fill="#ffd700" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
            <path d="M26 18 Q32 22 38 18" stroke="#e60000" stroke-width="3" fill="none"/>
            <circle cx="32" cy="34" r="7" fill="#e60000"/>
            <path d="M28 34 L36 34" stroke="#ffd700" stroke-width="2"/>
          </svg>`;

      case 'cap':
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <ellipse cx="28" cy="36" rx="20" ry="14" fill="#e60000" stroke="#ffd700" stroke-width="2"/>
            <path d="M20 40 Q40 40 56 36 Q44 46 22 46 Z" fill="#ffd700" stroke="#b45309" stroke-width="1.5"/>
            <circle cx="28" cy="22" r="3" fill="#ffd700"/>
            <path d="M20 32 Q28 26 36 32" stroke="#fff" stroke-width="2" fill="none"/>
          </svg>`;

      case 'umbrella':
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <path d="M32 12 Q12 28 14 36 L50 36 Q52 28 32 12 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <path d="M32 36 L32 50 Q32 54 28 54 Q24 54 24 50" stroke="#ffd700" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M24 36 Q32 32 40 36" stroke="#fff" stroke-width="1.5" fill="none"/>
            <line x1="32" y1="8" x2="32" y2="12" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`;

      case 'raincoat':
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <path d="M26 12 Q32 6 38 12 L44 18 L54 26 L48 32 L44 28 L44 56 L20 56 L20 28 L16 32 L10 26 L20 18 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <circle cx="32" cy="12" r="7" stroke="#38bdf8" stroke-width="2" fill="none"/>
            <line x1="32" y1="20" x2="32" y2="56" stroke="#ffd700" stroke-width="2"/>
          </svg>`;

      case 'tolstick':
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <rect x="22" y="10" width="20" height="14" rx="2" fill="#ffd700" stroke="#b45309" stroke-width="1.5"/>
            <rect x="25" y="13" width="6" height="4" rx="1" fill="#0284c7"/>
            <line x1="32" y1="24" x2="32" y2="56" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
            <rect x="29" y="44" width="6" height="12" rx="2" fill="#e60000"/>
          </svg>`;

      case 'bagcover':
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <ellipse cx="32" cy="34" rx="18" ry="22" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <path d="M20 24 Q32 16 44 24" stroke="#ffd700" stroke-width="2" fill="none"/>
            <path d="M22 44 Q32 50 42 44" stroke="#ffd700" stroke-width="2" fill="none"/>
            <path d="M26 34 L38 34" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`;

      case 'shoppingbag':
      default:
        return `
          <svg class="prize-artwork-svg" viewBox="0 0 64 64" fill="none">
            <rect x="16" y="24" width="32" height="34" rx="3" fill="#059669" stroke="#34d399" stroke-width="2"/>
            <path d="M24 24 L24 16 Q32 10 40 16 L40 24" stroke="#ffd700" stroke-width="3" fill="none" stroke-linecap="round"/>
            <circle cx="32" cy="40" r="7" fill="#ffd700"/>
            <path d="M28 40 L36 40" stroke="#e60000" stroke-width="2"/>
          </svg>`;
    }
  }

  async syncScoreToBackend(prize) {
    this.dom.sheetSyncStatus.innerHTML = `
      <span class="spinner"></span> Menyimpan data pemenang ke Google Sheet & Drive...
    `;
    this.dom.sheetSyncStatus.className = 'status-pill pending';
    this.dom.certLinkContainer.classList.add('hidden');

    const rpmDisplay = `${prize.targetRPM.toFixed(1)} x1000 RPM`;
    const payload = {
      name: this.playerName,
      score: Math.round(prize.targetRPM * 1000),
      tier: `${prize.tierName}: ${prize.prizeName}`,
      peakRpm: rpmDisplay,
      duration: parseFloat(this.holdDuration.toFixed(1)),
      maxPercent: rpmDisplay,
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
          <td class="score-col">${(entry.score || 0)} RPM</td>
          <td class="tier-col">${this.escapeHtml(entry.tier || '')}</td>
        </tr>
      `;
    });

    this.dom.leaderboardBody.innerHTML = rowsHtml;
  }

  shareScore() {
    if (!this.activePrize) return;
    const text = `Saya baru saja bermain Kratingdaeng Energi Pit - Energy Fuel Gauge dan memenangkan ${this.activePrize.prizeName} (${this.activePrize.tierName}) dengan putaran mesin ${this.activePrize.targetRPM.toFixed(1)} RPM! Gas pol sekarang!`;

    if (navigator.share) {
      navigator.share({
        title: 'Kratingdaeng Energi Pit - Fuel Gauge',
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

window.addEventListener('DOMContentLoaded', () => {
  window.game = new KratingdaengGame();
});
