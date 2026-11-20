/**
 * ===================================================================================
 * KRATINGDAENG ENERGY METER - GOOGLE APPS SCRIPT API INTEGRATION
 * ===================================================================================
 * Menghubungkan Game langsung ke Google Sheet & Google Drive via Apps Script Web App.
 * - Tanpa Google Cloud Console (Zero GCP setup)
 * - Fallback cerdas ke LocalStorage bila offline / URL belum diisi
 * ===================================================================================
 */

const API_STORAGE_KEY = 'KRATINGDAENG_APPS_SCRIPT_URL';
const LOCAL_LEADERBOARD_KEY = 'KRATINGDAENG_LOCAL_SCORES';

class ApiService {
  constructor() {
    this.scriptUrl = localStorage.getItem(API_STORAGE_KEY) || '';
  }

  /**
   * Simpan atau ubah URL Apps Script
   */
  setScriptUrl(url) {
    this.scriptUrl = (url || '').trim();
    localStorage.setItem(API_STORAGE_KEY, this.scriptUrl);
  }

  getScriptUrl() {
    return this.scriptUrl;
  }

  hasValidUrl() {
    return this.scriptUrl && this.scriptUrl.startsWith('https://script.google.com/macros/s/AKfycbwuKhWop7t4ydtYGsFgw0vTYEAQRIcQRsBUHT9B_xXwpFMOGu9e0Kixi3auoZaQjGow/exec');
  }

  /**
   * Kirim skor ke Google Apps Script (Google Sheets & Google Drive)
   */
  async submitScore(playerData) {
    // 1. Simpan selalu ke LocalStorage sebagai backup
    this.saveLocalScore(playerData);

    // 2. Jika URL belum dipasang, kembalikan hasil lokal simulasi
    if (!this.hasValidUrl()) {
      return {
        status: 'local_only',
        message: 'Disimpan di Browser Lokal (Masukkan URL Apps Script di Pengaturan untuk sync ke Google Sheet)',
        rank: this.calculateLocalRank(playerData.score),
        certificateUrl: '#'
      };
    }

    // 3. Kirim via POST ke Google Apps Script Web App
    try {
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Hindari CORS preflight OPTIONS block di Apps Script
        },
        body: JSON.stringify(playerData)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (err) {
      console.warn('Gagal konek ke Google Apps Script, beralih ke no-cors / local fallback:', err);

      // Fallback no-cors fire-and-forget bila browser memblokir CORS
      try {
        await fetch(this.scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(playerData)
        });
        return {
          status: 'success_nocors',
          message: 'Terkirim ke Google Sheet (Mode Langsung)!',
          rank: this.calculateLocalRank(playerData.score),
          certificateUrl: '#'
        };
      } catch (innerErr) {
        return {
          status: 'offline',
          message: 'Offline: Skor tersimpan di memori perangkat.',
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
      const response = await fetch(`${this.scriptUrl}?action=getLeaderboard&t=${Date.now()}`);
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
   * Tes Koneksi Google Apps Script
   */
  async testConnection(testUrl) {
    const url = (testUrl || this.scriptUrl || '').trim();
    if (!url.startsWith('https://script.google.com/macros/s/')) {
      return { success: false, message: 'Format URL tidak valid! Harus diawali: https://script.google.com/macros/s/...' };
    }

    try {
      const resp = await fetch(`${url}?test=1&t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        return { success: true, message: 'Koneksi Berhasil! Terhubung ke Google Sheet.', data };
      }
      return { success: false, message: `Server merespon dengan status: ${resp.status}` };
    } catch (e) {
      return { success: false, message: 'Gagal terhubung. Pastikan Apps Script di-deploy sebagai Web App dengan akses "Anyone" (Siapa saja).' };
    }
  }

  // --- LOCAL FALLBACK HELPERS ---
  getLocalScores() {
    try {
      const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { }

    // Default Highscore awal bertema Kratingdaeng
    return [
      { name: 'Banteng Merah Sakti', score: 14200, tier: '⚡ BULL OVERCHARGE GOD ⚡', peakRpm: 15.2 },
      { name: 'Kratingdaeng Master', score: 11800, tier: '🔥 Sang Juara Kratingdaeng 🔥', peakRpm: 12.8 },
      { name: 'Pejuang Lembur 99', score: 9400, tier: '💪 Pejuang Stamina Sakti 💪', peakRpm: 10.4 },
      { name: 'Red Bull Energy 07', score: 7600, tier: '⚡ Kratingdaeng Power ⚡', peakRpm: 9.1 },
      { name: 'Banteng Cepat', score: 5300, tier: 'Stamina Aktif', peakRpm: 7.5 }
    ];
  }

  saveLocalScore(playerData) {
    const scores = this.getLocalScores();
    scores.push({
      name: playerData.name || 'Anonymous',
      score: playerData.score || 0,
      tier: playerData.tier || 'Pejuang Stamina',
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
