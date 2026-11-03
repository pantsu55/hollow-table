(function () {
  const c = document.getElementById('c'), x = c.getContext('2d'), W = c.width, H = c.height, C = 70;
  M.setSeed(7);
  // neve com sombras azuladas
  M.noiseFill(x, W, H, ['#b3bfcc', '#cdd6df', '#dde4eb', '#e9eef3'], 180, { k: 1.6, grain: 9 });
  // trilha pisada (lama + neve suja), de baixo para cima
  x.save();
  const trail = [[6 * C, H + 40], [8 * C, 17 * C], [12 * C, 13 * C], [16 * C, 11 * C], [21 * C, 8 * C], [24 * C, 4 * C], [25 * C, -40]];
  const tm = M.bandMask(W, H, trail, 1.9 * C, 1.1);
  const tc = document.createElement('canvas'); tc.width = W; tc.height = H; const tx = tc.getContext('2d');
  M.texIn(tx, tm, ['#7d7066', '#9a8f86', '#b9b2ab', '#d2d0cf'], 26, { k: 1.8, grain: 14 });
  x.globalAlpha = 0.55; x.filter = 'blur(2px)'; x.drawImage(tc, 0, 0); x.globalAlpha = 1;
  x.filter = 'none'; x.restore();
  // pegadas de lobo grandes (que viram pés humanos)
  function paw(px, py, a, s, human) {
    x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgba(70,60,55,.55)';
    if (human) { x.beginPath(); x.ellipse(0, 0, s * 0.35, s * 0.8, 0, 0, Math.PI * 2); x.fill(); }
    else { x.beginPath(); x.ellipse(0, s * 0.25, s * 0.42, s * 0.36, 0, 0, Math.PI * 2); x.fill(); for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse((i - 1.5) * s * 0.28, -s * 0.35 - (i === 1 || i === 2 ? s * 0.12 : 0), s * 0.13, s * 0.17, 0, 0, Math.PI * 2); x.fill(); } }
    x.restore();
  }
  for (let i = 0; i < 9; i++) { const t = i / 9; paw(13 * C + t * 9 * C + (i % 2) * 18, 12.6 * C - t * 4.2 * C, -0.45, 20, i > 6); }
  // riacho congelado na diagonal
  x.save();
  const creek = [[-40, 6 * C], [5 * C, 7.5 * C], [9 * C, 7 * C], [13 * C, 9.5 * C], [15 * C, 14 * C], [19 * C, 17 * C], [25 * C, 18 * C], [W + 40, 21 * C]];
  function path(pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } x.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); }
  const bank = M.bandMask(W, H, creek, 2.6 * C, 0.9), ice = M.bandMask(W, H, creek, 1.9 * C, 0.7);
  x.save(); x.filter = 'blur(8px)'; x.globalAlpha = 0.55; x.drawImage(bank, 0, 0); x.restore();
  x.save(); x.globalCompositeOperation = 'multiply'; x.filter = 'blur(10px)'; x.globalAlpha = 0.35; x.drawImage(bank, 6, 10); x.restore();
  M.texIn(x, bank, ['#9aa9b8', '#b9c6d2', '#d3dce5'], 40, { k: 1.4, grain: 8 });
  M.texIn(x, ice, ['#5f7f96', '#7f9fb5', '#a9c4d4', '#cfe0ea'], 70, { k: 2, grain: 6 });
  x.save(); x.globalAlpha = 0.5; x.filter = 'blur(3px)'; x.strokeStyle = '#eaf3f8'; x.lineWidth = 6; x.restore();
  // rachaduras no gelo
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) { const k = Math.floor(M.rnd() * (creek.length - 1)), t = M.rnd(); let px = creek[k][0] + (creek[k + 1][0] - creek[k][0]) * t + M.R(-40, 40), py = creek[k][1] + (creek[k + 1][1] - creek[k][1]) * t + M.R(-40, 40); x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { px += M.R(-22, 22); py += M.R(-22, 22); x.lineTo(px, py); } x.stroke(); }
  // água escura num buraco no gelo
  x.fillStyle = '#1d2c38'; M.blob(x, 14.2 * C, 11.6 * C, 30, 0.5, 12); x.fill(); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 3; x.stroke();
  x.restore();
  // tronco caído atravessando o riacho (ponte)
  x.save(); M.shadow(x, 12, 6, 9, 0.6); x.translate(5.5 * C, 7.3 * C); x.rotate(1.25);
  const lg = x.createLinearGradient(0, -22, 0, 22); lg.addColorStop(0, '#6e5236'); lg.addColorStop(0.5, '#4f3a25'); lg.addColorStop(1, '#2c2016');
  x.fillStyle = lg; x.fillRect(-2.4 * C, -24, 4.8 * C, 48); M.noShadow(x);
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(-2.4 * C, -18 + i * 4.5); x.lineTo(2.4 * C, -18 + i * 4.5 + M.R(-3, 3)); x.stroke(); }
  x.fillStyle = 'rgba(236,241,246,.85)'; x.fillRect(-2.3 * C, -24, 4.6 * C, 12);
  x.fillStyle = '#8a6a48'; x.beginPath(); x.ellipse(2.4 * C, 0, 10, 24, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#4a3420'; for (let r = 4; r < 22; r += 5) { x.beginPath(); x.ellipse(2.4 * C, 0, r * 0.4, r, 0, 0, Math.PI * 2); x.stroke(); }
  x.restore();
  // ovelha morta e sangue (pista)
  x.save(); x.fillStyle = 'rgba(110,20,20,.55)'; M.blob(x, 10.6 * C, 15.2 * C, 46, 0.7, 14); x.fill(); x.fillStyle = 'rgba(90,15,15,.4)'; for (let i = 0; i < 14; i++) { M.blob(x, 10.6 * C + M.R(-90, 90), 15.2 * C + M.R(-70, 70), M.R(4, 10), 0.5, 7); x.fill(); }
  M.shadow(x, 8, 3, 5, 0.5); x.fillStyle = '#d9d2c4'; M.blob(x, 10.5 * C, 15.1 * C, 26, 0.35, 14); x.fill(); M.noShadow(x); x.fillStyle = '#cfc6b6'; for (let i = 0; i < 10; i++) { M.blob(x, 10.5 * C + M.R(-18, 18), 15.1 * C + M.R(-14, 14), 7, 0.4, 7); x.fill(); } x.fillStyle = '#2a2622'; x.beginPath(); x.ellipse(10.5 * C + 28, 15.1 * C - 4, 10, 7, 0.3, 0, Math.PI * 2); x.fill();
  x.restore();
  // pedras
  [[20 * C, 13.5 * C, 34], [21 * C, 14.2 * C, 22], [8.5 * C, 10.5 * C, 30], [26.5 * C, 10 * C, 40], [27.4 * C, 10.8 * C, 24], [3 * C, 15.8 * C, 28], [17 * C, 4.5 * C, 26], [12 * C, 19.5 * C, 30]].forEach(function (r) { M.rock(x, r[0], r[1], r[2], true); });
  // arbustos
  [[9.5 * C, 3 * C], [14 * C, 6.5 * C], [22.5 * C, 15.5 * C], [5 * C, 12.5 * C], [17.5 * C, 19.5 * C], [28 * C, 15 * C]].forEach(function (b) { M.bush(x, b[0], b[1], 30, true); });
  // árvores secas
  [[11 * C, 8 * C], [19 * C, 9.5 * C], [7 * C, 18 * C]].forEach(function (t) { M.bareTree(x, t[0], t[1], 90); });
  // linha de pinheiros nas bordas (densa), deixando a clareira
  const cx = 15 * C, cy = 11.5 * C;
  const trees = [];
  for (let i = 0; i < 420; i++) {
    const px = M.R(-60, W + 60), py = M.R(-60, H + 60);
    const dx = (px - cx) / (W * 0.42), dy = (py - cy) / (H * 0.4);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.92 + M.fbm(px / 300, py / 300, 3) * 0.35) continue;
    // não cobrir a trilha nas pontas
    let near = false; [[6.5 * C, H], [25 * C, 0]].forEach(function (q) { if (Math.hypot(px - q[0], py - q[1]) < 2.2 * C) near = true; });
    if (near) continue;
    trees.push([px, py, M.R(55, 95)]);
  }
  trees.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (t) { M.pine(x, t[0], t[1], t[2], true); });
  // alguns pinheiros soltos na clareira (cobertura)
  [[6 * C, 4.5 * C, 70], [23.5 * C, 12 * C, 75], [18.5 * C, 13 * C, 62], [13.5 * C, 3.5 * C, 66]].forEach(function (t) { M.pine(x, t[0], t[1], t[2], true); });
  // luz da lua: leve tom azul frio e vinheta
  x.fillStyle = 'rgba(40,70,120,.10)'; x.fillRect(0, 0, W, H);
  M.vignette(x, W, H, 0.5);
})();
