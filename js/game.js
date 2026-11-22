/**
 * ===================================================================================
 * KRATINGDAENG SPEEDOMETER SPIN WHEEL 180° - CORE GAME LOGIC
 * ===================================================================================
 * Fitur & Spesifikasi:
 * 1. Desain Roda Putar Setengah Lingkaran (180° Spin Wheel Speedometer / Odometer)
 * 2. SINGLE-CLICK TRIGGER (1 kali klik langsung memutar speedometer)
 * 3. Tampilan Speedometer Mewah, Modern, Realistis & Elegan
 * 4. Sektor Roda & Rasio Kemenangan Lucky Dip:
 *    - Tier 1 — 10%: Kaos Eksklusif dan Topi (1:1) [Zona Redline 162-180 KM/H]
 *    - Tier 2 — 30%: Payung Lipat, Jas Hujan, Tongkat Tol (RA) / Cover Tas (Pelabuhan) (2:3:4) [Zona Biru 108-162 KM/H]
 *    - Tier 3 — 60%: Shopping Bag saja [Zona Hijau 0-108 KM/H]
 * 5. Audio Multi-Layer Real Engine Sound (on_low, on_midhigh, on_high, off_midhigh, off_lower)
 * 6. Integrasi Google Sheets & Google Drive Otomatis
 * ===================================================================================
 */

class KratingdaengGame {
  constructor() {
    // State Game
    this.state = 'INIT'; // INIT, COUNTDOWN, PLAYING, SPINNING, DECELERATING, GAMEOVER
    this.playerName = 'Jagoan Kratingdaeng';
    this.location = 'RA'; // Default; akan diambil dari backend saat init

    // Speedometer 180° State
    // Sudut jarum: -90° (0 KM/H, sisi kiri) s/d +90° (180 KM/H, sisi kanan)
    this.currentAngle = -90;
    this.currentSpeed = 0; // 0 - 180 KM/H
    this.peakSpeed = 0;
    this.odometerMileage = 18420; // Kilometrage dasar
    this.lastTickSpeed = 0;
    this.gasHeld = false;
    this.holdRpm = 0;
    this.holdRaf = null;
    this.cycIdx = -1;
    this.cycLast = 0;
    this.cycPlan = [];
    this.cycStep = 0;
    this.cycWin = 0;

    // Single-Click Spin Timing (Total 15 detik sesuai urutan audio)
    // Timeline audio: off_lower(0-1.5s) → on_low(1.5-4.5s) → on_midhigh(4.5-8s) → on_high(8-11.5s) → off_midhigh(11.5-13.5s) → off_lower(13.5-15s)
    this.isSpinning = false;
    this.spinStartTime = 0;
    this.spinFastDuration = 9500;   // 0s-9.5s: fase putaran cepat (mesin naik on_low→on_midhigh→on_high)
    this.spinDecelDuration = 5500;  // 9.5s-15s: fase deselerasi (on_high turun→off_midhigh→off_lower)
    this.spinTotalDuration = this.spinFastDuration + this.spinDecelDuration; // = 15.0 detik
    this.decelStartAngle = 0;
    this.hasSwitchedToDecel = false;

    // Target Landing & Prize State
    this.targetAngle = 0;
    this.targetSpeed = 0;
    this.activePrize = null;

    // RAF Loop
    this.loopRaf = null;
    this.lastLoopTime = 0;

    // Inisialisasi DOM Elements Cache
    this.initDOMElements();

    // Ambil lokasi booth & konfigurasi dari backend
    this.loadBoothConfigFromBackend();

    // Inisialisasi Sistem Partikel FX
    this.particles = new ParticleSystem(this.dom.canvas);
    this.particles.start();

    // Pasang Event Listeners
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

      // Global Buttons
      nameInput: document.getElementById('player-name-input'),
      startBtn: document.getElementById('btn-start-game'),
      restartBtn: document.getElementById('btn-play-again'),
      muteBtn: document.getElementById('btn-toggle-mute'),
      settingsBtn: document.getElementById('btn-open-settings'),
      settingsModal: document.getElementById('settings-modal'),
      closeSettingsBtn: document.getElementById('btn-close-settings'),

      // HUD Stats
      hudPlayerDisplay: document.getElementById('hud-player-display'),
      hudLocationBadge: document.getElementById('hud-location-badge'),
      hudGasStatus: document.getElementById('hud-gas-status'),
      overchargeBanner: document.getElementById('overcharge-banner'),

      // Speedometer baru (js/gauge.js)
      needleGroup: document.getElementById('gauge-needle'),

      // Tombol Single-Click Spin Wheel
      spinWheelBtn: document.getElementById('btn-spin-wheel'),
      btnSpinText: document.getElementById('btn-spin-text'),
      btnSpinSubtext: document.getElementById('btn-spin-subtext'),

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

    // Lokasi Booth: Diatur oleh backend (Google Apps Script) via loadBoothConfigFromBackend()
    // Selector hanya tampilan informasi, tidak bisa diklik manual oleh pemain

    // Tombol Main Lagi
    this.dom.restartBtn.addEventListener('click', () => this.showStartScreen());

    // Audio & Mute Controls
    // SATU tombol suara: musik latar + efek suara sekaligus
    this.dom.muteBtn.addEventListener('click', () => {
      window.soundSystem.ensureContext();
      const isMuted = window.soundSystem.toggleMute();
      const icon = isMuted
        ? '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
        : '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
      this.dom.muteBtn.innerHTML = `${icon} <span>${isMuted ? 'SUARA OFF' : 'SUARA ON'}</span>`;
      this.dom.muteBtn.classList.toggle('active', !isMuted);
      if (isMuted) window.soundSystem.stopBGM();
      else if (this.state === 'PLAYING' || this.state === 'COUNTDOWN') window.soundSystem.startBGM();
    });

    // Settings Modal (hanya menampilkan info koneksi backend untuk referensi admin)
    if (this.dom.settingsBtn) {
      this.dom.settingsBtn.addEventListener('click', () => {
        if (this.dom.settingsModal) this.dom.settingsModal.classList.remove('hidden');
      });
    }
    if (this.dom.closeSettingsBtn) {
      this.dom.closeSettingsBtn.addEventListener('click', () => {
        if (this.dom.settingsModal) this.dom.settingsModal.classList.add('hidden');
      });
    }

    if (this.dom.refreshLbBtn) {
      this.dom.refreshLbBtn.addEventListener('click', () => this.updateLeaderboardDisplay());
    }

    if (this.dom.shareBtn) {
      this.dom.shareBtn.addEventListener('click', () => this.shareScore());
    }

    // =========================================================================
    // MEKANIK INTERAKSI: SATU TOMBOL TEKAN & TAHAN (sentuh / mouse / Spasi / Enter)
    // =========================================================================
    const gas = this.dom.spinWheelBtn;
    if (gas) {
      gas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { gas.setPointerCapture(e.pointerId); } catch (_) {}
        this.gasPress();
      });
      ['pointerup', 'pointercancel'].forEach(ev => gas.addEventListener(ev, () => this.gasRelease()));
      gas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    window.addEventListener('keydown', (e) => {
      if (this.state === 'PLAYING' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (!e.repeat) this.gasPress();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') this.gasRelease();
    });
    window.addEventListener('blur', () => this.gasRelease());
  }

  // ---- Tekan & tahan gas: jarum naik sampai penuh, lalu memicu putaran ----
  gasPress() {
    if (this.state !== 'PLAYING') return;
    window.soundSystem.ensureContext();
    this.gasHeld = true;
    if (this.dom.spinWheelBtn) this.dom.spinWheelBtn.classList.add('down');
  }

  gasRelease() {
    this.gasHeld = false;
    if (this.dom.spinWheelBtn) this.dom.spinWheelBtn.classList.remove('down');
  }

  holdTick(t) {
    if (this.state !== 'PLAYING') { this.holdRaf = null; return; }
    const dt = Math.min(0.05, (t - (this.holdLast || t)) / 1000);
    this.holdLast = t;
    const gauge = window.gauge;
    if (this.gasHeld) {
      this.holdRpm = Math.min(10, this.holdRpm + (10 / 1.6) * dt * (1 + this.holdRpm / 25));
      gauge.setStatus(this.holdRpm < 7 ? 'REVVING...' : 'KEEP HOLDING!');
      this.dom.hudGasStatus.textContent = 'GAS DITEKAN!';
      this.holdSecT = (this.holdSecT || 0) + dt;
      if (this.holdSecT > Math.max(0.05, 0.32 - this.holdRpm * 0.028)) {
        this.holdSecT = 0;
        this.cycIdx = (this.cycIdx + 1) % gauge.N;
        gauge.highlight(this.cycIdx);
        window.soundSystem.playNeedleTick(0.8 + this.holdRpm / 10 * 0.6);
      }
      if (this.holdRpm >= 9.98) {
        this.gasRelease();
        this.holdRaf = null;
        this.triggerSpin();
        return;
      }
    } else if (this.holdRpm > 0) {
      this.holdRpm = Math.max(0, this.holdRpm - 3.2 * dt);
      if (this.holdRpm === 0) {
        gauge.setStatus('PRESS TO REFUE!');
        this.dom.hudGasStatus.textContent = 'SIAP PUTAR!';
        gauge.clear();
      }
    }
    const jit = this.gasHeld && this.holdRpm > 1 ? Math.sin(t / 40) * 0.07 : 0;
    gauge.setValue(this.holdRpm + jit);
    this.holdRaf = requestAnimationFrame((x) => this.holdTick(x));
  }

  initAudioAndStart() {
    if (this.state !== 'INIT') return; // cegah countdown ganda
    window.soundSystem.ensureContext();
    const name = this.dom.nameInput.value.trim();
    this.playerName = name ? name : 'Jagoan Kratingdaeng';
    this.startCountdown();
  }

  // =========================================================================
  // AMBIL KONFIGURASI LOKASI BOOTH DARI BACKEND (Google Apps Script)
  // =========================================================================
  async loadBoothConfigFromBackend() {
    try {
      const config = await window.apiService.getBoothConfig();
      if (config && config.location) {
        this.location = config.location; // 'RA' atau 'Pelabuhan'
      }
      // Update tampilan badge di HUD jika game-screen sudah visible
      if (this.dom.hudLocationBadge) {
        this.dom.hudLocationBadge.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';
      }
      // Update label chip Tier 2 di start screen
      if (this.dom.tier2DynamicItem) {
        this.dom.tier2DynamicItem.textContent = this.location === 'RA'
          ? 'Tongkat Tol (Khusus RA)'
          : 'Cover Tas (Khusus Pelabuhan)';
      }
      // Update label di location-pill selector (hanya tampilkan yang aktif)
      this.updateLocationDisplay();
    } catch (e) {
      console.warn('Gagal memuat konfigurasi booth dari backend, menggunakan default RA:', e);
    }
  }

  updateLocationDisplay() {
    if (window.gauge) window.gauge.setLocation(this.location);
    const lt = document.getElementById('loc-title-text'), lh = document.getElementById('loc-hint-text');
    if (lt) lt.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';
    if (lh) lh.textContent = this.location === 'RA' ? 'Khusus Tongkat Tol' : 'Khusus Cover Tas';
    // Sembunyikan selector manual, tampilkan sebagai informasi saja
    document.querySelectorAll('.location-pill').forEach(pill => {
      pill.classList.remove('selected');
      if (pill.dataset.location === this.location) {
        pill.classList.add('selected');
      }
    });
    // Update label tier2 dynamic item
    if (this.dom.tier2DynamicItem) {
      this.dom.tier2DynamicItem.textContent = this.location === 'RA'
        ? 'Tongkat Tol (Khusus RA)'
        : 'Cover Tas (Khusus Pelabuhan)';
    }
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

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.dom.countdownText.textContent = count;
        window.soundSystem.playCountdown(false);
      } else if (count === 0) {
        this.dom.countdownText.textContent = 'PUTAR!';
        window.soundSystem.playCountdown(true);
      } else {
        clearInterval(timer);
        this.dom.countdownOverlay.classList.add('hidden');
        this.startMatch();
      }
    }, 900);
  }

  startMatch() {
    this.state = 'PLAYING';
    this.isSpinning = false;
    this.currentAngle = -90;
    this.currentSpeed = 0;
    this.peakSpeed = 0;
    this.lastTickSpeed = 0;

    // Reset Visual Display
    this.dom.hudPlayerDisplay.textContent = this.playerName;
    this.dom.hudLocationBadge.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';
    this.dom.hudGasStatus.textContent = 'SIAP PUTAR!';
    this.dom.hudGasStatus.style.color = '#ffd700';
    this.dom.overchargeBanner.textContent = 'TEKAN & TAHAN TOMBOL GAS SAMPAI PENUH!';

    // Reset Tombol Spin
    if (this.dom.spinWheelBtn) {
      this.dom.spinWheelBtn.disabled = false;
      this.dom.spinWheelBtn.classList.remove('spinning');
    }
    if (this.dom.btnSpinText) this.dom.btnSpinText.textContent = 'PRESS & HOLD:';
    if (this.dom.btnSpinSubtext) this.dom.btnSpinSubtext.textContent = 'GAS POL / REFUEL';
    if (this.dom.needleGroup) this.dom.needleGroup.classList.remove('decelerating');

    this.clearSectorHighlights();
    this.gasHeld = false;
    this.holdRpm = 0;
    this.holdLast = 0;
    this.cycIdx = -1;
    this.updateLocationDisplay();
    window.gauge.setStatus('PRESS TO REFUE!');
    this.updateSpeedometerVisual(-90, 0);

    // Audio BGM
    window.soundSystem.startBGM();

    // Loop tekan & tahan
    if (this.holdRaf) cancelAnimationFrame(this.holdRaf);
    this.holdRaf = requestAnimationFrame((t) => this.holdTick(t));
  }

  // =========================================================================
  // MEKANIK SINGLE-CLICK: SATU KLIK LANGSUNG MEMUTAR SPEEDOMETER
  // =========================================================================
  triggerSpin() {
    if (this.state !== 'PLAYING' || this.isSpinning) return;

    this.isSpinning = true;
    this.state = 'SPINNING';

    // Kunci tombol & aktifkan efek visual berputar
    if (this.dom.spinWheelBtn) {
      this.dom.spinWheelBtn.disabled = true;
      this.dom.spinWheelBtn.classList.add('spinning');
    }
    if (this.dom.btnSpinText) this.dom.btnSpinText.textContent = 'MEMUTAR SPEEDOMETER...';
    if (this.dom.btnSpinSubtext) this.dom.btnSpinSubtext.textContent = 'MENGHITUNG ZONA & TIER HADIAH';
    window.gauge.setStatus('GAS POL!');
    this.cycLast = performance.now();
    this.dom.hudGasStatus.textContent = 'PUTARAN KENCANG!';
    this.dom.hudGasStatus.style.color = '#ff1744';
    this.dom.overchargeBanner.textContent = 'SPEEDOMETER BERPUTAR DENGAN POWER MAKSIMAL!';

    // Tentukan hadiah dengan rasio resmi (Tier 1 10%, Tier 2 30%, Tier 3 60%)
    this.activePrize = this.rollLuckyDipPrize();
    this.targetAngle = this.activePrize.targetAngle;
    this.targetSpeed = this.activePrize.targetSpeed;

    // Parameter Timing Putaran Roda (15 detik, sesuai urutan audio)
    this.spinStartTime = performance.now();
    this.spinFastDuration = 9500;   // 0s-9.5s: putaran cepat (audio on_low→on_midhigh→on_high)
    this.spinDecelDuration = 5500;  // 9.5s-15s: deselerasi (audio off_midhigh→off_lower)
    this.spinTotalDuration = this.spinFastDuration + this.spinDecelDuration; // 15 detik total
    this.decelStartAngle = 90;
    this.hasSwitchedToDecel = false;

    // Mulai sequence suara mesin 15 detik (off_lower→on_low→on_midhigh→on_high→off_midhigh→off_lower)
    window.soundSystem.startSpinSequence();

    // Jalankan Loop Animasi Fisika RAF
    this.lastLoopTime = performance.now();
    if (this.loopRaf) cancelAnimationFrame(this.loopRaf);
    this.loopRaf = requestAnimationFrame((t) => this.spinLoop(t));
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
      // Mendarat di zona merah redline (162 - 180 KM/H, sudut +72° s/d +90°)
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
        desc: 'Luar Biasa! Anda memenangkan Hadiah Utama Tier 1 Kratingdaeng!'
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

      // Mendarat di zona biru (108 - 162 KM/H, sudut +18° s/d +72°)
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
    // Mendarat di zona hijau (0 - 108 KM/H, sudut -90° s/d +18°)
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

  // =========================================================================
  // SPIN LOOP ANIMASI (60 FPS)
  // =========================================================================
  spinLoop(currentTime) {
    if (this.state !== 'SPINNING' && this.state !== 'DECELERATING') return;

    const elapsed = currentTime - this.spinStartTime;

    // -----------------------------------------------------------------------
    // FASE 1: PUTARAN CEPAT BERKECEPATAN TINGGI (0.0s s/d 1.5s)
    // -----------------------------------------------------------------------
    if (elapsed < this.spinFastDuration) {
      const t = elapsed / 1000;
      // Ayunan frekuensi tinggi melintasi seluruh busur 180° (-90° s/d +90°)
      const swing = Math.sin(t * 14) * 62 + Math.sin(t * 28) * 26 + (Math.random() - 0.5) * 14;
      const blend = Math.min(1, elapsed / 400); // transisi mulus dari jarum penuh (+90) ke ayunan
      this.currentAngle = Math.max(-90, Math.min(90, 90 + (swing - 90) * blend));
      if (elapsed - this.cycLast > 85) { this.cycLast = elapsed; this.cycIdx = (this.cycIdx + 1) % window.gauge.N; window.gauge.highlight(this.cycIdx); }
      this.currentSpeed = Math.round(((this.currentAngle + 90) / 180) * 180);

      if (this.currentSpeed > this.peakSpeed) {
        this.peakSpeed = this.currentSpeed;
      }

      // Odometer Digital bertambah cepat (simulasi rotasi ban kencang)
      if (Math.random() > 0.35) {
        this.odometerMileage += Math.floor(Math.random() * 3) + 1;
      }

      // Suara deru mesin naik seiring intensitas kecepatan
      window.soundSystem.updateEngineRev(this.currentSpeed / 180, this.currentSpeed);

      // Partikel percikan dari ujung jarum
      if (Math.random() > 0.4) {
        this.emitNeedleSparks();
      }

      // Update Tampilan Speedometer & Odometer
      this.updateSpeedometerVisual(this.currentAngle, this.currentSpeed);
    }

    // -----------------------------------------------------------------------
    // TRANSISI KE FASE 2: PERLAMBATAN (DECELERATION) PADA DETIK KE-1.5
    // -----------------------------------------------------------------------
    else if (!this.hasSwitchedToDecel) {
      this.hasSwitchedToDecel = true;
      this.state = 'DECELERATING';
      this.decelStartAngle = this.currentAngle;
      this.planDecelSectors();
      window.gauge.setStatus('MENGUNCI...');

      this.dom.hudGasStatus.textContent = 'MENGUNCI...';
      this.dom.hudGasStatus.style.color = '#ffd700';
      this.dom.overchargeBanner.textContent = 'JARUM MELAMBAT... MENUJU SEKTOR HADIAH LUCKY DIP!';
      if (this.dom.btnSpinText) this.dom.btnSpinText.textContent = 'MENGUNCI TARGET...';
      if (this.dom.btnSpinSubtext) this.dom.btnSpinSubtext.textContent = 'JARUM SEDANG MENDARAT DI SEKTOR HADIAH';
      if (this.dom.needleGroup) this.dom.needleGroup.classList.add('decelerating');
      // Audio deselerasi sudah diatur oleh spinSequence (fase off_midhigh & off_lower)
    }

    // -----------------------------------------------------------------------
    // FASE 2: PERLAMBATAN DRAMATIS MENUJU TARGET (1.5s s/d 4.1s)
    // -----------------------------------------------------------------------
    if (elapsed >= this.spinFastDuration && elapsed < this.spinTotalDuration) {
      const decelElapsed = elapsed - this.spinFastDuration;
      const progress = Math.min(1.0, decelElapsed / this.spinDecelDuration);

      // Easing Cubic Out yang sangat halus dengan efek inersia pegas (spring settling)
      const ease = 1 - Math.pow(1 - progress, 3);
      const remainingProgress = 1 - progress;
      const wobble = Math.sin(progress * Math.PI * 4) * (remainingProgress * 12);

      this.currentAngle = this.decelStartAngle + ((this.targetAngle - this.decelStartAngle) * ease) + wobble;
      this.currentSpeed = Math.round(((this.currentAngle + 90) / 180) * 180);
      this.stepDecelSectors(decelElapsed);

      // Bunyi Tik Pin / Peg saat melintasi batas speed
      if (Math.abs(this.currentSpeed - this.lastTickSpeed) >= 14) {
        window.soundSystem.playNeedleTick(0.8 + (this.currentSpeed / 180) * 0.6);
        this.lastTickSpeed = this.currentSpeed;
      }

      this.updateSpeedometerVisual(this.currentAngle, this.currentSpeed);
    }

    // -----------------------------------------------------------------------
    // FASE 3: MENDARAT DI TARGET & FINISH ROUND (>= 4.1s)
    // -----------------------------------------------------------------------
    if (elapsed >= this.spinTotalDuration) {
      this.currentAngle = this.targetAngle;
      this.currentSpeed = this.targetSpeed;
      this.updateSpeedometerVisual(this.currentAngle, this.currentSpeed);
      this.highlightWinningSector();
      this.finishRound();
      return;
    }

    this.loopRaf = requestAnimationFrame((t) => this.spinLoop(t));
  }

  // =========================================================================
  // UPDATE VISUAL SPEEDOMETER & ODOMETER (180 DERAJAT)
  // =========================================================================
  updateSpeedometerVisual(angle, speed) {
    // sudut -90..+90 => RPM 0..10 pada speedometer baru
    window.gauge.setValue((Math.max(-90, Math.min(90, angle)) + 90) / 18);
  }

  // Rencana tik sektor saat melambat: tik terakhir PASTI mendarat di sektor hadiah
  planDecelSectors() {
    const N = window.gauge.N;
    this.cycWin = window.gauge.indexForPrize(this.activePrize.prizeType);
    const n = 16 + ((((this.cycWin - this.cycIdx - 16) % N) + N) % N);
    const raw = []; let s = 0;
    for (let k = 0; k < n; k++) { s += 60 + Math.pow(k / n, 2.2) * 420; raw.push(s); }
    const f = (this.spinDecelDuration * 0.92) / s;
    this.cycPlan = raw.map(x => x * f);
    this.cycStep = 0;
  }

  stepDecelSectors(decelElapsed) {
    while (this.cycStep < this.cycPlan.length && decelElapsed >= this.cycPlan[this.cycStep]) {
      this.cycIdx = (this.cycIdx + 1) % window.gauge.N;
      window.gauge.highlight(this.cycIdx);
      window.soundSystem.playNeedleTick(1 + (this.cycStep / this.cycPlan.length) * 0.3);
      this.cycStep++;
    }
  }

  highlightWinningSector() {
    window.gauge.highlight(this.cycWin, true);
    window.gauge.setStatus(this.activePrize.prizeName.replace(/ Kratingdaeng.*$/i, '').toUpperCase() + '!');
  }

  clearSectorHighlights() {
    window.gauge.clear();
  }

  emitNeedleSparks() {
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
    window.soundSystem.stopSpinSequence(); // pastikan audio spin dihentikan jika finish lebih awal

    const prize = this.activePrize;

    // Bunyikan Fanfare Kemenangan Sesuai Tier
    window.soundSystem.playPrizeWin(prize.tier);

    // Ledakan Confetti & Partikel
    this.particles.createOverchargeExplosion();
    this.triggerScreenShake(7);

    // Tampilkan Data Hadiah di Screen Game Over
    this.dom.resPrizeName.textContent = prize.prizeName;
    this.dom.resTierBadge.textContent = prize.tierName;
    this.dom.resTierBadge.className = `tier-badge ${prize.badgeClass}`;
    this.dom.resTierDesc.textContent = prize.desc;
    this.dom.resFinalSpeed.textContent = `${prize.targetSpeed} KM/H`;
    this.dom.resHoldTime.textContent = `${(this.spinTotalDuration / 1000).toFixed(1)}s (1 Klik)`;
    this.dom.resBoothLoc.textContent = this.location === 'RA' ? 'Rest Area (RA)' : 'Pelabuhan';

    // Artwork SVG Hadiah
    this.dom.resPrizeIconBox.innerHTML = this.getPrizeArtworkSvg(prize.prizeType);

    // Beralih Layar ke Hasil
    setTimeout(() => {
      this.dom.gameScreen.classList.add('hidden');
      this.dom.gameOverScreen.classList.remove('hidden');
    }, 450);

    // Simpan ke Google Sheet & LocalStorage
    await this.syncScoreToBackend(prize);
  }

  // =========================================================================
  // VECTOR ARTWORK SVG UNTUK SETIAP HADIAH
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
      duration: parseFloat((this.spinTotalDuration / 1000).toFixed(1)),
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
