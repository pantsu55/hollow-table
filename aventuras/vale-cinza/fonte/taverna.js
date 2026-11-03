(function () {
  const c = document.getElementById('c'), x = c.getContext('2d'), W = c.width, H = c.height, C = 70;
  M.setSeed(5);
  M.noiseFill(x, W, H, ['#b3bfcc', '#cdd6df', '#dde4eb', '#e9eef3'], 180, { k: 1.6, grain: 9 });
  // trilha de lama na neve até a porta
  const trail = [[11 * C, H + 40], [11.4 * C, 16.6 * C], [12 * C, 15.6 * C]];
  const tm = M.bandMask(W, H, trail, 2 * C, 1); const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
  M.texIn(tc.getContext('2d'), tm, ['#6f6258', '#8d8279', '#aea69f'], 24, { k: 1.8, grain: 14 }); x.globalAlpha = 0.6; x.drawImage(tc, 0, 0); x.globalAlpha = 1;
  // interior: 1..23 x 1..15
  const X0 = 1 * C, Y0 = 1 * C, X1 = 23 * C, Y1 = 15.5 * C;
  x.save(); x.beginPath(); x.rect(X0, Y0, X1 - X0, Y1 - Y0); x.clip();
  M.planks(x, X0, Y0, X1 - X0, Y1 - Y0, 0.5 * C, ['#6d4d30', '#5f4229', '#7a5636', '#674830'], false);
  x.fillStyle = 'rgba(30,18,8,.18)'; x.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  // cozinha (lajotas) no canto superior direito: 17..23 x 1..6
  M.flagstones(x, 17 * C, Y0, 6 * C, 5 * C, 0.8 * C, '#6a6560');
  // tapete diante da lareira
  M.rugRect(x, 2.4 * C, 6.2 * C, 3.2 * C, 3.6 * C, '#4d2a1e', '#b08a3e');
  // balcão em L: 9..16 x 2..3 e desce até 5
  x.save(); M.shadow(x, 14, 6, 9, 0.6); x.fillStyle = '#4b311c'; x.fillRect(9 * C, 3.1 * C, 7 * C, 0.9 * C); x.fillRect(15.1 * C, 3.1 * C, 0.9 * C, 3.2 * C); x.restore();
  M.planks(x, 9 * C, 3.1 * C, 7 * C, 0.9 * C, 0.3 * C, ['#7d5634', '#6b4a2c'], false); M.planks(x, 15.1 * C, 4 * C, 0.9 * C, 2.3 * C, 0.3 * C, ['#7d5634', '#6b4a2c'], true);
  x.strokeStyle = '#2e1d0f'; x.lineWidth = 4; x.strokeRect(9 * C, 3.1 * C, 7 * C, 0.9 * C); x.strokeRect(15.1 * C, 4 * C, 0.9 * C, 2.3 * C);
  // barris atrás do balcão e canecas
  [[9.6, 1.7], [10.6, 1.7], [11.6, 1.7], [13, 1.6], [14.2, 1.7]].forEach(function (b) { M.barrel(x, b[0] * C, b[1] * C, 30); });
  function mug(px, py) { x.save(); M.shadow(x, 3, 1, 2, 0.5); x.fillStyle = '#8a8f96'; x.beginPath(); x.arc(px, py, 7, 0, Math.PI * 2); x.fill(); M.noShadow(x); x.fillStyle = '#e7d9a8'; x.beginPath(); x.arc(px, py, 4.5, 0, Math.PI * 2); x.fill(); x.restore(); }
  [[10, 3.5], [11.3, 3.6], [12.8, 3.45], [14.4, 3.55], [15.5, 4.7]].forEach(function (m) { mug(m[0] * C, m[1] * C); });
  // banquetas do balcão
  [10, 11.3, 12.6, 13.9].forEach(function (k) { M.stool(x, k * C, 4.6 * C, 17); });
  // cozinha: fogão, mesa de trabalho, caixotes
  x.save(); M.shadow(x, 12, 5, 7, 0.6); x.fillStyle = '#4a4744'; x.fillRect(20.5 * C, 1.1 * C, 2.3 * C, 1.4 * C); x.restore(); M.fire(x, 21.65 * C, 1.8 * C, 18);
  M.table(x, 18.2 * C, 3.2 * C, 2.4 * C, 1 * C); M.crate(x, 21.6 * C, 4 * C, 0.9 * C); M.crate(x, 22.1 * C, 5 * C, 0.75 * C);
  // mesas redondas com banquetas
  function roundSet(px, py, n) { M.table(x, px, py, 0.62 * C, 0, true); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.4; M.stool(x, px + Math.cos(a) * 1.05 * C, py + Math.sin(a) * 1.05 * C, 16); } mug(px - 10, py - 6); mug(px + 12, py + 8); }
  roundSet(9 * C, 8.5 * C, 4); roundSet(13.5 * C, 8 * C, 5); roundSet(18.5 * C, 9 * C, 4); roundSet(9.5 * C, 12.8 * C, 3); roundSet(19 * C, 13 * C, 4);
  // mesa comprida com bancos
  M.table(x, 12.2 * C, 11.6 * C, 4.6 * C, 1 * C);
  x.save(); M.shadow(x, 8, 3, 5, 0.5); x.fillStyle = '#4b311c'; x.fillRect(12.3 * C, 11 * C, 4.4 * C, 0.35 * C); x.fillRect(12.3 * C, 12.85 * C, 4.4 * C, 0.35 * C); x.restore();
  [[13, 12.1], [14.4, 12.05], [15.8, 12.15]].forEach(function (m) { mug(m[0] * C, m[1] * C); });
  // escada para o andar de cima (canto inferior esquerdo)
  x.save(); M.shadow(x, 10, 4, 6, 0.55); x.fillStyle = '#3d2817'; x.fillRect(1.1 * C, 11.5 * C, 2.6 * C, 3.9 * C); x.restore();
  for (let i = 0; i < 8; i++) { x.fillStyle = M.shade('#7a5636', -i * 0.06); x.fillRect(1.2 * C, 11.6 * C + i * 0.47 * C, 2.4 * C, 0.4 * C); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(1.2 * C, 11.6 * C + i * 0.47 * C + 0.4 * C, 2.4 * C, 0.07 * C); }
  // velas nas mesas
  M.candle(x, 13.5 * C, 8 * C); M.candle(x, 9 * C, 8.5 * C); M.candle(x, 14.5 * C, 11.6 * C); M.candle(x, 18.5 * C, 9 * C);
  x.restore();
  // paredes externas de pedra, com porta e janelas
  const T = 0.5 * C;
  M.wall(x, X0, Y0, X1, Y0, T);
  M.wall(x, X0, Y0, X0, 6 * C, T); M.wall(x, X0, 10 * C, X0, Y1, T);
  M.wall(x, X1, Y0, X1, 9 * C, T); M.wall(x, X1, 11 * C, X1, Y1, T);
  M.wall(x, X0, Y1, 11.3 * C, Y1, T); M.wall(x, 12.9 * C, Y1, X1, Y1, T);
  // lareira na parede esquerda (6..10)
  x.save(); M.shadow(x, 16, 6, 8, 0.7); x.fillStyle = '#5b5752'; x.fillRect(0.6 * C, 6 * C, 1.4 * C, 4 * C); x.restore();
  M.flagstones(x, 0.7 * C, 6.1 * C, 1.2 * C, 3.8 * C, 0.45 * C, '#77716b');
  x.fillStyle = '#16120f'; x.fillRect(1.1 * C, 7 * C, 0.9 * C, 2 * C); M.fire(x, 1.6 * C, 8 * C, 30);
  // parede interna da cozinha com porta
  M.wall(x, 17 * C, Y0, 17 * C, 2.3 * C, 0.3 * C); M.wall(x, 17 * C, 3.6 * C, 17 * C, 6 * C, 0.3 * C); M.wall(x, 17 * C, 6 * C, X1, 6 * C, 0.3 * C);
  // porta de entrada aberta
  x.save(); M.shadow(x, 8, 3, 5, 0.6); x.translate(11.3 * C, Y1); x.rotate(1.2); M.planks(x, 0, -10, 1.5 * C, 20, 10, ['#4a3320', '#5e4229'], false); x.restore();
  // janelas (vidro)
  [[X0, 3 * C, 0], [X0, 12.4 * C, 0], [X1, 13 * C, 0], [6 * C, Y1, 1], [18 * C, Y1, 1], [5 * C, Y0, 1]].forEach(function (w) { x.save(); x.fillStyle = '#9cc0d6'; if (w[2]) x.fillRect(w[0] - 0.6 * C, w[1] - 6, 1.2 * C, 12); else x.fillRect(w[0] - 6, w[1] - 0.6 * C, 12, 1.2 * C); x.restore(); M.glow(x, w[0], w[1], 70, '255,190,110', 0.25); });
  // saída lateral (porta dos fundos, parede direita 9..11)
  x.save(); x.fillStyle = '#3a2716'; x.fillRect(X1 - 8, 9 * C, 16, 2 * C); x.restore();
  // lenha empilhada e barris lá fora
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { x.save(); M.shadow(x, 4, 2, 3, 0.5); x.fillStyle = '#5a3d24'; x.beginPath(); x.arc((2 + i * 0.4) * C, (16.4 + j * 0.4) * C, 13, 0, Math.PI * 2); x.fill(); M.noShadow(x); x.fillStyle = '#b08455'; x.beginPath(); x.arc((2 + i * 0.4) * C, (16.4 + j * 0.4) * C, 9, 0, Math.PI * 2); x.fill(); x.restore(); }
  M.barrel(x, 21 * C, 16.5 * C, 30); M.barrel(x, 22 * C, 16.8 * C, 28); M.crate(x, 19.4 * C, 16.2 * C, 0.8 * C);
  M.pine(x, 23.4 * C, 17.2 * C, 70, true); M.pine(x, 0.4 * C, 17.4 * C, 60, true);
  // luz quente: escurece o salão e acende em volta do fogo e das velas
  x.save(); x.beginPath(); x.rect(X0, Y0, X1 - X0, Y1 - Y0); x.clip();
  x.fillStyle = 'rgba(15,8,4,.28)'; x.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  M.glow(x, 2.2 * C, 8 * C, 6 * C, '255,140,60', 0.32); M.glow(x, 13.5 * C, 8 * C, 3 * C, '255,180,90', 0.14); M.glow(x, 14.5 * C, 11.6 * C, 3 * C, '255,180,90', 0.14); M.glow(x, 21.6 * C, 1.8 * C, 3 * C, '255,140,60', 0.2);
  x.restore();
  M.vignette(x, W, H, 0.35);
})();
