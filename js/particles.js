/**
 * ===================================================================================
 * KRATINGDAENG ENERGY METER - PARTICLE & VISUAL FX SYSTEM
 * ===================================================================================
 * Menghandle efek visual dinamis:
 * 1. Gelembung Karbonasi Kratingdaeng di dalam tabung energi
 * 2. Percikan Listrik (Electric Sparks) saat tap/klik cepat
 * 3. Teks Melayang (Floating Score / Crit Text: +100, CRITICAL x3!)
 * 4. Efek Ledakan Partikel Emas saat OVERCHARGE 100%
 * ===================================================================================
 */

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.floatingTexts = [];
    this.bubbles = [];
    this.running = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initBubbles(25);
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  initBubbles(count) {
    this.bubbles = [];
    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 4 + 1.5,
        speed: Math.random() * 1.5 + 0.8,
        opacity: Math.random() * 0.7 + 0.3,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.loop();
    }
  }

  stop() {
    this.running = false;
  }

  /**
   * Menambahkan percikan listrik/energi saat tombol ditap
   */
  createSparks(x, y, count = 15, isGolden = false) {
    const colors = isGolden
      ? ['#ffd700', '#ffea75', '#ffffff', '#ff9900']
      : ['#ff1744', '#ffd700', '#00e5ff', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  /**
   * Ledakan Kemenangan Overcharge
   */
  createOverchargeExplosion() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const colors = ['#ffd700', '#ff1744', '#ffea00', '#ffffff', '#ff0055'];

    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        isConfetti: Math.random() > 0.5
      });
    }
  }

  /**
   * Teks skor melayang (contoh: "+150", "CRITICAL x3!", "BULL SURGE!")
   */
  addFloatingText(text, x, y, color = '#ffd700', isCrit = false) {
    this.floatingTexts.push({
      text: text,
      x: x + (Math.random() * 30 - 15),
      y: y,
      vy: -2.8,
      life: 1.0,
      decay: isCrit ? 0.02 : 0.03,
      color: color,
      scale: isCrit ? 1.4 : 1.0,
      isCrit: isCrit
    });
  }

  loop() {
    if (!this.running) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Render & Update Gelembung Karbonasi Kratingdaeng
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
    for (let b of this.bubbles) {
      b.y -= b.speed;
      b.wobble += 0.05;
      b.x += Math.sin(b.wobble) * 0.5;

      if (b.y < -10) {
        b.y = this.canvas.height + 10;
        b.x = Math.random() * this.canvas.width;
      }

      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 230, 100, ${b.opacity})`;
      this.ctx.fill();
    }

    // 2. Render & Update Partikel Percikan / Ledakan
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;

      this.ctx.beginPath();
      if (p.isConfetti) {
        this.ctx.fillRect(p.x, p.y, p.size * 1.5, p.size * 0.8);
      } else {
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 3. Render & Update Floating Numbers / Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.life -= t.decay;

      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = t.life;
      this.ctx.font = t.isCrit ? '900 24px "Segoe UI", sans-serif' : 'bold 18px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';

      // Glow outline
      this.ctx.shadowBlur = t.isCrit ? 15 : 8;
      this.ctx.shadowColor = t.color;
      this.ctx.strokeStyle = '#060b19';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(t.text, t.x, t.y);

      this.ctx.fillStyle = t.color;
      this.ctx.fillText(t.text, t.x, t.y);
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.loop());
  }
}
