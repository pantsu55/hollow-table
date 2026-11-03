(function () {
  const c = document.getElementById('c'), x = c.getContext('2d'), W = c.width, H = c.height, C = 70;
  M.setSeed(21);
  M.noiseFill(x, W, H, ['#b3bfcc', '#cdd6df', '#dde4eb', '#e9eef3'], 180, { k: 1.6, grain: 9 });
  // trilha até a porta
  const trail = [[13.5 * C, H + 40], [13.2 * C, 21 * C], [13.5 * C, 18.6 * C]];
  const tm = M.bandMask(W, H, trail, 1.8 * C, 1);
  const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
  M.texIn(tc.getContext('2d'), tm, ['#7d7066', '#9a8f86', '#b9b2ab', '#d2d0cf'], 26, { k: 1.8, grain: 14 });
  x.globalAlpha = 0.55; x.drawImage(tc, 0, 0); x.globalAlpha = 1;
  // ----- capela: nave de 6..20 x 4..18 e abside no topo
  const nave = [6 * C, 5 * C, 14 * C, 13.5 * C];
  const poly = function () { x.beginPath(); x.moveTo(6 * C, 18.5 * C); x.lineTo(6 * C, 5 * C); x.lineTo(9 * C, 5 * C); x.arc(13 * C, 5 * C, 4 * C, Math.PI, 0); x.lineTo(20 * C, 5 * C); x.lineTo(20 * C, 18.5 * C); x.closePath(); };
  x.save(); poly(); x.clip();
  M.flagstones(x, 5 * C, 0, 16 * C, 19 * C, C * 1.0, '#5f5a55');
  // musgo e sujeira
  x.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { x.fillStyle = M.rnd() < 0.5 ? '#3b4a2c' : '#2a2520'; M.blob(x, M.R(6 * C, 20 * C), M.R(1 * C, 18.5 * C), M.R(10, 40), 0.6, 10); x.fill(); } x.globalAlpha = 1;
  // tapete velho no corredor
  M.rugRect(x, 12.1 * C, 8.5 * C, 1.8 * C, 9.5 * C, '#5a1f1f', '#a1823c');
  // neve entrando pelo telhado caído
  x.globalAlpha = 0.6; [[7.2 * C, 15 * C, 100], [18.6 * C, 9.5 * C, 110], [19 * C, 16.8 * C, 70], [7.4 * C, 6.4 * C, 70]].forEach(function (s) { M.snowDrift(x, s[0], s[1], s[2]); }); x.globalAlpha = 1;
  // feixe de luar
  x.save(); x.globalCompositeOperation = 'lighter'; const lb = x.createRadialGradient(16.5 * C, 11 * C, 0, 16.5 * C, 11 * C, 3.5 * C); lb.addColorStop(0, 'rgba(150,180,230,.28)'); lb.addColorStop(1, 'rgba(150,180,230,0)'); x.fillStyle = lb; x.fillRect(0, 0, W, H); x.restore();
  // bancos (alguns quebrados)
  function pew(px, py, ang, broken) {
    x.save(); x.translate(px, py); x.rotate(ang);
    M.shadow(x, 8, 4, 6, 0.55); x.fillStyle = '#4a3320'; x.fillRect(-1.9 * C, -0.28 * C, 3.8 * C, 0.56 * C); M.noShadow(x);
    M.planks(x, -1.9 * C, -0.28 * C, 3.8 * C, 0.56 * C, 0.19 * C, ['#5e4229', '#533a24', '#684a2e'], false);
    x.fillStyle = '#3a2716'; x.fillRect(-1.9 * C, 0.16 * C, 3.8 * C, 0.12 * C);
    if (broken) { x.clearRect(0, 0, 0, 0); x.fillStyle = 'rgba(0,0,0,0)'; }
    x.restore();
  }
  [[9 * C, 9.5 * C, 0.02], [9 * C, 11.5 * C, -0.05], [9.1 * C, 13.5 * C, 0.25], [8.6 * C, 15.6 * C, 0.04], [16.9 * C, 9.5 * C, -0.03], [17 * C, 13.5 * C, 0.08], [16.8 * C, 15.5 * C, -0.32]].forEach(function (p) { pew(p[0], p[1], p[2]); });
  // tábuas soltas de um banco destruído
  for (let i = 0; i < 6; i++) { x.save(); x.translate(17 * C + M.R(-60, 60), 11.5 * C + M.R(-40, 40)); x.rotate(M.R(0, 3)); M.shadow(x, 5, 2, 3, 0.5); x.fillStyle = M.rnd() < 0.5 ? '#5e4229' : '#4a3320'; x.fillRect(-M.R(30, 70), -6, M.R(60, 120), 12); x.restore(); }
  // colunas
  [[8.5 * C, 7.5 * C], [17.5 * C, 7.5 * C], [8.5 * C, 12.5 * C], [17.5 * C, 12.5 * C], [8.5 * C, 17 * C]].forEach(function (p) {
    x.save(); M.shadow(x, 14, 6, 8, 0.6); const g = x.createRadialGradient(p[0] - 10, p[1] - 10, 4, p[0], p[1], 34); g.addColorStop(0, '#a19b94'); g.addColorStop(1, '#5c5752'); x.fillStyle = g; x.beginPath(); x.arc(p[0], p[1], 32, 0, Math.PI * 2); x.fill(); M.noShadow(x); x.strokeStyle = '#3a3633'; x.lineWidth = 3; x.stroke(); x.restore();
  });
  // coluna caída (destroços)
  x.save(); x.translate(17.6 * C, 16.9 * C); x.rotate(-0.6); M.shadow(x, 10, 5, 7, 0.6); const cg = x.createLinearGradient(0, -30, 0, 30); cg.addColorStop(0, '#a19b94'); cg.addColorStop(1, '#4f4a46'); x.fillStyle = cg; x.fillRect(-1.3 * C, -30, 2.6 * C, 60); M.noShadow(x); x.strokeStyle = 'rgba(0,0,0,.4)'; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(-1.3 * C + i * 0.65 * C, -30); x.lineTo(-1.3 * C + i * 0.65 * C, 30); x.stroke(); } x.restore();
  // altar no alto da abside
  x.save(); M.shadow(x, 16, 6, 9, 0.65); x.fillStyle = '#857e76'; x.fillRect(11.5 * C, 3.2 * C, 3 * C, 1.3 * C); M.noShadow(x); x.fillStyle = '#e8e0cf'; x.fillRect(11.7 * C, 3.35 * C, 2.6 * C, 1 * C); x.fillStyle = '#6b1d1d'; x.fillRect(12.75 * C, 3.35 * C, 0.5 * C, 1 * C); x.restore();
  // degraus do altar
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(10.5 * C, 5 * C, 5 * C, 6); x.fillRect(10 * C, 6 * C, 6 * C, 6);
  M.candle(x, 11.8 * C, 3.5 * C); M.candle(x, 14.2 * C, 3.5 * C); M.candle(x, 13 * C, 2.6 * C);
  // alçapão para a cripta (à direita do altar)
  x.save(); M.shadow(x, 6, 2, 3, 0.5); x.fillStyle = '#1a1512'; x.fillRect(17.6 * C, 5.3 * C, 1.4 * C, 1.4 * C); M.noShadow(x); M.planks(x, 17.65 * C, 5.35 * C, 0.75 * C, 1.3 * C, 0.25 * C, ['#5e4229', '#533a24'], true); x.strokeStyle = '#2b2b2e'; x.lineWidth = 4; x.strokeRect(17.6 * C, 5.3 * C, 1.4 * C, 1.4 * C); for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.4 + i * 0.12) + ')'; x.fillRect(18.4 * C, 5.35 * C + i * 0.33 * C, 0.55 * C, 0.28 * C); } x.restore();
  // entulho
  for (let i = 0; i < 26; i++) { const q = [[7 * C, 6 * C], [19 * C, 14.5 * C], [6.8 * C, 17 * C], [15 * C, 4 * C]][i % 4]; M.rock(x, q[0] + M.R(-60, 60), q[1] + M.R(-50, 50), M.R(8, 22), i % 3 === 0); }
  x.restore();
  // paredes (com brechas)
  const T = 0.55 * C;
  M.wall(x, 6 * C, 18.5 * C, 12.4 * C, 18.5 * C, T);
  M.wall(x, 14.6 * C, 18.5 * C, 20 * C, 18.5 * C, T);
  M.wall(x, 6 * C, 18.5 * C, 6 * C, 12.6 * C, T);
  M.wall(x, 6 * C, 10.4 * C, 6 * C, 5 * C, T);
  M.wall(x, 20 * C, 18.5 * C, 20 * C, 15.2 * C, T);
  M.wall(x, 20 * C, 12.6 * C, 20 * C, 5 * C, T);
  M.wall(x, 6 * C, 5 * C, 9 * C, 5 * C, T);
  M.wall(x, 17 * C, 5 * C, 20 * C, 5 * C, T);
  // abside em arco (segmentos)
  for (let i = 0; i < 10; i++) { if (i === 6) continue; const a1 = Math.PI + i / 10 * Math.PI, a2 = Math.PI + (i + 1) / 10 * Math.PI; M.wall(x, 13 * C + Math.cos(a1) * 4 * C, 5 * C + Math.sin(a1) * 4 * C, 13 * C + Math.cos(a2) * 4 * C, 5 * C + Math.sin(a2) * 4 * C, T); }
  // porta da frente (folhas abertas)
  x.save(); M.shadow(x, 8, 3, 5, 0.6); x.translate(12.5 * C, 18.5 * C); x.rotate(-1.1); M.planks(x, 0, -10, 1.1 * C, 20, 10, ['#4a3320', '#5e4229'], false); x.restore();
  x.save(); M.shadow(x, 8, 3, 5, 0.6); x.translate(14.5 * C, 18.5 * C); x.rotate(-2.2); M.planks(x, 0, -10, 1.1 * C, 20, 10, ['#4a3320', '#5e4229'], false); x.restore();
  // pedras derrubadas fora das brechas
  for (let i = 0; i < 18; i++) { const q = [[5.4 * C, 11.5 * C], [20.6 * C, 13.9 * C], [16.2 * C, 1.6 * C]][i % 3]; M.rock(x, q[0] + M.R(-50, 50), q[1] + M.R(-60, 60), M.R(10, 26), true); }
  // ----- cripta (subterrâneo), à direita: 22..29 x 8..22
  const cx0 = 22.3 * C, cy0 = 8.2 * C, cw = 7.2 * C, ch = 14.4 * C;
  x.save(); M.shadow(x, 40, 0, 0, 0.95); x.fillStyle = '#0d0c0f'; x.fillRect(cx0 - 0.5 * C, cy0 - 0.5 * C, cw + C, ch + C); x.restore();
  x.save(); x.beginPath(); x.rect(cx0, cy0, cw, ch); x.clip();
  M.flagstones(x, cx0, cy0, cw, ch, C * 0.8, '#4f4b47');
  // escada (topo da cripta)
  for (let i = 0; i < 6; i++) { x.fillStyle = M.shade('#6a655f', -i * 0.1); x.fillRect(cx0 + 0.3 * C, cy0 + i * 0.3 * C, 1.6 * C, 0.3 * C); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(cx0 + 0.3 * C, cy0 + i * 0.3 * C + 0.25 * C, 1.6 * C, 0.05 * C); }
  // sarcófagos
  function sarc(px, py, ang, open) { x.save(); x.translate(px, py); x.rotate(ang); M.shadow(x, 12, 5, 8, 0.7); x.fillStyle = '#6d6862'; x.fillRect(-0.55 * C, -1.2 * C, 1.1 * C, 2.4 * C); M.noShadow(x); x.strokeStyle = '#2f2c29'; x.lineWidth = 3; x.strokeRect(-0.55 * C, -1.2 * C, 1.1 * C, 2.4 * C); if (open) { x.fillStyle = '#1a1714'; x.fillRect(-0.4 * C, -1.05 * C, 0.8 * C, 2.1 * C); } else { x.strokeStyle = 'rgba(255,255,255,.12)'; x.strokeRect(-0.42 * C, -1.05 * C, 0.84 * C, 2.1 * C); x.beginPath(); x.moveTo(0, -0.8 * C); x.lineTo(0, 0.5 * C); x.moveTo(-0.25 * C, -0.45 * C); x.lineTo(0.25 * C, -0.45 * C); x.stroke(); } x.restore(); }
  sarc(cx0 + 1.2 * C, cy0 + 4.2 * C, 0); sarc(cx0 + 1.2 * C, cy0 + 7.6 * C, 0, true); sarc(cx0 + 6 * C, cy0 + 4.2 * C, 0); sarc(cx0 + 6 * C, cy0 + 7.6 * C, 0.05);
  // tampa caída do sarcófago aberto
  x.save(); x.translate(cx0 + 2.6 * C, cy0 + 8.4 * C); x.rotate(0.5); M.shadow(x, 10, 4, 6, 0.6); x.fillStyle = '#6d6862'; x.fillRect(-0.5 * C, -1.1 * C, 1 * C, 2.2 * C); x.restore();
  // palha e correntes presas na parede do fundo (onde Bram se acorrenta)
  x.save(); x.globalAlpha = 0.9; for (let i = 0; i < 260; i++) { x.strokeStyle = M.rnd() < 0.5 ? '#b9973f' : '#8c6e2a'; x.lineWidth = 2; const px = cx0 + 3.6 * C + M.R(-1.4, 1.4) * C, py = cy0 + 12.4 * C + M.R(-0.9, 0.9) * C, a = M.R(0, 3); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14); x.stroke(); } x.restore();
  function chain(x1, y1, x2, y2) { const d = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(d / 12); x.strokeStyle = '#a5a8ad'; x.lineWidth = 4; for (let i = 0; i < n; i++) { const t = i / n, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t; x.beginPath(); x.ellipse(px, py, i % 2 ? 8 : 4, i % 2 ? 4 : 8, Math.atan2(y2 - y1, x2 - x1), 0, Math.PI * 2); x.stroke(); } }
  x.fillStyle = '#2b2b2e'; x.fillRect(cx0 + 3.2 * C, cy0 + ch - 14, 0.8 * C, 14);
  chain(cx0 + 3.4 * C, cy0 + ch - 8, cx0 + 3 * C, cy0 + 12.2 * C); chain(cx0 + 3.8 * C, cy0 + ch - 8, cx0 + 4.4 * C, cy0 + 12.4 * C);
  chain(cx0 + 4.4 * C, cy0 + 12.4 * C, cx0 + 4.9 * C, cy0 + 11.6 * C);
  // marcas de garras no chão
  x.strokeStyle = 'rgba(15,12,10,.6)'; x.lineWidth = 3; for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const bx = cx0 + [2, 5.4, 4][k] * C + i * 9, by = cy0 + [10.6, 10, 6][k] * C; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + 18, by + 34); x.stroke(); }
  x.fillStyle = 'rgba(5,5,10,.38)'; x.fillRect(cx0, cy0, cw, ch);
  // velas da cripta
  M.candle(x, cx0 + 0.6 * C, cy0 + 2.4 * C); M.candle(x, cx0 + 6.6 * C, cy0 + 2.4 * C); M.candle(x, cx0 + 2.2 * C, cy0 + 12.8 * C); M.candle(x, cx0 + 5.2 * C, cy0 + 13.2 * C);
  x.restore();
  // paredes da cripta
  M.wall(x, cx0, cy0, cx0 + cw, cy0, 0.4 * C); M.wall(x, cx0, cy0 + ch, cx0 + cw, cy0 + ch, 0.4 * C); M.wall(x, cx0, cy0, cx0, cy0 + ch, 0.4 * C); M.wall(x, cx0 + cw, cy0, cx0 + cw, cy0 + ch, 0.4 * C);
  // ----- floresta em volta
  const trees = [];
  for (let i = 0; i < 380; i++) {
    const px = M.R(-60, W + 60), py = M.R(-60, H + 60);
    if (px > 3.6 * C && px < 22.6 * C && py > -1 * C && py < 21 * C) continue;
    if (px > 21.2 * C && px < 30.2 * C && py > 7 * C && py < 23.4 * C) continue;
    if (Math.abs(px - 13.4 * C) < 1.6 * C && py > 18 * C) continue;
    trees.push([px, py, M.R(55, 95)]);
  }
  trees.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (t) { M.pine(x, t[0], t[1], t[2], true); });
  M.bareTree(x, 4.2 * C, 20.5 * C, 90); M.bareTree(x, 21.5 * C, 3 * C, 80);
  x.fillStyle = 'rgba(40,70,120,.12)'; x.fillRect(0, 0, W, H);
  M.vignette(x, W, H, 0.5);
})();
