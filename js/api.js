/**
 * ===================================================================================
 * KRATINGDAENG SPEEDOMETER SPIN WHEEL - GOOGLE APPS SCRIPT API INTEGRATION
 * ===================================================================================
 * Menghubungkan Game ke Google Sheet & Google Drive via Apps Script Web App.
 *
 * PENGATURAN UNTUK ADMIN:
 *   - URL Google Apps Script diisi di bawah (SCRIPT_URL), bukan di UI/frontend
 *   - Lokasi Booth (RA atau Pelabuhan) diatur oleh backend via getBoothConfig()
 *   - Fallback otomatis ke LocalStorage bila offline / URL belum diisi
 *
 * CARA DEPLOY:
 *   1. Buka Google Apps Script: https://script.google.com
 *   2. Paste isi google-apps-script/Code.gs
 *   3. Deploy → Web App → Execute as: Me → Who has access: Anyone
 *   4. Salin URL hasil deploy dan tempel di SCRIPT_URL di bawah ini
 * ===================================================================================
 */

// ==================================================================================
// KONFIGURASI ADMIN — ISI URL DAN LOKASI BOOTH DI SINI, BUKAN DI FRONTEND
// ==================================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyCPBWKgbcX2El_F33dLkq5FyLLuRLKRe7dFL7Yq3iQaqSh-xZ7UyWYUKfMte1997sE/exec'; // <-- Tempel URL Google Apps Script Anda di sini
// Contoh: 'https://script.google.com/macros/s/AKfycb.../exec'

// Lokasi booth aktif: 'RA' untuk Rest Area, 'Pelabuhan' untuk Pelabuhan
// Jika backend mengembalikan konfigurasi, nilai ini akan ditimpa otomatis
const DEFAULT_BOOTH_LOCATION = 'RA';
// ==================================================================================

const LOCAL_LEADERBOARD_KEY = 'KRATINGDAENG_LOCAL_SCORES';

class ApiService {
  constructor() {
    // URL dikonfigurasi di atas (SCRIPT_URL), bukan dari localStorage / input user
    this.scriptUrl = SCRIPT_URL.trim();
    this.boothLocation = DEFAULT_BOOTH_LOCATION;
  }

  getScriptUrl() {
    return this.scriptUrl;
  }

  hasValidUrl() {
    return Boolean(
      this.scriptUrl &&
      this.scriptUrl.startsWith('https://script.google.com/macros/s/')
    );
  }

  /**
   * Ambil konfigurasi booth dari Google Apps Script backend.
   * Backend menentukan lokasi (RA / Pelabuhan) — frontend tidak bisa memilih sendiri.
   * Jika gagal, gunakan DEFAULT_BOOTH_LOCATION.
   */
  async getBoothConfig() {
    if (!this.hasValidUrl()) {
      return { location: this.boothLocation };
    }

    try {
      const resp = await fetch(
        `${this.scriptUrl}?action=getBoothConfig&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data && data.location) {
        this.boothLocation = data.location; // simpan di memori
        return { location: data.location };
      }
    } catch (e) {
      console.warn('Gagal mengambil konfigurasi booth dari backend:', e);
    }

    return { location: this.boothLocation };
  }

  /**
   * Kirim skor ke Google Apps Script (Google Sheets & Google Drive).
   * Lokasi booth dikirim bersama data sehingga backend mengetahui konteks hadiah.
   */
  async submitScore(playerData) {
    // 1. Simpan selalu ke LocalStorage sebagai backup
    this.saveLocalScore(playerData);

    // 2. Jika URL belum diisi admin, simpan lokal saja
    if (!this.hasValidUrl()) {
      return {
        status: 'local_only',
        message: 'Tersimpan di perangkat (Admin belum menghubungkan Google Sheet)',
        rank: this.calculateLocalRank(playerData.score),
        certificateUrl: '#'
      };
    }

    // 3. Kirim via POST ke Google Apps Script Web App
    try {
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Hindari CORS preflight di Apps Script
        },
        body: JSON.stringify(playerData)
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      return result;

    } catch (err) {
      console.warn('Gagal konek ke Google Apps Script, beralih ke no-cors / local fallback:', err);

      // Fallback no-cors fire-and-forget bila browser memblokir CORS
      try {
        await fetch(this.scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(playerData)
        });
        return {
          status: 'success_nocors',
          message: 'Terkirim ke Google Sheet!',
          rank: this.calculateLocalRank(playerData.score),
          certificateUrl: '#'
        };
      } catch (innerErr) {
        return {
          status: 'offline',
          message: 'Offline: Skor tersimpan di perangkat.',
          rank: this.calculateLocalRank(playerData.score),
          certificateUrl: '#'
        };
      }
    }
  }

  /**
   * Ambil data Papan Peringkat (Top 10) dari Google Sheets
   */
  async getLeaderboard() {
    if (!this.hasValidUrl()) {
      return this.getLocalLeaderboard();
    }

    try {
      const response = await fetch(
        `${this.scriptUrl}?action=getLeaderboard&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      if (data && data.status === 'success' && Array.isArray(data.leaderboard)) {
        return data.leaderboard;
      }
      return this.getLocalLeaderboard();
    } catch (err) {
      console.warn('Gagal mengambil leaderboard dari Google Sheet, menggunakan data lokal:', err);
      return this.getLocalLeaderboard();
    }
  }

  /**
   * Tes Koneksi Google Apps Script (dipanggil dari admin tool jika dibutuhkan)
   */
  async testConnection(testUrl) {
    const url = (testUrl || this.scriptUrl || '').trim();
    if (!url.startsWith('https://script.google.com/macros/s/')) {
      return { ok: false, error: 'Format URL tidak valid.' };
    }

    try {
      const resp = await fetch(`${url}?test=1&t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        return { ok: true, message: 'Koneksi Berhasil!', data };
      }
      return { ok: false, error: `Server merespon status: ${resp.status}` };
    } catch (e) {
      return { ok: false, error: 'Gagal terhubung. Pastikan Apps Script di-deploy dengan akses "Anyone".' };
    }
  }

  // --- LOCAL FALLBACK HELPERS ---
  getLocalScores() {
    try {
      const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { }

    // Data contoh awal
    return [
      { name: 'Juara Speedometer', score: 178, tier: 'Tier 1 (10%): Kaos Eksklusif', peakRpm: 178 },
      { name: 'Rider Biru', score: 142, tier: 'Tier 2 (30%): Payung Lipat', peakRpm: 142 },
      { name: 'Pejuang Hijau', score: 88, tier: 'Tier 3 (60%): Shopping Bag', peakRpm: 88 }
    ];
  }

  saveLocalScore(playerData) {
    const scores = this.getLocalScores();
    scores.push({
      name: playerData.name || 'Anonymous',
      score: playerData.score || 0,
      tier: playerData.tier || 'Tier 3',
      peakRpm: playerData.peakRpm || 0,
      timestamp: new Date().toISOString()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(scores.slice(0, 20)));
  }

  getLocalLeaderboard() {
    return this.getLocalScores().slice(0, 10);
  }

  calculateLocalRank(score) {
    const scores = this.getLocalScores();
    let rank = 1;
    for (const item of scores) {
      if (item.score > score) rank++;
    }
    return rank;
  }
}

window.apiService = new ApiService();
