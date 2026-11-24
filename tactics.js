/* Hollow Table · miniatura tática (sprite em camadas, estilo FFT)
   Carrega sprites/tactics/manifest.json e as camadas PNG; desenha qualquer <canvas data-tac='{"set":…}'> que estiver na página.
   Config salva na ficha (SH.tac): { set: 'guerreira'|'guerreiro', elmo: bool, arma: 'nenhuma'|'espada'|… }
   Uso: HTTac.open(cfg, onSave)  -> abre o editor (janela por cima da ficha)
        HTTac.draw(canvas, cfg, anim, dir, t) -> desenha um quadro (para o mapa tático) */
(function () {
  'use strict';
  const BASE = 'sprites/tactics/';
  const VER = '5';
  const SETS = [['guerreira', 'Feminino'], ['guerreiro', 'Masculino']];
  const ARMAS = [['nenhuma', 'Nenhuma'], ['espada', 'Espada'], ['machado', 'Machado'], ['maca', 'Maça'], ['cajado', 'Cajado'], ['arco', 'Arco'], ['besta', 'Besta'], ['pistola', 'Pistola']];
  const RANGED = { arco: 1, besta: 1, pistola: 1 };
  const DIRS = ['DL', 'DR', 'UR', 'UL'];   // sentido horário visto de cima
  /* paletas: 5 tons, do mais escuro ao mais claro (null = cor original do desenho) */
  const PELES = [
    ['clara', 'Clara', null], ['palida', 'Pálida', ['8a5a50', 'c8968a', 'e8bcae', 'f6dccf', 'fff0e6']],
    ['morena', 'Morena', ['5a3424', '8f5a3c', 'b97a52', 'd49a6c', 'e6b487']], ['marrom', 'Marrom', ['3e2418', '6b4028', '8f5a38', 'ad7448', 'c48d5e']],
    ['escura', 'Escura', ['24140e', '3e2418', '5a3622', '74482e', '8c5c3c']],
    ['verde', 'Verde', ['2c4020', '4a6630', '6a8a40', '8aa858', 'a8c474']], ['cinza', 'Cinza', ['3a4040', '5c6664', '7e8a86', '9eaaa4', 'bcc6c0']],
    ['vermelha', 'Vermelha', ['4e0e12', '86181c', 'b8262a', 'd8443c', 'ee6a56']], ['roxa', 'Roxa', ['3a2048', '5c3470', '7e4c94', '9c68b0', 'b888c8']],
    ['azulada', 'Azulada', ['2a3458', '405088', '5a70b0', '7890c8', '98acdc']]
  ];
  const CABELOS = [
    ['castanho', 'Castanho', null], ['preto', 'Preto', ['0e0d12', '1c1a20', '2a2730', '3a3642', '4c4756']],
    ['loiro', 'Loiro', ['5a3e18', '8a6428', 'b48c3c', 'd4b058', 'ecd080']], ['ruivo', 'Ruivo', ['4a160c', '7a2814', 'a83c1c', 'c8582a', 'e07a3e']],
    ['branco', 'Branco', ['5a5660', '8a8690', 'b4b0ba', 'd4d2da', 'eeeef2']], ['azul', 'Azul', ['141c3c', '23306a', '34489a', '4c64c0', '7088dc']],
    ['roxo', 'Roxo', ['24143a', '3c2260', '583488', '7448a8', '9468c8']], ['verde', 'Verde', ['142a1c', '1f4430', '2e6044', '42805a', '62a078']]
  ];
  /* raças: camadas extras e a pele sugerida ao escolher */
  const RACAS = [
    ['humano', 'Humano', [], null], ['elfo', 'Elfo', ['orelha_elfo'], null], ['meio-elfo', 'Meio-elfo', ['orelha_orc'], null],
    ['orc', 'Orc', ['orelha_orc', 'presas'], 'verde'], ['meio-orc', 'Meio-orc', ['presas'], 'cinza'], ['tiefling', 'Tiefling', ['chifres'], 'vermelha']
  ];
  const DEF = { set: 'guerreira', raca: 'humano', elmo: false, arma: 'espada', pele: 'clara', cabelo: 'castanho' };
  let man = null, manP = null;
  const imgs = {};
  /* prévia do editor: Idle; ao escolher uma arma, um golpe e volta ao Idle */
  const prev = { dir: 'DL', shot: null, t0: performance.now() };

  function norm(c) {
    c = Object.assign({}, DEF, c || {});
    if (!SETS.some(function (s) { return s[0] === c.set; })) c.set = DEF.set;
    if (!ARMAS.some(function (a) { return a[0] === c.arma; })) c.arma = DEF.arma;
    if (!PELES.some(function (a) { return a[0] === c.pele; })) c.pele = DEF.pele;
    if (!CABELOS.some(function (a) { return a[0] === c.cabelo; })) c.cabelo = DEF.cabelo;
    if (!RACAS.some(function (a) { return a[0] === c.raca; })) c.raca = DEF.raca;
    return { set: c.set, raca: c.raca, elmo: !!c.elmo, arma: c.arma, pele: c.pele, cabelo: c.cabelo };
  }
  function loadMan() {
    if (!manP) manP = fetch(BASE + 'manifest.json?v=' + VER, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { man = m; return m; }).catch(function () { manP = null; });
    return manP;
  }
  function img(set, layer) {
    const k = set + '/' + layer;
    /* cada camada vem com a impressão digital do conteúdo: arquivo novo = endereço novo, sem misturar com cópias antigas */
    const h = ((man && man.sets[set] && man.sets[set].hash) || {})[layer] || VER;
    if (!imgs[k]) { const im = new Image(); im.src = BASE + k + '.png?h=' + h; imgs[k] = im; }
    return imgs[k];
  }
  /* troca de cor: a claridade de cada pixel escolhe o tom na paleta nova (mantém sombras e luz do desenho) */
  function hex(h) { return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    return [h * 60, s, l];
  }
  const SRC = { pele: [0.28, 0.80], cabelo: [0.07, 0.46] };
  function rampAt(R, t) { const x = t * (R.length - 1), i = Math.min(R.length - 2, Math.floor(x)), f = x - i; return [0, 1, 2].map(function (k) { return Math.round(R[i][k] + (R[i + 1][k] - R[i][k]) * f); }); }
  function recolor(im, kind, ramp) {
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const ctx = cv.getContext('2d'); ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height), a = d.data, R = ramp.map(hex), lo = SRC[kind][0], hi = SRC[kind][1], memo = {};
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const key = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
      let out = memo[key];
      if (out === undefined) {
        const q = hsl(a[i], a[i + 1], a[i + 2]);
        const skin = kind === 'pele' ? ((q[0] <= 45 || q[0] >= 340) && q[1] >= 0.15 && q[2] >= lo && q[2] <= 0.86) : q[2] >= lo;
        out = memo[key] = skin ? rampAt(R, Math.max(0, Math.min(1, (q[2] - lo) / (hi - lo)))) : null;
      }
      if (out) { a[i] = out[0]; a[i + 1] = out[1]; a[i + 2] = out[2]; }
    }
    ctx.putImageData(d, 0, 0);
    return cv;
  }
  const tinted = {};
  function layerImg(c, l) {
    const base = img(c.set, l);
    const kind = (l === 'corpo' || l.indexOf('orelha_') === 0) ? 'pele' : (l === 'cabelo' || l === 'cabelo_elmo' ? 'cabelo' : null);
    const opt = kind && (kind === 'pele' ? PELES : CABELOS).filter(function (p) { return p[0] === c[kind]; })[0];
    if (!opt || !opt[2]) return base;
    if (!base.complete || !base.naturalWidth) return null;
    const k = c.set + '/' + l + '/' + opt[0];
    if (!tinted[k]) tinted[k] = recolor(base, kind, opt[2]);
    return tinted[k];
  }
  function layersFor(c) {
    const have = (man.sets[c.set] || {}).layers || [];
    const ex = (RACAS.filter(function (r) { return r[0] === c.raca; })[0] || RACAS[0])[2];
    const has = function (x) { return ex.indexOf(x) >= 0; };
    const L = ['corpo'];
    if (has('presas')) L.push('presas');
    L.push('roupa', c.elmo ? 'cabelo_elmo' : 'cabelo');
    ex.forEach(function (x) { if (x.indexOf('orelha_') === 0) L.push(x); });
    if (c.arma !== 'nenhuma') L.push(c.arma);
    if (c.elmo) L.push('elmo');
    if (has('chifres')) L.push('chifres');
    return L.filter(function (l) { return have.indexOf(l) >= 0; });
  }
  function total(key) { const a = man.anims[key]; let s = 0; if (a) for (let i = 0; i < a[1]; i++) s += man.durations[a[0] + i]; return s; }
  function frameAt(key, t, loop) {
    const a = man.anims[key]; if (!a) return 0;
    let tt = loop ? t % total(key) : Math.max(0, t);
    for (let i = 0; i < a[1]; i++) { tt -= man.durations[a[0] + i]; if (tt < 0) return a[0] + i; }
    return a[0] + a[1] - 1;
  }
  function animKey(c, anim, dir) { return (anim === 'Attack' && RANGED[c.arma] ? 'Shoot' : anim) + '_' + dir; }
  function blit(cv, c, fi) {
    const ctx = cv.getContext('2d'), F = man.frame, cols = man.cols, sx = (fi % cols) * F, sy = Math.floor(fi / cols) * F, sc = cv.width / F;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    layersFor(c).forEach(function (l) { const im = layerImg(c, l); if (im && (im.width || im.naturalWidth) && (im.complete !== false)) ctx.drawImage(im, sx, sy, F, F, 0, 0, F * sc, F * sc); });
  }
  function draw(cv, cfg, anim, dir, t) {
    if (!man) { loadMan(); return false; }
    const c = norm(cfg), key = animKey(c, anim || 'Idle', dir || 'DL'), a = man.anims[key];
    blit(cv, c, frameAt(key, t || 0, !a || a[2] === 'loop'));
    return true;
  }
  function tick(now) {
    requestAnimationFrame(tick);
    const list = document.querySelectorAll('canvas[data-tac]');
    if (!list.length) return;
    if (!man) { loadMan(); return; }
    list.forEach(function (cv) {
      let c; try { c = norm(JSON.parse(cv.dataset.tac)); } catch (e) { c = norm(null); }
      const t = now - prev.t0;
      if (prev.shot) {
        const k = animKey(c, prev.shot, prev.dir);
        if (t < total(k) + 250) { blit(cv, c, frameAt(k, t, false)); return; }
        prev.shot = null; prev.t0 = now;
      }
      blit(cv, c, frameAt('Idle_' + prev.dir, t, true));
    });
  }
  requestAnimationFrame(tick);

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  const SW0 = { pele: 'f4be92', cabelo: '6c4532' };
  function chips(key, opts, val) {
    return '<div class="chips wrap" role="group">' + opts.map(function (o) {
      const sw = SW0[key] ? '<i class="tac-sw" style="background:#' + (o[2] ? o[2][3] : SW0[key]) + '"></i>' : '';
      return '<button type="button" class="chip" data-tac-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + sw + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  /* editor em janela: trabalha num rascunho; só grava ao Salvar */
  function open(cfg, onSave) {
    if (document.querySelector('.tac-ov')) return;
    const c = norm(cfg);
    prev.dir = 'DL'; prev.shot = null; prev.t0 = performance.now();
    const ov = document.createElement('div');
    ov.className = 'pfit tac-ov';
    ov.innerHTML = '<div class="pfit-in tac-in" role="dialog" aria-modal="true" aria-label="Editar miniatura"><h3>Editar miniatura</h3>' +
      '<p class="hint">É assim que o personagem aparece no mapa tático.</p>' +
      '<div class="tac-wrap"><div class="tac-stage"><canvas class="tac" width="256" height="256" data-tac="' + esc(JSON.stringify(c)) + '" aria-label="Miniatura animada do personagem"></canvas>' +
      '<div class="tac-dir"><button type="button" class="chip" data-tac-rot="-1" aria-label="Girar para a esquerda">⟲</button><button type="button" class="chip" data-tac-rot="1" aria-label="Girar para a direita">⟳</button></div></div>' +
      '<div class="tac-opts">' +
      '<div class="grp"><label>Corpo</label>' + chips('set', SETS, c.set) + '</div>' +
      '<div class="grp"><label>Raça</label>' + chips('raca', RACAS, c.raca) + '</div>' +
      '<div class="grp"><label>Pele</label>' + chips('pele', PELES, c.pele) + '</div>' +
      '<div class="grp"><label>Cabelo</label>' + chips('cabelo', CABELOS, c.cabelo) + '</div>' +
      '<div class="grp"><label>Elmo</label>' + chips('elmo', [['false', 'Sem elmo'], ['true', 'Com elmo']], c.elmo) + '</div>' +
      '<div class="grp"><label>Arma</label>' + chips('arma', ARMAS, c.arma) + '</div>' +
      '<p class="hint">Por enquanto só existe a armadura de guerreiro. Cabelos, roupas e chapéus novos vão aparecendo aqui.</p>' +
      '</div></div>' +
      '<div class="pfit-b"><span class="sp"></span><button type="button" class="btn q sm" data-tac-x="cancel">Cancelar</button><button type="button" class="btn sm" data-tac-x="ok">Salvar</button></div></div>';
    document.body.appendChild(ov);
    const cv = ov.querySelector('canvas');
    function close() { ov.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) { close(); return; }
      const x = e.target.closest('[data-tac-x]');
      if (x) { if (x.dataset.tacX === 'ok' && onSave) onSave(norm(c)); close(); return; }
      const r = e.target.closest('[data-tac-rot]');
      if (r) { const i = DIRS.indexOf(prev.dir); prev.dir = DIRS[(i + Number(r.dataset.tacRot) + 4) % 4]; return; }
      const b = e.target.closest('[data-tac-set]');
      if (!b) return;
      const k = b.dataset.tacSet, v = b.dataset.v;
      c[k] = k === 'elmo' ? v === 'true' : v;
      if (k === 'raca') {   // a raça sugere a pele dela (dá para trocar depois)
        const r = RACAS.filter(function (x) { return x[0] === v; })[0];
        const sug = r && r[3] ? r[3] : (['verde', 'cinza', 'vermelha', 'roxa', 'azulada'].indexOf(c.pele) >= 0 ? 'clara' : c.pele);
        c.pele = sug;
        ov.querySelectorAll('[data-tac-set="pele"]').forEach(function (y) { y.setAttribute('aria-pressed', String(y.dataset.v === c.pele)); });
      }
      cv.dataset.tac = JSON.stringify(c);
      ov.querySelectorAll('[data-tac-set="' + k + '"]').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); });
      if (k === 'arma' && v !== 'nenhuma') { prev.shot = 'Attack'; prev.t0 = performance.now(); }   // a arma só aparece no golpe: mostra um
    });
  }
  window.HTTac = { open: open, norm: norm, draw: draw, load: loadMan, dirs: DIRS };
})();
