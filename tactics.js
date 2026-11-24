/* Hollow Table · miniatura tática (sprite em camadas, estilo FFT)
   Carrega sprites/tactics/manifest.json e as camadas PNG; desenha qualquer <canvas data-tac='{"set":…}'> que estiver na página.
   Config salva na ficha (SH.tac): { set: 'guerreira'|'guerreiro', elmo: bool, arma: 'nenhuma'|'espada'|… }
   Uso: HTTac.open(cfg, onSave)  -> abre o editor (janela por cima da ficha)
        HTTac.draw(canvas, cfg, anim, dir, t) -> desenha um quadro (para o mapa tático) */
(function () {
  'use strict';
  const BASE = 'sprites/tactics/';
  const VER = '2';
  const SETS = [['guerreira', 'Feminino'], ['guerreiro', 'Masculino']];
  const ARMAS = [['nenhuma', 'Nenhuma'], ['espada', 'Espada'], ['machado', 'Machado'], ['maca', 'Maça'], ['cajado', 'Cajado'], ['arco', 'Arco'], ['besta', 'Besta'], ['pistola', 'Pistola']];
  const RANGED = { arco: 1, besta: 1, pistola: 1 };
  const DIRS = ['DL', 'DR', 'UR', 'UL'];   // sentido horário visto de cima
  const DEF = { set: 'guerreira', elmo: false, arma: 'espada' };
  let man = null, manP = null;
  const imgs = {};
  /* prévia do editor: Idle; ao escolher uma arma, um golpe e volta ao Idle */
  const prev = { dir: 'DL', shot: null, t0: performance.now() };

  function norm(c) {
    c = Object.assign({}, DEF, c || {});
    if (!SETS.some(function (s) { return s[0] === c.set; })) c.set = DEF.set;
    if (!ARMAS.some(function (a) { return a[0] === c.arma; })) c.arma = DEF.arma;
    return { set: c.set, elmo: !!c.elmo, arma: c.arma };
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
    layersFor(c).forEach(function (l) { const im = img(c.set, l); if (im.complete && im.naturalWidth) ctx.drawImage(im, sx, sy, F, F, 0, 0, F * sc, F * sc); });
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
  function chips(key, opts, val) {
    return '<div class="chips wrap" role="group">' + opts.map(function (o) {
      return '<button type="button" class="chip" data-tac-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + esc(o[1]) + '</button>';
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
      cv.dataset.tac = JSON.stringify(c);
      ov.querySelectorAll('[data-tac-set="' + k + '"]').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); });
      if (k === 'arma' && v !== 'nenhuma') { prev.shot = 'Attack'; prev.t0 = performance.now(); }   // a arma só aparece no golpe: mostra um
    });
  }
  window.HTTac = { open: open, norm: norm, draw: draw, load: loadMan, dirs: DIRS };
})();
