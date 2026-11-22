/**
 * ===================================================================================
 * KRATINGDAENG SPEEDOMETER SPIN WHEEL - PRIZES & CUSTOM DRIVE ICONS CONFIGURATION
 * ===================================================================================
 * Anda dapat mengatur URL gambar JPG dari Google Drive untuk setiap hadiah di sini
 * atau langsung melalui menu "Atur Icon Hadiah" di aplikasi (tersimpan ke LocalStorage).
 *
 * Mendukung format link Google Drive:
 * - https://drive.google.com/file/d/ID_FILE/view?usp=sharing
 * - https://drive.google.com/open?id=ID_FILE
 * - Link langsung JPG/PNG apa saja
 * ===================================================================================
 */

const STORAGE_KEY_PRIZE_IMAGES = 'KRATINGDAENG_PRIZE_IMAGES_V1';

// Format link Google Drive ke direct link thumbnail gambar yang bisa ditampilkan langsung di browser/SVG/img
function formatDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Pola 1: /file/d/ID/view
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://drive.google.com/thumbnail?id=${matchFileD[1]}&sz=w600`;
  }

  // Pola 2: id=ID atau ?id=ID
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w600`;
  }

  // Pola 3: lh3.googleusercontent.com/d/ID
  const matchLh3 = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh3 && matchLh3[1]) {
    return `https://drive.google.com/thumbnail?id=${matchLh3[1]}&sz=w600`;
  }

  return trimmed;
}

// Konfigurasi Default Hadiah & Icon
const DEFAULT_PRIZES = {
  tshirt: {
    key: 'tshirt',
    name: 'Kaos Eksklusif',
    tier: 1,
    emoji: '👕',
    imageUrl: '', // Masukkan link JPG Drive jika ada default
    hint: 'Kaos Resmi Kratingdaeng Red Bull'
  },
  cap: {
    key: 'cap',
    name: 'Topi Kratingdaeng',
    tier: 1,
    emoji: '🧢',
    imageUrl: '',
    hint: 'Topi Sporty Kratingdaeng'
  },
  umbrella: {
    key: 'umbrella',
    name: 'Payung Lipat',
    tier: 2,
    emoji: '☂️',
    imageUrl: '',
    hint: 'Payung Lipat Otomatis'
  },
  raincoat: {
    key: 'raincoat',
    name: 'Jas Hujan',
    tier: 2,
    emoji: '🧥',
    imageUrl: '',
    hint: 'Jas Hujan Motor Rider'
  },
  tolstick: {
    key: 'tolstick',
    name: 'Tongkat Tol (RA)',
    tier: 2,
    emoji: '🔦',
    imageUrl: '',
    hint: 'Tongkat Tol Khusus Booth Rest Area'
  },
  bagcover: {
    key: 'bagcover',
    name: 'Cover Tas (Pelabuhan)',
    tier: 2,
    emoji: '🎒',
    imageUrl: '',
    hint: 'Cover Tas Khusus Booth Pelabuhan'
  },
  shoppingbag: {
    key: 'shoppingbag',
    name: 'Shopping Bag',
    tier: 3,
    emoji: '🛍️',
    imageUrl: '',
    hint: 'Shopping Bag Eksklusif Kratingdaeng'
  }
};

class PrizeConfigManager {
  constructor() {
    this.prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRIZE_IMAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(k => {
          if (this.prizes[k]) {
            this.prizes[k].imageUrl = parsed[k] || '';
          }
        });
      }
    } catch (e) {
      console.warn('Gagal memuat konfigurasi gambar hadiah:', e);
    }
  }

  saveToStorage() {
    try {
      const toSave = {};
      Object.keys(this.prizes).forEach(k => {
        toSave[k] = this.prizes[k].imageUrl || '';
      });
      localStorage.setItem(STORAGE_KEY_PRIZE_IMAGES, JSON.stringify(toSave));
      return true;
    } catch (e) {
      console.error('Gagal menyimpan konfigurasi gambar hadiah:', e);
      return false;
    }
  }

  setImage(key, rawUrl) {
    if (this.prizes[key]) {
      this.prizes[key].imageUrl = rawUrl ? rawUrl.trim() : '';
    }
  }

  getDirectImageUrl(key) {
    const p = this.prizes[key];
    if (!p || !p.imageUrl) return '';
    return formatDriveImageUrl(p.imageUrl);
  }

  getRawImageUrl(key) {
    const p = this.prizes[key];
    return p ? (p.imageUrl || '') : '';
  }

  getPrize(key) {
    return this.prizes[key] || null;
  }

  getAllPrizes() {
    return this.prizes;
  }

  resetAll() {
    Object.keys(this.prizes).forEach(k => {
      this.prizes[k].imageUrl = DEFAULT_PRIZES[k].imageUrl || '';
    });
    this.saveToStorage();
  }
}

window.prizeManager = new PrizeConfigManager();
