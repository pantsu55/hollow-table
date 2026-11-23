/* Hollow Table · miniatura tática (sprite em camadas, estilo FFT)
   Carrega sprites/tactics/manifest.json e as camadas PNG; desenha qualquer <canvas data-tac='{"set":…}'> que estiver na página.
   Config salva na ficha (SH.tac): { set: 'guerreira'|'guerreiro', elmo: bool, arma: 'nenhuma'|'espada'|… } */
(function () {
  'use strict';
  const BASE = 'sprites/tactics/';
  const VER = '1';
  const SETS = [['guerreira', 'Feminino'], ['guerreiro', 'Masculino']];
  const ARMAS = [['nenhuma', 'Nenhuma'], ['espada', 'Espada'], ['machado', 'Machado'], ['maca', 'Maça'], ['cajado', 'Cajado'], ['arco', 'Arco'], ['besta', 'Besta'], ['pistola', 'Pistola']];
  const RANGED = { arco: 1, besta: 1, pistola: 1 };
  const ANIMS = [['Idle', 'Parado'], ['Walk', 'Andando'], ['Attack', 'Ataque'], ['Cast', 'Magia'], ['Raise', 'Item'], ['Guard', 'Defesa'], ['Hurt', 'Dano'], ['KO', 'Caído']];
  const DIRS = ['DL', 'DR', 'UR', 'UL'];   // sentido horário visto de cima
  const DEF = { set: 'guerreira', elmo: false, arma: 'espada' };
  let man = null, manP = null;
  const imgs = {};
  const prev = { anim: 'Idle', dir: 'DL', t0: performance.now() };

  function norm(c) {
    c = Object.assign({}, DEF, c || {});
    if (!SETS.some(function (s) { return s[0] === c.set; })) c.set = DEF.set;
    if (!ARMAS.some(function (a) { return a[0] === c.arma; })) c.arma = DEF.arma;
    c.elmo = !!c.elmo;
    return c;
  }
  function loadMan() {
    if (!manP) manP = fetch(BASE + 'manifest.json?v=' + VER).then(function (r) { return r.json(); }).then(function (m) { man = m; return m; }).catch(function () { manP = null; });
    return manP;
  }
  function img(set, layer) {
    const k = set + '/' + layer;
    if (!imgs[k]) { const im = new Image(); im.src = BASE + k + '.png?v=' + VER; imgs[k] = im; }
    return imgs[k];
  }
  function layersFor(c) {
    const have = (man.sets[c.set] || {}).layers || [];
    const L = ['corpo', 'roupa', c.elmo ? 'cabelo_elmo' : 'cabelo'];
    if (c.arma !== 'nenhuma') L.push(c.arma);
    if (c.elmo) L.push('elmo');
    return L.filter(function (l) { return have.indexOf(l) >= 0; });
  }
  /* quadro da animação no instante t (ms); as de uma vez só repetem com uma pausa no fim */
  function frameAt(key, t) {
    const a = man.anims[key]; if (!a) return 0;
    const s = a[0], n = a[1], once = a[2] === 'once';
    let total = 0; for (let i = 0; i < n; i++) total += man.durations[s + i];
    const cyc = total + (once ? 700 : 0);
    let tt = t % cyc;
    for (let i = 0; i < n; i++) { tt -= man.durations[s + i]; if (tt < 0) return s + i; }
    return s + n - 1;
  }
  function draw(cv, c, key, t) {
    const ctx = cv.getContext('2d'), F = man.frame, cols = man.cols;
    const fi = frameAt(key, t), sx = (fi % cols) * F, sy = Math.floor(fi / cols) * F;
    const scale = cv.width / F;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    layersFor(c).forEach(function (l) {
      const im = img(c.set, l);
      if (im.complete && im.naturalWidth) ctx.drawImage(im, sx, sy, F, F, 0, 0, F * scale, F * scale);
    });
  }
  function animKey(c, anim, dir) {
    let a = anim;
    if (a === 'Attack' && RANGED[c.arma]) a = 'Shoot';
    return a + '_' + dir;
  }
  function tick(now) {
    requestAnimationFrame(tick);
    const list = document.querySelectorAll('canvas[data-tac]');
    if (!list.length) return;
    if (!man) { loadMan(); return; }
    list.forEach(function (cv) {
      let c; try { c = norm(JSON.parse(cv.dataset.tac)); } catch (e) { c = norm(null); }
      const anim = cv.dataset.anim || prev.anim, dir = cv.dataset.dir || prev.dir;
      draw(cv, c, animKey(c, anim, dir), now - prev.t0);
    });
  }
  requestAnimationFrame(tick);

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function chips(key, opts, val, ro) {
    return '<div class="chips wrap" role="group">' + opts.map(function (o) {
      return '<button type="button" class="chip" data-tac-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '"' + (ro ? ' disabled' : '') + '>' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  /* o cartão da ficha: prévia animada + escolhas (ro = só leitura) */
  function card(cfg, ro) {
    const c = norm(cfg);
    return '<div class="card tacc"><h2>Miniatura do grid</h2>' +
      '<div class="tac-wrap"><div class="tac-stage"><canvas class="tac" width="256" height="256" data-tac="' + esc(JSON.stringify(c)) + '" aria-label="Miniatura animada do personagem"></canvas>' +
      '<div class="tac-dir"><button type="button" class="chip" data-tac-rot="-1" aria-label="Girar para a esquerda">⟲</button><button type="button" class="chip" data-tac-rot="1" aria-label="Girar para a direita">⟳</button></div></div>' +
      '<div class="tac-opts">' +
      '<div class="grp"><label>Prévia</label>' + chips('anim', ANIMS, prev.anim, false) + '</div>' +
      '<div class="grp"><label>Corpo</label>' + chips('set', SETS, c.set, ro) + '</div>' +
      '<div class="grp"><label>Elmo</label>' + chips('elmo', [['false', 'Sem elmo'], ['true', 'Com elmo']], c.elmo, ro) + '</div>' +
      '<div class="grp"><label>Arma</label>' + chips('arma', ARMAS, c.arma, ro) + '</div>' +
      '<p class="hint-s">Por enquanto só existe a armadura de guerreiro. Cabelos, roupas e chapéus novos vão aparecendo aqui.</p>' +
      '</div></div></div>';
  }
  /* cliques da prévia (não salvam nada); os que mudam a ficha vão para onChange */
  let onChange = null;
  document.addEventListener('click', function (e) {
    const r = e.target.closest('[data-tac-rot]');
    if (r) { const i = DIRS.indexOf(prev.dir); prev.dir = DIRS[(i + Number(r.dataset.tacRot) + 4) % 4]; prev.t0 = performance.now(); return; }
    const b = e.target.closest('[data-tac-set]');
    if (!b || b.disabled) return;
    const k = b.dataset.tacSet, v = b.dataset.v;
    const box = b.closest('.tacc');
    if (k === 'anim') {
      prev.anim = v; prev.t0 = performance.now();
      if (box) box.querySelectorAll('[data-tac-set="anim"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      return;
    }
    const cv = box && box.querySelector('canvas[data-tac]');
    let c; try { c = norm(JSON.parse(cv.dataset.tac)); } catch (err) { c = norm(null); }
    c[k] = k === 'elmo' ? v === 'true' : v;
    if (k === 'arma' && v !== 'nenhuma' && (prev.anim === 'Idle' || prev.anim === 'Walk')) prev.anim = 'Attack';   // mostra a arma na hora
    prev.t0 = performance.now();
    if (cv) cv.dataset.tac = JSON.stringify(c);
    if (box) {
      box.querySelectorAll('[data-tac-set="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      box.querySelectorAll('[data-tac-set="anim"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === prev.anim)); });
    }
    if (onChange) onChange(c);
  });
  window.HTTac = { card: card, norm: norm, onChange: function (fn) { onChange = fn; }, load: loadMan };
})();
