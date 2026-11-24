/* Hollow Table · miniatura tática (sprite em camadas, estilo FFT)
   Carrega sprites/tactics/manifest.json e as camadas PNG; desenha qualquer <canvas data-tac='{"set":…}'> que estiver na página.
   Config salva na ficha (SH.tac): { set: 'guerreira'|'guerreiro', elmo: bool, arma: 'nenhuma'|'espada'|… }
   Uso: HTTac.open(cfg, onSave)  -> abre o editor (janela por cima da ficha)
        HTTac.draw(canvas, cfg, anim, dir, t) -> desenha um quadro (para o mapa tático) */
(function () {
  'use strict';
  const BASE = 'sprites/tactics/';
  const VER = '9';
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
    ['humano', 'Humano', [], null], ['elfo', 'Elfo', ['orelha_elfo'], null], ['meio-elfo', 'Meio-elfo', ['orelha_elfo'], null],
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
  const INL = window.HTTAC_INLINE || null;   // página de revisão: manifest e imagens embutidos
  function loadMan() {
    if (INL && !man) { man = INL.manifest; manP = Promise.resolve(man); }
    if (!manP) manP = fetch(BASE + 'manifest.json?v=' + VER, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { man = m; return m; }).catch(function () { manP = null; });
    return manP;
  }
  /* pele e cabelo: as variações vêm prontas do servidor (camada~opção.png), feitas e revisadas antes de publicar */
  const SKIN_L = { corpo: 1, pele_elmo: 1, orelha_elfo: 1, orelha_orc: 1, orelha_elfo_elmo: 1, orelha_orc_elmo: 1, roupa_pele: 1, cabelo_pele: 1, cabelo_elmo_pele: 1 };
  ['espada', 'machado', 'maca', 'cajado', 'arco', 'besta', 'pistola'].forEach(function (w) { SKIN_L[w + '_pele'] = 1; });   // mão desenhada junto com a arma
  const HAIR_L = { cabelo: 1, cabelo_elmo: 1 };
  ['espada', 'machado', 'maca', 'cajado', 'arco', 'besta', 'pistola'].forEach(function (w) { HAIR_L[w + '_cabelo'] = 1; });   // cabelo desenhado junto com a arma
  function img(set, name) {
    const k = set + '/' + name;
    if (!imgs[k]) {
      const h = ((man && man.sets[set] && man.sets[set].hash) || {})[name] || VER;
      const im = new Image(); im.src = INL ? (INL.files[k] || '') : BASE + k + '.png?h=' + h; imgs[k] = im;
    }
    return imgs[k];
  }
  function layerImg(c, l) {
    const hs = (man.sets[c.set] || {}).hash || {};
    let v = null;
    if (SKIN_L[l] && c.pele !== 'clara') v = l + '~' + c.pele;
    if (HAIR_L[l] && c.cabelo !== 'castanho') v = l + '~' + c.cabelo;
    return img(c.set, v && hs[v] ? v : l);
  }
  function layersFor(c) {
    const have = (man.sets[c.set] || {}).layers || [];
    const ex = (RACAS.filter(function (r) { return r[0] === c.raca; })[0] || RACAS[0])[2];
    const has = function (x) { return ex.indexOf(x) >= 0; };
    const L = ['corpo'];
    if (has('presas')) L.push('presas');
    L.push('roupa', 'roupa_pele');                    // *_pele: pele que estava desenhada na camada de cima (troca com a pele)
    const hair = c.elmo ? 'cabelo_elmo' : 'cabelo';
    L.push(hair, hair + '_pele', hair + '_fixo');   // _fixo: olho, prendedor e pedaços de roupa que estavam no cabelo (não mudam)
    const ears = ex.filter(function (x) { return x.indexOf('orelha_') === 0; });
    if (!c.elmo) ears.forEach(function (x) { L.push(x); });
    if (c.arma !== 'nenhuma') L.push(c.arma, c.arma + '_pele', c.arma + '_cabelo');
    if (c.elmo) { L.push('pele_elmo', 'elmo'); ears.forEach(function (x) { L.push(x + '_elmo'); }); }   // com elmo: orelha por fora dele
    if (has('chifres')) L.push(c.elmo ? 'chifres_elmo' : 'chifres');
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
    layersFor(c).forEach(function (l) { const im = layerImg(c, l); if (im.complete && im.naturalWidth) ctx.drawImage(im, sx, sy, F, F, 0, 0, F * sc, F * sc); });
  }
  function draw(cv, cfg, anim, dir, t, repeat) {
    if (!man) { loadMan(); return false; }
    const c = norm(cfg), key = animKey(c, anim || 'Idle', dir || 'DL'), a = man.anims[key];
    if (repeat && a && a[2] !== 'loop') t = (t || 0) % (total(key) + 700);   // revisão: repete com uma pausa no fim
    blit(cv, c, frameAt(key, t || 0, !a || a[2] === 'loop'));
    return true;
  }
  /* quadro i de uma animação (para folhas de revisão) */
  function frameCount(cfg, anim, dir) { if (!man) return 0; const a = man.anims[animKey(norm(cfg), anim, dir)]; return a ? a[1] : 0; }
  function drawIndex(cv, cfg, anim, dir, i) {
    if (!man) return false;
    const c = norm(cfg), a = man.anims[animKey(c, anim, dir)]; if (!a) return false;
    blit(cv, c, a[0] + Math.min(i, a[1] - 1)); return true;
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
  function chips(key, opts, val) {
    return '<div class="chips wrap" role="group">' + opts.map(function (o) {
      return '<button type="button" class="chip" data-tac-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  /* cores: só bolinhas (o nome da escolhida aparece no título do grupo) */
  const SW0 = { pele: 'f4be92', cabelo: '6c4532' };
  function swatches(key, opts, val) {
    return '<div class="tac-sws" role="group">' + opts.map(function (o) {
      const col = o[2] ? o[2][3] : SW0[key];
      return '<button type="button" class="tac-swb" data-tac-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (val === o[0]) + '" aria-label="' + esc(o[1]) + '" title="' + esc(o[1]) + '" style="--sw:#' + col + '"></button>';
    }).join('') + '</div>';
  }
  function nameOf(opts, v) { const o = opts.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : ''; }
  /* editor em janela: trabalha num rascunho; só grava ao Salvar */
  function open(cfg, onSave) {
    if (document.querySelector('.tac-ov')) return;
    const c = norm(cfg);
    prev.dir = 'DL'; prev.shot = null; prev.t0 = performance.now();
    const ov = document.createElement('div');
    ov.className = 'pfit tac-ov';
    ov.innerHTML = '<div class="pfit-in tac-in" role="dialog" aria-modal="true" aria-labelledby="tac-h">' +
      '<div class="tac-hd"><h3 id="tac-h">Editar miniatura</h3><p class="hint">É assim que o personagem aparece no mapa tático.</p></div>' +
      '<div class="tac-bd"><div class="tac-wrap">' +
      '<div class="tac-stage"><canvas class="tac" width="320" height="320" data-tac="' + esc(JSON.stringify(c)) + '" aria-label="Miniatura animada do personagem"></canvas>' +
      '<div class="tac-dir"><button type="button" class="chip" data-tac-rot="-1" aria-label="Girar para a esquerda">⟲</button><span class="tac-dl">Girar</span><button type="button" class="chip" data-tac-rot="1" aria-label="Girar para a direita">⟳</button></div></div>' +
      '<div class="tac-opts">' +
      '<div class="grp"><label>Corpo</label>' + chips('set', SETS, c.set) + '</div>' +
      '<div class="grp"><label>Raça</label>' + chips('raca', RACAS, c.raca) + '</div>' +
      '<div class="grp"><label>Pele <b class="tac-nm" data-nm="pele">' + esc(nameOf(PELES, c.pele)) + '</b></label>' + swatches('pele', PELES, c.pele) + '</div>' +
      '<div class="grp"><label>Cabelo <b class="tac-nm" data-nm="cabelo">' + esc(nameOf(CABELOS, c.cabelo)) + '</b></label>' + swatches('cabelo', CABELOS, c.cabelo) + '</div>' +
      '<div class="grp"><label>Elmo</label>' + chips('elmo', [['false', 'Sem elmo'], ['true', 'Com elmo']], c.elmo) + '</div>' +
      '<div class="grp"><label>Arma</label>' + chips('arma', ARMAS, c.arma) + '</div>' +
      '<p class="hint">Por enquanto só existe a armadura de guerreiro. Cabelos, roupas e chapéus novos vão aparecendo aqui.</p>' +
      '</div></div></div>' +
      '<div class="tac-ft"><button type="button" class="btn q sm" data-tac-x="cancel">Cancelar</button><button type="button" class="btn sm" data-tac-x="ok">Salvar</button></div></div>';
    document.body.appendChild(ov);
    const cv = ov.querySelector('canvas');
    function close() { ov.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    function mark(k) {
      ov.querySelectorAll('[data-tac-set="' + k + '"]').forEach(function (y) { y.setAttribute('aria-pressed', String(y.dataset.v === String(c[k]))); });
      const nm = ov.querySelector('[data-nm="' + k + '"]');
      if (nm) nm.textContent = nameOf(k === 'pele' ? PELES : CABELOS, c[k]);
    }
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
        const rr = RACAS.filter(function (x) { return x[0] === v; })[0];
        c.pele = rr && rr[3] ? rr[3] : (['verde', 'cinza', 'vermelha', 'roxa', 'azulada'].indexOf(c.pele) >= 0 ? 'clara' : c.pele);
        mark('pele');
      }
      cv.dataset.tac = JSON.stringify(c);
      mark(k);
      if (k === 'arma' && v !== 'nenhuma') { prev.shot = 'Attack'; prev.t0 = performance.now(); }   // a arma só aparece no golpe: mostra um
    });
  }
  window.HTTac = { open: open, norm: norm, draw: draw, drawIndex: drawIndex, frameCount: frameCount, load: loadMan, dirs: DIRS, opts: { sets: SETS, racas: RACAS, peles: PELES, cabelos: CABELOS, armas: ARMAS } };
})();
