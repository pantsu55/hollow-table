/* Biblioteca de desenho de mapas de batalha (roda no navegador, num canvas). Grade: C px por quadrado. */
window.M = (function () {
  let seed = 1;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function setSeed(s) { seed = s; }
  const R = function (a, b) { return a + (b - a) * rnd(); };
  /* ruído de valor suave */
  const P = []; for (let i = 0; i < 512; i++) P.push(Math.random());
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = function (t) { return t * t * (3 - 2 * t); };
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o) { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < (o || 4); i++) { t += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2; } return t / n; }
  function hexA(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  /* preenche a tela com uma textura por ruído entre duas ou mais cores */
  function noiseFill(ctx, w, h, cols, sc, opts) {
    opts = opts || {};
    const img = ctx.getImageData(0, 0, w, h), d = img.data, cs = cols.map(hexA), mask = opts.mask;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (mask && !mask(x, y)) continue;
      let n = fbm(x / sc, y / sc, opts.oct || 5);
      n = Math.max(0, Math.min(0.999, (n - 0.5) * (opts.k || 1.8) + 0.5));
      const p = n * (cs.length - 1), i = Math.floor(p), c = mix(cs[i], cs[i + 1], p - i);
      const g = (Math.random() - 0.5) * (opts.grain || 10);
      const o = (y * w + x) * 4;
      d[o] = c[0] + g; d[o + 1] = c[1] + g; d[o + 2] = c[2] + g; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function blob(ctx, x, y, r, irr, n) {
    n = n || 14;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, rr = r * (1 + (rnd() - 0.5) * irr);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  function shadow(ctx, blur, ox, oy, a) { ctx.shadowColor = 'rgba(0,0,0,' + (a == null ? 0.55 : a) + ')'; ctx.shadowBlur = blur; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy; }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  /* pinheiro visto de cima, com neve: galhos finos irradiando, em camadas */
  function pine(ctx, x, y, r, snow) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,18,26,.42)';
    ctx.filter = 'blur(' + Math.round(r * 0.18) + 'px)';
    blob(ctx, x + r * 0.32, y + r * 0.42, r * 0.95, 0.35, 16); ctx.fill();
    ctx.filter = 'none';
    const layers = [[1, [16, 30, 26]], [0.84, [22, 40, 32]], [0.66, [30, 52, 40]], [0.46, [40, 66, 50]], [0.28, [52, 80, 60]]];
    layers.forEach(function (L, li) {
      const rr = r * L[0], n = 26 + li * 4;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, len = rr * R(0.75, 1.05), wdt = rr * R(0.1, 0.18);
        const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
        const px = Math.cos(a + Math.PI / 2) * wdt, py = Math.sin(a + Math.PI / 2) * wdt;
        const k = R(-8, 8);
        ctx.fillStyle = 'rgb(' + (L[1][0] + k) + ',' + (L[1][1] + k) + ',' + (L[1][2] + k) + ')';
        ctx.beginPath(); ctx.moveTo(x + px * 0.3, y + py * 0.3); ctx.lineTo(x + Math.cos(a) * len * 0.55 + px, y + Math.sin(a) * len * 0.55 + py); ctx.lineTo(tx, ty); ctx.lineTo(x + Math.cos(a) * len * 0.55 - px, y + Math.sin(a) * len * 0.55 - py); ctx.lineTo(x - px * 0.3, y - py * 0.3); ctx.closePath(); ctx.fill();
      }
      if (snow && li < 4) {
        ctx.save(); ctx.globalAlpha = 0.5 + li * 0.08;
        for (let i = 0; i < 7 + li * 2; i++) {
          const a = rnd() * Math.PI * 2, d = rr * R(0.25, 0.8);
          const sx = x + Math.cos(a) * d - rr * 0.08, sy = y + Math.sin(a) * d - rr * 0.08;
          ctx.fillStyle = rnd() < 0.5 ? '#eef3f7' : '#d6e0ea';
          ctx.beginPath(); ctx.ellipse(sx, sy, rr * R(0.06, 0.13), rr * R(0.04, 0.08), a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    });
    if (snow) { ctx.fillStyle = 'rgba(238,243,247,.85)'; blob(ctx, x - r * 0.04, y - r * 0.04, r * 0.09, 0.5, 8); ctx.fill(); }
    ctx.restore();
  }
  /* árvore sem folhas (galhos) */
  function bareTree(ctx, x, y, r) {
    ctx.save();
    shadow(ctx, 8, 6, 8, 0.5);
    ctx.strokeStyle = '#2a2018'; ctx.lineCap = 'round';
    const br = function (px, py, a, len, w, d) {
      if (d > 4 || len < 4) return;
      const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      const n = 2 + (rnd() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) br(nx, ny, a + R(-0.7, 0.7), len * R(0.55, 0.75), w * 0.65, d + 1);
    };
    const n = 6 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) br(x, y, i / n * Math.PI * 2 + rnd() * 0.5, r * 0.45, r * 0.12, 0);
    noShadow(ctx);
    ctx.fillStyle = '#3a2c20'; blob(ctx, x, y, r * 0.16, 0.2, 10); ctx.fill();
    ctx.restore();
  }
  function rock(ctx, x, y, r, snow) {
    ctx.save();
    shadow(ctx, r * 0.4, r * 0.25, r * 0.35, 0.6);
    blob(ctx, x, y, r, 0.45, 9);
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#8d8f93'); g.addColorStop(1, '#4a4d52');
    ctx.fillStyle = g; ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = 'rgba(20,20,24,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.1); ctx.lineTo(x + r * 0.1, y - r * 0.35); ctx.stroke();
    if (snow) { ctx.fillStyle = 'rgba(236,241,246,.85)'; blob(ctx, x - r * 0.2, y - r * 0.25, r * 0.5, 0.5, 8); ctx.fill(); }
    ctx.restore();
  }
  function bush(ctx, x, y, r, snow) {
    ctx.save(); shadow(ctx, r * 0.4, r * 0.2, r * 0.3, 0.5);
    for (let i = 0; i < 6; i++) { blob(ctx, x + R(-r, r) * 0.5, y + R(-r, r) * 0.5, r * R(0.45, 0.65), 0.4, 9); ctx.fillStyle = 'rgb(' + Math.floor(R(30, 45)) + ',' + Math.floor(R(48, 64)) + ',' + Math.floor(R(30, 40)) + ')'; ctx.fill(); if (i === 0) noShadow(ctx); }
    if (snow) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#e6edf3'; for (let i = 0; i < 4; i++) { blob(ctx, x + R(-r, r) * 0.4 - r * 0.15, y + R(-r, r) * 0.4 - r * 0.15, r * 0.25, 0.5, 7); ctx.fill(); } }
    ctx.restore();
  }
  /* tábuas de madeira num retângulo */
  function planks(ctx, x, y, w, h, pw, cols, vertical) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const n = Math.ceil((vertical ? w : h) / pw);
    for (let i = 0; i < n; i++) {
      let off = -rnd() * 200;
      while (off < (vertical ? h : w)) {
        const len = R(120, 260), c = cols[Math.floor(rnd() * cols.length)];
        const px = vertical ? x + i * pw : x + off, py = vertical ? y + off : y + i * pw;
        const ww = vertical ? pw : len, hh = vertical ? len : pw;
        const g = vertical ? ctx.createLinearGradient(px, 0, px + ww, 0) : ctx.createLinearGradient(0, py, 0, py + hh);
        g.addColorStop(0, c); g.addColorStop(1, shade(c, -0.18));
        ctx.fillStyle = g; ctx.fillRect(px, py, ww, hh);
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(px + 0.5, py + 0.5, ww - 1, hh - 1);
        ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); if (vertical) { const gx = px + R(3, pw - 3); ctx.moveTo(gx, py); ctx.bezierCurveTo(gx + R(-3, 3), py + hh * 0.3, gx + R(-3, 3), py + hh * 0.6, gx, py + hh); } else { const gy = py + R(3, pw - 3); ctx.moveTo(px, gy); ctx.bezierCurveTo(px + ww * 0.3, gy + R(-3, 3), px + ww * 0.6, gy + R(-3, 3), px + ww, gy); } ctx.stroke(); }
        off += len;
      }
    }
    ctx.restore();
  }
  function shade(hex, k) { const c = hexA(hex), f = function (v) { return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); }; return 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')'; }
  /* lajotas de pedra */
  function flagstones(ctx, x, y, w, h, s, base) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#242226'; ctx.fillRect(x, y, w, h);
    for (let row = 0; row * s < h + s; row++) {
      let cx = x - (row % 2) * s * 0.5 - rnd() * s * 0.3;
      while (cx < x + w) {
        const sw = s * R(0.75, 1.35), sh = s;
        const c = shade(base, R(-0.14, 0.08));
        ctx.fillStyle = c;
        const px = cx + 2, py = y + row * s + 2;
        ctx.beginPath(); ctx.moveTo(px + R(0, 3), py + R(0, 3)); ctx.lineTo(px + sw - 4 + R(-2, 1), py + R(0, 3)); ctx.lineTo(px + sw - 4 + R(-2, 1), py + sh - 4 + R(-2, 1)); ctx.lineTo(px + R(0, 3), py + sh - 4 + R(-2, 1)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 3, py + sh - 6); ctx.lineTo(px + 3, py + 3); ctx.lineTo(px + sw - 6, py + 3); ctx.stroke();
        if (rnd() < 0.25) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); let qx = px + R(4, sw - 8), qy = py + 4; ctx.moveTo(qx, qy); for (let k = 0; k < 4; k++) { qx += R(-8, 8); qy += sh / 5; ctx.lineTo(qx, qy); } ctx.stroke(); }
        cx += sw;
      }
    }
    ctx.globalAlpha = 0.22; for (let i = 0; i < w * h / 9000; i++) { ctx.fillStyle = rnd() < 0.5 ? '#000' : '#8a7f70'; blob(ctx, x + rnd() * w, y + rnd() * h, R(12, 50), 0.7, 10); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.restore();
  }
  /* parede grossa de pedra entre dois pontos */
  function wall(ctx, x1, y1, x2, y2, t) {
    ctx.save();
    shadow(ctx, 14, 5, 7, 0.65);
    ctx.strokeStyle = '#3b3a3e'; ctx.lineWidth = t; ctx.lineCap = 'square';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    noShadow(ctx);
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
    let d = 0;
    while (d < len) {
      const bl = Math.min(R(t * 0.8, t * 1.5), len - d);
      for (let row = 0; row < 2; row++) {
        const off = (row - 0.5) * t * 0.5, ox = row ? t * 0.3 : 0;
        const ax = x1 + ux * (d + ox) + nx * off, ay = y1 + uy * (d + ox) + ny * off;
        ctx.fillStyle = shade('#77736f', R(-0.25, 0.1));
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux));
        ctx.fillRect(1, -t * 0.25 + 1, Math.max(2, bl - 2), t * 0.5 - 2);
        ctx.restore();
      }
      d += bl;
    }
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1 + nx * t / 2, y1 + ny * t / 2); ctx.lineTo(x2 + nx * t / 2, y2 + ny * t / 2); ctx.moveTo(x1 - nx * t / 2, y1 - ny * t / 2); ctx.lineTo(x2 - nx * t / 2, y2 - ny * t / 2); ctx.stroke();
    ctx.restore();
  }
  function rugRect(ctx, x, y, w, h, c1, c2) {
    ctx.save(); shadow(ctx, 6, 2, 3, 0.4);
    ctx.fillStyle = c1; ctx.fillRect(x, y, w, h); noShadow(ctx);
    ctx.strokeStyle = c2; ctx.lineWidth = 6; ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
    ctx.lineWidth = 2; ctx.strokeRect(x + 20, y + 20, w - 40, h - 40);
    ctx.globalAlpha = 0.25; for (let i = 0; i < 200; i++) { ctx.fillStyle = rnd() < 0.5 ? '#000' : '#fff'; ctx.fillRect(x + rnd() * w, y + rnd() * h, 2, 2); }
    ctx.restore();
  }
  function table(ctx, x, y, w, h, round) {
    ctx.save(); shadow(ctx, 12, 5, 7, 0.55);
    ctx.fillStyle = '#6b4a2c';
    if (round) { ctx.beginPath(); ctx.arc(x, y, w, 0, Math.PI * 2); ctx.fill(); noShadow(ctx); planksClipCircle(ctx, x, y, w); }
    else { ctx.fillRect(x, y, w, h); noShadow(ctx); planks(ctx, x, y, w, h, 14, ['#7a5533', '#6e4b2d', '#835c37'], w < h); ctx.strokeStyle = '#3a2615'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); }
    ctx.restore();
  }
  function planksClipCircle(ctx, x, y, r) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    planks(ctx, x - r, y - r, r * 2, r * 2, 13, ['#7a5533', '#6e4b2d', '#835c37'], false);
    ctx.restore();
    ctx.strokeStyle = '#3a2615'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  function stool(ctx, x, y, r) { ctx.save(); shadow(ctx, 6, 3, 4, 0.5); ctx.fillStyle = '#5a3d24'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); noShadow(ctx); ctx.strokeStyle = '#2e1f12'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  function barrel(ctx, x, y, r) {
    ctx.save(); shadow(ctx, 8, 4, 5, 0.55);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#8a6038'); g.addColorStop(1, '#4a2f18');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = '#2b2b2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function crate(ctx, x, y, s) { ctx.save(); shadow(ctx, 8, 4, 5, 0.55); ctx.fillStyle = '#7a5a36'; ctx.fillRect(x, y, s, s); noShadow(ctx); planks(ctx, x, y, s, s, s / 4, ['#80603a', '#735433'], false); ctx.strokeStyle = '#3b2814'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, s - 4, s - 4); ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + s - 4, y + s - 4); ctx.stroke(); ctx.restore(); }
  function glow(ctx, x, y, r, col, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + col + ',' + (a || 0.5) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function fire(ctx, x, y, r) {
    ctx.save();
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = r * 0.25; ctx.lineCap = 'round'; const a = i / 4 * Math.PI + rnd() * 0.3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(0.35, '#ffb43a'); g.addColorStop(0.8, '#d4471a'); g.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = g; blob(ctx, x, y, r * 0.9, 0.5, 12); ctx.fill();
    ctx.restore();
    glow(ctx, x, y, r * 5, '255,150,60', 0.35);
  }
  function candle(ctx, x, y) { ctx.save(); ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); glow(ctx, x, y, 40, '255,190,90', 0.35); }
  function snowDrift(ctx, x, y, r) { ctx.save(); ctx.globalAlpha = 0.85; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(240,244,248,.95)'); g.addColorStop(0.7, 'rgba(225,232,240,.7)'); g.addColorStop(1, 'rgba(225,232,240,0)'); ctx.fillStyle = g; blob(ctx, x, y, r, 0.5, 12); ctx.fill(); ctx.restore(); }
  function vignette(ctx, w, h, a) { const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (a || 0.45) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  /* faixa orgânica (rio, gelo, trilha) ao longo de pontos: devolve um canvas-máscara */
  function bandMask(w, h, pts, width, wob) {
    const m = document.createElement('canvas'); m.width = w; m.height = h;
    const g = m.getContext('2d'); g.fillStyle = '#fff';
    const L = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < d; t += 6) L.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); }
    /* suaviza a linha */
    for (let k = 0; k < 6; k++) for (let i = 1; i < L.length - 1; i++) { L[i][0] = (L[i - 1][0] + L[i][0] * 2 + L[i + 1][0]) / 4; L[i][1] = (L[i - 1][1] + L[i][1] * 2 + L[i + 1][1]) / 4; }
    L.forEach(function (p, i) { const r = width / 2 * (1 + (fbm(i / 30, 3.7, 3) - 0.5) * (wob || 0.8)); g.beginPath(); g.arc(p[0], p[1], r, 0, Math.PI * 2); g.fill(); });
    return m;
  }
  /* pinta uma textura de ruído só dentro da máscara */
  function texIn(ctx, mask, cols, sc, opts) {
    const w = mask.width, h = mask.height, t = document.createElement('canvas'); t.width = w; t.height = h;
    const tc = t.getContext('2d'), md = mask.getContext('2d').getImageData(0, 0, w, h).data;
    noiseFill(tc, w, h, cols, sc, Object.assign({ mask: function (x, y) { return md[(y * w + x) * 4 + 3] > 0; } }, opts || {}));
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
    ctx.drawImage(t, 0, 0);
  }
  return { bandMask: bandMask, texIn: texIn, R: R, rnd: rnd, setSeed: setSeed, fbm: fbm, noiseFill: noiseFill, blob: blob, shadow: shadow, noShadow: noShadow, pine: pine, bareTree: bareTree, rock: rock, bush: bush, planks: planks, shade: shade, flagstones: flagstones, wall: wall, rugRect: rugRect, table: table, stool: stool, barrel: barrel, crate: crate, glow: glow, fire: fire, candle: candle, snowDrift: snowDrift, vignette: vignette };
})();
