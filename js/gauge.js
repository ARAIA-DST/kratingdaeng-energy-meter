/** Speedometer RPM/Fuel gauge (pengganti speedometer & odometer lama) */
class SpeedGauge {
  constructor(svg) {
    this.svg = svg;
    this.N = 8;
    this.items = [
      { k: 'tshirt', n: 'Kaos', i: '👕' }, { k: 'cap', n: 'Topi', i: '🧢' },
      { k: 'tshirt', n: 'Kaos', i: '👕' }, { k: 'cap', n: 'Topi', i: '🧢' },
      { k: 'umbrella', n: 'Payung Lipat', i: '☂️' }, { k: 'raincoat', n: 'Jas Hujan', i: '🧥' },
      { k: 'tolstick', n: 'Tongkat Tol', i: '🔦' }, { k: 'shoppingbag', n: 'Shopping Bag', i: '🛍️' }
    ];
    this.build();
    this.setValue(0);
  }
  static P(r, d) { return [300 + r * Math.sin(d * Math.PI / 180), 300 - r * Math.cos(d * Math.PI / 180)]; }
  static A(v) { return -135 + v * 27; }
  build() {
    const P = SpeedGauge.P, A = SpeedGauge.A, W = 260 / this.N;
    const arc = (r, a, b) => { const s = P(r, a), e = P(r, b); return `M${s[0]} ${s[1]}A${r} ${r} 0 0 1 ${e[0]} ${e[1]}`; };
    let h = `<defs>
 <linearGradient id="gCh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".25" stop-color="#7d838c"/><stop offset=".5" stop-color="#e9ecef"/><stop offset=".75" stop-color="#5b6069"/><stop offset="1" stop-color="#d7dadf"/></linearGradient>
 <radialGradient id="gFace" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#0b2a42"/><stop offset=".7" stop-color="#050b12"/><stop offset="1" stop-color="#000"/></radialGradient>
 <linearGradient id="gSb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d7cc4"/><stop offset="1" stop-color="#16497d"/></linearGradient>
 <linearGradient id="gSg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd24a"/><stop offset="1" stop-color="#d89a00"/></linearGradient>
 <filter id="gGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<circle cx="300" cy="300" r="296" fill="url(#gCh)"/><circle cx="300" cy="300" r="282" fill="#14181d"/>
<image href="assets/logo.png" x="20" y="12" width="92" height="40" preserveAspectRatio="xMinYMid meet"/>`;
    this.items.forEach((p, i) => {
      const a0 = -130 + i * W + 1, a1 = -130 + (i + 1) * W - 1, ro = 276, ri = 196;
      const o0 = P(ro, a0), o1 = P(ro, a1), i1 = P(ri, a1), i0 = P(ri, a0), m = (a0 + a1) / 2, q = P(236, m);
      h += `<path class="g-sec" d="M${o0[0]} ${o0[1]}A${ro} ${ro} 0 0 1 ${o1[0]} ${o1[1]}L${i1[0]} ${i1[1]}A${ri} ${ri} 0 0 0 ${i0[0]} ${i0[1]}Z" fill="url(#gSb)" stroke="#0a2744" stroke-width="2"/>
<g transform="translate(${q[0]} ${q[1]}) rotate(${m * .75})"><text class="g-ico" id="g-ico-${i}" y="-8">${p.i}</text><text class="g-lbl" id="g-lbl-${i}" y="20">${p.n}</text></g>`;
    });
    h += `<circle cx="300" cy="300" r="186" fill="url(#gCh)"/><circle cx="300" cy="300" r="176" fill="#05090e"/><circle cx="300" cy="300" r="168" fill="url(#gFace)"/>`;
    for (let k = 0; k <= 20; k++) {
      const v = k / 2, big = k % 2 === 0, s = P(big ? 138 : 146, A(v)), e = P(156, A(v));
      h += `<line x1="${s[0]}" y1="${s[1]}" x2="${e[0]}" y2="${e[1]}" stroke="${v >= 6 ? '#ff5b45' : '#7fdcff'}" stroke-width="${big ? 3 : 1.5}"/>`;
    }
    h += `<path d="${arc(160, A(0), A(6))}" fill="none" stroke="#2fc8ff" stroke-width="5" filter="url(#gGlow)"/><path d="${arc(160, A(6), A(10))}" fill="none" stroke="#ff3b2a" stroke-width="5" filter="url(#gGlow)"/>`;
    for (let v = 0; v <= 10; v++) { const q = P(116, A(v)); h += `<text class="g-num" x="${q[0]}" y="${q[1]}" fill="${v >= 6 ? '#ff6a55' : '#fff'}">${v}</text>`; }
    h += `<text class="g-t1" x="300" y="228">RPM / FUEL GAUGE:</text><text class="g-t2" id="gauge-status" x="300" y="256">PRESS TO REFUE!</text>`;
    for (let i = 0; i < 14; i++) h += `<rect class="g-led" x="${229 + i * 11.2}" y="394" width="9" height="18" rx="1.5" fill="${i < 8 ? '#43d62a' : i < 11 ? '#d8e21b' : '#e0301d'}" opacity=".18"/>`;
    h += `<text x="214" y="407" font-size="17" text-anchor="middle">⛽</text>
<g id="gauge-needle" transform="translate(300 300) rotate(-135)"><polygon points="-4,12 0,-142 4,12" fill="#ff2a1a" filter="url(#gGlow)"/><polygon points="-1.5,10 0,-140 1.5,10" fill="#ffb4a8"/></g>
<circle cx="300" cy="300" r="24" fill="url(#gCh)"/><circle cx="300" cy="300" r="17" fill="#111"/><image href="assets/logo.png" x="285" y="293" width="30" height="14" preserveAspectRatio="xMidYMid meet"/>`;
    this.svg.innerHTML = h;
    this.secs = [...this.svg.querySelectorAll('.g-sec')];
    this.leds = [...this.svg.querySelectorAll('.g-led')];
    this.needle = this.svg.querySelector('#gauge-needle');
    this.status = this.svg.querySelector('#gauge-status');
  }
  setValue(v) {
    v = Math.max(0, Math.min(10, v || 0));
    this.needle.setAttribute('transform', `translate(300 300) rotate(${SpeedGauge.A(v).toFixed(2)})`);
    const lit = Math.round(v / 10 * this.leds.length);
    this.leds.forEach((l, i) => l.setAttribute('opacity', i < lit ? 1 : .18));
  }
  setStatus(t) { this.status.textContent = t; }
  highlight(i, win) {
    this.secs.forEach((s, k) => { s.setAttribute('fill', k === i ? 'url(#gSg)' : 'url(#gSb)'); s.classList.toggle('win', !!win && k === i); });
  }
  clear() { this.highlight(-1); }
  setLocation(loc) {
    const pel = loc === 'Pelabuhan';
    document.getElementById('g-ico-6').textContent = pel ? '🎒' : '🔦';
    document.getElementById('g-lbl-6').textContent = pel ? 'Cover Tas' : 'Tongkat Tol';
  }
  indexForPrize(type) {
    const key = type === 'bagcover' ? 'tolstick' : type;
    const c = this.items.map((p, i) => p.k === key ? i : -1).filter(i => i >= 0);
    return c[Math.floor(Math.random() * c.length)];
  }
}
window.gauge = new SpeedGauge(document.getElementById('gauge-svg'));
