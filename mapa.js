/* Mapa da mesa (v2): imagem + grade (quadrados ou hexágonos), miniaturas, objetos, régua, névoa de guerra e combate.
   Usado no app do Mestre (vista Jogo) e na página dos jogadores (aba Jogo).
   O Mestre edita tudo; cada jogador move só o próprio token. Os jogadores recebem apenas o recorte revelado da imagem.
   Uso: HTMap.mount(elemento, { api, cid, uid, owner, system, party, imgUrl, toast, myName, toolsEl, combatEl, fill, rollInit, onEsc, onLog })
        -> { destroy(), reload(), relayout(), state() }
   Atributos próprios (data-m*) para não colidir com os cliques dos apps. */
(function () {
  'use strict';
  var SQ3 = Math.sqrt(3);
  var COLORS = ['#5EE1F5', '#B08CFF', '#6EE0A8', '#FFB86B', '#FF8F8F', '#F5E27A', '#8FB8FF', '#E9E6F7'];
  var PRESETS = [
    { n: 'Barricada', sh: 'rect', w: 2, h: 1, col: '#B07A45', pat: 'wood' },
    { n: 'Parede de gelo', sh: 'rect', w: 4, h: 1, col: '#8FE3FF', pat: 'ice', op: 0.8 },
    { n: 'Pedra', sh: 'ellipse', w: 1, h: 1, col: '#8A8AA0', pat: 'stone' },
    { n: 'Fogo', sh: 'circle', r: 1, col: '#FF8A3D', pat: 'fire', op: 0.85 },
    { n: 'Água', sh: 'rect', w: 3, h: 3, col: '#4C8DFF', pat: 'water', op: 0.6 },
    { n: 'Escuridão', sh: 'circle', r: 2, col: '#05040A', pat: 'solid', op: 0.6 },
    { n: 'Círculo', sh: 'circle', r: 2, col: '#B08CFF', pat: 'solid', op: 0.4 },
    { n: 'Cone', sh: 'cone', r: 3, col: '#FFB86B', pat: 'solid', op: 0.45 },
    { n: 'Linha', sh: 'rect', w: 6, h: 1, col: '#5EE1F5', pat: 'solid', op: 0.4 },
    { n: 'Porta', sh: 'rect', w: 1, h: 0.25, col: '#C48A52', pat: 'wood' },
    { n: 'Marcador', sh: 'ellipse', w: 0.6, h: 0.6, col: '#FF8F8F', pat: 'solid', op: 0.9 }
  ];
  var PATS = [['solid', 'Liso'], ['wood', 'Madeira'], ['ice', 'Gelo'], ['stone', 'Pedra'], ['water', 'Água'], ['fire', 'Fogo'], ['poison', 'Veneno'], ['dark', 'Escuridão'], ['light', 'Luz'], ['web', 'Teia'], ['mud', 'Lama'], ['smoke', 'Fumaça'], ['arcane', 'Arcano']];
  /* efeitos da ferramenta Desenhar: [textura, nome, cor, opacidade] */
  var FX = [['mark', 'Marca', '', 0.32], ['fire', 'Fogo', '#FF8A3D', 0.85], ['ice', 'Gelo', '#8FE3FF', 0.7], ['water', 'Água', '#4C8DFF', 0.6], ['poison', 'Veneno', '#7BD64A', 0.55], ['dark', 'Escuridão', '#05040A', 0.74], ['light', 'Luz', '#FFE9A0', 0.38], ['web', 'Teia', '#E9E6F7', 0.3], ['mud', 'Lama', '#7A5A3A', 0.66], ['smoke', 'Fumaça', '#9AA0B5', 0.58], ['arcane', 'Arcano', '#B08CFF', 0.5]];
  var DKINDS = { pen: 'Traço', area: 'Área livre', rect: 'Retângulo', circle: 'Círculo', erase: 'Apagar' };
  var OVERS = { fire: ['p-fire', 'p-ember'] };
  var SHAPES = { rect: 'Retângulo', ellipse: 'Elipse', circle: 'Círculo (raio)', cone: 'Cone' };
  var UNITS = [['m', 'metros'], ['ft', 'pés'], ['jd', 'jardas'], ['q', 'só casas']];
  var UNIT_S = { m: 'm', ft: 'pés', jd: 'jd' };
  var CONDS = [['caido', 'Caído', '#FFB86B'], ['envenenado', 'Envenenado', '#6EE0A8'], ['amedrontado', 'Amedrontado', '#B08CFF'], ['atordoado', 'Atordoado', '#F5E27A'],
    ['contido', 'Contido', '#8FB8FF'], ['cego', 'Cego', '#9A95B8'], ['concentrando', 'Concentrando', '#5EE1F5'], ['invisivel', 'Invisível', '#E9E6F7'],
    ['sangrando', 'Sangrando', '#FF6B6B'], ['inconsciente', 'Inconsciente', '#FF8F8F'], ['vulneravel', 'Vulnerável', '#FF9A6B'], ['escondido', 'Escondido', '#7C8BA8']];
  var CONDM = {}; CONDS.forEach(function (c) { CONDM[c[0]] = c; });
  function condAb(k) { var c = CONDM[k]; return c ? c[1].slice(0, 2) : '?'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function plain(n) { return String(Math.round(n * 100) / 100); }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }
  function initials(s) { return String(s || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || '?'; }
  function b64e(a) { var s = ''; for (var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
  function b64d(t) { try { var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; } catch (e) { return null; } }
  function hash(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function P2(p) { return (Math.round(p[0] * 10) / 10) + ' ' + (Math.round(p[1] * 10) / 10); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  function d20() { var a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % 20) + 1; }
  function mod2(n) { return ((n % 2) + 2) % 2; }
  function cubeRound(q, r) {
    var s = -q - r, rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    var dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return [rq, rr];
  }

  /* ---------- geometria da grade: quadrados ou hexágonos (em colunas: lados retos em cima; em linhas: pontas em cima) ---------- */
  function makeGeom(g) {
    var t = g.t === 'hx' ? 'hx' : 'sq', o = g.o === 'r' ? 'r' : 'c', s = Math.max(4, num(g.s, 70)), ox = num(g.ox, 0), oy = num(g.oy, 0), R = s / SQ3;
    var G = { t: t, o: o, s: s, ox: ox, oy: oy, R: R };
    if (t === 'sq') {
      G.center = function (c, r) { return [ox + (c + 0.5) * s, oy + (r + 0.5) * s]; };
      G.cellAt = function (x, y) { return [Math.floor((x - ox) / s), Math.floor((y - oy) / s)]; };
      G.corners = function (c, r) { var x = ox + c * s, y = oy + r * s; return [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]; };
      G.half = [s / 2, s / 2];
      G.range = function (x0, y0, x1, y1) { return [Math.floor((x0 - ox) / s), Math.floor((y0 - oy) / s), Math.floor((x1 - ox - 0.01) / s), Math.floor((y1 - oy - 0.01) / s)]; };
      G.dist = function (a, b, rule) { var dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]), mx = Math.max(dx, dy), mn = Math.min(dx, dy); return rule === 'r' ? Math.sqrt(dx * dx + dy * dy) : (rule === 'a' ? mx + Math.floor(mn / 2) : mx); };
      G.grid = function (x0, y0, x1, y1) {
        var d = '', k;
        for (k = Math.ceil((x0 - ox) / s); ox + k * s <= x1; k++) d += 'M' + (ox + k * s).toFixed(1) + ' ' + y0 + 'V' + y1;
        for (k = Math.ceil((y0 - oy) / s); oy + k * s <= y1; k++) d += 'M' + x0 + ' ' + (oy + k * s).toFixed(1) + 'H' + x1;
        return d;
      };
    } else {
      var flat = o === 'c', cw = flat ? 1.5 * R : s, rh = flat ? s : 1.5 * R;
      G.center = flat
        ? function (c, r) { return [ox + R + c * cw, oy + s / 2 + r * s + (mod2(c) ? s / 2 : 0)]; }
        : function (c, r) { return [ox + s / 2 + c * s + (mod2(r) ? s / 2 : 0), oy + R + r * rh]; };
      G.cellAt = flat
        ? function (x, y) { var px = x - ox - R, py = y - oy - s / 2, cr = cubeRound((2 / 3 * px) / R, (-1 / 3 * px + SQ3 / 3 * py) / R); return [cr[0], cr[1] + (cr[0] - mod2(cr[0])) / 2]; }
        : function (x, y) { var px = x - ox - s / 2, py = y - oy - R, cr = cubeRound((SQ3 / 3 * px - 1 / 3 * py) / R, (2 / 3 * py) / R); return [cr[0] + (cr[1] - mod2(cr[1])) / 2, cr[1]]; };
      G.axial = flat ? function (c, r) { return [c, r - (c - mod2(c)) / 2]; } : function (c, r) { return [c - (r - mod2(r)) / 2, r]; };
      G.corners = function (c, r) { var p = G.center(c, r), a = []; for (var k = 0; k < 6; k++) { var an = Math.PI / 3 * k + (flat ? 0 : Math.PI / 6); a.push([p[0] + R * Math.cos(an), p[1] + R * Math.sin(an)]); } return a; };
      G.half = flat ? [R, s / 2] : [s / 2, R];
      G.range = function (x0, y0, x1, y1) { return [Math.floor((x0 - ox - 2 * R) / cw), Math.floor((y0 - oy - s) / rh), Math.ceil((x1 - ox) / cw), Math.ceil((y1 - oy) / rh)]; };
      G.dist = function (a, b) { var p = G.axial(a[0], a[1]), q = G.axial(b[0], b[1]), dq = p[0] - q[0], dr = p[1] - q[1]; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; };
      G.grid = function (x0, y0, x1, y1) {
        var rg = G.range(x0, y0, x1, y1), d = '';
        for (var c = rg[0]; c <= rg[2] + 1; c++) for (var r = rg[1]; r <= rg[3] + 1; r++) { var p = G.corners(c, r); d += 'M' + P2(p[2]) + 'L' + P2(p[3]) + 'L' + P2(p[4]) + 'L' + P2(p[5]); }
        return d;
      };
    }
    G.poly = function (c, r) { return 'M' + G.corners(c, r).map(P2).join('L') + 'Z'; };
    G.box = function (c, r) { var p = G.center(c, r); return [p[0] - G.half[0], p[1] - G.half[1], p[0] + G.half[0], p[1] + G.half[1]]; };
    G.disk = function (c, r, rad) { var out = []; for (var cc = c - rad - 1; cc <= c + rad + 1; cc++) for (var rr = r - rad - 1; rr <= r + rad + 1; rr++) if (G.dist([c, r], [cc, rr], 's') <= rad) out.push([cc, rr]); return out; };
    return G;
  }

  var CSS = [
    '.mp, .mp-tools, .mf { --m-serif: var(--serif, var(--font-display, Cinzel, Georgia, serif)); --m-mono: var(--mono, var(--font-mono, ui-monospace, monospace)); --m-font: var(--font, var(--font-body, system-ui, sans-serif)); --m-bad: var(--bad, #FF8F8F); --m-glass: rgba(14, 12, 26, 0.86); }',
    '.mp { position: relative; height: calc(100dvh - 215px); min-height: 320px; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: #07060d; isolation: isolate; }',
    '.mp.fill { height: 100%; min-height: 0; }',
    '.mp.full { height: 100dvh; border: 0; border-radius: 0; }',
    '.mp.expanded { position: fixed; inset: 0; z-index: 70; height: auto !important; border-radius: 0; border: 0; }',
    '.mp-svg { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab; display: block; }',
    '.mp-svg.ruler, .mp-svg.grid, .mp-svg.fog, .mp-svg.draw, .mp-svg.point { cursor: crosshair; }',
    '.mp-dot { display: block; border-radius: 50%; background: currentColor; }',
    '.mp-fxs { flex-wrap: wrap; max-width: 100%; }',
    '.mp-fxs .mp-fb { border-bottom: 1px solid var(--line); margin-bottom: -1px; }',
    '.mp-laser { pointer-events: none; }',
    '.mp-svg.dragging { cursor: grabbing; }',
    '.mp-svg text { font-family: var(--m-font); pointer-events: none; }',
    '.mp-tl, .mp-tr { position: absolute; top: 10px; z-index: 3; display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start; pointer-events: none; }',
    '.mp-tv .mp-tl, .mp-tv .mp-tr, .mp-tv .mp-sub, .mp-tv .mp-insp, .mp-tv .mp-read { display: none !important; }',
    '.mp-tv .mp-svg { pointer-events: none; }',
    '.mp-tl { left: 10px; max-width: calc(100% - 20px); z-index: 6; }',
    '.mp.panel-open .mp-sub { left: calc(min(350px, 94%) + 10px); max-width: calc(100% - min(350px, 94%) - 20px); }',
    '.mp.panel-open .mp-insp { left: calc(min(350px, 94%) + 10px); width: min(330px, calc(100% - min(350px, 94%) - 20px)); }',
    '.mp-tr { right: 10px; justify-content: flex-end; }',
    '.mp-grp { pointer-events: auto; display: inline-flex; border: 1px solid var(--line); border-radius: 12px; background: var(--m-glass); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 8px 24px -12px rgba(0,0,0,0.8); overflow: hidden; }',
    '.mp-fb { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; min-width: 40px; justify-content: center; padding: 0 12px; border: 0; border-right: 1px solid var(--line); background: none; color: var(--fg); font: 600 13.5px var(--m-font); cursor: pointer; white-space: nowrap; }',
    '.mp-fb:last-child { border-right: 0; }',
    '.mp-fb:hover { background: rgba(255,255,255,0.05); }',
    '.mp-fb svg { width: 18px; height: 18px; flex: none; }',
    '.mp-fb[aria-pressed="true"] { color: var(--accent); background: var(--accent-soft); box-shadow: inset 0 -2px 0 var(--accent); }',
    '.mp-fb.sq { padding: 0; width: 40px; }',
    '.mp-fb.hot { color: var(--accent-ink); background: var(--accent); }',
    '.mp.mp-narrow .mp-fb .lb { display: none; }',
    '.mp.mp-narrow .mp-fb { padding: 0 10px; }',
    '.mp.mp-narrow .mp-fxs .mp-fb .lb { display: inline; }',
    '.mp.mp-tiny [data-ma="zin"], .mp.mp-tiny [data-ma="zout"] { display: none; }',
    '.mp.mp-tiny.mp-own .mp-tr { top: 58px; }',
    '.mp.mp-tiny.mp-own .mp-sub { top: 106px; }',
    '.mp-sub { position: absolute; left: 10px; top: 60px; z-index: 6; display: flex; gap: 6px; flex-wrap: wrap; max-width: calc(100% - 20px); pointer-events: none; }',
    '.mp-sub[hidden] { display: none; }',
    '.mp-sub .mp-fb { font-size: 13px; min-height: 36px; }',
    '.mp-note { pointer-events: auto; align-self: center; padding: 8px 12px; border-radius: 10px; background: var(--m-glass); border: 1px solid var(--line); font-size: 13px; color: var(--muted); }',
    '.mp-banner { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 2; display: flex; align-items: center; gap: 10px; max-width: calc(100% - 24px); padding: 7px 16px 7px 8px; border-radius: 99px; background: var(--m-glass); border: 1px solid var(--line); color: var(--fg); pointer-events: none; white-space: nowrap; box-shadow: 0 10px 30px -14px #000; }',
    '.mp-banner[hidden] { display: none; }',
    '.mp-banner .r { font: 700 12px var(--m-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding: 4px 9px; border-radius: 99px; background: rgba(255,255,255,0.06); }',
    '.mp-banner b { font-family: var(--m-serif); font-size: 16px; letter-spacing: 0.04em; overflow: hidden; text-overflow: ellipsis; }',
    '.mp-banner.mine { border-color: var(--accent); box-shadow: 0 0 24px -6px var(--accent); }',
    '.mp-banner.mine b { color: var(--accent); }',
    '.mp-read { position: absolute; left: 50%; bottom: 62px; transform: translateX(-50%); z-index: 2; padding: 8px 14px; border-radius: 99px; background: rgba(10, 9, 18, 0.94); border: 1px solid var(--accent); color: var(--fg); font: 600 14px var(--m-mono); box-shadow: 0 0 18px -6px var(--accent); pointer-events: none; white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; }',
    '.mp-read[hidden] { display: none; }',
    '.mp-empty { position: absolute; inset: 0; display: grid; place-content: center; gap: 8px; text-align: center; padding: 24px; color: var(--muted); z-index: 1; }',
    '.mp-empty b { font-family: var(--m-serif); font-size: 21px; color: var(--fg); letter-spacing: 0.05em; }',
    '.mp-empty[hidden] { display: none; }',
    '.mp-insp { position: absolute; left: 10px; bottom: 10px; z-index: 4; width: min(330px, calc(100% - 20px)); max-height: calc(100% - 120px); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; touch-action: pan-y; padding: 12px; border-radius: 14px; background: rgba(19, 17, 34, 0.97); border: 1px solid var(--line); box-shadow: 0 16px 40px -16px #000; display: grid; gap: 10px; box-sizing: border-box; }',
    '.mp-insp[hidden] { display: none; }',
    '.mp-insp.mini { width: auto; max-width: calc(100% - 20px); display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 14px; border-radius: 12px; }',
    '.mp-mini-n { font-family: var(--m-serif); font-size: 15px; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }',
    '.mp-insp-h { display: flex; justify-content: space-between; align-items: center; gap: 8px; }',
    '.mp-x { width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--line); background: var(--surface-2); color: var(--fg); cursor: pointer; font-size: 18px; line-height: 1; }',
    '.mp-side { position: absolute; top: 0; left: 0; bottom: 0; z-index: 5; width: min(350px, 94%); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; touch-action: pan-y; padding: 60px 12px 12px; background: rgba(19, 17, 34, 0.97); border-right: 1px solid var(--line); box-shadow: 14px 0 40px rgba(0, 0, 0, 0.5); box-sizing: border-box; }',
    '.mp-side[hidden] { display: none; }',
    '.mp-tools { display: grid; gap: 14px; align-content: start; min-width: 0; max-width: 100%; overflow-x: hidden; }',
    '.mp-tools-host { overflow-x: hidden !important; overscroll-behavior-x: none; touch-action: pan-y; }',
    '.mp-tools h3, .mp-insp h3, .mf h3 { font: 600 12px var(--m-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0; }',
    '.mp-sec { display: grid; gap: 9px; padding-bottom: 14px; border-bottom: 1px solid var(--line); min-width: 0; }',
    '.mp-sec:last-child { border-bottom: 0; }',
    '.mp-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; min-width: 0; }',
    '.mp-row > label { flex: 1 1 110px; display: grid; gap: 3px; font-size: 12px; color: var(--muted); min-width: 0; }',
    '.mp-tools input[type="number"], .mp-tools input[type="text"], .mp-tools select, .mp-insp input[type="number"], .mp-insp input[type="text"], .mp-insp select, .mf input[type="number"] { width: 100%; max-width: 100%; min-width: 0; min-height: 38px; padding: 0 9px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--fg); font: inherit; font-size: 14px; box-sizing: border-box; }',
    '.mp-tools input[type="color"], .mp-insp input[type="color"] { width: 100%; height: 38px; padding: 2px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); box-sizing: border-box; }',
    '.mp-tools input[type="range"], .mp-insp input[type="range"] { width: 100%; accent-color: var(--accent); }',
    '.mp-row > label.mp-chk { display: flex; flex: 1 1 100%; gap: 10px; align-items: center; font-size: 14px; color: var(--fg); }',
    '.mp-tools input[type="checkbox"], .mp-insp input[type="checkbox"] { width: 22px; height: 22px; min-height: 0; margin: 0; padding: 0; flex: none; accent-color: var(--accent); }',
    '.mp-b { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--fg); font: inherit; font-size: 14px; cursor: pointer; max-width: 100%; box-sizing: border-box; }',
    '.mp-b:hover { border-color: var(--muted); }',
    '.mp-b[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }',
    '.mp-b svg { width: 17px; height: 17px; flex: none; }',
    '.mp-b.sq { padding: 0; width: 38px; justify-content: center; }',
    '.mp-b.pri { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 700; }',
    '.mp-b.bad { color: var(--m-bad); }',
    '.mp-b.wide { flex: 1 1 auto; justify-content: center; }',
    '.mp-row > label.mp-b { display: inline-flex; flex: none; gap: 6px; font-size: 14px; color: var(--fg); cursor: pointer; }',
    '.mp-row > label.mp-b.pri { color: var(--accent-ink); }',
    '.mp-seg { display: flex; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }',
    '.mp-seg button { flex: 1; min-height: 38px; border: 0; border-right: 1px solid var(--line); background: var(--bg); color: var(--muted); font: inherit; font-size: 13.5px; cursor: pointer; }',
    '.mp-seg button:last-child { border-right: 0; }',
    '.mp-seg button[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); font-weight: 700; }',
    '.mp-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px; }',
    '.mp-chips .mp-b { justify-content: flex-start; font-size: 13px; padding: 0 9px; min-width: 0; overflow: hidden; white-space: nowrap; }',
    '.mp-sw { width: 14px; height: 14px; border-radius: 4px; flex: none; border: 1px solid rgba(255,255,255,0.3); }',
    '.mp-cols { display: flex; gap: 6px; flex-wrap: wrap; }',
    '.mp-cols button { width: 28px; height: 28px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }',
    '.mp-cols button[aria-pressed="true"] { border-color: var(--fg); }',
    '.mp-hint { font-size: 12.5px; color: var(--muted); line-height: 1.45; margin: 0; }',
    '.mp-stat { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); margin: 0; }',
    '.mp-stat i { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex: none; }',
    '.mp-stat.on i { background: var(--ok, #6EE0A8); box-shadow: 0 0 8px var(--ok, #6EE0A8); }',
    '.mp-stat.on { color: var(--fg); }',
    '.mp-nudge { display: grid; grid-template-columns: repeat(3, 38px); gap: 4px; }',
    '.mp-tk.mine .mp-ring { animation: mp-pulse 2.4s ease-in-out infinite; }',
    '.mp-turn { animation: mp-turn 1.6s ease-in-out infinite; }',
    '@keyframes mp-pulse { 50% { stroke-opacity: 0.35; } }',
    '@keyframes mp-turn { 50% { stroke-opacity: 0.25; } }',
    '@media (prefers-reduced-motion: reduce) { .mp-tk.mine .mp-ring, .mp-turn { animation: none !important; } }',
    '.mf { display: grid; gap: 10px; min-width: 0; }',
    '.mf-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }',
    '.mf-head .r { font: 700 12px var(--m-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); padding: 4px 9px; border-radius: 99px; border: 1px solid var(--accent); }',
    '.mf-now { font-family: var(--m-serif); font-size: 19px; letter-spacing: 0.04em; color: var(--fg); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.mf-now small { display: block; font: 600 12px var(--m-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }',
    '.mf-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }',
    '.mf-it { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 4px 6px 4px 10px; border-radius: 11px; border: 1px solid var(--line); background: var(--surface-2); min-width: 0; }',
    '.mf-it.cur { border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 18px -8px var(--accent); }',
    '.mf-it.out { opacity: 0.5; }',
    '.mf-it.out .mf-n { text-decoration: line-through; }',
    '.mf-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }',
    '.mf-n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14.5px; color: var(--fg); background: none; border: 0; padding: 0; text-align: left; font-family: inherit; cursor: default; }',
    'button.mf-n { cursor: pointer; }',
    '.mf-n small { color: var(--muted); font-size: 12px; margin-left: 6px; }',
    '.mf input.mf-ini { width: 58px; min-height: 34px; text-align: center; font-family: var(--m-mono); padding: 0 4px; flex: none; }',
    '.mf-v { font: 700 14px var(--m-mono); color: var(--fg); min-width: 30px; text-align: center; }',
    '.mf-act { display: inline-flex; gap: 2px; flex: none; }',
    '.mf-act button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--muted); cursor: pointer; font-size: 13px; }',
    '.mf-act button:hover { border-color: var(--line); color: var(--fg); }',
    '.mf-go { display: flex; gap: 6px; }',
    '.mf-c { display: inline-block; margin-left: 5px; padding: 0 5px; border-radius: 6px; font: 700 12px var(--m-mono); line-height: 17px; color: #0A0912; vertical-align: 1px; }',
    '.mp-conds { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 5px; }',
    '.mp-conds button { display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 8px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--muted); font: inherit; font-size: 12.5px; cursor: pointer; text-align: left; min-width: 0; }',
    '.mp-conds button i { width: 10px; height: 10px; border-radius: 50%; flex: none; }',
    '.mp-conds button[aria-pressed="true"] { color: var(--fg); border-color: var(--accent); background: var(--accent-soft); }',
    '.mp-cdur { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--fg); }',
    '.mp-cdur input { width: 70px !important; flex: none; }',
    '.mp-hpbox { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--line); border-radius: 11px; background: var(--bg); }',
    '.mp-hpbox b { font: 700 18px var(--m-mono); }',
    '.mf-go .mp-b.pri { flex: 1; justify-content: center; min-height: 46px; font-size: 15px; }'
  ].join('\n');

  function S(p, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>'; }
  var ICON = {
    hand: S('<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13m0-3.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.8-2.4L4 14.5a1.6 1.6 0 0 1 2.5-2L8 14"/>'),
    ruler: S('<rect x="2.5" y="8" width="19" height="8" rx="1.5" transform="rotate(-30 12 12)"/><path d="M8 13.2 9.2 11M11.4 11.3l1.2-2.1M14.8 9.4l1.2-2.1"/>'),
    fog: S('<path d="M3 9h11M6 13h14M3 17h9M16 17h5M17 9h4"/><path d="M6.5 5.5a4 4 0 0 1 7-1"/>'),
    grid: S('<path d="M3.5 3.5h17v17h-17zM9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>', ' stroke-width="2"'),
    minus: S('<path d="M5 12h14"/>', ' stroke-width="2"'),
    fill: S('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7 9v6M17 9v6"/>'),
    fit: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    me: S('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>'),
    expand: S('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
    shrink: S('<path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7"/>'),
    tools: S('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>'),
    brush: S('<path d="M14.5 4.5l5 5L11 18l-5-5z"/><path d="M6 13c-2 0-3 1.5-3 3.5V20h3.5c2 0 3.5-1 3.5-3"/>'),
    rect: S('<rect x="4" y="5" width="16" height="14" rx="1.5" stroke-dasharray="3 2.5"/>'),
    undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    sword: S('<path d="M14.5 17.5 3.5 6.5v-3h3l11 11M13 19l6-6M16 16l4 4M18.5 21l2.5-2.5"/>'),
    pen: S('<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>'),
    lasso: S('<path d="M12 4c5 0 8.5 2.6 8.5 6.5S17 17 12 17c-1.300 0-2.500-.2-3.600-.5" stroke-dasharray="3 2.500"/><path d="M8.400 16.500C5.500 15.600 3.500 13.300 3.500 10.500 3.500 6.600 7 4 12 4" stroke-dasharray="3 2.500"/><circle cx="7.500" cy="18.500" r="2"/>'),
    circ: S('<circle cx="12" cy="12" r="8" stroke-dasharray="3 2.5"/>'),
    eraser: S('<path d="M8.500 19 4.300 14.800a1.500 1.500 0 0 1 0-2.100l8.400-8.400a1.500 1.500 0 0 1 2.100 0l4.900 4.900a1.500 1.500 0 0 1 0 2.100L12 19zM8 9.500l6.500 6.500M8.500 19H20"/>'),
    point: S('<path d="M5 3.500l13.500 6.800-5.600 1.700-1.700 5.600z"/><path d="M13.500 13.500 19.500 19.500"/>'),
    snd: S('<path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M15.500 9.200a4 4 0 0 1 0 5.600M18 6.700a7.500 7.500 0 0 1 0 10.600"/>'),
    mute: S('<path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>')
  };
  var SELECTOR = '[data-mt],[data-ma],[data-mpre],[data-mn],[data-mc],[data-mfm],[data-mfs],[data-mfz],[data-mgt],[data-mgo],[data-mfa],[data-mfr],[data-mcd],[data-mfoe],[data-mdk],[data-mdf],[data-mdz],[data-mdl]';

  function injectCss() {
    if (document.getElementById('mp-css')) return;
    var s = document.createElement('style'); s.id = 'mp-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ---------- sons do mapa: gravações curtas (pasta sons/, todas em domínio público; ver sons/CREDITOS.txt) ----------
     Cada som tem variações, sorteadas a cada vez, para não soar repetido. [quantas variações, volume] */
  var SMP = { ping: [1, 0.55], move: [5, 0.7], place: [2, 0.55], draw: [4, 0.85], erase: [2, 0.5], turn: [3, 0.8], round: [1, 0.6], fight: [1, 0.7], end: [1, 0.5], reveal: [1, 0.6], down: [1, 0.6] };
  var sCtx = null, sCache = {}, sLast = {};
  function sBuf(ac, key) {
    if (sCtx !== ac) { sCtx = ac; sCache = {}; }
    if (sCache[key]) return sCache[key];
    return (sCache[key] = fetch('sons/' + key + '.mp3?v=4').then(function (r) { if (!r.ok) throw new Error('som'); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { var p = ac.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(function () { /* o erro já chega pelo rej */ }); }); })
      .then(function (b) { sCache[key] = b; return b; })
      .catch(function () { delete sCache[key]; return null; }));
  }
  function sWarm(ac) { Object.keys(SMP).forEach(function (n) { for (var i = 1; i <= SMP[n][0]; i++) sBuf(ac, n + i); }); }
  function sPlay(ac, out, t, name, n) {
    /* uma peça que anda várias casas dá vários passos */
    if (n > 1) { for (var q = 0; q < n; q++) sPlay(ac, out, t + q * 0.17, name, 1); return; }
    var m = SMP[name], i = 1 + Math.floor(Math.random() * m[0]);
    if (m[0] > 1 && i === sLast[name]) i = 1 + (i % m[0]);
    sLast[name] = i;
    var b = sBuf(ac, name + i), t0 = Date.now();
    function go(buf, late) { if (!buf) return; var s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf; s.playbackRate.value = name === 'ping' ? 1 : 0.96 + Math.random() * 0.08; g.gain.value = m[1]; s.connect(g); g.connect(out); s.start(late ? Math.max(ac.currentTime, t) : t); }
    if (b && typeof b.then === 'function') b.then(function (buf) { if (Date.now() - t0 < 450 || t > ac.currentTime) go(buf, true); }); else go(b, false);
  }
  var SFX = {};
  Object.keys(SMP).forEach(function (n) { SFX[n] = function (ac, o, t, k) { sPlay(ac, o, t, n, k); }; });

  function mount(host, ctx) {
    injectCss();
    var spect = !!ctx.spect; /* tela da mesa (TV): a conta é a do Mestre, mas mostra só o que os jogadores veem, sem ferramentas */
    var api = ctx.api, cid = ctx.cid, uid = ctx.uid, owner = !!ctx.owner && !spect, sys = ctx.system || 'dnd5e';
    var sfog = null, sfogFor = '';
    var maps = [], map = null, objs = {}, seq = 0, urls = {}, loads = {};
    var P = null, pImgUrl = '';
    var G = makeGeom({}), FG = null, fog = null, lastGeom = '';
    var tool = 'move', sel = null, ruler = null, drag = null, rdown = null, fstroke = null, frect = null, msgText = '';
    var fogMode = 'show', fogShape = 'brush', fogSize = 1, fogPrev = false, expanded = false, panelOpen = false;
    var fitMode = ctx.spect ? 'fit' : (lsGet('ht-map-fit', 'fill') === 'fit' ? 'fit' : 'fill');
    var view = { x: 0, y: 0, k: 1 }, views = {}, atMin = true;
    var pend = {}, busy = {}, sendT = {}, hpBase = {}, hpT = {};
    var fight = null, fightRev = -1, fightBusy = false;
    var pts = {}, selDraw = false, editOpen = false, hpQty = 1, mode = null, gest = null, timers = [], dead = false, saveT = null, fogT = null, pubT = null, pubBusy = false, pubAgain = false, drawQ = 0, fogQ = 0, tick = 0, lastFull = 0;

    var toolsBox = null, fightBox = ctx.combatEl || null;
    var dk = 'pen', dfx = 'mark', dcol = '#FF8F8F', dsz = 2, dstroke = null, drawn = [];
    var tvF = null, fAnim = 0, voT = 0, voLast = '', pk = {}, pkT = 0, lz = [], lzRaf = 0, lzEl = null, lzOn = false, lzOffT = 0, lzSent = 0;
    var sndOn = lsGet('ht-map-snd', '1') !== '0', sndAc = null, sndOut = null, sndAt = {};
    function sndIo() {
      var a = null; try { a = ctx.audio ? ctx.audio() : null; } catch (e) { a = null; }
      if (a && a.ac && a.out) return a;
      if (ctx.audio) return null;
      if (!sndAc) { try { var AC = window.AudioContext || window.webkitAudioContext; sndAc = new AC(); sndOut = sndAc.createGain(); sndOut.gain.value = 0.8; sndOut.connect(sndAc.destination); } catch (e) { return null; } }
      return { ac: sndAc, out: sndOut };
    }
    function snd(name, n) {
      if (!sndOn || dead || document.hidden || !SFX[name]) return;
      try {
        if (ctx.sndMute && ctx.sndMute()) return;
        var now = Date.now(); if (sndAt[name] && now - sndAt[name] < 110) return; sndAt[name] = now;
        var io = sndIo(); if (!io) return;
        if (sndWarm !== io.ac) { sndWarm = io.ac; sWarm(io.ac); }
        if (io.ac.state !== 'running') { if (io.ac.resume) io.ac.resume().catch(function () { /* espera um toque */ }); return; }
        SFX[name](io.ac, io.out, io.ac.currentTime + 0.02, n);
        if (ctx.onSnd) ctx.onSnd(name);
      } catch (e) { /* som é um extra */ }
    }
    var sndWarm = null;
    function sndPre() { if (!sndOn) return; var io = sndIo(); if (io && sndWarm !== io.ac) { sndWarm = io.ac; sWarm(io.ac); } }
    function sndUnlock() { if (!sndOn) return; if (!ctx.audio) { var io = sndIo(); if (io && io.ac.state === 'suspended') io.ac.resume().catch(function () { /* ok */ }); } sndPre(); }
    document.addEventListener('pointerdown', sndUnlock, true);
    if (ctx.audio) setTimeout(function () { if (!dead) sndPre(); }, 2500);
    host.innerHTML = '<div class="mp' + (ctx.full ? ' full' : '') + (ctx.fill ? ' fill' : '') + (spect ? ' mp-tv' : '') + '"><svg class="mp-svg" xmlns="http://www.w3.org/2000/svg"><defs class="mp-defs"></defs><g class="mp-w"><g class="L-img"></g><g class="L-grid"></g><g class="L-obj"></g><g class="L-fog"></g><g class="L-tok"></g><g class="L-hl"></g><g class="L-rul"></g><g class="L-ping"></g></g></svg>' +
      '<div class="mp-tl"></div><div class="mp-tr"></div><div class="mp-sub" hidden></div><div class="mp-banner" hidden></div><div class="mp-read" hidden></div><div class="mp-insp" hidden></div><div class="mp-empty" hidden></div>' +
      (owner && !ctx.toolsEl ? '<aside class="mp-side" hidden aria-label="Ferramentas do mapa"></aside>' : '') + '</div>';
    var $ = function (s) { return host.querySelector(s); };
    var root = $('.mp'), svg = $('.mp-svg'), W$ = $('.mp-w');
    if (owner) { toolsBox = ctx.toolsEl || $('.mp-side'); if (toolsBox) toolsBox.classList.add('mp-tools-host'); }
    var L = { img: $('.L-img'), grid: $('.L-grid'), obj: $('.L-obj'), fog: $('.L-fog'), tok: $('.L-tok'), hl: $('.L-hl'), rul: $('.L-rul'), ping: $('.L-ping'), defs: $('.mp-defs') };

    /* ---------- rede ---------- */
    async function j(path, opt) { var r = await api(path, opt); if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } if (r.status === 204) return null; var t = await r.text(); return t ? JSON.parse(t) : null; }
    var JH = { 'Content-Type': 'application/json' };
    /* cada mudança do Mestre avisa a tela da mesa, que busca na hora em vez de esperar o próximo ciclo */
    function poked(path) {
      if (!owner || !ctx.onPoke) return;
      var k = /map_pings/.test(path) ? 'p' : (/combats|\/rolls/.test(path) ? 'f' : (/map_views|\/maps\?/.test(path) ? 'v' : (/map_objs|_obj/.test(path) ? 'o' : '')));
      if (!k) return; pk[k] = 1; clearTimeout(pkT);
      pkT = setTimeout(function () { var s = Object.keys(pk).join(''); pk = {}; try { ctx.onPoke(s); } catch (e) { /* ok */ } }, 70);
    }
    function post(path, body, extra) { return j(path, { method: 'POST', headers: Object.assign({}, JH, extra || {}), body: JSON.stringify(body) }).then(function (r) { poked(path); return r; }); }
    function patch(path, body, extra) { return j(path, { method: 'PATCH', headers: Object.assign({}, JH, extra || {}), body: JSON.stringify(body) }).then(function (r) { poked(path); return r; }); }
    function loadUrl(img) {
      if (!img) return Promise.resolve('');
      if (urls[img]) return Promise.resolve(urls[img]);
      if (loads[img]) return loads[img];
      var i = img.indexOf('/');
      loads[img] = Promise.resolve(ctx.imgUrl(img.slice(0, i), img.slice(i + 1))).then(function (u) { urls[img] = u; delete loads[img]; if (!dead) queueDraw(); return u; }, function () { delete loads[img]; return ''; });
      return loads[img];
    }
    function queueDraw() { if (!drawQ) drawQ = requestAnimationFrame(function () { drawQ = 0; drawAll(); }); }

    /* ---------- grade, névoa e limites ---------- */
    function W() { return owner ? num(map && map.cfg && map.cfg.w, 1000) : 0; }
    function H() { return owner ? num(map && map.cfg && map.cfg.h, 1000) : 0; }
    function gcfg() {
      if (owner) { var c = (map && map.cfg) || {}; return { t: c.gt === 'hx' ? 'hx' : 'sq', o: c.go === 'r' ? 'r' : 'c', s: num(c.cell, 70), ox: num(c.ox, 0), oy: num(c.oy, 0), per: num(c.per, 1.5), unit: c.unit || 'm', diag: c.diag || 's', show: c.grid !== false, gcol: c.gcol || '#ffffff', gop: num(c.gop, 0.35) }; }
      return (P && P.view && P.view.g) || {};
    }
    function regeom() {
      var g = gcfg(); G = makeGeom(g);
      if (owner && map) { var rg = G.range(0, 0, W(), H()); FG = { c0: rg[0], r0: rg[1], cols: rg[2] - rg[0] + 1, rows: rg[3] - rg[1] + 1, fs: g.t + g.o + Math.round(g.s * 100) }; }
      else FG = null;
      lastGeom = geomKey();
    }
    function geomKey() { return JSON.stringify(gcfg()) + (owner ? W() + 'x' + H() : JSON.stringify(P && P.view && P.view.crop)); }
    function regeomMaybe() { if (geomKey() !== lastGeom) regeom(); }
    function fidx(c, r) { if (!FG || c < FG.c0 || r < FG.r0 || c >= FG.c0 + FG.cols || r >= FG.r0 + FG.rows) return -1; return (r - FG.r0) * FG.cols + (c - FG.c0); }
    function bit(b, i) { return i >= 0 && ((b[i >> 3] >> (i & 7)) & 1) === 1; }
    function emptyBits() { return new Uint8Array(FG ? Math.ceil(FG.cols * FG.rows / 8) : 0); }
    function readBits(src) {
      var c = (map && map.cfg) || {}, out = emptyBits(), bits = src ? b64d(src) : null;
      if (bits && FG && c.fs === FG.fs) {
        var f0 = Array.isArray(c.f0) ? c.f0 : [FG.c0, FG.r0], oc = num(map.fog_cols, FG.cols), orr = num(map.fog_rows, FG.rows);
        for (var r = 0; r < orr; r++) for (var cc = 0; cc < oc; cc++) if (bit(bits, r * oc + cc)) { var ni = fidx(cc + f0[0], r + f0[1]); if (ni >= 0) out[ni >> 3] |= 1 << (ni & 7); }
      }
      return out;
    }
    /* bits: o que os jogadores veem (publicado); draft: o que o Mestre está preparando, só vai para eles ao salvar */
    function loadFog() {
      var on = !!(map && map.fog);
      fog = { on: on, bits: on ? readBits(map.fog) : emptyBits() };
      fog.draft = on && map.fog_draft ? readBits(map.fog_draft) : fog.bits.slice();
    }
    function pending() { var n = 0; if (!fog || !fog.on) return 0; for (var i = 0; i < fog.bits.length; i++) { var x = fog.bits[i] ^ fog.draft[i]; while (x) { n += x & 1; x >>= 1; } } return n; }
    function shown(c, r) {
      if (owner) { if (!fog || !fog.on) return true; return bit(fog.bits, fidx(c, r)); }
      var pf = P && P.view && P.view.pf; if (!pf) return true;
      var cc = c - pf.c0, rr = r - pf.r0; if (cc < 0 || rr < 0 || cc >= pf.nc || rr >= pf.nr) return false;
      if (!pf._b) pf._b = b64d(pf.b) || new Uint8Array(0);
      return bit(pf._b, rr * pf.nc + cc);
    }
    function setCell(c, r, v) { var i = fidx(c, r), b = fog.draft; if (i < 0) return false; if (bit(b, i) === !!v) return false; if (v) b[i >> 3] |= 1 << (i & 7); else b[i >> 3] &= ~(1 << (i & 7)); return true; }
    function revealedCells(arr) { var out = [], b = arr || (fog && fog.bits); if (!FG || !fog) return out; for (var r = 0; r < FG.rows; r++) for (var c = 0; c < FG.cols; c++) if (bit(b, r * FG.cols + c)) out.push([c + FG.c0, r + FG.r0]); return out; }
    function revealCrop(arr) {
      if (!fog || !fog.on) return [0, 0, W(), H()];
      var rc = revealedCells(arr); if (!rc.length) return null;
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      rc.forEach(function (p) { var b = G.box(p[0], p[1]); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); });
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W(), Math.ceil(x1)); y1 = Math.min(H(), Math.ceil(y1));
      return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
    }
    function bounds() {
      if (!owner) return P && P.view && P.view.crop;
      if (!map) return null;
      if (fogPrev) return revealCrop(fog && fog.draft);
      return [0, 0, W(), H()];
    }
    function cellName(n) { return G.t === 'hx' ? (n === 1 ? 'hexágono' : 'hexágonos') : (n === 1 ? 'quadrado' : 'quadrados'); }
    function dist(sq) { var g = gcfg(), u = g.unit || 'm', per = num(g.per, 1.5); return fmt(sq) + ' ' + cellName(sq) + (u === 'q' ? '' : ' · ' + fmt(sq * per) + ' ' + (UNIT_S[u] || u)); }
    function walked(sq) { var g = gcfg(), u = g.unit || 'm', per = num(g.per, 1.5); return u === 'q' ? fmt(sq) + ' ' + cellName(sq) : fmt(sq * per) + ' ' + (UNIT_S[u] || u) + ' (' + fmt(sq) + ' ' + cellName(sq) + ')'; }
    function rule() { return G.t === 'hx' ? 'h' : (gcfg().diag || 's'); }

    /* ---------- tokens e objetos: onde ficam ---------- */
    function partyRow(u) { return (ctx.party ? ctx.party() : []).filter(function (x) { return x.user_id === u; })[0] || null; }
    function partyOf(u) { var p = partyRow(u); return p ? p.info || {} : {}; }
    function tokSize(d) { return Math.max(0.5, num(d.s, 1)); }
    function tokCenter(d) { var s = tokSize(d); if (G.t === 'hx') return G.center(Math.round(num(d.x, 0)), Math.round(num(d.y, 0))); return [G.ox + (num(d.x, 0) + s / 2) * G.s, G.oy + (num(d.y, 0) + s / 2) * G.s]; }
    function tokRad(d) { var s = tokSize(d); return G.t === 'hx' ? Math.min(G.half[0], G.half[1]) * 0.88 * s : G.s * s / 2 * 0.96; }
    function tokCell(d) { if (G.t === 'hx') return [Math.round(num(d.x, 0)), Math.round(num(d.y, 0))]; var s = tokSize(d); return [Math.round(num(d.x, 0)) + Math.floor(s / 2), Math.round(num(d.y, 0)) + Math.floor(s / 2)]; }
    function objCenter(d) { var s = G.s, x = G.ox + num(d.x, 0) * s, y = G.oy + num(d.y, 0) * s; if (d.sh === 'circle' || d.sh === 'cone') return [x, y]; return [x + num(d.w, 1) * s / 2, y + num(d.h, 1) * s / 2]; }
    function anchorOf(o) { if (o.kind === 'tok') return tokCell(o.data || {}); var c = objCenter(o.data || {}); return G.cellAt(c[0], c[1]); }
    function inShown(o) { var a = anchorOf(o); return shown(a[0], a[1]); }
    function cellIdx(o) { var a = anchorOf(o); return fidx(a[0], a[1]); }
    function visibleNow(o) { if (o.gone) return false; if (owner && fogPrev) return !o.hidden && inShown(o); return true; }
    function tokName(o) { var d = o.data || {}; if (d.n) return d.n; if (o.owner) { var p = partyRow(o.owner); if (p) return (p.info && p.info.c) || p.name || 'Jogador'; } return 'Token'; }
    function tokImg(o) { var d = o.data || {}; if (d.img) return d.img; var p = o.owner ? partyOf(o.owner).p : ''; return p ? 'players/' + p : ''; }
    function tokHp(o) {
      var d = o.data || {};
      if (d.hp && num(d.hp.m, 0) > 0) return (owner || d.hs) ? { v: num(d.hp.v, 0), m: num(d.hp.m, 1) } : null;
      if (o.owner) { var b = partyOf(o.owner).b; if (Array.isArray(b) && b[0] && num(b[0][2], 0) > 0 && (b[0][3] || 'hp') === 'hp') return { v: num(b[0][1], 0), m: num(b[0][2], 1) }; }
      return null;
    }

    /* ---------- desenho ---------- */
    function defsHtml() {
      var c = G.s, b = bounds() || [0, 0, 1, 1];
      return '<pattern id="p-wood" width="' + c * 0.25 + '" height="' + c + '" patternUnits="userSpaceOnUse"><path d="M0 0V' + c + '" stroke="#000" stroke-opacity="0.3" stroke-width="' + c * 0.03 + '"/></pattern>' +
        '<pattern id="p-ice" width="' + c * 0.5 + '" height="' + c * 0.5 + '" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V' + c * 0.5 + '" stroke="#fff" stroke-opacity="0.5" stroke-width="' + c * 0.04 + '"/></pattern>' +
        '<pattern id="p-stone" width="' + c * 0.3 + '" height="' + c * 0.3 + '" patternUnits="userSpaceOnUse"><circle cx="' + c * 0.08 + '" cy="' + c * 0.08 + '" r="' + c * 0.035 + '" fill="#000" fill-opacity="0.35"/><circle cx="' + c * 0.21 + '" cy="' + c * 0.19 + '" r="' + c * 0.025 + '" fill="#fff" fill-opacity="0.25"/></pattern>' +
        '<pattern id="p-water" width="' + c * 0.5 + '" height="' + c * 0.25 + '" patternUnits="userSpaceOnUse"><path d="M0 ' + c * 0.125 + 'Q' + c * 0.125 + ' 0 ' + c * 0.25 + ' ' + c * 0.125 + 'T' + c * 0.5 + ' ' + c * 0.125 + '" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="' + c * 0.03 + '"/>' + drift(c * 0.5, 0, 5) + '</pattern>' +
        '<radialGradient id="p-fire"><stop offset="0" stop-color="#FFF3A0" stop-opacity="0.95"/><stop offset="0.55" stop-color="#FF9A3D" stop-opacity="0.6"/><stop offset="1" stop-color="#FF3D1F" stop-opacity="0.15"/><animate attributeName="r" values="0.5;0.6;0.52;0.57;0.5" dur="1.7s" repeatCount="indefinite"/></radialGradient>' +
        '<pattern id="p-ember" width="' + c * 0.6 + '" height="' + c * 0.6 + '" patternUnits="userSpaceOnUse"><circle cx="' + c * 0.1 + '" cy="' + c * 0.12 + '" r="' + c * 0.028 + '" fill="#FFE9A0" fill-opacity="0.85"/><circle cx="' + c * 0.38 + '" cy="' + c * 0.33 + '" r="' + c * 0.02 + '" fill="#FFD07A" fill-opacity="0.7"/><circle cx="' + c * 0.24 + '" cy="' + c * 0.52 + '" r="' + c * 0.016 + '" fill="#FFF3C0" fill-opacity="0.6"/>' + drift(0, -c * 0.6, 2.4) + '</pattern>' +
        '<pattern id="p-poison" width="' + c * 0.5 + '" height="' + c * 0.5 + '" patternUnits="userSpaceOnUse"><circle cx="' + c * 0.13 + '" cy="' + c * 0.14 + '" r="' + c * 0.06 + '" fill="none" stroke="#E4FFB0" stroke-opacity="0.7" stroke-width="' + c * 0.018 + '"/><circle cx="' + c * 0.36 + '" cy="' + c * 0.33 + '" r="' + c * 0.035 + '" fill="#E4FFB0" fill-opacity="0.45"/><circle cx="' + c * 0.2 + '" cy="' + c * 0.42 + '" r="' + c * 0.02 + '" fill="#E4FFB0" fill-opacity="0.5"/>' + drift(0, -c * 0.5, 4.5) + '</pattern>' +
        '<pattern id="p-dark" width="' + c * 0.6 + '" height="' + c * 0.6 + '" patternUnits="userSpaceOnUse"><circle cx="' + c * 0.12 + '" cy="' + c * 0.15 + '" r="' + c * 0.022 + '" fill="#8B7BFF" fill-opacity="0.35"/><circle cx="' + c * 0.42 + '" cy="' + c * 0.4 + '" r="' + c * 0.016 + '" fill="#5EE1F5" fill-opacity="0.22"/></pattern>' +
        '<radialGradient id="p-light"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="0.6" stop-color="#FFE9A0" stop-opacity="0.3"/><stop offset="1" stop-color="#FFE9A0" stop-opacity="0"/><animate attributeName="r" values="0.5;0.55;0.5" dur="2.6s" repeatCount="indefinite"/></radialGradient>' +
        '<pattern id="p-web" width="' + c * 0.5 + '" height="' + c * 0.5 + '" patternUnits="userSpaceOnUse"><path d="M0 0L' + c * 0.5 + ' ' + c * 0.5 + 'M' + c * 0.5 + ' 0L0 ' + c * 0.5 + 'M' + c * 0.25 + ' 0V' + c * 0.5 + 'M0 ' + c * 0.25 + 'H' + c * 0.5 + '" stroke="#fff" stroke-opacity="0.4" stroke-width="' + c * 0.012 + '"/><circle cx="' + c * 0.25 + '" cy="' + c * 0.25 + '" r="' + c * 0.09 + '" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="' + c * 0.012 + '"/><circle cx="' + c * 0.25 + '" cy="' + c * 0.25 + '" r="' + c * 0.18 + '" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="' + c * 0.012 + '"/></pattern>' +
        '<pattern id="p-mud" width="' + c * 0.6 + '" height="' + c * 0.6 + '" patternUnits="userSpaceOnUse"><ellipse cx="' + c * 0.16 + '" cy="' + c * 0.18 + '" rx="' + c * 0.1 + '" ry="' + c * 0.06 + '" fill="#000" fill-opacity="0.28"/><ellipse cx="' + c * 0.43 + '" cy="' + c * 0.42 + '" rx="' + c * 0.08 + '" ry="' + c * 0.05 + '" fill="#000" fill-opacity="0.22"/><ellipse cx="' + c * 0.4 + '" cy="' + c * 0.14 + '" rx="' + c * 0.04 + '" ry="' + c * 0.025 + '" fill="#fff" fill-opacity="0.1"/></pattern>' +
        '<pattern id="p-smoke" width="' + c * 0.9 + '" height="' + c * 0.9 + '" patternUnits="userSpaceOnUse"><circle cx="' + c * 0.25 + '" cy="' + c * 0.28 + '" r="' + c * 0.2 + '" fill="#fff" fill-opacity="0.13"/><circle cx="' + c * 0.66 + '" cy="' + c * 0.6 + '" r="' + c * 0.16 + '" fill="#fff" fill-opacity="0.1"/><circle cx="' + c * 0.5 + '" cy="' + c * 0.2 + '" r="' + c * 0.1 + '" fill="#000" fill-opacity="0.12"/>' + drift(c * 0.9, 0, 11) + '</pattern>' +
        '<pattern id="p-arcane" width="' + c * 0.6 + '" height="' + c * 0.6 + '" patternUnits="userSpaceOnUse"><path d="' + star(c * 0.15, c * 0.16, c * 0.07) + star(c * 0.43, c * 0.42, c * 0.045) + '" fill="#fff" fill-opacity="0.75"/><circle cx="' + c * 0.45 + '" cy="' + c * 0.12 + '" r="' + c * 0.014 + '" fill="#fff" fill-opacity="0.6"/>' + drift(c * 0.6, -c * 0.6, 7) + '</pattern>' +
        '<pattern id="p-fogm" width="' + c * 0.4 + '" height="' + c * 0.4 + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="' + c * 0.4 + '" height="' + c * 0.4 + '" fill="#05040b" fill-opacity="0.62"/><path d="M0 0V' + c * 0.4 + '" stroke="#8B7BFF" stroke-opacity="0.28" stroke-width="' + c * 0.05 + '"/></pattern>' +
        '<pattern id="p-fogp" width="' + c * 0.6 + '" height="' + c * 0.6 + '" patternUnits="userSpaceOnUse"><rect width="' + c * 0.6 + '" height="' + c * 0.6 + '" fill="#08070f"/><circle cx="' + c * 0.12 + '" cy="' + c * 0.15 + '" r="' + c * 0.02 + '" fill="#8B7BFF" fill-opacity="0.18"/><circle cx="' + c * 0.42 + '" cy="' + c * 0.4 + '" r="' + c * 0.015 + '" fill="#5EE1F5" fill-opacity="0.14"/></pattern>' +
        '<clipPath id="mp-clip"><rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '"/></clipPath>';
    }
    function drift(dx, dy, sec) { return '<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="' + dx + ' ' + dy + '" dur="' + sec + 's" repeatCount="indefinite"/>'; }
    function star(x, y, r) { var q = r * 0.28; return 'M' + x + ' ' + (y - r) + 'L' + (x + q) + ' ' + (y - q) + 'L' + (x + r) + ' ' + y + 'L' + (x + q) + ' ' + (y + q) + 'L' + x + ' ' + (y + r) + 'L' + (x - q) + ' ' + (y + q) + 'L' + (x - r) + ' ' + y + 'L' + (x - q) + ' ' + (y - q) + 'Z'; }
    function drawBase() {
      if (owner ? !map : !P) { L.img.innerHTML = ''; L.grid.innerHTML = ''; L.fog.innerHTML = ''; return; }
      L.defs.innerHTML = defsHtml();
      var g = gcfg(), b = bounds();
      if (owner) {
        var u = map.img ? urls['mapas/' + map.img] : ''; if (map.img && !u) loadUrl('mapas/' + map.img);
        L.img.innerHTML = '<rect width="' + W() + '" height="' + H() + '" fill="#0d0b18"/>' + (u ? '<image href="' + esc(u) + '" width="' + W() + '" height="' + H() + '" preserveAspectRatio="none"/>' : '');
      } else {
        L.img.innerHTML = b ? '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="#08070f"/>' + (pImgUrl ? '<image href="' + esc(pImgUrl) + '" x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" preserveAspectRatio="none"/>' : '') : '';
      }
      var gb = owner ? [0, 0, W(), H()] : b;
      L.grid.innerHTML = g.show !== false && gb ? '<path clip-path="url(#mp-clip)" d="' + G.grid(gb[0], gb[1], gb[0] + gb[2], gb[1] + gb[3]) + '" fill="none" stroke="' + esc(g.gcol || '#ffffff') + '" stroke-opacity="' + clamp(num(g.gop, 0.35), 0.05, 1) + '" stroke-width="1" vector-effect="non-scaling-stroke"/>' : '';
      drawFog();
    }
    function drawFog() {
      var d = '', fill;
      if (owner) {
        if (!map || !fog || !fog.on || !FG) { L.fog.innerHTML = ''; return; }
        var hidden = [], toShow = [], toHide = [];
        for (var r = 0; r < FG.rows; r++) for (var c = 0; c < FG.cols; c++) {
          var i = r * FG.cols + c, dv = bit(fog.draft, i), pv = bit(fog.bits, i), cell = [c + FG.c0, r + FG.r0];
          if (!dv) hidden.push(cell);
          if (!fogPrev && dv && !pv) toShow.push(cell);
          if (!fogPrev && !dv && pv) toHide.push(cell);
        }
        d = cellsPath(hidden); fill = fogPrev ? 'url(#p-fogp)' : 'url(#p-fogm)';
        var pend = (toShow.length ? '<path d="' + cellsPath(toShow) + '" fill="#5EE1F5" fill-opacity="0.16" stroke="#5EE1F5" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>' : '') +
          (toHide.length ? '<path d="' + cellsPath(toHide) + '" fill="#FF8F8F" fill-opacity="0.14" stroke="#FF8F8F" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>' : '');
        L.fog.innerHTML = (d ? '<path clip-path="url(#mp-clip)" d="' + d + '" fill="' + fill + '"/>' : '') + (pend ? '<g clip-path="url(#mp-clip)">' + pend + '</g>' : '');
        return;
      } else {
        var pf = P && P.view && P.view.pf, bb = bounds();
        if (!pf || !bb) { L.fog.innerHTML = ''; return; }
        var open = [];
        for (var rr = 0; rr < pf.nr; rr++) for (var cc = 0; cc < pf.nc; cc++) if (shown(cc + pf.c0, rr + pf.r0)) open.push([cc + pf.c0, rr + pf.r0]);
        d = 'M' + bb[0] + ' ' + bb[1] + 'h' + bb[2] + 'v' + bb[3] + 'h' + (-bb[2]) + 'Z' + cellsPath(open);
        L.fog.innerHTML = '<path clip-path="url(#mp-clip)" fill-rule="evenodd" d="' + d + '" fill="url(#p-fogp)"/>';
        return;
      }
      L.fog.innerHTML = d ? '<path clip-path="url(#mp-clip)" d="' + d + '" fill="' + fill + '"/>' : '';
    }
    function cellsPath(cells) {
      if (!cells.length) return '';
      if (G.t !== 'sq') return cells.map(function (p) { return G.poly(p[0], p[1]); }).join('');
      var rows = {}, d = '';
      cells.forEach(function (p) { (rows[p[1]] = rows[p[1]] || []).push(p[0]); });
      Object.keys(rows).forEach(function (rk) {
        var r = +rk, cs = rows[rk].sort(function (a, b) { return a - b; }), a = cs[0], b = cs[0];
        for (var i = 1; i <= cs.length; i++) {
          if (i < cs.length && cs[i] === b + 1) { b = cs[i]; continue; }
          d += 'M' + (G.ox + a * G.s).toFixed(1) + ' ' + (G.oy + r * G.s).toFixed(1) + 'h' + ((b - a + 1) * G.s).toFixed(1) + 'v' + G.s.toFixed(1) + 'h' + (-(b - a + 1) * G.s).toFixed(1) + 'Z';
          if (i < cs.length) { a = cs[i]; b = cs[i]; }
        }
      });
      return d;
    }
    function dimmed(o) { return owner && !fogPrev && (o.hidden || (fog && fog.on && !inShown(o))); }
    function pathPts(d) { var c = G.s; return String(d.pts || '').split(' ').map(function (q) { var v = q.split(','); return [parseFloat(v[0]) * c, parseFloat(v[1]) * c]; }).filter(function (v) { return isFinite(v[0]) && isFinite(v[1]); }); }
    function objSvg(o) {
      var d = o.data || {}, c = G.s, sh = d.sh || 'rect', col = esc(d.col || '#B07A45'), op = clamp(num(d.op, 1), 0.1, 1), pat = d.pat || 'solid', rot = num(d.rot, 0);
      var x = G.ox + num(d.x, 0) * c, y = G.oy + num(d.y, 0) * c, w = Math.max(0.1, num(d.w, 1)) * c, h = Math.max(0.05, num(d.h, 1)) * c, r = Math.max(0.5, num(d.r, 1)) * c;
      var ovs = pat === 'solid' ? [] : (OVERS[pat] || ['p-' + pat]), tf, geo, base, body, m = c * 0.06, selEl = '';
      var own = ' fill="' + col + '" fill-opacity="' + op + '" stroke="' + col + '" stroke-width="' + c * 0.04 + '"', dark = ' fill="' + col + '" fill-opacity="' + op + '" stroke="' + (d.ed ? col : '#000') + '" stroke-opacity="' + (d.ed ? 0.9 : 0.45) + '" stroke-width="' + c * (d.ed ? 0.04 : 0.03) + '"';
      if (sh === 'path') {
        var ps = pathPts(d), sw = Math.max(0.03, num(d.sw, 0.2)) * c;
        geo = '<path d="' + (ps.length ? 'M' + ps.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + (d.cl ? 'Z' : '') : 'M0 0') + '" stroke-linecap="round" stroke-linejoin="round"';
        tf = 'translate(' + x + ' ' + y + ')';
        if (d.cl) body = geo + ' fill="' + col + '" fill-opacity="' + op + '" stroke="' + col + '" stroke-opacity="0.9" stroke-width="' + c * 0.045 + '"/>' + ovs.map(function (id) { return geo + ' fill="url(#' + id + ')"/>'; }).join('');
        else body = geo + ' fill="none" stroke="#000" stroke-opacity="0" stroke-width="' + Math.max(sw, c * 0.4) + '" pointer-events="stroke"/>' + geo + ' fill="none" stroke="' + col + '" stroke-opacity="' + op + '" stroke-width="' + sw + '"/>' + ovs.map(function (id) { return geo + ' fill="none" stroke="url(#' + id + ')" stroke-width="' + sw + '"/>'; }).join('');
        if (owner && sel === o.id) selEl = '<rect x="' + -m + '" y="' + -m + '" width="' + (w + 2 * m) + '" height="' + (h + 2 * m) + '" fill="none" stroke="#5EE1F5" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>';
        return '<g data-id="' + o.id + '" class="mp-ob" transform="' + tf + '"' + (dimmed(o) ? ' opacity="0.5"' : '') + '>' + body + selEl + '</g>';
      }
      if (sh === 'circle') { tf = 'translate(' + x + ' ' + y + ')'; geo = '<circle r="' + r + '"'; base = own; }
      else if (sh === 'cone') {
        var a = 26.565 * Math.PI / 180, px = r * Math.cos(a), py = r * Math.sin(a);
        tf = 'translate(' + x + ' ' + y + ') rotate(' + rot + ')'; geo = '<path d="M0 0L' + px + ' ' + (-py) + 'A' + r + ' ' + r + ' 0 0 1 ' + px + ' ' + py + 'Z"'; base = own;
      } else if (sh === 'ellipse') { tf = 'translate(' + (x + w / 2) + ' ' + (y + h / 2) + ') rotate(' + rot + ')'; geo = '<ellipse rx="' + w / 2 + '" ry="' + h / 2 + '"'; base = dark; }
      else { tf = 'translate(' + (x + w / 2) + ' ' + (y + h / 2) + ') rotate(' + rot + ')'; geo = '<rect x="' + -w / 2 + '" y="' + -h / 2 + '" width="' + w + '" height="' + h + '" rx="' + Math.min(c * 0.05, h / 3) + '"'; base = dark; }
      body = geo + base + '/>' + ovs.map(function (id) { return geo + ' fill="url(#' + id + ')"/>'; }).join('');
      var lab = d.n && d.lab !== false ? '<text transform="rotate(' + -rot + ')" y="' + c * 0.1 + '" text-anchor="middle" font-size="' + c * 0.26 + '" fill="#fff" stroke="#000" stroke-width="' + c * 0.07 + '" paint-order="stroke" stroke-linejoin="round">' + esc(d.n) + '</text>' : '';
      if (owner && sel === o.id) selEl = (sh === 'circle' || sh === 'cone' ? '<circle r="' + (r + m) + '"' : (sh === 'ellipse' ? '<ellipse rx="' + (w / 2 + m) + '" ry="' + (h / 2 + m) + '"' : '<rect x="' + (-w / 2 - m) + '" y="' + (-h / 2 - m) + '" width="' + (w + 2 * m) + '" height="' + (h + 2 * m) + '"')) + ' fill="none" stroke="#5EE1F5" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>';
      return '<g data-id="' + o.id + '" class="mp-ob" transform="' + tf + '"' + (dimmed(o) ? ' opacity="0.5"' : '') + '>' + body + lab + selEl + '</g>';
    }
    function tokSvg(o, k) {
      var d = o.data || {}, c = G.s, ctr = tokCenter(d), r = tokRad(d), col = esc(d.col || '#5EE1F5');
      var img = tokImg(o), u = img ? urls[img] : '', mine = o.owner === uid && !owner, name = tokName(o);
      if (img && !u) loadUrl(img);
      var face = u ? '<clipPath id="cp' + k + '"><circle r="' + (r - c * 0.04) + '"/></clipPath><image href="' + esc(u) + '" x="' + (-r) + '" y="' + (-r) + '" width="' + 2 * r + '" height="' + 2 * r + '" clip-path="url(#cp' + k + ')" preserveAspectRatio="xMidYMid slice"/>'
        : '<text y="' + r * 0.34 + '" text-anchor="middle" font-size="' + r * 0.9 + '" font-weight="700" fill="' + col + '">' + esc(initials(name)) + '</text>';
      var x2 = d.dead ? '<path d="M' + -r * 0.55 + ' ' + -r * 0.55 + 'L' + r * 0.55 + ' ' + r * 0.55 + 'M' + r * 0.55 + ' ' + -r * 0.55 + 'L' + -r * 0.55 + ' ' + r * 0.55 + '" stroke="#FF5A5A" stroke-width="' + c * 0.09 + '" stroke-linecap="round"/>' : '';
      var hp = tokHp(o), hpEl = '';
      if (hp) { var f = clamp(hp.v / hp.m, 0, 1), bw = r * 1.6; hpEl = '<rect x="' + -bw / 2 + '" y="' + (r - c * 0.06) + '" width="' + bw + '" height="' + c * 0.11 + '" rx="' + c * 0.05 + '" fill="#000" fill-opacity="0.75"/><rect x="' + -bw / 2 + '" y="' + (r - c * 0.06) + '" width="' + bw * f + '" height="' + c * 0.11 + '" rx="' + c * 0.05 + '" fill="' + (f <= 0.25 ? '#FF6B6B' : (f <= 0.5 ? '#FFB86B' : '#6EE0A8')) + '"/>'; }
      var short = name.length > 11 ? name.split(/[\s,;.]+/)[0].slice(0, 12) : name;
      var nm = name && d.lab !== false ? '<text y="' + (r + c * (hp ? 0.36 : 0.28)) + '" text-anchor="middle" font-size="' + c * 0.25 + '" fill="#fff" stroke="#000" stroke-width="' + c * 0.07 + '" paint-order="stroke" stroke-linejoin="round"><title>' + esc(name) + '</title>' + esc(short) + '</text>' : '';
      var seld = owner && sel === o.id ? '<circle r="' + (r + c * 0.08) + '" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>' : '';
      var cs = Array.isArray(d.cond) ? d.cond.filter(function (x) { return CONDM[x.k]; }) : [], badges = '';
      cs.slice(0, 4).forEach(function (x, i) {
        var an = (-60 + i * 32) * Math.PI / 180, br = c * 0.13, bx = Math.cos(an) * (r + br * 0.2), by = Math.sin(an) * (r + br * 0.2);
        badges += '<g transform="translate(' + bx.toFixed(1) + ' ' + by.toFixed(1) + ')"><title>' + esc(CONDM[x.k][1] + (x.r ? ' · ' + x.r + ' rodada(s)' : '')) + '</title><circle r="' + br + '" fill="' + CONDM[x.k][2] + '" stroke="#0A0912" stroke-width="' + c * 0.025 + '"/><text y="' + br * 0.36 + '" text-anchor="middle" font-size="' + br * 0.95 + '" font-weight="700" fill="#0A0912">' + esc(condAb(x.k)) + '</text></g>';
      });
      if (cs.length > 4) badges += '<text x="' + (r * 0.95) + '" y="' + (r * 0.2) + '" font-size="' + c * 0.2 + '" font-weight="700" fill="#fff" stroke="#000" stroke-width="' + c * 0.05 + '" paint-order="stroke">+' + (cs.length - 4) + '</text>';
      seld += badges;
      return '<g data-id="' + o.id + '" class="mp-tk' + (mine ? ' mine' : '') + '" transform="translate(' + ctr[0].toFixed(2) + ' ' + ctr[1].toFixed(2) + ')"' + (dimmed(o) ? ' opacity="0.5"' : '') + '>' +
        '<circle r="' + (r - c * 0.01) + '" fill="#131122"/>' + face + x2 +
        '<circle class="mp-ring" r="' + (r - c * 0.03) + '" fill="none" stroke="' + col + '" stroke-width="' + Math.max(2, c * 0.065) + '"' + (o.hidden ? ' stroke-dasharray="6 4"' : '') + '/>' + hpEl + nm + seld + '</g>';
    }
    function allObjs() { return Object.keys(objs).map(function (k) { return objs[k]; }); }
    function drawObjs() {
      if (dead) return;
      if (mode === 'drag' || mode === 'tap') { selDraw = true; return; }
      var list = allObjs().filter(visibleNow).sort(function (a, b) { return a.seq - b.seq; });
      L.obj.innerHTML = list.filter(function (o) { return o.kind === 'obj'; }).map(objSvg).join('');
      var k = 0;
      L.tok.innerHTML = list.filter(function (o) { return o.kind === 'tok'; }).map(function (o) { return tokSvg(o, k++); }).join('');
      if (drag && drag.id && drag.started) { var g = svg.querySelector('[data-id="' + drag.id + '"]'); if (g) g.setAttribute('opacity', '0.8'); }
      drawHl();
    }
    function curEntry() { if (!fight || !fight.on || fight.phase !== 'go') return null; return (fight.list || [])[fight.turn] || null; }
    function drawHl() {
      var e = curEntry(), h = '';
      if (e && objs[e.k] && visibleNow(objs[e.k])) {
        var d = objs[e.k].data || {}, c = tokCenter(d), r = tokRad(d) + G.s * 0.14;
        h = '<g transform="translate(' + c[0] + ' ' + c[1] + ')"><circle class="mp-turn" r="' + r + '" fill="none" stroke="#5EE1F5" stroke-width="4" vector-effect="non-scaling-stroke"/><path d="M0 ' + (-r - G.s * 0.06) + 'l' + (-G.s * 0.14) + ' ' + (-G.s * 0.2) + 'h' + G.s * 0.28 + 'z" fill="#5EE1F5"/></g>';
      }
      L.hl.innerHTML = h;
      banner();
    }
    function drawRuler() {
      var rd = $('.mp-read'), h = '';
      if (frect) {
        var a = frect.a, b = frect.b, col = fogMode === 'show' ? '#5EE1F5' : '#8B7BFF';
        h = '<rect x="' + Math.min(a[0], b[0]) + '" y="' + Math.min(a[1], b[1]) + '" width="' + Math.abs(a[0] - b[0]) + '" height="' + Math.abs(a[1] - b[1]) + '" fill="' + col + '" fill-opacity="0.15" stroke="' + col + '" stroke-width="2" stroke-dasharray="8 5" vector-effect="non-scaling-stroke"/>';
      }
      if (dstroke) {
        var dd = drawData(), dc = esc(dd.col), da = dstroke.a, db = dstroke.b, dash = ' stroke="' + dc + '" stroke-width="2" stroke-dasharray="8 5" vector-effect="non-scaling-stroke"';
        if (dstroke.k === 'rect') { var rr0 = rectOf(da, db); h += '<rect x="' + (G.ox + rr0[0] * G.s) + '" y="' + (G.oy + rr0[1] * G.s) + '" width="' + rr0[2] * G.s + '" height="' + rr0[3] * G.s + '" fill="' + dc + '" fill-opacity="0.2"' + dash + '/>'; }
        else if (dstroke.k === 'circle') { var cc0 = circOf(da, db); h += '<circle cx="' + (G.ox + cc0[0] * G.s) + '" cy="' + (G.oy + cc0[1] * G.s) + '" r="' + cc0[2] * G.s + '" fill="' + dc + '" fill-opacity="0.2"' + dash + '/>'; }
        else { var pl = dstroke.pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
          h += dstroke.k === 'area' ? '<polygon points="' + pl + '" fill="' + dc + '" fill-opacity="0.22"' + dash + ' stroke-linejoin="round"/>' : '<polyline points="' + pl + '" fill="none" stroke="' + dc + '" stroke-opacity="0.9" stroke-width="' + DSW[dsz - 1] * G.s + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
      }
      if (ruler && ruler.pts.length) {
        var ps = ruler.pts.map(function (p) { return G.center(p[0], p[1]); });
        h += '<polyline points="' + ps.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#5EE1F5" stroke-width="3" stroke-dasharray="9 6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
        ps.forEach(function (p, i) { h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i ? 5 : 7) + '" fill="' + (i ? '#0A0912' : '#5EE1F5') + '" stroke="#5EE1F5" stroke-width="2" vector-effect="non-scaling-stroke"/>'; });
        var t = 0; for (var i = 1; i < ruler.pts.length; i++) t += G.dist(ruler.pts[i - 1], ruler.pts[i], rule());
        rd.hidden = false; rd.textContent = dist(t);
      } else { rd.hidden = !msgText; rd.textContent = msgText; }
      L.rul.innerHTML = h;
    }
    function drawAll() { regeomMaybe(); drawBase(); drawObjs(); drawRuler(); }
    function applyView() { W$.setAttribute('transform', 'translate(' + view.x.toFixed(2) + ' ' + view.y.toFixed(2) + ') scale(' + view.k.toFixed(5) + ')'); if (owner && ctx.onView) viewOut(); }
    /* o Mestre conta que trecho do mapa está na tela dele; a tela da mesa enquadra o mesmo trecho */
    function viewOut() {
      if (voT) return;
      voT = setTimeout(function () {
        voT = 0; if (!map || dead) return;
        var v = vp(); if (!v[0] || !v[1]) return;
        var a = toWorld(0, 0), b = toWorld(v[0], v[1]), m = { map: map.id, full: !!atMin, r: [Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1])] }, sg = JSON.stringify(m);
        if (sg === voLast) return; voLast = sg;
        try { ctx.onView(m); } catch (e) { /* ok */ }
      }, 90);
    }
    function focusTarget() {
      var Lm = limits(); if (!Lm || !tvF || tvF.full || !tvF.r || !P || tvF.map !== P.map_id || !(tvF.r[2] > 0) || !(tvF.r[3] > 0)) return null;
      var r = tvF.r, v = Lm.v, k = clamp(Math.min(v[0] / r[2], v[1] / r[3]), Lm.minK, Lm.maxK);
      return { k: k, x: v[0] / 2 - (r[0] + r[2] / 2) * k, y: v[1] / 2 - (r[1] + r[3] / 2) * k };
    }
    function applyFocus(anim) {
      cancelAnimationFrame(fAnim);
      var from = { x: view.x, y: view.y, k: view.k }, t = focusTarget();
      if (t) { view.k = t.k; view.x = t.x; view.y = t.y; clampView(); } else fit();
      var to = { x: view.x, y: view.y, k: view.k }, min = !t, v = vp();
      atMin = min;
      if (!anim || !v[0] || (Math.abs(from.k - to.k) < 1e-6 && Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5)) { applyView(); return; }
      var ca = [(v[0] / 2 - from.x) / from.k, (v[1] / 2 - from.y) / from.k], cb = [(v[0] / 2 - to.x) / to.k, (v[1] / 2 - to.y) / to.k], t0 = performance.now();
      (function step(n) {
        var q = Math.min(1, (n - t0) / 320), e = 1 - Math.pow(1 - q, 3), k = from.k * Math.pow(to.k / from.k, e);
        view.k = k; view.x = v[0] / 2 - (ca[0] + (cb[0] - ca[0]) * e) * k; view.y = v[1] / 2 - (ca[1] + (cb[1] - ca[1]) * e) * k;
        if (q >= 1) { view.x = to.x; view.y = to.y; view.k = to.k; }
        applyView(); if (q < 1) fAnim = requestAnimationFrame(step);
      })(t0);
    }

    /* ---------- enquadramento: preencher ou inteiro; o mapa nunca sai da tela ---------- */
    function vp() { var r = svg.getBoundingClientRect(); return [r.width, r.height]; }
    function limits() {
      var b = bounds(), v = vp(); if (!b || !v[0] || !v[1] || !b[2] || !b[3]) return null;
      var kx = v[0] / b[2], ky = v[1] / b[3], minK = fitMode === 'fill' ? Math.max(kx, ky) : Math.min(kx, ky);
      minK = Math.min(minK, Math.max(Math.min(kx, ky), Math.min(v[0], v[1]) / (G.s * 3)));  /* área pequena: no máximo 3 casas no lado menor da tela */
      return { b: b, v: v, minK: minK, maxK: spect ? Math.max(minK * 14, 1.2 * Math.min(v[0], v[1]) / G.s) : Math.max(minK * 4, 0.9 * Math.min(v[0], v[1]) / G.s) };
    }
    function slack() {
      var sr = svg.getBoundingClientRect(), t = 0, bt = 0;
      [$('.mp-tl'), $('.mp-tr'), $('.mp-sub')].forEach(function (el) { if (el && !el.hidden && el.firstChild) { var r = el.getBoundingClientRect(); t = Math.max(t, r.bottom - sr.top + 6); } });
      var bn = $('.mp-banner'); if (bn && !bn.hidden) { var r2 = bn.getBoundingClientRect(); bt = Math.max(0, sr.bottom - r2.top + 6); }
      return { t: Math.min(t, sr.height * 0.3), b: Math.min(bt, sr.height * 0.2) };
    }
    function clampView() {
      var Lm = limits(); if (!Lm) return;
      var b = Lm.b, v = Lm.v, sk = slack();
      view.k = clamp(view.k, Lm.minK, Lm.maxK); atMin = view.k <= Lm.minK * 1.001;
      var w = b[2] * view.k, h = b[3] * view.k;
      view.x = w >= v[0] - 0.5 ? clamp(view.x, v[0] - (b[0] + b[2]) * view.k, -b[0] * view.k) : (v[0] - w) / 2 - b[0] * view.k;
      view.y = h >= v[1] - 0.5 ? clamp(view.y, v[1] - (b[1] + b[3]) * view.k - sk.b, -b[1] * view.k + sk.t) : (v[1] - h) / 2 - b[1] * view.k;
    }
    function fit() { var Lm = limits(); if (!Lm) return; view.k = Lm.minK; view.x = (Lm.v[0] - Lm.b[2] * view.k) / 2 - Lm.b[0] * view.k; view.y = (Lm.v[1] - Lm.b[3] * view.k) / 2 - Lm.b[1] * view.k; clampView(); applyView(); atMin = true; }
    function toWorld(px, py) { return [(px - view.x) / view.k, (py - view.y) / view.k]; }
    function zoomAt(f, px, py) { var w = toWorld(px, py); view.k = view.k * f; var Lm = limits(); if (Lm) view.k = clamp(view.k, Lm.minK, Lm.maxK); view.x = px - w[0] * view.k; view.y = py - w[1] * view.k; clampView(); applyView(); }
    function rel(e) { var r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function size() {
      if (ctx.full || ctx.fill || expanded) return;
      var top = root.getBoundingClientRect().top, h = Math.max(320, window.innerHeight - top - (ctx.reserve ? ctx.reserve() : 0) - 12);
      if (Math.abs(parseFloat(root.style.height) - h) > 1 || !root.style.height) root.style.height = h + 'px';
    }
    var lastVp = '';
    function onResize() {
      size();
      var v = vp(), k = Math.round(v[0]) + 'x' + Math.round(v[1]);
      root.classList.toggle('mp-narrow', v[0] < (owner ? 900 : 720)); root.classList.toggle('mp-tiny', v[0] < 480);
      if (k === lastVp) return; lastVp = k;
      if (spect && tvF) applyFocus(false); else if (atMin) fit(); else { clampView(); applyView(); }
    }

    /* ---------- barras e painéis ---------- */
    function fb(attrs, icon, label, pressed, cls) { return '<button type="button" class="mp-fb' + (cls ? ' ' + cls : '') + (label ? '' : ' sq') + '" ' + attrs + (pressed != null ? ' aria-pressed="' + !!pressed + '"' : '') + (label ? ' title="' + esc(label) + '"' : '') + '>' + icon + (label ? '<span class="lb">' + esc(label) + '</span>' : '') + '</button>'; }
    function bars() {
      var tl = '<div class="mp-grp" role="group" aria-label="Ferramentas">' + fb('data-mt="move"', ICON.hand, 'Mover', tool === 'move') + fb('data-mt="point"', ICON.point, 'Apontar', tool === 'point') + fb('data-mt="ruler"', ICON.ruler, 'Régua', tool === 'ruler') + (owner ? fb('data-mt="draw"', ICON.pen, 'Desenhar', tool === 'draw') + fb('data-mt="fog"', ICON.fog, 'Névoa', tool === 'fog') : '') + '</div>';
      if (owner && !ctx.toolsEl) tl += '<div class="mp-grp">' + fb('data-ma="panel"', ICON.tools, 'Ferramentas', panelOpen) + '</div>';
      var tr = '<div class="mp-grp" role="group" aria-label="Enquadramento">' + fb('data-ma="fitmode" aria-label="' + (fitMode === 'fill' ? 'Preenchendo o espaço. Tocar para ver o mapa inteiro' : 'Mapa inteiro. Tocar para preencher o espaço') + '"', fitMode === 'fill' ? ICON.fill : ICON.fit, fitMode === 'fill' ? 'Preencher' : 'Inteiro', null) + fb('data-ma="zout" aria-label="Menos zoom"', ICON.minus, '', null) + fb('data-ma="zin" aria-label="Mais zoom"', ICON.plus, '', null) + '</div>' +
        '<div class="mp-grp">' + (!owner ? fb('data-ma="me"', ICON.me, 'Meu personagem', null) : '') + fb('data-ma="snd" aria-label="' + (sndOn ? 'Sons do mapa ligados. Tocar para silenciar' : 'Sons do mapa desligados. Tocar para ligar') + '"', sndOn ? ICON.snd : ICON.mute, '', null) + fb('data-ma="expand" aria-label="' + (expanded ? 'Sair da tela cheia' : 'Tela cheia') + '"', expanded ? ICON.shrink : ICON.expand, '', expanded) + '</div>';
      $('.mp-tl').innerHTML = tl; $('.mp-tr').innerHTML = tr;
      var sub = $('.mp-sub');
      if (owner && tool === 'fog' && map) {
        sub.hidden = false;
        sub.innerHTML = !fog || !fog.on
          ? '<span class="mp-note">A névoa está desligada neste mapa.</span><div class="mp-grp">' + fb('data-ma="fogon"', ICON.fog, 'Ligar a névoa', null, 'hot') + '</div>'
          : '<div class="mp-grp">' + fb('data-mfm="show"', ICON.eye, 'Revelar', fogMode === 'show') + fb('data-mfm="hide"', ICON.fog, 'Esconder', fogMode === 'hide') + '</div>' +
            '<div class="mp-grp">' + fb('data-mfs="brush"', ICON.brush, 'Pincel', fogShape === 'brush') + fb('data-mfs="rect"', ICON.rect, 'Área', fogShape === 'rect') + '</div>' +
            (fogShape === 'brush' ? '<div class="mp-grp" role="group" aria-label="Tamanho do pincel">' + [1, 2, 3].map(function (n) { return fb('data-mfz="' + n + '" aria-label="Pincel tamanho ' + n + '"', '<b style="font:700 13px var(--m-mono)">' + n + '</b>', '', fogSize === n); }).join('') + '</div>' : '') +
            '<div class="mp-grp">' + fb('data-ma="fogprev"', ICON.eye, 'Prévia', fogPrev) + '</div>' +
            (pending() ? '<div class="mp-grp">' + fb('data-ma="fogsave"', ICON.eye, 'Salvar para os jogadores (' + pending() + ')', null, 'hot') + fb('data-ma="fogundo"', ICON.undo, 'Desfazer', null) + '</div>' : '<span class="mp-note">Os jogadores já veem isto.</span>');
      } else if (owner && tool === 'draw' && map) {
        sub.hidden = false;
        var sw = function (c2) { return '<i class="mp-sw" style="background:' + c2 + '"></i>'; };
        sub.innerHTML = '<div class="mp-grp" role="group" aria-label="O que desenhar">' + fb('data-mdk="pen"', ICON.pen, 'Traço', dk === 'pen') + fb('data-mdk="area"', ICON.lasso, 'Área livre', dk === 'area') + fb('data-mdk="rect"', ICON.rect, 'Retângulo', dk === 'rect') + fb('data-mdk="circle"', ICON.circ, 'Círculo', dk === 'circle') + fb('data-mdk="erase"', ICON.eraser, 'Apagar', dk === 'erase') + '</div>' +
          (dk === 'pen' ? '<div class="mp-grp" role="group" aria-label="Espessura do traço">' + [1, 2, 3].map(function (n) { return fb('data-mdz="' + n + '" aria-label="Espessura ' + n + '"', '<b class="mp-dot" style="width:' + (4 + n * 4) + 'px;height:' + (4 + n * 4) + 'px"></b>', '', dsz === n); }).join('') + '</div>' : '') +
          (dk !== 'erase' ? '<div class="mp-grp mp-fxs" role="group" aria-label="Efeito">' + FX.map(function (f) { return fb('data-mdf="' + f[0] + '"', sw(f[0] === 'mark' ? dcol : f[2]), f[1], dfx === f[0]); }).join('') + '</div>' +
            (dfx === 'mark' ? '<div class="mp-grp" role="group" aria-label="Cor da marca">' + COLORS.map(function (cl) { return fb('data-mdl="' + cl + '" aria-label="Cor ' + cl + '"', sw(cl), '', dcol.toLowerCase() === cl.toLowerCase()); }).join('') + '</div>' : '') : '') +
          (drawn.length ? '<div class="mp-grp">' + fb('data-ma="dundo"', ICON.undo, 'Desfazer', null) + '</div>' : '');
      } else sub.hidden = true;
      root.classList.toggle('mp-narrow', vp()[0] < (owner ? 900 : 720)); root.classList.toggle('mp-tiny', vp()[0] < 480); root.classList.toggle('mp-own', owner);
    }
    function entName(e) { if (e.h && !owner) return '???'; var o = objs[e.k]; if (o) return tokName(o); return e.n || 'Alguém'; }
    function banner() {
      var b = $('.mp-banner'), e = curEntry();
      if (!e) { b.hidden = true; return; }
      var mine = e.u && e.u === uid && !owner, dh = sys === 'daggerheart';
      b.hidden = false; b.classList.toggle('mine', !!mine);
      b.innerHTML = (dh ? '<span class="r">Holofote</span>' : '<span class="r">Rodada ' + (fight.round || 1) + '</span>') + '<b>' + esc(mine ? 'Sua vez · ' + entName(e) : (dh ? entName(e) : 'Vez de ' + entName(e))) + '</b>';
    }
    function empty() {
      var e = $('.mp-empty'), show = function (h) { e.hidden = false; e.innerHTML = h; };
      if (owner) { if (map) { e.hidden = true; return; } show('<b>Nenhum mapa ainda</b><span>' + (ctx.toolsEl ? 'Na aba Mapa, ao lado, envie a imagem de um mapa.' : 'Abra as Ferramentas e envie a imagem de um mapa.') + ' A grade é desenhada por cima.</span>'); return; }
      if (!P) { show('<b>Sem mapa na mesa</b><span>O Mestre ainda não mostrou um mapa.</span>'); return; }
      if (!P.view || !P.view.crop) { show('<b>Tudo na escuridão</b><span>O Mestre ainda não revelou nenhuma parte deste mapa.</span>'); return; }
      if (!P.pimg) { show('<b>Preparando o mapa…</b><span>O Mestre está terminando de montar esta área.</span>'); return; }
      if (!pImgUrl) { show('<b>Carregando o mapa…</b>'); return; }
      e.hidden = true;
    }
    function selObj() { return sel && objs[sel] && !objs[sel].gone ? objs[sel] : null; }
    function acrossOf() { var g = gcfg(); if (g.t !== 'hx' || g.o === 'r') return W() / G.s; return (W() - 2 * G.R) / (1.5 * G.R) + 1; }
    function cellFromAcross(n) { var g = gcfg(); n = clamp(n, 3, 400); if (g.t !== 'hx' || g.o === 'r') return W() / n; return W() / (1.5 * (n - 1) + 2) * SQ3; }
    function panel() {
      if (!owner || !toolsBox) return;
      if (!ctx.toolsEl) { toolsBox.hidden = !panelOpen; root.classList.toggle('panel-open', panelOpen); }
      var c = (map && map.cfg) || {}, g = gcfg(), h = '<div class="mp-tools">';
      h += '<div class="mp-sec"><h3>Mapa</h3><div class="mp-row"><label>Mapa da mesa<select data-mf="map">' + (maps.length ? maps.map(function (m) { return '<option value="' + m.id + '"' + (map && map.id === m.id ? ' selected' : '') + '>' + esc(m.name) + (m.shown ? ' · na mesa' : '') + '</option>'; }).join('') : '<option value="">Nenhum</option>') + '</select></label></div>' +
        (map ? '<p class="mp-stat' + (map.shown ? ' on' : '') + '"><i></i>' + (map.shown ? 'Os jogadores estão vendo este mapa' + (fog && fog.on ? ', só a parte revelada.' : '.') : 'Só você vê este mapa.') + '</p>' : '') +
        '<div class="mp-row">' + (map ? '<button type="button" class="mp-b' + (map.shown ? '' : ' pri') + ' wide" data-ma="shown">' + (map.shown ? 'Esconder dos jogadores' : 'Mostrar aos jogadores') + '</button>' : '') +
        '<label class="mp-b' + (map ? '' : ' pri') + '">' + ICON.plus + '<span>Novo mapa</span><input type="file" accept="image/*" data-mf="newmap" hidden></label></div>' +
        (map && ctx.scene ? '<div class="mp-row"><label class="mp-chk"><input type="checkbox" data-mf="slink"' + (ctx.scene.mapId() === map.id ? ' checked' : '') + '> Abrir este mapa na cena “' + esc(ctx.scene.name()) + '”</label></div>' : '') +
        (map ? '<div class="mp-row"><label>Nome<input type="text" data-mf="mname" maxlength="80" value="' + esc(map.name) + '"></label></div><div class="mp-row"><button type="button" class="mp-b bad" data-ma="delmap">Apagar este mapa</button></div>' : '') + '</div>';
      if (map) {
        var hx = g.t === 'hx';
        h += '<div class="mp-sec"><h3>Grade</h3><div class="mp-seg" role="group" aria-label="Tipo de grade"><button type="button" data-mgt="sq" aria-pressed="' + !hx + '">Quadrados</button><button type="button" data-mgt="hx" aria-pressed="' + hx + '">Hexágonos</button></div>' +
          (hx ? '<div class="mp-seg" role="group" aria-label="Orientação dos hexágonos"><button type="button" data-mgo="c" aria-pressed="' + (g.o !== 'r') + '">Em colunas</button><button type="button" data-mgo="r" aria-pressed="' + (g.o === 'r') + '">Em linhas</button></div>' : '') +
          '<div class="mp-row"><label>' + (hx ? 'Hexágonos' : 'Quadrados') + ' na largura<input type="number" min="3" max="400" step="1" data-mf="cols" value="' + plain(acrossOf()) + '"></label><label>Tamanho (px)<input type="number" min="4" max="1000" step="0.5" data-mf="cell" value="' + plain(G.s) + '"></label></div>' +
          '<div class="mp-row"><div class="mp-nudge"><span></span><button type="button" class="mp-b sq" data-mn="0,-1" aria-label="Grade para cima">▲</button><span></span><button type="button" class="mp-b sq" data-mn="-1,0" aria-label="Grade para a esquerda">◀</button><button type="button" class="mp-b sq" data-mn="0,1" aria-label="Grade para baixo">▼</button><button type="button" class="mp-b sq" data-mn="1,0" aria-label="Grade para a direita">▶</button></div>' +
          '<div style="flex:1 1 140px;display:grid;gap:6px;min-width:0"><button type="button" class="mp-b" data-mt="grid" aria-pressed="' + (tool === 'grid') + '">' + ICON.grid + 'Alinhar arrastando</button><p class="mp-hint">Ajuste fino: 1 px por toque.</p></div></div>' +
          '<div class="mp-row"><label>Cada ' + (hx ? 'hexágono' : 'quadrado') + ' vale<input type="number" min="0.1" step="0.5" data-mf="per" value="' + num(c.per, 1.5) + '"></label><label>Unidade<select data-mf="unit">' + UNITS.map(function (u) { return '<option value="' + u[0] + '"' + ((c.unit || 'm') === u[0] ? ' selected' : '') + '>' + u[1] + '</option>'; }).join('') + '</select></label></div>' +
          (hx ? '' : '<div class="mp-row"><label>Diagonais<select data-mf="diag"><option value="s"' + (c.diag !== 'a' && c.diag !== 'r' ? ' selected' : '') + '>contam 1 quadrado</option><option value="a"' + (c.diag === 'a' ? ' selected' : '') + '>alternadas (1, 2, 1…)</option><option value="r"' + (c.diag === 'r' ? ' selected' : '') + '>reais (em linha reta)</option></select></label></div>') +
          '<div class="mp-row"><label class="mp-chk"><input type="checkbox" data-mf="gshow"' + (c.grid !== false ? ' checked' : '') + '> Mostrar a grade</label></div>' +
          '<div class="mp-row"><label>Cor da grade<input type="color" data-mf="gcol" value="' + esc(c.gcol || '#ffffff') + '"></label><label>Força<input type="range" min="0.05" max="1" step="0.05" data-mf="gop" value="' + clamp(num(c.gop, 0.35), 0.05, 1) + '"></label></div></div>';
        h += '<div class="mp-sec"><h3>Névoa de guerra</h3><div class="mp-row"><label class="mp-chk"><input type="checkbox" data-mf="fogon"' + (fog && fog.on ? ' checked' : '') + '> Usar névoa neste mapa</label></div>' +
          (fog && fog.on ? '<p class="mp-hint">Com a ferramenta Névoa, revele com o pincel ou marcando uma área. Nada muda para os jogadores até você tocar em Salvar: em azul, o que vai aparecer; em vermelho, o que vai sumir. Eles recebem só o pedaço revelado, recortado, e os tokens na escuridão ficam escondidos.</p><div class="mp-row"><button type="button" class="mp-b" data-ma="fogall">Revelar tudo</button><button type="button" class="mp-b" data-ma="fognone">Esconder tudo</button><button type="button" class="mp-b" data-ma="fogprev" aria-pressed="' + fogPrev + '">' + ICON.eye + 'Prévia</button></div>' + (pending() ? '<div class="mp-row"><button type="button" class="mp-b pri wide" data-ma="fogsave">Salvar para os jogadores (' + pending() + ')</button><button type="button" class="mp-b" data-ma="fogundo">Desfazer</button></div>' : '<p class="mp-stat on"><i></i>Os jogadores já veem a névoa como está.</p>')
            : '<p class="mp-hint">Ligue para começar com o mapa todo escondido e ir revelando aos poucos.</p>') + '</div>';
        h += '<div class="mp-sec"><h3>Adicionar ao mapa</h3><div class="mp-chips">' + PRESETS.map(function (pr, i) { return '<button type="button" class="mp-b" data-mpre="' + i + '"><i class="mp-sw" style="background:' + pr.col + '"></i>' + esc(pr.n) + '</button>'; }).join('') + '</div>' +
          '<div class="mp-row"><button type="button" class="mp-b" data-ma="addtok">' + ICON.plus + 'Token novo</button><button type="button" class="mp-b" data-ma="addpl">Jogadores no mapa</button></div>' + foesHtml() + '</div>';
      }
      toolsBox.innerHTML = h + '</div>';
    }
    function foesHtml() {
      var fs = ctx.foes ? ctx.foes() : [];
      if (!fs.length) return '<p class="mp-hint">Os adversários que você cria em Preparar aparecem aqui para pôr no mapa.</p>';
      return '<h3 style="margin-top:4px">Adversários da aventura</h3><div class="mp-chips">' + fs.map(function (f, i) { return '<button type="button" class="mp-b" data-mfoe="' + i + '" title="' + esc(f.n + (f.scene ? ' · ' + f.scene : '')) + '"><i class="mp-sw" style="background:#FF8F8F"></i>' + esc(f.n) + (f.mins > 0 ? ' ×' + f.mins : '') + '</button>'; }).join('') + '</div><p class="mp-hint">Toque para pôr no mapa, já com a vida e numerados. Grupos de lacaios entram todos de uma vez.</p>';
    }
    function colRow(cur) { return '<div class="mp-cols">' + COLORS.map(function (cl) { return '<button type="button" style="background:' + cl + '" data-mc="' + cl + '" aria-pressed="' + (String(cur).toLowerCase() === cl.toLowerCase()) + '" aria-label="Cor ' + cl + '"></button>'; }).join('') + '</div>'; }
    function insp() {
      var box = $('.mp-insp');
      if (!owner) { box.hidden = true; return; }
      var o = selObj();
      if (!o) { box.hidden = true; box.innerHTML = ''; return; }
      if (box.contains(document.activeElement) && box._for === o.id && document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'checkbox') return;
      box._for = o.id;
      box.classList.toggle('mini', !editOpen);
      if (!editOpen) { box.innerHTML = '<b class="mp-mini-n">' + esc(o.kind === 'tok' ? tokName(o) : ((o.data && o.data.n) || 'Objeto')) + '</b><button type="button" class="mp-b" data-ma="edit">Editar</button><button type="button" class="mp-x" data-ma="unsel" aria-label="Tirar a seleção">×</button>'; box.hidden = false; return; }
      var d = o.data || {}, isTok = o.kind === 'tok', h = '<div class="mp-insp-h"><h3>' + (isTok ? 'Token' : 'Objeto') + '</h3><button type="button" class="mp-x" data-ma="unsel" aria-label="Fechar">×</button></div>';
      h += '<div class="mp-row"><label>Nome<input type="text" data-md="n" maxlength="40" value="' + esc(d.n || '') + '"' + (isTok && o.owner ? ' placeholder="' + esc(partyOf(o.owner).c || '') + '"' : '') + '></label></div>';
      if (isTok) {
        var mem = (ctx.party ? ctx.party() : []).filter(function (m) { return !m.mestre; }), hx = G.t === 'hx';
        h += '<div class="mp-row"><label>Tamanho<select data-md="s">' + [0.5, 1, 2, 3, 4].map(function (s) { return '<option value="' + s + '"' + (tokSize(d) === s ? ' selected' : '') + '>' + (s === 0.5 ? 'miúdo' : (s === 1 ? (hx ? '1 hexágono' : '1 quadrado') : (hx ? 'grande ×' + s : s + ' × ' + s))) + '</option>'; }).join('') + '</select></label>' +
          '<label>Quem move<select data-mo="1"><option value="">Só o Mestre</option>' + mem.map(function (m) { return '<option value="' + m.user_id + '"' + (o.owner === m.user_id ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></label></div>' + colRow(d.col || COLORS[0]) +
          '<div class="mp-row"><label class="mp-b">Miniatura<input type="file" accept="image/*" data-mf="tokimg" hidden></label>' + (d.img ? '<button type="button" class="mp-b" data-ma="tokimgx">Tirar a imagem</button>' : '') + '</div>';
        if (o.owner) {
          var ph = tokHp(o), dh = sys === 'daggerheart';
          h += '<div class="mp-hpbox"><h3>Vida na ficha de ' + esc((partyRow(o.owner) || {}).name || 'jogador') + '</h3>' + (ph ? '<b>' + ph.v + ' / ' + ph.m + '</b>' : '<p class="mp-hint">Sem ficha ainda.</p>') +
            '<div class="mp-row"><label>' + (dh ? 'PV a marcar' : 'Quanto') + '<input type="number" min="1" step="1" inputmode="numeric" data-mhq="1" value="' + hpQty + '"></label>' +
            '<button type="button" class="mp-b" data-ma="dmg">' + (dh ? 'Marcar' : 'Dano') + '</button><button type="button" class="mp-b" data-ma="heal">' + (dh ? 'Limpar' : 'Cura') + '</button></div>' +
            '<p class="mp-hint">Muda a ficha do jogador na hora.' + (sys === 'dnd5e' ? ' O dano tira primeiro dos PV temporários.' : '') + '</p></div>';
        }
        else h += '<div class="mp-row"><label>Vida<input type="number" min="0" step="1" data-mhp="v" value="' + (d.hp ? num(d.hp.v, 0) : '') + '"></label><label>Máx.<input type="number" min="0" step="1" data-mhp="m" value="' + (d.hp ? num(d.hp.m, 0) : '') + '"></label></div>' +
          '<div class="mp-row"><label class="mp-chk"><input type="checkbox" data-mdc="hs"' + (d.hs ? ' checked' : '') + '> Jogadores veem a vida</label></div>';
        h += '<div class="mp-row"><label class="mp-chk"><input type="checkbox" data-mdc="dead"' + (d.dead ? ' checked' : '') + '> Derrotado</label></div>';
        var cl = Array.isArray(d.cond) ? d.cond : [];
        h += '<h3>Condições</h3><div class="mp-conds">' + CONDS.map(function (c) { var on = cl.some(function (x) { return x.k === c[0]; }); return '<button type="button" data-mcd="' + c[0] + '" aria-pressed="' + on + '"><i style="background:' + c[2] + '"></i>' + c[1] + '</button>'; }).join('') + '</div>' +
          cl.filter(function (x) { return CONDM[x.k]; }).map(function (x) { return '<label class="mp-cdur"><i class="mf-c" style="background:' + CONDM[x.k][2] + '">' + esc(condAb(x.k)) + '</i>' + CONDM[x.k][1] + ' por <input type="number" min="0" max="99" step="1" inputmode="numeric" data-mcr="' + x.k + '" value="' + (x.r || '') + '" placeholder="—"> rodadas</label>'; }).join('') +
          (cl.length ? '<p class="mp-hint">Com rodadas, a condição some sozinha quando o tempo acaba. Sem número, fica até você tirar.</p>' : '');
        if (fight && fight.on) { var inF = (fight.list || []).some(function (e) { return e.k === o.id; }); h += '<div class="mp-row"><button type="button" class="mp-b" data-ma="' + (inF ? 'fout' : 'fin') + '">' + ICON.sword + (inF ? 'Tirar do combate' : 'Entrar no combate') + '</button></div>'; }
      } else {
        var sh = d.sh || 'rect', pth = sh === 'path';
        if (pth) h += '<div class="mp-row"><label>Textura<select data-md="pat">' + PATS.map(function (x) { return '<option value="' + x[0] + '"' + ((d.pat || 'solid') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' + (d.cl ? '' : '<label>Espessura<input type="number" min="0.05" max="2" step="0.05" data-md="sw" value="' + num(d.sw, 0.2) + '"></label>') + '</div>';
        else h += '<div class="mp-row"><label>Forma<select data-md="sh">' + Object.keys(SHAPES).map(function (k) { return '<option value="' + k + '"' + (sh === k ? ' selected' : '') + '>' + SHAPES[k] + '</option>'; }).join('') + '</select></label><label>Textura<select data-md="pat">' + PATS.map(function (x) { return '<option value="' + x[0] + '"' + ((d.pat || 'solid') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label></div>';
        if (pth) { /* sem medidas */ }
        else if (sh === 'circle' || sh === 'cone') h += '<div class="mp-row"><label>Raio (casas)<input type="number" min="0.5" step="0.5" data-md="r" value="' + num(d.r, 1) + '"></label></div>';
        else h += '<div class="mp-row"><label>Largura<input type="number" min="0.25" step="0.25" data-md="w" value="' + num(d.w, 1) + '"></label><label>Altura<input type="number" min="0.25" step="0.25" data-md="h" value="' + num(d.h, 1) + '"></label></div>';
        if (sh !== 'circle' && !pth) h += '<div class="mp-row"><label>Giro: ' + Math.round(num(d.rot, 0)) + '°<input type="range" min="0" max="345" step="15" data-md="rot" value="' + num(d.rot, 0) + '"></label></div>';
        h += colRow(d.col || '#B07A45') + '<div class="mp-row"><label>Opacidade<input type="range" min="0.1" max="1" step="0.05" data-md="op" value="' + clamp(num(d.op, 1), 0.1, 1) + '"></label></div>' +
          '<div class="mp-row"><label class="mp-chk"><input type="checkbox" data-mdc="lk"' + (d.lk ? ' checked' : '') + '> Travar (não arrasta sem querer)</label></div>';
      }
      h += '<div class="mp-row"><button type="button" class="mp-b" data-ma="hide" aria-pressed="' + !!o.hidden + '">' + (o.hidden ? 'Escondido dos jogadores' : 'Esconder dos jogadores') + '</button><button type="button" class="mp-b" data-ma="dup">Duplicar</button><button type="button" class="mp-b bad" data-ma="del">Apagar</button></div>';
      box.innerHTML = h; box.hidden = false;
    }
    function refresh() { bars(); empty(); panel(); insp(); fightPanel(); }

    /* ---------- leitura ---------- */
    /* tela da mesa: a conta do Mestre recebe tudo do banco, então o que está escondido ou sob a névoa é descartado aqui */
    function spVis(r) {
      if (r.hidden) return false;
      if (!sfog || r.cell == null) return true;
      if (r.cell < 0 || r.cell >= sfog.n || r.cell >= sfog.bits.length * 8) return false;
      return bit(sfog.bits, r.cell);
    }
    async function spFogLoad(mid, rev) {
      var key = mid + ':' + rev;
      if (sfogFor === key) return;
      var rows = await j('/rest/v1/maps?id=eq.' + mid + '&select=fog,fog_cols,fog_rows');
      var m = rows && rows[0];
      if (!m) throw new Error('mapa');
      var bits = m.fog ? b64d(m.fog) : null;
      sfog = m.fog ? { bits: bits || new Uint8Array(0), n: (m.fog_cols || 0) * (m.fog_rows || 0) } : null;
      sfogFor = key;
    }
    function ingest(rows, silent) {
      var ch = false, ev = {};
      rows.forEach(function (r) {
        if (spect && !r.gone && !spVis(r)) r = { id: r.id, seq: r.seq, gone: true };
        var old = objs[r.id], hold = (pend[r.id] || (busy[r.id] && busy[r.id] > Date.now())) && old;
        if (r.seq > seq) seq = r.seq;
        if (hold) return;
        if (r.gone) { if (old) { delete objs[r.id]; ch = true; ev.erase = 1; if (sel === r.id) sel = null; } return; }
        if (!old) ev[r.kind === 'tok' ? 'place' : 'draw'] = 1;
        else if (r.kind === 'tok') { var od = old.data || {}, nd = r.data || {}; if (num(od.x, 0) !== num(nd.x, 0) || num(od.y, 0) !== num(nd.y, 0)) ev.move = stepsOf(od, nd); if (nd.dead && !od.dead) ev.down = 1; }
        objs[r.id] = { id: r.id, kind: r.kind, data: r.data || {}, owner: r.owner, hidden: !!r.hidden, gone: false, seq: r.seq, cell: r.cell };
        ch = true;
      });
      if (!silent && ch && rows.length <= 8) Object.keys(ev).forEach(function (k) { snd(k, ev[k]); });
      return ch;
    }
    function curMapId() { return owner ? (map && map.id) : (P && P.map_id); }
    function protect(k) { return pend[k] || (busy[k] && busy[k] > Date.now()); }
    async function pollObjs(full) {
      var mid = curMapId(); if (!mid || dead) return;
      if (full) seq = 0;
      var quiet = full || !seq;
      var q = '/rest/v1/map_objs?map_id=eq.' + mid + '&select=id,kind,data,owner,hidden,gone,seq,cell&order=seq.asc&limit=1000' + (seq ? '&seq=gt.' + seq : '&gone=eq.false');
      try {
        var rows = await j(q);
        if (curMapId() !== mid || dead) return;
        var ch = false;
        if (full) { var keep0 = {}; (rows || []).forEach(function (x) { keep0[x.id] = 1; }); Object.keys(objs).forEach(function (k) { if (!keep0[k] && !protect(k)) { delete objs[k]; ch = true; } }); }
        if (ingest(rows || [], quiet)) ch = true;
        if (!full && Date.now() - lastFull > (owner ? 20000 : 6000)) {
          lastFull = Date.now();
          var ids = await j('/rest/v1/map_objs?map_id=eq.' + mid + '&select=id&gone=eq.false&limit=1000');
          if (curMapId() === mid && ids) { var keep = {}; ids.forEach(function (x) { keep[x.id] = 1; }); Object.keys(objs).forEach(function (k) { if (!keep[k] && !protect(k)) { delete objs[k]; ch = true; } }); }
        }
        if (ch || full) { drawObjs(); if (owner && sel && !objs[sel]) { sel = null; insp(); } }
      } catch (e) { /* tenta no próximo ciclo */ }
    }
    async function loadMaps() {
      try {
        var rows = await j('/rest/v1/maps?campaign_id=eq.' + cid + '&select=id,name,img,cfg,shown,fog,fog_draft,fog_cols,fog_rows&order=created_at.asc');
        var vs = []; try { vs = await j('/rest/v1/map_views?campaign_id=eq.' + cid + '&select=map_id,view,pimg,rev,name') || []; } catch (e) { vs = []; }
        maps = rows || [];
        var vmap = {}; vs.forEach(function (v) { vmap[v.map_id] = v; });
        maps.forEach(function (m) { m._v = vmap[m.id] || null; });
        var want = (map && maps.filter(function (m) { return m.id === map.id; })[0]) || maps.filter(function (m) { return m.shown; })[0] || maps[0] || null;
        setMap(want, true);
        if (map && map.shown) schedulePub(400);
        if (wantMap) { var wm = wantMap; wantMap = null; useMap(wm.id, wm.show); }
      } catch (e) { msgText = 'Não consegui carregar os mapas.'; drawRuler(); }
    }
    async function loadView() {
      try {
        var rows = await j('/rest/v1/map_views?campaign_id=eq.' + cid + '&shown=eq.true&select=map_id,name,view,pimg,rev');
        var v = rows && rows[0] ? rows[0] : null;
        if (!v) { if (P) { views[P.map_id] = view; P = null; pImgUrl = ''; objs = {}; seq = 0; drawAll(); refresh(); } else empty(); spState(); return; }
        var newMap = !P || P.map_id !== v.map_id;
        if (!newMap && P.rev === v.rev) return;
        var oldImg = P && P.pimg, vw0 = (P && P.view) || {}, vw1 = v.view || {}, rvl = !newMap && JSON.stringify(vw0.pf || vw0.crop || null) !== JSON.stringify(vw1.pf || vw1.crop || null);
        if (spect) await spFogLoad(v.map_id, v.rev);
        if (newMap || spect) { if (P && newMap) views[P.map_id] = view; objs = {}; seq = 0; }
        if (v.pimg && v.pimg !== oldImg) { var u = await loadUrl('mapas/' + v.pimg); if (!u) return; pImgUrl = u; }
        else if (!v.pimg) pImgUrl = '';
        P = v;
        regeom(); drawAll();
        if (newMap) { if (views[v.map_id]) { view = views[v.map_id]; clampView(); applyView(); } else fit(); }
        else if (atMin) fit(); else { clampView(); applyView(); }
        if (spect && tvF) applyFocus(false);
        refresh();
        pollObjs(true);
        spState();
        if (rvl) snd('reveal');
      } catch (e) { /* tenta no próximo ciclo */ }
    }
    var spLast = null;
    function spState() { if (!spect || !ctx.onShown) return; var on = !!(P && P.pimg && P.view && P.view.crop); if (on !== spLast) { spLast = on; try { ctx.onShown(on, P ? P.name || '' : ''); } catch (e) { /* ok */ } } }
    function setMap(m, keepSel) {
      if (map) views[map.id] = view;
      var same = !!(m && map && m.id === map.id);
      map = m;
      if (!same) { objs = {}; seq = 0; sel = null; ruler = null; lastFull = 0; pend = {}; fogPrev = false; }
      else if (!keepSel) sel = null;
      regeom(); if (map) loadFog(); else fog = null;
      drawAll();
      if (m && !same) { if (views[m.id]) { view = views[m.id]; clampView(); applyView(); } else setTimeout(fit, 0); pollObjs(); }
      refresh();
    }

    /* ---------- o que os jogadores recebem ---------- */
    function wantView() {
      var g = gcfg(), crop = revealCrop(), pf = null;
      if (fog && fog.on && crop) {
        var rc = revealedCells(), c0 = 1e9, r0 = 1e9, c1 = -1e9, r1 = -1e9;
        rc.forEach(function (p) { c0 = Math.min(c0, p[0]); r0 = Math.min(r0, p[1]); c1 = Math.max(c1, p[0]); r1 = Math.max(r1, p[1]); });
        var nc = c1 - c0 + 1, nr = r1 - r0 + 1, b = new Uint8Array(Math.ceil(nc * nr / 8));
        rc.forEach(function (p) { var i = (p[1] - r0) * nc + (p[0] - c0); b[i >> 3] |= 1 << (i & 7); });
        pf = { c0: c0, r0: r0, nc: nc, nr: nr, b: b64e(b) };
      }
      return { g: { t: g.t, o: g.o, s: g.s, ox: g.ox, oy: g.oy, per: g.per, unit: g.unit, diag: g.diag, show: g.show, gcol: g.gcol, gop: g.gop }, crop: crop, pf: pf };
    }
    function imgSig() { if (!map) return ''; var g = gcfg(); return hash(map.img + '|' + (fog && fog.on ? JSON.stringify([g.t, g.o, g.s, g.ox, g.oy]) + b64e(fog.bits) : 'full') + '|' + W() + 'x' + H()); }
    function schedulePub(ms) { if (!owner || !map) return; clearTimeout(pubT); pubT = setTimeout(function () { pubT = null; publish(false); }, ms == null ? 1300 : ms); }
    async function baseImage() {
      var u = await loadUrl('mapas/' + map.img); if (!u) return null;
      return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = u; });
    }
    async function publish(force) {
      if (!owner || !map) return;
      if (!map.shown && !force) return;
      if (pubBusy) { pubAgain = true; return; }
      pubBusy = true;
      var m = map;
      try {
        var want = wantView(), isig = imgSig(), cur = (m._v && m._v.view) || {};
        if (m._v && cur.isig === isig && (m._v.pimg || !want.crop)) {
          if (JSON.stringify(want) !== JSON.stringify({ g: cur.g, crop: cur.crop, pf: cur.pf }) || m._v.name !== m.name) await upView(m, Object.assign({}, want, { isig: isig }), m._v.pimg);
          return;
        }
        var pimg = null;
        if (want.crop) {
          var im = await baseImage(); if (!im) throw new Error('img');
          var blob = await playerImage(im, want.crop);
          pimg = cid + '/v-' + m.id + '-' + Date.now().toString(36) + '.jpg';
          await upload(pimg, blob);
        }
        var old = m._v && m._v.pimg;
        await upView(m, Object.assign({}, want, { isig: isig }), pimg);
        if (old && old !== pimg) api('/storage/v1/object/mapas/' + old, { method: 'DELETE' }).catch(function () { /* ok */ });
      } catch (e) { if (!dead) { ctx.toast('Não consegui atualizar o mapa dos jogadores. Tento de novo.', 'bad'); schedulePub(5000); } }
      finally { pubBusy = false; if (pubAgain && !dead) { pubAgain = false; schedulePub(300); } }
    }
    async function upView(m, v, pimg) {
      var rows = await post('/rest/v1/map_views?on_conflict=map_id', { map_id: m.id, campaign_id: cid, name: m.name, view: v, pimg: pimg }, { Prefer: 'resolution=merge-duplicates,return=representation' });
      m._v = (rows && rows[0]) || { map_id: m.id, view: v, pimg: pimg };
      m._v.name = m.name;
    }
    function playerImage(im, crop) {
      var k = Math.min(1, 3072 / Math.max(crop[2], crop[3])), cw = Math.max(1, Math.round(crop[2] * k)), ch = Math.max(1, Math.round(crop[3] * k));
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
      g.save(); g.scale(cw / crop[2], ch / crop[3]); g.translate(-crop[0], -crop[1]);
      if (fog && fog.on) {
        g.beginPath();
        revealedCells().forEach(function (p) { var cs = G.corners(p[0], p[1]); g.moveTo(cs[0][0], cs[0][1]); for (var i = 1; i < cs.length; i++) g.lineTo(cs[i][0], cs[i][1]); g.closePath(); });
        g.clip();
      }
      g.drawImage(im, 0, 0, W(), H());
      g.restore();
      return new Promise(function (res, rej) { cv.toBlob(function (b) { b ? res(b) : rej(new Error('img')); }, 'image/jpeg', 0.86); });
    }

    /* ---------- escrita ---------- */
    function queue(id, p) {
      var o = objs[id]; if (!o) return;
      o.data = Object.assign({}, o.data, p);
      pend[id] = Object.assign(pend[id] || {}, p);
      busy[id] = Date.now() + 2500;
      clearTimeout(sendT[id]);
      sendT[id] = setTimeout(function () { flush(id); }, 350);
      drawObjs();
    }
    async function flush(id) {
      var p = pend[id]; if (!p) return;
      delete pend[id];
      var o = objs[id];
      try {
        await post('/rest/v1/rpc/patch_obj', { oid: id, p: p });
        if (o && ('x' in p || 'y' in p || 's' in p || 'w' in p || 'h' in p || 'r' in p || 'sh' in p)) syncCell(o);
      } catch (e) { ctx.toast('Não consegui salvar a mudança no mapa.', 'bad'); }
      busy[id] = Date.now() + 2500;
    }
    function syncCell(o) { if (!owner || !FG) return; var c = cellIdx(o); if (c === o.cell) return; o.cell = c; patch('/rest/v1/map_objs?id=eq.' + o.id, { cell: c }).catch(function () { /* o próximo ajuste corrige */ }); }
    function syncAllCells() { allObjs().forEach(function (o) { if (!o.gone) syncCell(o); }); }
    function viewCenterCell() { var v = vp(), w = toWorld(v[0] / 2, v[1] / 2); return G.cellAt(w[0], w[1]); }
    function freeCell(x, y) {
      var t = allObjs().filter(function (o) { return o.kind === 'tok' && !o.gone; });
      var occ = function (c) { return t.some(function (o) { var a = tokCell(o.data); return a[0] === c[0] && a[1] === c[1]; }); };
      if (!occ([x, y])) return [x, y];
      for (var rad = 1; rad < 7; rad++) { var ring = G.disk(x, y, rad).filter(function (c) { return G.dist(c, [x, y], 's') === rad; }); for (var i = 0; i < ring.length; i++) if (!occ(ring[i])) return ring[i]; }
      return [x, y];
    }
    async function create(kind, data, ownerId, hidden, keep) {
      if (!map) return null;
      var o = { id: uuid(), kind: kind, data: data, owner: ownerId || null, hidden: !!hidden, gone: false, seq: 1e15 };
      o.cell = cellIdx(o);
      objs[o.id] = o; busy[o.id] = Date.now() + 2500; if (!keep) { sel = o.id; editOpen = true; } drawObjs(); insp(); fightPanel(); snd(kind === 'tok' ? 'place' : 'draw');
      try { await post('/rest/v1/map_objs', { id: o.id, map_id: map.id, campaign_id: cid, kind: kind, data: data, owner: o.owner, hidden: o.hidden, cell: o.cell }); }
      catch (e) { delete objs[o.id]; if (sel === o.id) sel = null; drawObjs(); insp(); ctx.toast('Não consegui adicionar ao mapa.', 'bad'); return null; }
      return o;
    }
    var DSW = [0.08, 0.2, 0.5];
    function drawData() { var f = FX.filter(function (x) { return x[0] === dfx; })[0] || FX[0]; return f[0] === 'mark' ? { n: 'Marca', col: dcol, pat: 'solid', op: 0.32 } : { n: f[1], col: f[2], pat: f[0], op: f[3] }; }
    function half(v) { return Math.round(v * 2) / 2; }
    function rectOf(a, b) { var x0 = half((Math.min(a[0], b[0]) - G.ox) / G.s), y0 = half((Math.min(a[1], b[1]) - G.oy) / G.s), x1 = half((Math.max(a[0], b[0]) - G.ox) / G.s), y1 = half((Math.max(a[1], b[1]) - G.oy) / G.s); return [x0, y0, x1 - x0, y1 - y0]; }
    function circOf(a, b) { return [half((a[0] - G.ox) / G.s), half((a[1] - G.oy) / G.s), Math.max(0.5, half(Math.hypot(b[0] - a[0], b[1] - a[1]) / G.s))]; }
    /* tira pontos que não mudam o desenho (o traço fica leve para guardar e mandar) */
    function thin(pts, eps) {
      if (pts.length < 3) return pts.slice();
      var keep = [0, pts.length - 1], st = [[0, pts.length - 1]];
      while (st.length) {
        var sg = st.pop(), a = pts[sg[0]], b = pts[sg[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-9, mx = 0, mi = -1;
        for (var i = sg[0] + 1; i < sg[1]; i++) { var dd = Math.abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / len; if (len < 1e-6) dd = Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]); if (dd > mx) { mx = dd; mi = i; } }
        if (mi > 0 && mx > eps) { keep.push(mi); st.push([sg[0], mi], [mi, sg[1]]); }
      }
      return keep.sort(function (p, q) { return p - q; }).map(function (i) { return pts[i]; });
    }
    function finishDraw(ds) {
      var base = drawData(), d = null, a = ds.a, b = ds.b, tap = Math.hypot(b[0] - a[0], b[1] - a[1]) * view.k < 8;
      if (ds.k === 'rect') {
        var r = rectOf(a, b);
        if (tap || r[2] < 0.5 || r[3] < 0.5) { if (!tap) return; var cl = G.cellAt(a[0], a[1]), bx = G.box(cl[0], cl[1]); r = [(bx[0] - G.ox) / G.s, (bx[1] - G.oy) / G.s, (bx[2] - bx[0]) / G.s, (bx[3] - bx[1]) / G.s]; }
        d = Object.assign(base, { sh: 'rect', x: r[0], y: r[1], w: r[2], h: r[3], rot: 0, ed: 1, lab: false });
      } else if (ds.k === 'circle') {
        var c = circOf(a, b); if (tap) c[2] = 1;
        d = Object.assign(base, { sh: 'circle', x: c[0], y: c[1], r: c[2], lab: false });
      } else {
        var u = ds.pts.map(function (q) { return [(q[0] - G.ox) / G.s, (q[1] - G.oy) / G.s]; }), eps = 0.025, t = thin(u, eps);
        while (t.length > 280) { eps *= 1.6; t = thin(u, eps); }
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; t.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
        if (t.length < (ds.k === 'area' ? 3 : 2) || Math.hypot(x1 - x0, y1 - y0) < (ds.k === 'area' ? 0.4 : 0.15)) return;
        x0 = Math.round(x0 * 100) / 100; y0 = Math.round(y0 * 100) / 100;
        d = Object.assign(base, { sh: 'path', x: x0, y: y0, w: Math.max(0.05, Math.round((x1 - x0) * 100) / 100), h: Math.max(0.05, Math.round((y1 - y0) * 100) / 100), pts: t.map(function (q) { return (q[0] - x0).toFixed(2) + ',' + (q[1] - y0).toFixed(2); }).join(' '), cl: ds.k === 'area' ? 1 : 0, lab: false });
        if (!d.cl) { d.sw = DSW[dsz - 1]; d.op = dfx === 'mark' ? 0.95 : Math.max(base.op, 0.85); }
      }
      create('obj', d, null, false, true).then(function (o) { if (o) { drawn.push(o.id); if (drawn.length > 40) drawn.shift(); bars(); } });
    }
    function removeObj(o) {
      if (!o || o.gone) return;
      o.gone = true; delete objs[o.id]; if (sel === o.id) sel = null;
      drawn = drawn.filter(function (id) { return id !== o.id; });
      drawObjs(); insp(); snd('erase');
      patch('/rest/v1/map_objs?id=eq.' + o.id, { gone: true }).catch(function () { ctx.toast('Não consegui apagar.', 'bad'); pollObjs(true); });
    }
    function eraseAt(e) {
      var el = document.elementFromPoint(e.clientX, e.clientY), g = el && el.closest ? el.closest('.mp-ob[data-id]') : null, o = g ? objs[g.getAttribute('data-id')] : null;
      if (o && o.kind === 'obj' && !(o.data && o.data.lk)) removeObj(o);
    }
    function drawUndo() { while (drawn.length) { var o = objs[drawn.pop()]; if (o) { removeObj(o); break; } } bars(); }
    /* ponteiro ao vivo: um rastro que some sozinho; o do Mestre aparece também na tela da mesa */
    function laserPush(x, y) {
      lz.push([x, y, performance.now()]); if (lz.length > 80) lz.shift();
      lzOn = true; clearTimeout(lzOffT); lzOffT = setTimeout(function () { lzOn = false; }, 2500);
      if (!lzRaf) lzRaf = requestAnimationFrame(laserDraw);
    }
    function laserEnd() { lzOn = false; clearTimeout(lzOffT); if (!lzRaf && lz.length) lzRaf = requestAnimationFrame(laserDraw); }
    function laserDraw() {
      lzRaf = 0; if (dead) return;
      var now = performance.now(), k = view.k || 1, LIFE = 650, hd = lz[lz.length - 1];
      lz = lz.filter(function (q) { return now - q[2] < LIFE; });
      if (!lzEl) { lzEl = document.createElementNS('http://www.w3.org/2000/svg', 'g'); lzEl.setAttribute('class', 'mp-laser'); L.ping.appendChild(lzEl); }
      var h = '';
      for (var i = 1; i < lz.length; i++) { var a = lz[i - 1], b = lz[i], al = 1 - (now - b[2]) / LIFE; h += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="#FF5A6E" stroke-opacity="' + (al * 0.85).toFixed(2) + '" stroke-width="' + ((2 + 7 * al) / k).toFixed(2) + '" stroke-linecap="round"/>'; }
      var ha = hd ? (lzOn ? 1 : Math.max(0, 1 - (now - hd[2]) / LIFE)) : 0;
      if (hd && ha > 0) h += '<circle cx="' + hd[0].toFixed(1) + '" cy="' + hd[1].toFixed(1) + '" r="' + 16 / k + '" fill="#FF5A6E" fill-opacity="' + (0.28 * ha).toFixed(2) + '"/><circle cx="' + hd[0].toFixed(1) + '" cy="' + hd[1].toFixed(1) + '" r="' + 6.5 / k + '" fill="#fff" fill-opacity="' + ha.toFixed(2) + '" stroke="#FF5A6E" stroke-opacity="' + ha.toFixed(2) + '" stroke-width="' + 3 / k + '"/>';
      lzEl.innerHTML = h;
      if (lz.length || (hd && ha > 0 && lzOn)) lzRaf = requestAnimationFrame(laserDraw); else if (!lzOn) lzEl.innerHTML = '';
    }
    function laserOut(w) {
      if (!ctx.onPoint || !map) return;
      if (!w) { lzSent = 0; try { ctx.onPoint(null); } catch (e) { /* ok */ } return; }
      var now = Date.now(); if (now - lzSent < 45) return; lzSent = now;
      try { ctx.onPoint({ map: map.id, x: Math.round(w[0]), y: Math.round(w[1]) }); } catch (e) { /* ok */ }
    }
    function addPreset(i) {
      var pr = PRESETS[i], v = vp(), w = toWorld(v[0] / 2, v[1] / 2), ux = Math.round((w[0] - G.ox) / G.s * 2) / 2, uy = Math.round((w[1] - G.oy) / G.s * 2) / 2;
      var d = { n: pr.n, sh: pr.sh, col: pr.col, pat: pr.pat, op: pr.op || 1, rot: 0, lab: true, x: ux, y: uy };
      if (pr.sh === 'circle' || pr.sh === 'cone') d.r = pr.r; else { d.w = pr.w; d.h = pr.h; d.x = ux - Math.floor(pr.w / 2); d.y = uy - Math.floor(pr.h / 2); }
      create('obj', d, null, false);
    }
    function addToken() { var p = freeCell.apply(null, viewCenterCell()); create('tok', { n: 'Token', x: p[0], y: p[1], s: 1, col: COLORS[4] }, null, false); }
    function addPlayers() {
      var have = {}; allObjs().forEach(function (o) { if (o.kind === 'tok' && o.owner && !o.gone) have[o.owner] = 1; });
      var members = (ctx.party ? ctx.party() : []).filter(function (m) { return !m.mestre && !have[m.user_id]; });
      if (!members.length) { ctx.toast('Todos os jogadores já estão no mapa.', ''); return; }
      var c = viewCenterCell(), n0 = Object.keys(have).length;
      members.forEach(function (m, n) { var p = freeCell(c[0], c[1]); create('tok', { n: '', x: p[0], y: p[1], s: 1, col: COLORS[(n0 + n) % COLORS.length] }, m.user_id, false); });
      editOpen = false; insp();
    }
    function setCfg(p, soft, geomChange, beforeFG) {
      if (!map) return;
      var before = beforeFG || (FG ? Object.assign({}, FG) : null);
      map.cfg = Object.assign({}, map.cfg, p);
      regeom();
      if (geomChange && fog && fog.on) remapFog(before);
      drawAll(); if (sel) insp();
      if (geomChange) { clearTimeout(setCfg.t); setCfg.t = setTimeout(syncAllCells, 900); }
      clearTimeout(saveT); saveT = setTimeout(saveMap, soft ? 500 : 150);
      schedulePub();
    }
    function remapFog(oldFG) {
      if (!oldFG || oldFG.fs !== FG.fs) { var had = countBits(fog.bits) + countBits(fog.draft); fog.bits = emptyBits(); fog.draft = emptyBits(); if (had) ctx.toast('Mudar o tamanho ou o tipo da grade escondeu de novo o mapa inteiro.', ''); return; }
      if (oldFG.c0 === FG.c0 && oldFG.r0 === FG.r0 && oldFG.cols === FG.cols && oldFG.rows === FG.rows) return;
      var mv = function (src) { var nb = emptyBits(); for (var r = 0; r < oldFG.rows; r++) for (var c = 0; c < oldFG.cols; c++) if (bit(src, r * oldFG.cols + c)) { var ni = fidx(c + oldFG.c0, r + oldFG.r0); if (ni >= 0) nb[ni >> 3] |= 1 << (ni & 7); } return nb; };
      fog.bits = mv(fog.bits); fog.draft = mv(fog.draft);
    }
    function countBits(a) { var n = 0; if (!a) return 0; for (var i = 0; i < a.length; i++) { var b = a[i]; while (b) { n += b & 1; b >>= 1; } } return n; }
    function saveMap() {
      if (!map || !FG) return;
      var m = map;
      m.cfg = Object.assign({}, m.cfg, { f0: [FG.c0, FG.r0], fs: FG.fs });
      m.fog = fog && fog.on ? b64e(fog.bits) : null; m.fog_draft = fog && fog.on ? b64e(fog.draft) : null; m.fog_cols = FG.cols; m.fog_rows = FG.rows;
      patch('/rest/v1/maps?id=eq.' + m.id, { cfg: m.cfg, fog: m.fog, fog_draft: m.fog_draft, fog_cols: m.fog_cols, fog_rows: m.fog_rows }).catch(function () { ctx.toast('Não consegui salvar o mapa.', 'bad'); });
    }
    function fogChanged() {
      if (!fogQ) fogQ = requestAnimationFrame(function () { fogQ = 0; drawFog(); drawObjs(); if (fogPrev) { L.defs.innerHTML = defsHtml(); clampView(); applyView(); } });
      clearTimeout(fogT); fogT = setTimeout(function () { fogT = null; saveMap(); }, 700);
      var n = pending(); if ((n > 0) !== !!fogChanged.had) { fogChanged.had = n > 0; bars(); panel(); } else updPending(n);
    }
    function updPending(n) { var el = root.querySelector('[data-ma="fogsave"] .lb'); if (el) el.textContent = 'Salvar para os jogadores (' + n + ')'; }
    function fogSave() {
      if (!fog || !fog.on) return;
      fog.bits = fog.draft.slice(); fogChanged.had = false;
      clearTimeout(fogT); fogT = null; saveMap(); drawFog(); drawObjs(); bars(); panel();
      snd('reveal');
      if (map && map.shown) { schedulePub(0); ctx.toast('Névoa salva. Os jogadores já veem a área nova.', 'good'); }
      else ctx.toast('Névoa salva. Os jogadores verão assim quando você mostrar o mapa.', 'good');
    }
    function fogUndo() { if (!fog || !fog.on) return; fog.draft = fog.bits.slice(); fogChanged.had = false; clearTimeout(fogT); fogT = null; saveMap(); drawFog(); bars(); panel(); if (fogPrev) { clampView(); applyView(); } }
    function shrink(file, max, q) {
      return new Promise(function (res, rej) {
        var u = URL.createObjectURL(file), im = new Image();
        im.onload = function () {
          var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(function (b) { URL.revokeObjectURL(u); b ? res({ blob: b, w: c.width, h: c.height }) : rej(new Error('img')); }, 'image/jpeg', q);
        };
        im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); };
        im.src = u;
      });
    }
    async function upload(path, blob) { var r = await api('/storage/v1/object/mapas/' + path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob }); if (!r.ok) throw new Error('upload'); }
    async function newMap(file) {
      ctx.toast('Enviando o mapa…', '');
      try {
        var s = await shrink(file, 4096, 0.86), id = uuid(), path = cid + '/m-' + id + '.jpg';
        await upload(path, s.blob);
        var name = String(file.name || 'Mapa').replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'Mapa', hx = sys === 'gurps';
        var c = { w: s.w, h: s.h, cell: Math.max(8, Math.round(s.w / 30)), ox: 0, oy: 0, per: hx ? 1 : 1.5, unit: 'm', diag: 's', grid: true, gcol: '#ffffff', gop: 0.35, gt: hx ? 'hx' : 'sq', go: 'c' };
        var rows = await post('/rest/v1/maps', { id: id, campaign_id: cid, name: name, img: path, cfg: c }, { Prefer: 'return=representation' });
        var m = rows && rows[0] ? rows[0] : { id: id, name: name, img: path, cfg: c, shown: false };
        m._v = null;
        urls['mapas/' + path] = URL.createObjectURL(s.blob);
        maps.push(m); setMap(m); saveMap();
        ctx.toast('Mapa enviado. Ajuste a grade e mostre aos jogadores quando quiser.', 'good');
      } catch (e) { ctx.toast('Não consegui enviar o mapa.', 'bad'); }
    }
    async function tokImage(file) {
      var o = selObj(); if (!o) return;
      try {
        var s = await shrink(file, 256, 0.85), path = cid + '/t-' + uuid().slice(0, 8) + '.jpg';
        await upload(path, s.blob);
        urls['mapas/' + path] = URL.createObjectURL(s.blob);
        queue(o.id, { img: 'mapas/' + path }); insp();
      } catch (e) { ctx.toast('Não consegui usar esta imagem.', 'bad'); }
    }
    async function setShown() {
      if (!map) return;
      var on = !map.shown, m = map;
      try {
        if (on) { clearTimeout(pubT); await publish(true); }
        await post('/rest/v1/rpc/set_map', { cid: cid, mid: on ? m.id : null });
        maps.forEach(function (x) { x.shown = on && x.id === m.id; });
        ctx.toast(on ? 'Os jogadores agora veem este mapa' + (fog && fog.on ? ' (só a parte revelada).' : '.') : 'Mapa escondido dos jogadores.', on ? 'good' : '');
        panel();
      } catch (e) { ctx.toast('Não consegui mudar o mapa da mesa.', 'bad'); }
    }
    async function delMap() {
      if (!map) return;
      if (!delMap.arm) { delMap.arm = true; ctx.toast('Toque em “Apagar este mapa” de novo para confirmar.', ''); setTimeout(function () { delMap.arm = false; }, 4000); return; }
      delMap.arm = false;
      var m = map;
      try {
        await j('/rest/v1/maps?id=eq.' + m.id, { method: 'DELETE' });
        if (m.img) api('/storage/v1/object/mapas/' + m.img, { method: 'DELETE' }).catch(function () { /* ok */ });
        if (m._v && m._v.pimg) api('/storage/v1/object/mapas/' + m._v.pimg, { method: 'DELETE' }).catch(function () { /* ok */ });
        maps = maps.filter(function (x) { return x.id !== m.id; }); map = null;
        setMap(maps[0] || null);
      } catch (e) { ctx.toast('Não consegui apagar o mapa.', 'bad'); }
    }
    async function delObj() {
      var o = selObj(); if (!o) return;
      o.gone = true; delete objs[o.id]; sel = null; drawObjs(); insp(); fightPanel(); snd('erase');
      try { await patch('/rest/v1/map_objs?id=eq.' + o.id, { gone: true }); } catch (e) { ctx.toast('Não consegui apagar.', 'bad'); pollObjs(true); }
    }
    async function setHidden() {
      var o = selObj(); if (!o) return;
      o.hidden = !o.hidden; busy[o.id] = Date.now() + 2500; drawObjs(); insp();
      try { await patch('/rest/v1/map_objs?id=eq.' + o.id, { hidden: o.hidden }); } catch (e) { ctx.toast('Não consegui mudar a visibilidade.', 'bad'); }
    }
    async function setOwner(v) {
      var o = selObj(); if (!o) return;
      o.owner = v || null; busy[o.id] = Date.now() + 2500; drawObjs(); insp();
      try { await patch('/rest/v1/map_objs?id=eq.' + o.id, { owner: o.owner }); } catch (e) { ctx.toast('Não consegui mudar quem move.', 'bad'); }
    }
    function dup() {
      var o = selObj(); if (!o) return;
      var d = JSON.parse(JSON.stringify(o.data));
      if (o.kind === 'tok') { var p = freeCell.apply(null, tokCell(d)); d.x = p[0]; d.y = p[1]; } else { d.x = num(d.x, 0) + 1; d.y = num(d.y, 0) + 1; }
      var m = /^(.*?)(?: (\d+))?$/.exec(d.n || ''); if (o.kind === 'tok' && m && m[1]) d.n = m[1] + ' ' + ((parseInt(m[2], 10) || 1) + 1);
      create(o.kind, d, null, o.hidden);
    }
    function canMove(o) { return !!o && !o.gone && (owner || (o.kind === 'tok' && o.owner === uid && !o.hidden)); }
    async function moveTo(o, x, y, from) {
      var prev = { x: num(o.data.x, 0), y: num(o.data.y, 0) };
      var fromCell = from || tokCell(o.data);
      o.data = Object.assign({}, o.data, { x: x, y: y }); busy[o.id] = Date.now() + 2500;
      if (owner) o.cell = cellIdx(o);
      drawObjs(); if (o.kind === 'tok') snd('move', stepsOf({ x: fromCell[0], y: fromCell[1] }, { x: tokCell(o.data)[0], y: tokCell(o.data)[1] }));
      try {
        await post('/rest/v1/rpc/move_obj', { oid: o.id, nx: x, ny: y, nc: owner ? o.cell : null });
        if (o.kind === 'tok') logMove(o, fromCell, tokCell(o.data));
      } catch (e) { o.data = Object.assign({}, o.data, prev); drawObjs(); ctx.toast(e.status === 403 ? 'Você só pode mover o seu personagem.' : 'Não consegui mover agora.', 'bad'); }
    }

    /* ---------- condições ---------- */
    function setCond(o, k, on) {
      var cl = (Array.isArray(o.data.cond) ? o.data.cond : []).filter(function (x) { return x.k !== k; });
      if (on) cl.push({ k: k, r: 0 });
      queue(o.id, { cond: cl }); insp(); fightPanel();
      if (fight && fight.on && !o.hidden && CONDM[k]) logEv('cond', tokName(o) + (on ? ' está ' : ' não está mais ') + CONDM[k][1].toLowerCase(), { tok: o.id });
    }
    function setCondR(o, k, r) {
      var cl = (Array.isArray(o.data.cond) ? o.data.cond : []).map(function (x) { return x.k === k ? { k: k, r: r } : x; });
      queue(o.id, { cond: cl }); fightPanel();
    }
    function tickConds() {
      allObjs().forEach(function (o) {
        if (o.gone || !Array.isArray(o.data.cond) || !o.data.cond.some(function (x) { return x.r > 0; })) return;
        var keep = [];
        o.data.cond.forEach(function (x) {
          if (!(x.r > 0)) { keep.push(x); return; }
          if (x.r - 1 > 0) keep.push({ k: x.k, r: x.r - 1 });
          else if (!o.hidden && CONDM[x.k]) logEv('cond', CONDM[x.k][1] + ' acabou em ' + tokName(o), { tok: o.id });
        });
        queue(o.id, { cond: keep });
      });
      if (sel) insp();
    }

    /* ---------- vida do jogador direto na ficha ---------- */
    async function sheetHp(o, n, heal) {
      var u = o.owner; if (!u || !(n > 0)) return;
      var who = tokName(o), before = null, after = null;
      try {
        for (var at = 0; at < 4; at++) {
          var rows = await j('/rest/v1/pdocs?campaign_id=eq.' + cid + '&user_id=eq.' + u + '&kind=eq.sheet&select=data,rev'), r = rows && rows[0];
          if (!r || !r.data) { ctx.toast('Este jogador ainda não tem ficha.', 'bad'); return; }
          var doc = JSON.parse(JSON.stringify(r.data)), sd = doc[sys] = doc[sys] || {}, tmp = 0;
          if (sys === 'dnd5e') {
            sd.hp = sd.hp || {}; var mx = num(sd.hp.max, 0), cu = num(sd.hp.cur, mx); tmp = num(sd.hp.tmp, 0); before = cu;
            if (heal) cu = mx ? Math.min(mx, cu + n) : cu + n;
            else { var ab = Math.min(tmp, n); tmp -= ab; cu = Math.max(0, cu - (n - ab)); }
            sd.hp.cur = cu; sd.hp.tmp = tmp; after = cu;
          } else if (sys === 'gurps') {
            sd.at = sd.at || {}; sd.sec = sd.sec || {};
            var gm = num(sd.at.st, 10) + num(sd.sec.hp, 0), gc = num(sd.hpCur, gm); before = gc;
            gc = heal ? Math.min(gm, gc + n) : Math.max(-5 * gm, gc - n); sd.hpCur = gc; after = gc;
          } else {
            sd.hp = sd.hp || {}; var hm = num(sd.hp.max, 6), hv = num(sd.hp.v, 0); before = hm - hv;
            hv = heal ? Math.max(0, hv - n) : Math.min(hm, hv + n); sd.hp.v = hv; after = hm - hv;
          }
          var res = await post('/rest/v1/rpc/save_sheet', { cid: cid, uid: u, doc: doc, base: r.rev || 0 }), ok = res && res[0] && res[0].ok;
          if (!ok) continue;
          var pr = partyRow(u), inf = pr && pr.info && Array.isArray(pr.info.b) ? JSON.parse(JSON.stringify(pr.info)) : null;
          if (inf && inf.b[0]) { inf.b[0][1] = after; if (sys === 'dnd5e') { if (tmp > 0) inf.t = tmp; else delete inf.t; } pr.info = inf; post('/rest/v1/rpc/put_summary', { cid: cid, uid: u, inf: inf }).catch(function () { /* o jogador manda o resumo depois */ }); }
          if (ctx.onParty) ctx.onParty();
          drawObjs(); insp();
          var txt = sys === 'daggerheart' ? who + (heal ? ' limpou ' : ' marcou ') + n + ' PV (' + before + ' → ' + after + ')' : who + (heal ? ' recuperou ' + n + ' de vida' : ' sofreu ' + n + ' de dano') + ' (' + before + ' → ' + after + ')';
          ctx.toast(txt + '.', heal ? 'good' : '');
          if (fight && fight.on) logEv('hp', txt, { tok: o.id });
          return;
        }
        ctx.toast('A ficha mudou ao mesmo tempo. Tente de novo.', 'bad');
      } catch (e) { ctx.toast('Não consegui mudar a ficha.', 'bad'); }
    }

    /* ---------- apontar no mapa ---------- */
    var pingLast = null, lpT = null;
    function myCol() { var mine = allObjs().filter(function (o) { return o.kind === 'tok' && o.owner === uid; })[0]; return owner ? '#B08CFF' : ((mine && mine.data.col) || '#5EE1F5'); }
    function showPing(x, y, who, col) {
      var k = view.k || 1, r = 26 / k, id = 'pg' + Math.random().toString(36).slice(2, 8);
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', id); g.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
      g.innerHTML = '<circle r="' + r * 0.35 + '" fill="' + esc(col) + '"/>' +
        [0, 0.4, 0.8].map(function (b) { return '<circle r="' + r * 0.4 + '" fill="none" stroke="' + esc(col) + '" stroke-width="' + 3 / k + '"><animate attributeName="r" from="' + r * 0.4 + '" to="' + r * 2.2 + '" dur="1.2s" begin="' + b + 's" repeatCount="2"/><animate attributeName="opacity" from="1" to="0" dur="1.2s" begin="' + b + 's" repeatCount="2"/></circle>'; }).join('') +
        (who ? '<text y="' + (-r * 0.9) + '" text-anchor="middle" font-size="' + 14 / k + '" font-weight="700" fill="#fff" stroke="#000" stroke-width="' + 4 / k + '" paint-order="stroke">' + esc(who) + '</text>' : '');
      L.ping.appendChild(g); snd('ping');
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 3300);
    }
    function doPing(w) {
      var mid = curMapId(); if (!mid) return;
      var who = (ctx.myName ? ctx.myName() : '') || '', col = myCol();
      showPing(w[0], w[1], who, col);
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* ok */ }
      post('/rest/v1/map_pings', { campaign_id: cid, map_id: mid, x: Math.round(w[0]), y: Math.round(w[1]), who: who.slice(0, 60), col: col }, { Prefer: 'return=minimal' }).catch(function () { /* o sinal é só um extra */ });
    }
    async function pollPings() {
      var mid = curMapId(); if (!mid || dead) return;
      try {
        if (pingLast === null) {
          var last = await j('/rest/v1/map_pings?campaign_id=eq.' + cid + '&select=id&order=id.desc&limit=1');
          pingLast = last && last[0] ? last[0].id : 0;
          if (owner) api('/rest/v1/map_pings?campaign_id=eq.' + cid + '&at=lt.' + encodeURIComponent(new Date(Date.now() - 86400000).toISOString()), { method: 'DELETE' }).catch(function () { /* ok */ });
          return;
        }
        var rows = await j('/rest/v1/map_pings?campaign_id=eq.' + cid + '&id=gt.' + pingLast + '&select=id,user_id,map_id,x,y,who,col,at&order=id.asc&limit=20');
        (rows || []).forEach(function (p) {
          pingLast = Math.max(pingLast, p.id);
          if ((p.user_id === uid && !spect) || p.map_id !== curMapId() || Date.now() - new Date(p.at).getTime() > 15000) return;
          showPing(num(p.x, 0), num(p.y, 0), p.who, p.col || '#5EE1F5');
        });
      } catch (e) { /* tenta no próximo ciclo */ }
    }

    /* ---------- adversários da aventura e mapa da cena (app do Mestre) ---------- */
    function addFoe(f) {
      if (!map || !f) return;
      var base = String(f.n || 'Adversário').slice(0, 30), qty = f.mins > 0 ? f.mins : 1, c = viewCenterCell();
      var used = allObjs().filter(function (o) { return o.kind === 'tok' && !o.gone && o.data.n && o.data.n.indexOf(base) === 0; }).map(function (o) { var m = /(\d+)$/.exec(o.data.n); return m ? +m[1] : 1; });
      var nx = used.length ? Math.max.apply(null, used) + 1 : 1;
      for (var i = 0; i < qty; i++) {
        var p = freeCell(c[0], c[1]), hp = f.mins > 0 ? 1 : num(f.hp, 0);
        create('tok', { n: (qty > 1 || used.length ? base + ' ' + (nx + i) : base), x: p[0], y: p[1], s: 1, col: '#FF8F8F', foe: f.id || '', hp: hp > 0 ? { v: hp, m: hp } : undefined }, null, false);
      }
      editOpen = false; insp();
      ctx.toast(qty > 1 ? qty + ' ' + base + ' no mapa.' : base + ' no mapa.', '');
    }
    var wantMap = null;
    function useMap(id, show) {
      if (!owner) return;
      if (!maps.length && !map) { wantMap = { id: id, show: show }; return; }
      var m = maps.filter(function (x) { return x.id === id; })[0]; if (!m) return;
      var wasShown = maps.some(function (x) { return x.shown; });
      if (!map || map.id !== m.id) setMap(m);
      if (show && wasShown && !m.shown) setShown();
    }

    /* ---------- combate ---------- */
    function entCol(e) { var o = objs[e.k]; return (o && o.data && o.data.col) || e.c || '#9A95B8'; }
    function iniLabel() { return sys === 'gurps' ? 'Vel. básica' : 'Iniciativa'; }
    function stepsOf(a, b) { return clamp(Math.round(Math.max(Math.abs(num(b.x, 0) - num(a.x, 0)), Math.abs(num(b.y, 0) - num(a.y, 0)))), 1, 4); }
    function fightSnd(a, b) {
      var ao = !!(a && a.on), bo = !!(b && b.on);
      if (!ao && bo) { snd('fight'); return; }
      if (ao && !bo) { snd('end'); return; }
      if (!bo || b.phase !== 'go') return;
      if (a.phase !== 'go' || num(b.round, 0) > num(a.round, 0)) snd('round');
      else if (b.turn !== a.turn) snd('turn');
    }
    async function fightLoad() {
      try {
        var rows = await j('/rest/v1/combats?campaign_id=eq.' + cid + '&select=data,rev'), r = rows && rows[0];
        var rev = r ? r.rev : -2;
        if (rev === fightRev) return;
        var first = fightRev === -1, prevF = fight;
        fightRev = rev; fight = r ? r.data : null;
        if (!first) fightSnd(prevF, fight);
        fightPanel(); drawHl(); if (owner && sel) insp();
      } catch (e) { /* tenta no próximo ciclo */ }
    }
    async function fightWrite(fn) {
      if (fightBusy) return; fightBusy = true;
      try {
        for (var at = 0; at < 4; at++) {
          var rows = await j('/rest/v1/combats?campaign_id=eq.' + cid + '&select=data,rev'), r = rows && rows[0];
          var res = fn(r ? JSON.parse(JSON.stringify(r.data || {})) : {}); if (!res) return;
          var out = !r
            ? await post('/rest/v1/combats?on_conflict=campaign_id', { campaign_id: cid, data: res.data }, { Prefer: 'resolution=merge-duplicates,return=representation' })
            : await patch('/rest/v1/combats?campaign_id=eq.' + cid + '&rev=eq.' + r.rev, { data: res.data }, { Prefer: 'return=representation' });
          if (out && out[0]) {
            var pf0 = fight; fight = out[0].data; fightRev = out[0].rev; fightSnd(pf0, fight); fightPanel(); drawHl(); if (sel) insp();
            (res.ev || []).forEach(function (e) { logEv(e[0], e[1], e[2]); });
            if (res.newRound) tickConds();
            return;
          }
        }
        ctx.toast('O combate mudou ao mesmo tempo em outro lugar. Tente de novo.', 'bad');
      } catch (e) { ctx.toast('Não consegui atualizar o combate.', 'bad'); }
      finally { fightBusy = false; }
    }
    function logEv(ev, text, extra) {
      post('/rest/v1/rolls', { campaign_id: cid, who: ((ctx.myName ? ctx.myName() : '') || 'Mestre').slice(0, 60), label: String(text).slice(0, 120), expr: '', result: Object.assign({ ev: ev, round: (fight && fight.round) || 0 }, extra || {}), kind: 'luta' }, { Prefer: 'return=minimal' })
        .then(function () { if (ctx.onLog) ctx.onLog(); }).catch(function () { /* o histórico é um extra */ });
    }
    function logMove(o, a, b) {
      if (!fight || !fight.on || fight.phase !== 'go' || o.hidden || !a || !b) return;
      if (owner && fog && fog.on && (!shown(a[0], a[1]) || !shown(b[0], b[1]))) return;
      var n = G.dist(a, b, rule()); if (!n) return;
      logEv('move', tokName(o) + ' andou ' + walked(n), { tok: o.id });
    }
    function nextIdx(d, from, dir) {
      var L2 = d.list || [], n = L2.length; if (!n) return { i: 0, wrap: false };
      var i = from, wrap = false;
      for (var k = 0; k < n; k++) {
        i += dir; if (i >= n) { i = 0; wrap = true; } if (i < 0) { i = n - 1; wrap = true; }
        var e = L2[i], o = objs[e.k];
        if (!e.out && !(o && o.data && o.data.dead)) return { i: i, wrap: wrap };
      }
      return { i: ((from + dir) % n + n) % n, wrap: wrap };
    }
    function turnEv(d) { var e = (d.list || [])[d.turn]; if (!e) return null; var nm = e.h ? 'alguém' : entName(e); return ['turn', sys === 'daggerheart' ? 'Holofote: ' + nm : 'Rodada ' + d.round + ' · vez de ' + nm, { u: e.u || null, tok: e.k, round: d.round }]; }
    function sortList(L2) { return L2.map(function (e, i) { return [e, i]; }).sort(function (a, b) { var x = a[0].ini, y = b[0].ini; if (x == null && y == null) return a[1] - b[1]; if (x == null) return 1; if (y == null) return -1; return y - x || a[1] - b[1]; }).map(function (p) { return p[0]; }); }
    function entryOf(o) { return { k: o.id, n: tokName(o).slice(0, 40), u: o.owner || null, c: (o.data && o.data.col) || '', ini: null, h: !!o.hidden }; }
    function startFight() {
      var dh = sys === 'daggerheart';
      var toks = allObjs().filter(function (o) { return o.kind === 'tok' && !o.gone && !o.hidden && !(o.data && o.data.dead) && (!fog || !fog.on || inShown(o)); });
      if (!toks.length) { ctx.toast('Coloque tokens no mapa para começar o combate.', ''); return; }
      toks.sort(function (a, b) { return (b.owner ? 1 : 0) - (a.owner ? 1 : 0) || tokName(a).localeCompare(tokName(b), 'pt-BR'); });
      fightWrite(function () { var d = { on: true, round: 1, turn: dh ? -1 : 0, phase: dh ? 'go' : 'ini', list: toks.map(entryOf), map: map && map.id }; return { data: d, ev: [['start', 'Começou o combate: ' + d.list.map(function (e) { return e.n; }).join(', '), {}]] }; });
    }
    function fightAct(a, k, v) {
      if (a === 'start') { startFight(); return; }
      fightWrite(function (d) {
        if (!d.on) return null;
        var L2 = d.list || [], ev = [], at = function (key) { return L2.findIndex(function (x) { return x.k === key; }); }, curK = L2[d.turn] && L2[d.turn].k;
        if (a === 'go' || (a === 'next' && d.phase !== 'go')) { d.list = sortList(L2); d.phase = 'go'; d.round = 1; d.turn = nextIdx(d, -1, 1).i; ev.push(turnEv(d)); }
        else if (a === 'next') { var nx = nextIdx(d, d.turn, 1), nr = nx.wrap && d.turn >= 0; if (nr) d.round = (d.round || 1) + 1; d.turn = nx.i; ev.push(turnEv(d)); if (nr) return { data: d, ev: ev.filter(Boolean), newRound: true }; }
        else if (a === 'prev') { var pv = nextIdx(d, d.turn < 0 ? 0 : d.turn, -1); if (pv.wrap && d.round > 1) d.round--; d.turn = pv.i; ev.push(turnEv(d)); }
        else if (a === 'spot') { var ix = at(k); if (ix < 0) return null; d.turn = ix; d.phase = 'go'; ev.push(turnEv(d)); }
        else if (a === 'sort') { d.list = sortList(L2); if (curK) d.turn = Math.max(0, d.list.findIndex(function (e) { return e.k === curK; })); }
        else if (a === 'ini') { var i0 = at(k); if (i0 < 0) return null; L2[i0].ini = v; }
        else if (a === 'rollfoes') { var got = []; L2.forEach(function (x) { if (!x.u && x.ini == null) { x.ini = d20(); got.push((x.h ? 'alguém' : x.n) + ' ' + x.ini); } }); if (!got.length) return null; ev.push(['ini', 'Iniciativa dos adversários: ' + got.join(' · '), {}]); }
        else if (a === 'up' || a === 'down') { var i2 = at(k), j2 = i2 + (a === 'up' ? -1 : 1); if (i2 < 0 || j2 < 0 || j2 >= L2.length) return null; var t = L2[i2]; L2[i2] = L2[j2]; L2[j2] = t; if (curK) d.turn = at(curK); }
        else if (a === 'out') { var i4 = at(k); if (i4 < 0) return null; L2[i4].out = !L2[i4].out; }
        else if (a === 'rm') { var i3 = at(k); if (i3 < 0) return null; L2.splice(i3, 1); d.turn = curK && curK !== k ? at(curK) : Math.min(Math.max(d.turn, 0), L2.length - 1); }
        else if (a === 'add') { var o = objs[k]; if (!o || at(k) >= 0) return null; var en = entryOf(o); L2.push(en); if (!o.hidden) ev.push(['join', en.n + ' entrou no combate', { tok: k }]); }
        else if (a === 'end') { var rounds = d.round || 1; return { data: { on: false, last: { round: rounds } }, ev: [['end', 'Fim do combate' + (sys === 'daggerheart' ? '' : ' · ' + rounds + (rounds === 1 ? ' rodada' : ' rodadas')), {}]] }; }
        else return null;
        return { data: d, ev: ev.filter(Boolean) };
      });
    }
    async function myIni(k, v) {
      try { await post('/rest/v1/rpc/set_init', { cid: cid, k: k, v: v }); fightRev = -1; fightLoad(); }
      catch (e) { ctx.toast('Não consegui anotar a iniciativa.', 'bad'); }
    }
    async function rollMine(k) { if (!ctx.rollInit) return; var v = await ctx.rollInit(); if (v != null) myIni(k, v); }
    function fightPanel() {
      if (!fightBox) return;
      if (document.activeElement && fightBox.contains(document.activeElement) && document.activeElement.getAttribute('data-mfi')) return;
      var f = fight, dh = sys === 'daggerheart', h = '<div class="mf">';
      if (!f || !f.on) {
        h += '<div class="mf-head"><h3>Combate</h3></div>';
        if (owner) h += '<button type="button" class="mp-b pri wide" data-mfa="start" style="min-height:46px">' + ICON.sword + 'Iniciar combate</button><p class="mp-hint">' + (map ? 'Entram os tokens visíveis do mapa. ' + (dh ? 'Depois você passa o holofote para quem agir.' : 'Cada um anota a ' + iniLabel().toLowerCase() + ' e você começa a rodada.') : 'Primeiro, coloque um mapa e os tokens.') + '</p>';
        else h += '<p class="mp-hint">Nenhum combate agora. Quando o Mestre começar, a ordem aparece aqui.</p>';
        fightBox.innerHTML = h + '</div>'; return;
      }
      var L2 = f.list || [], cur = f.phase === 'go' ? L2[f.turn] : null;
      h += '<div class="mf-head"><h3>Combate</h3>' + (dh ? '' : '<span class="r">' + (f.phase === 'go' ? 'Rodada ' + (f.round || 1) : esc(iniLabel())) + '</span>') + '</div>';
      h += '<p class="mf-now"><small>' + (f.phase !== 'go' ? (sys === 'gurps' ? 'Anotando a velocidade básica' : 'Rolando a iniciativa') : (dh ? 'Holofote' : 'Vez de')) + '</small>' + (cur ? esc(entName(cur)) : (f.phase === 'go' ? 'ninguém ainda' : 'todos')) + '</p>';
      h += '<ol class="mf-list">' + L2.map(function (e, i) {
        var o = objs[e.k], deadT = o && o.data && o.data.dead, mine = e.u && e.u === uid, isCur = f.phase === 'go' && i === f.turn, nm = entName(e), val = '';
        if (!dh) val = (owner || mine) ? '<input class="mf-ini" type="number" step="1" inputmode="numeric" data-mfi="' + esc(e.k) + '" value="' + (e.ini == null ? '' : e.ini) + '" aria-label="' + esc(iniLabel() + ' de ' + nm) + '" placeholder="—">' : '<span class="mf-v">' + (e.ini == null ? '—' : esc(e.ini)) + '</span>';
        var roll = !owner && mine && sys === 'dnd5e' && e.ini == null && ctx.rollInit ? '<button type="button" class="mp-b" data-mfr="' + esc(e.k) + '" style="min-height:34px">Rolar</button>' : '';
        var acts = owner ? '<span class="mf-act"><button type="button" data-mfa="up" data-mk="' + esc(e.k) + '" aria-label="Subir">▲</button><button type="button" data-mfa="down" data-mk="' + esc(e.k) + '" aria-label="Descer">▼</button><button type="button" data-mfa="out" data-mk="' + esc(e.k) + '" aria-label="' + (e.out ? 'Voltar ao combate' : 'Pular por enquanto') + '">' + (e.out ? '↺' : '⏸') + '</button><button type="button" data-mfa="rm" data-mk="' + esc(e.k) + '" aria-label="Tirar do combate">×</button></span>' : '';
        var tag = (deadT ? '<small>derrotado</small>' : '') + (mine ? '<small>você</small>' : '') + (o && Array.isArray(o.data.cond) ? o.data.cond.filter(function (x) { return CONDM[x.k]; }).map(function (x) { return '<i class="mf-c" style="background:' + CONDM[x.k][2] + '" title="' + esc(CONDM[x.k][1]) + '">' + esc(condAb(x.k)) + (x.r ? ' ' + x.r : '') + '</i>'; }).join('') : '');
        var nameEl = owner && f.phase === 'go' ? '<button type="button" class="mf-n" data-mfa="spot" data-mk="' + esc(e.k) + '" title="' + (dh ? 'Dar o holofote' : 'Passar a vez para este') + '">' + esc(nm) + tag + '</button>' : '<span class="mf-n">' + esc(nm) + tag + '</span>';
        return '<li class="mf-it' + (isCur ? ' cur' : '') + (e.out || deadT ? ' out' : '') + '"><i class="mf-dot" style="background:' + esc(entCol(e)) + '"></i>' + nameEl + roll + val + acts + '</li>';
      }).join('') + '</ol>';
      if (owner) {
        if (f.phase !== 'go') h += '<div class="mf-go"><button type="button" class="mp-b pri" data-mfa="go">Começar a rodada 1</button></div>' + (sys === 'dnd5e' ? '<div class="mp-row"><button type="button" class="mp-b" data-mfa="rollfoes">Rolar d20 dos adversários</button></div>' : '');
        else h += '<div class="mf-go"><button type="button" class="mp-b sq" data-mfa="prev" aria-label="Voltar a vez">◀</button><button type="button" class="mp-b pri" data-mfa="next">' + (dh ? 'Próximo holofote' : 'Próximo turno') + ' ▶</button></div>';
        var so = selObj();
        h += '<div class="mp-row">' + (dh ? '' : '<button type="button" class="mp-b" data-mfa="sort">Ordenar</button>') + (so && so.kind === 'tok' && !L2.some(function (e) { return e.k === so.id; }) ? '<button type="button" class="mp-b" data-mfa="add" data-mk="' + so.id + '">+ ' + esc(tokName(so)) + '</button>' : '') + '<button type="button" class="mp-b bad" data-mfa="end">Encerrar</button></div>';
        if (dh) h += '<p class="mp-hint">Toque num nome para dar o holofote.</p>';
      } else if (f.phase !== 'go') h += '<p class="mp-hint">' + (sys === 'gurps' ? 'Anote a sua velocidade básica.' : 'Role ou anote a sua iniciativa.') + ' O Mestre começa a rodada quando todos estiverem prontos.</p>';
      fightBox.innerHTML = h + '</div>';
    }

    /* ---------- ponteiro ---------- */
    function snapCell(px, py) { var w = toWorld(px, py); return G.cellAt(w[0], w[1]); }
    function pinchStart() {
      var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
      gest = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: view.k, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, vx: view.x, vy: view.y };
      if (drag && drag.started && objs[drag.id]) objs[drag.id].data = Object.assign({}, objs[drag.id].data, { x: drag.x0, y: drag.y0 });
      if (mode === 'ruler' && ruler && !ruler.keep) ruler = null;
      if (mode === 'point' && gest && gest.moved && owner) { laserEnd(); laserOut(null); }
      mode = 'pinch'; drag = null; fstroke = null; frect = null; dstroke = null; svg.classList.remove('dragging'); drawObjs(); drawRuler();
    }
    function paint(c, r) { var ch = false; G.disk(c, r, fogSize - 1).forEach(function (p) { if (setCell(p[0], p[1], fogMode === 'show')) ch = true; }); if (ch) fogChanged(); }
    svg.addEventListener('pointerdown', function (e) {
      if (!(owner ? map : P)) return;
      /* um toque novo (primeiro dedo) zera dedos que ficaram presos: no iPad um "levantar" perdido virava pinça */
      if (e.isPrimary || e.pointerType === 'mouse') { pts = {}; if (mode === 'pinch' || mode === 'idle') { mode = null; gest = null; } }
      if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault();
      var p = rel(e); pts[e.pointerId] = p;
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      if (Object.keys(pts).length === 2) { clearTimeout(lpT); pinchStart(); return; }
      if (Object.keys(pts).length > 2) return;
      var hit = e.target.closest ? e.target.closest('[data-id]') : null, o = hit ? objs[hit.getAttribute('data-id')] : null;
      if (e.button === 1) { mode = 'pan'; gest = { sx: p[0], sy: p[1], vx: view.x, vy: view.y }; return; }
      if (tool === 'ruler') {
        var s = snapCell(p[0], p[1]);
        mode = 'ruler'; msgText = '';
        rdown = { x: p[0], y: p[1], s: s, moved: false, had: !!(ruler && ruler.keep) };
        if (!rdown.had) ruler = { pts: [s, s], keep: false };
        drawRuler(); return;
      }
      if (tool === 'fog' && owner && fog && fog.on) {
        var w = toWorld(p[0], p[1]); msgText = '';
        if (fogShape === 'rect') { mode = 'frect'; frect = { a: w, b: w }; drawRuler(); return; }
        mode = 'fbrush'; var c = G.cellAt(w[0], w[1]); fstroke = { last: w }; paint(c[0], c[1]); drawRuler(); return;
      }
      if (tool === 'draw' && owner && map) {
        msgText = '';
        if (dk === 'erase') { mode = 'erase'; eraseAt(e); return; }
        var wd = toWorld(p[0], p[1]); mode = 'draw'; dstroke = { k: dk, a: wd, b: wd, pts: [wd] }; drawRuler(); return;
      }
      if (tool === 'point') { mode = 'point'; gest = { sx: p[0], sy: p[1], moved: false, w: toWorld(p[0], p[1]) }; return; }
      if (tool === 'grid' && owner) { mode = 'gridmove'; gest = { sx: p[0], sy: p[1], ox: G.ox, oy: G.oy, fg: FG ? Object.assign({}, FG) : null }; svg.classList.add('dragging'); return; }
      if (o) {
        if (owner && sel !== o.id) { sel = o.id; editOpen = false; selDraw = true; fightPanel(); }
        if (canMove(o) && !(o.data && o.data.lk)) {
          var wv = toWorld(p[0], p[1]), ctr = o.kind === 'tok' ? tokCenter(o.data) : [G.ox + num(o.data.x, 0) * G.s, G.oy + num(o.data.y, 0) * G.s];
          mode = 'drag'; drag = { id: o.id, sx: p[0], sy: p[1], x0: num(o.data.x, 0), y0: num(o.data.y, 0), gx: wv[0] - ctr[0], gy: wv[1] - ctr[1], from: o.kind === 'tok' ? tokCell(o.data) : null, started: false };
          return;
        }
        mode = 'tap'; return;
      }
      mode = 'pan'; gest = { sx: p[0], sy: p[1], vx: view.x, vy: view.y, moved: false };
      if (tool === 'move' && e.button !== 2) { var pw = toWorld(p[0], p[1]); clearTimeout(lpT); lpT = setTimeout(function () { if (mode === 'pan' && gest && !gest.moved && Object.keys(pts).length === 1) { doPing(pw); mode = 'idle'; gest = null; } }, 550); }
    });
    svg.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      var p = rel(e); pts[e.pointerId] = p;
      if (mode === 'pinch') {
        var k = Object.keys(pts); if (k.length < 2) return;
        var a = pts[k[0]], b = pts[k[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        var Lm = limits(), nk = gest.k * d / gest.d; if (Lm) nk = clamp(nk, Lm.minK, Lm.maxK);
        var w = [(gest.mx - gest.vx) / gest.k, (gest.my - gest.vy) / gest.k];
        view.k = nk; view.x = mx - w[0] * nk; view.y = my - w[1] * nk; clampView(); applyView(); return;
      }
      if (mode === 'erase') { eraseAt(e); return; }
      if (mode === 'draw' && dstroke) {
        var wq = toWorld(p[0], p[1]); dstroke.b = wq;
        if (dstroke.k === 'pen' || dstroke.k === 'area') { var lp = dstroke.pts[dstroke.pts.length - 1]; if (Math.hypot(wq[0] - lp[0], wq[1] - lp[1]) > Math.max(G.s * 0.04, 2 / view.k)) dstroke.pts.push(wq); }
        drawRuler(); return;
      }
      if (mode === 'point' && gest) {
        if (!gest.moved && Math.abs(p[0] - gest.sx) + Math.abs(p[1] - gest.sy) > 8) { gest.moved = true; if (!owner) { mode = 'pan'; gest = { sx: p[0], sy: p[1], vx: view.x, vy: view.y, moved: true }; return; } }
        if (gest.moved) { var wl = toWorld(p[0], p[1]); laserPush(wl[0], wl[1]); laserOut(wl); }
        return;
      }
      if (mode === 'pan') {
        if (Math.abs(p[0] - gest.sx) + Math.abs(p[1] - gest.sy) > 8) { gest.moved = true; clearTimeout(lpT); }
        view.x = gest.vx + p[0] - gest.sx; view.y = gest.vy + p[1] - gest.sy; clampView(); applyView(); return;
      }
      if (mode === 'gridmove') {
        var dx = (p[0] - gest.sx) / view.k, dy = (p[1] - gest.sy) / view.k;
        map.cfg = Object.assign({}, map.cfg, { ox: Math.round(gest.ox + dx), oy: Math.round(gest.oy + dy) }); drawAll(); return;
      }
      if (mode === 'fbrush' && fstroke) {
        var w2 = toWorld(p[0], p[1]), l = fstroke.last, steps = Math.max(1, Math.ceil(Math.hypot(w2[0] - l[0], w2[1] - l[1]) / (G.s * 0.4)));
        for (var i = 1; i <= steps; i++) { var q = G.cellAt(l[0] + (w2[0] - l[0]) * i / steps, l[1] + (w2[1] - l[1]) * i / steps); paint(q[0], q[1]); }
        fstroke.last = w2; return;
      }
      if (mode === 'frect' && frect) { frect.b = toWorld(p[0], p[1]); drawRuler(); return; }
      if (mode === 'ruler' && ruler && rdown) {
        var s = snapCell(p[0], p[1]);
        if (!rdown.moved && Math.abs(p[0] - rdown.x) + Math.abs(p[1] - rdown.y) > 6) { rdown.moved = true; if (rdown.had) ruler = { pts: [rdown.s, s], keep: false }; }
        if (rdown.moved) { ruler.pts[ruler.pts.length - 1] = s; drawRuler(); }
        return;
      }
      if (mode === 'drag' && drag) {
        if (!drag.started && Math.abs(p[0] - drag.sx) + Math.abs(p[1] - drag.sy) < 5) return;
        var o = objs[drag.id]; if (!o) return;
        if (!drag.started) { drag.started = true; svg.classList.add('dragging'); }
        var wv = toWorld(p[0], p[1]), tx = wv[0] - drag.gx, ty = wv[1] - drag.gy, nx, ny;
        if (o.kind === 'tok') {
          if (G.t === 'hx') { var hc = G.cellAt(tx, ty); nx = hc[0]; ny = hc[1]; }
          else { var sz = tokSize(o.data); nx = Math.round((tx - G.ox) / G.s - sz / 2); ny = Math.round((ty - G.oy) / G.s - sz / 2); }
          o.data = Object.assign({}, o.data, { x: nx, y: ny });
          ruler = { pts: [drag.from, tokCell(o.data)], keep: false, drag: true };
        } else {
          o.data = Object.assign({}, o.data, { x: Math.round(((tx - G.ox) / G.s) * 2) / 2, y: Math.round(((ty - G.oy) / G.s) * 2) / 2 });
        }
        placeEl(o); drawHl(); drawRuler();
      }
    });
    /* durante o arrasto só o próprio desenho se move: redesenhar tiraria do lugar o elemento que está sob o dedo */
    function objTf(d) {
      var c = G.s, sh = d.sh || 'rect', x = G.ox + num(d.x, 0) * c, y = G.oy + num(d.y, 0) * c, w = Math.max(0.1, num(d.w, 1)) * c, h = Math.max(0.05, num(d.h, 1)) * c, rot = num(d.rot, 0);
      if (sh === 'circle' || sh === 'path') return 'translate(' + x + ' ' + y + ')';
      if (sh === 'cone') return 'translate(' + x + ' ' + y + ') rotate(' + rot + ')';
      return 'translate(' + (x + w / 2) + ' ' + (y + h / 2) + ') rotate(' + rot + ')';
    }
    function placeEl(o) {
      var g = svg.querySelector('[data-id="' + o.id + '"]'); if (!g) { drawObjs(); return; }
      if (o.kind === 'tok') { var c = tokCenter(o.data); g.setAttribute('transform', 'translate(' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ')'); }
      else g.setAttribute('transform', objTf(o.data));
      g.setAttribute('opacity', '0.8');
    }
    function endPtr(e) {
      if (!pts[e.pointerId]) return;
      clearTimeout(lpT);
      delete pts[e.pointerId];
      try { svg.releasePointerCapture(e.pointerId); } catch (x) { /* ok */ }
      if (mode === 'pinch' || mode === 'idle') { mode = Object.keys(pts).length ? 'idle' : null; gest = null; return; }
      svg.classList.remove('dragging');
      if (mode === 'gridmove' && gest) { setCfg({ ox: G.ox, oy: G.oy }, false, true, gest.fg); panel(); }
      else if (mode === 'fbrush') fstroke = null;
      else if (mode === 'draw' && dstroke) { var dsx = dstroke; dstroke = null; drawRuler(); finishDraw(dsx); }
      else if (mode === 'erase') bars();
      else if (mode === 'point' && gest) { if (!gest.moved) doPing(gest.w); else { laserEnd(); laserOut(null); } }
      else if (mode === 'frect' && frect) {
        var a = frect.a, b = frect.b, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]), ch = false;
        if ((x1 - x0) * view.k < 6 && (y1 - y0) * view.k < 6) { var c = G.cellAt(a[0], a[1]); ch = setCell(c[0], c[1], fogMode === 'show'); }
        else { var rg = G.range(x0, y0, x1, y1); for (var cc = rg[0]; cc <= rg[2]; cc++) for (var rr = rg[1]; rr <= rg[3]; rr++) { var ce = G.center(cc, rr); if (ce[0] >= x0 && ce[0] <= x1 && ce[1] >= y0 && ce[1] <= y1 && setCell(cc, rr, fogMode === 'show')) ch = true; } }
        frect = null; drawRuler(); if (ch) fogChanged();
      }
      else if (mode === 'ruler' && ruler && rdown) {
        if (!rdown.moved && rdown.had) { var a0 = ruler.pts[0], a1 = ruler.pts[1]; if (ruler.pts.length === 2 && a0[0] === a1[0] && a0[1] === a1[1]) ruler.pts[1] = rdown.s; else ruler.pts.push(rdown.s); }
        ruler.keep = true; rdown = null; drawRuler();
      }
      else if (mode === 'drag' && drag) {
        var o = objs[drag.id], d = drag; drag = null;
        if (o && d.started) {
          var nx = num(o.data.x, 0), ny = num(o.data.y, 0); o.data = Object.assign({}, o.data, { x: d.x0, y: d.y0 });
          if (nx !== d.x0 || ny !== d.y0) moveTo(o, nx, ny, d.from); else drawObjs();
          var keepR = ruler; setTimeout(function () { if (ruler === keepR) { ruler = null; drawRuler(); } }, 1400);
        } else drawObjs();
      }
      else if (mode === 'tap') drawObjs();
      else if (mode === 'pan' && gest && !gest.moved) { if (owner && sel) { sel = null; drawObjs(); insp(); fightPanel(); } if (ruler && tool !== 'ruler') { ruler = null; drawRuler(); } }
      mode = null; gest = null;
      if (selDraw) { selDraw = false; drawObjs(); insp(); }
    }
    svg.addEventListener('pointerup', endPtr);
    svg.addEventListener('pointercancel', endPtr);
    svg.addEventListener('lostpointercapture', endPtr);
    window.addEventListener('pointerup', endPtr);
    window.addEventListener('pointercancel', endPtr);
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) { svg.addEventListener(t, function (e) { e.preventDefault(); }); });
    svg.addEventListener('touchstart', function (e) { if (e.touches.length > 1 || mode) e.preventDefault(); }, { passive: false });
    svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p[0], p[1]); }, { passive: false });
    svg.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ---------- cliques e campos ---------- */
    function toolMsg() {
      if (tool === 'point') return owner ? 'Toque para sinalizar. Arraste para apontar ao vivo na tela da mesa.' : 'Toque no mapa para sinalizar para a mesa.';
      if (tool === 'draw') return dk === 'erase' ? 'Toque ou passe o dedo sobre um desenho para apagar.' : (dk === 'pen' ? 'Passe o dedo para riscar.' : (dk === 'area' ? 'Contorne a área com o dedo.' : (dk === 'rect' ? 'Arraste para marcar o retângulo.' : 'Arraste do centro para fora.')));
      return tool === 'ruler' ? 'Arraste para medir. Toque em vários pontos para fazer curvas.'
        : (tool === 'fog' ? (fog && fog.on ? (fogShape === 'rect' ? 'Arraste para marcar a área a ' + (fogMode === 'show' ? 'revelar.' : 'esconder.') : 'Passe o dedo para ' + (fogMode === 'show' ? 'revelar.' : 'esconder.')) : '')
          : (tool === 'grid' ? 'Arraste para alinhar a grade com o desenho do mapa.' : ''));
    }
    function setTool(t) {
      var was = tool;
      tool = was === t && t !== 'move' ? 'move' : t;
      ruler = null; frect = null; dstroke = null; msgText = toolMsg();
      if (tool !== 'fog' && fogPrev) { fogPrev = false; regeom(); drawAll(); fit(); }
      svg.setAttribute('class', 'mp-svg' + (tool === 'ruler' ? ' ruler' : (tool === 'grid' ? ' grid' : (tool === 'fog' ? ' fog' : (tool === 'draw' ? ' draw' : (tool === 'point' ? ' point' : ''))))));
      drawRuler(); bars(); if (was === 'grid' || tool === 'grid') panel();
    }
    function onClick(e) {
      var t = e.target.closest(SELECTOR);
      if (!t || !e.currentTarget.contains(t)) return;
      var ds = t.dataset;
      if (ds.mt) { setTool(ds.mt); return; }
      if (ds.mfm) { fogMode = ds.mfm; msgText = toolMsg(); drawRuler(); bars(); return; }
      if (ds.mfs) { fogShape = ds.mfs; msgText = toolMsg(); drawRuler(); bars(); return; }
      if (ds.mfz) { fogSize = parseInt(ds.mfz, 10) || 1; bars(); return; }
      if (ds.mdk) { dk = DKINDS[ds.mdk] ? ds.mdk : 'pen'; msgText = toolMsg(); drawRuler(); bars(); return; }
      if (ds.mdf) { dfx = ds.mdf; bars(); return; }
      if (ds.mdz) { dsz = clamp(parseInt(ds.mdz, 10) || 2, 1, 3); bars(); return; }
      if (ds.mdl) { dcol = ds.mdl; bars(); return; }
      if (ds.mgt) { if (!map) return; setCfg({ gt: ds.mgt, per: ds.mgt === 'hx' && sys === 'gurps' ? 1 : num(map.cfg.per, 1.5) }, false, true); panel(); return; }
      if (ds.mgo) { setCfg({ go: ds.mgo }, false, true); panel(); return; }
      if (ds.mpre != null) { addPreset(parseInt(ds.mpre, 10)); return; }
      if (ds.mn) { var v = ds.mn.split(',').map(Number); setCfg({ ox: G.ox + v[0], oy: G.oy + v[1] }, true, true); return; }
      if (ds.mc) { var o = selObj(); if (o) { queue(o.id, { col: ds.mc }); insp(); fightPanel(); } return; }
      if (ds.mfa) { if (owner) fightAct(ds.mfa, ds.mk); return; }
      if (ds.mfr) { rollMine(ds.mfr); return; }
      if (ds.mcd) { var oc = selObj(); if (oc) setCond(oc, ds.mcd, t.getAttribute('aria-pressed') !== 'true'); return; }
      if (ds.mfoe != null) { var fl = ctx.foes ? ctx.foes() : []; addFoe(fl[+ds.mfoe]); return; }
      var a = ds.ma, r = vp();
      if (a === 'dundo') drawUndo();
      else if (a === 'snd') { sndOn = !sndOn; lsSet('ht-map-snd', sndOn ? '1' : '0'); bars(); if (sndOn) { sndUnlock(); snd('ping'); } }
      else if (a === 'zin') zoomAt(1.3, r[0] / 2, r[1] / 2);
      else if (a === 'zout') zoomAt(1 / 1.3, r[0] / 2, r[1] / 2);
      else if (a === 'fitmode') { fitMode = fitMode === 'fill' ? 'fit' : 'fill'; lsSet('ht-map-fit', fitMode); fit(); bars(); }
      else if (a === 'expand') { expanded = !expanded; root.classList.toggle('expanded', expanded); if (!expanded) { root.style.height = ''; size(); } bars(); lastVp = ''; setTimeout(onResize, 30); }
      else if (a === 'panel') { panelOpen = !panelOpen; bars(); panel(); }
      else if (a === 'me') {
        var mine = allObjs().filter(function (o2) { return o2.kind === 'tok' && o2.owner === uid && !o2.gone; })[0];
        if (!mine) { ctx.toast('O Mestre ainda não colocou o seu personagem no mapa.', ''); return; }
        var c = tokCenter(mine.data), Lm = limits(); if (Lm) view.k = Math.max(view.k, Math.min(Lm.maxK, Lm.minK * 1.6)); view.x = r[0] / 2 - c[0] * view.k; view.y = r[1] / 2 - c[1] * view.k; clampView(); applyView();
      }
      else if (a === 'shown') setShown();
      else if (a === 'delmap') delMap();
      else if (a === 'addtok') addToken();
      else if (a === 'addpl') addPlayers();
      else if (a === 'del') delObj();
      else if (a === 'hide') setHidden();
      else if (a === 'dup') dup();
      else if (a === 'edit') { editOpen = true; insp(); }
      else if (a === 'dmg' || a === 'heal') { var oh = selObj(), qi = $('.mp-insp [data-mhq]'); if (oh) sheetHp(oh, Math.max(1, Math.round(num(qi && qi.value, 1))), a === 'heal'); }
      else if (a === 'unsel') { sel = null; drawObjs(); insp(); fightPanel(); }
      else if (a === 'fin') { var o3 = selObj(); if (o3) fightAct('add', o3.id); }
      else if (a === 'fout') { var o4 = selObj(); if (o4) fightAct('rm', o4.id); }
      else if (a === 'tokimgx') { var o2 = selObj(); if (o2) { queue(o2.id, { img: '' }); insp(); } }
      else if (a === 'fogon') setFogOn(true);
      else if (a === 'fogall' || a === 'fognone') { if (!fog || !fog.on) return; fog.draft.fill(a === 'fogall' ? 255 : 0); fogChanged(); }
      else if (a === 'fogsave') fogSave();
      else if (a === 'fogundo') fogUndo();
      else if (a === 'fogprev') { fogPrev = !fogPrev; regeom(); drawAll(); fit(); bars(); panel(); }
    }
    function setFogOn(on) {
      if (!map || !FG) return;
      fog = { on: on, bits: emptyBits(), draft: emptyBits() }; fogChanged.had = false;
      if (!on) fogPrev = false;
      syncAllCells(); drawAll(); saveMap(); schedulePub(300); panel();
      if (on && tool !== 'fog') setTool('fog'); else bars();
    }
    function onField(e, final) {
      var t = e.target, ds = t.dataset;
      if (ds.mf === 'newmap' || ds.mf === 'tokimg') { if (!final) return; var f = t.files && t.files[0]; t.value = ''; if (f) (ds.mf === 'newmap' ? newMap(f) : tokImage(f)); return; }
      if (ds.mf === 'map') { if (!final) return; var m = maps.filter(function (x) { return x.id === t.value; })[0]; if (m) setMap(m); return; }
      if (ds.mf === 'fogon') { if (final) setFogOn(t.checked); return; }
      if (ds.mf === 'slink') { if (final && ctx.scene && map) { ctx.scene.link(t.checked ? map.id : null); ctx.toast(t.checked ? 'Este mapa abre sozinho na cena “' + ctx.scene.name() + '”.' : 'A cena não abre mais este mapa.', ''); } return; }
      if (ds.mhq) { hpQty = Math.max(1, Math.round(num(t.value, 1))); return; }
      if (ds.mcr) { if (!final) return; var or = selObj(); if (or) setCondR(or, ds.mcr, Math.max(0, Math.min(99, Math.round(num(t.value, 0))))); return; }
      if (ds.mfi) { if (!final) return; var v = t.value === '' ? null : Math.round(num(t.value, 0)); if (owner) fightAct('ini', ds.mfi, v); else if (v != null) myIni(ds.mfi, v); setTimeout(fightPanel, 50); return; }
      if (ds.mf === 'mname') { if (!map) return; map.name = t.value.trim().slice(0, 80) || 'Mapa'; clearTimeout(saveT); var id = map.id, nm = map.name; saveT = setTimeout(function () { patch('/rest/v1/maps?id=eq.' + id, { name: nm }).catch(function () { /* ok */ }); schedulePub(200); }, 600); return; }
      var cfgMap = { cols: function (v2) { return { cell: Math.max(4, cellFromAcross(num(v2, 30))) }; }, cell: function (v2) { return { cell: clamp(num(v2, 70), 4, 1000) }; }, per: function (v2) { return { per: Math.max(0.1, num(v2, 1.5)) }; }, unit: function (v2) { return { unit: v2 }; }, diag: function (v2) { return { diag: v2 }; }, gcol: function (v2) { return { gcol: v2 }; }, gop: function (v2) { return { gop: num(v2, 0.35) }; } };
      if (cfgMap[ds.mf]) {
        if (t.type === 'number' && !isFinite(parseFloat(t.value))) return;
        var geo = ds.mf === 'cols' || ds.mf === 'cell';
        setCfg(cfgMap[ds.mf](t.value), true, geo);
        var oc = toolsBox && toolsBox.querySelector('[data-mf="cols"]'), ol = toolsBox && toolsBox.querySelector('[data-mf="cell"]');
        if (ds.mf === 'cols' && ol && ol !== document.activeElement) ol.value = plain(G.s);
        if (ds.mf === 'cell' && oc && oc !== document.activeElement) oc.value = plain(acrossOf());
        return;
      }
      if (ds.mf === 'gshow') { setCfg({ grid: t.checked }); return; }
      var o = selObj(); if (!o) return;
      if (ds.md) {
        var k = ds.md, val = t.value, p = {};
        if (k === 'n') p.n = val.slice(0, 40);
        else if (k === 'sh' || k === 'pat') p[k] = val;
        else { if (!isFinite(parseFloat(val))) return; p[k] = num(val, 1); if (k === 'rot') { var lb = t.parentNode; if (lb && lb.firstChild) lb.firstChild.nodeValue = 'Giro: ' + Math.round(p.rot) + '°'; } }
        queue(o.id, p); if (final && k === 'sh') { insp(); } if (k === 'n' && final) fightPanel(); return;
      }
      if (ds.mdc) { if (!final) return; var q = {}; q[ds.mdc] = t.checked; queue(o.id, q); if (ds.mdc === 'dead' && t.checked) snd('down'); if (ds.mdc === 'dead' && fight && fight.on && !o.hidden) { logEv('down', tokName(o) + (t.checked ? ' foi derrotado' : ' voltou à luta'), { tok: o.id }); fightPanel(); } return; }
      if (ds.mhp) {
        var hp = Object.assign({ v: 0, m: 0 }, o.data.hp || {}), was = o.data.hp ? Object.assign({}, o.data.hp) : null;
        hp[ds.mhp] = Math.max(0, num(t.value, 0)); if (ds.mhp === 'm' && !hp.v) hp.v = hp.m;
        if (!(o.id in hpBase)) hpBase[o.id] = was;
        queue(o.id, { hp: hp });
        clearTimeout(hpT[o.id]); hpT[o.id] = setTimeout(function () { hpLog(o); }, 2500);
        return;
      }
      if (ds.mo) { if (final) setOwner(t.value); }
    }
    function hpLog(o) {
      var was = hpBase[o.id]; delete hpBase[o.id];
      if (!fight || !fight.on || o.hidden || !o.data.hp || !was || !num(was.m, 0)) return;
      var a = num(was.v, 0), b = num(o.data.hp.v, 0); if (a === b) return;
      var nm = tokName(o);
      logEv('hp', o.data.hs ? nm + ': ' + a + ' → ' + b + ' de vida (' + (b > a ? '+' : '−') + Math.abs(b - a) + ')' : nm + (b < a ? ' foi ferido' : ' recuperou vida'), { tok: o.id });
    }
    var boxes = [host].concat(toolsBox && !host.contains(toolsBox) ? [toolsBox] : []).concat(fightBox && !host.contains(fightBox) ? [fightBox] : []);
    var onIn = function (e) { onField(e, false); }, onCh = function (e) { onField(e, true); };
    boxes.forEach(function (el) { el.addEventListener('click', onClick); el.addEventListener('input', onIn); el.addEventListener('change', onCh); });
    function onKey(e) {
      if (dead || !host.isConnected || !host.offsetParent && !expanded) return;
      var tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (ruler || frect) { ruler = null; frect = null; drawRuler(); }
        else if (sel) { sel = null; drawObjs(); insp(); fightPanel(); }
        else if (expanded) { expanded = false; root.classList.remove('expanded'); root.style.height = ''; size(); bars(); lastVp = ''; setTimeout(onResize, 30); }
        else if (tool !== 'move') setTool('move');
        else if (ctx.onEsc) ctx.onEsc();
      }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && owner && selObj()) { e.preventDefault(); delObj(); }
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { onResize(); }) : null;
    if (ro) ro.observe(root);

    /* ---------- partida ---------- */
    refresh();
    size();
    if (owner) loadMaps(); else loadView();
    fightLoad();
    timers.push(setInterval(function () {
      if (document.hidden || dead) return;
      tick++;
      if (tick % 2 === 0) { pollObjs(); pollPings(); }
      if (!owner && tick % 3 === 0) loadView();
      if (tick % 3 === 1) fightLoad();
      if (tick % 4 === 0) { size(); if (!owner && allObjs().some(function (o) { return o.owner; })) drawObjs(); }
    }, 1000));
    function onVis() { if (!document.hidden) { pollObjs(); if (!owner) loadView(); fightLoad(); } }
    document.addEventListener('visibilitychange', onVis);

    return {
      destroy: function () {
        if (fogT) { clearTimeout(fogT); saveMap(); }
        if (pubT) { clearTimeout(pubT); publish(false); }
        dead = true; timers.forEach(clearInterval);
        document.removeEventListener('pointerdown', sndUnlock, true); clearTimeout(voT); clearTimeout(pkT); cancelAnimationFrame(fAnim); cancelAnimationFrame(lzRaf); if (sndAc) { try { sndAc.close(); } catch (e) { /* ok */ } }
        document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize); window.removeEventListener('pointerup', endPtr); window.removeEventListener('pointercancel', endPtr);
        boxes.forEach(function (el) { el.removeEventListener('click', onClick); el.removeEventListener('input', onIn); el.removeEventListener('change', onCh); });
        if (ro) ro.disconnect();
        Object.keys(sendT).forEach(function (id) { clearTimeout(sendT[id]); flush(id); });
      },
      reload: function () { if (owner) loadMaps(); else loadView(); fightRev = -1; fightLoad(); },
      relayout: function () { lastVp = ''; onResize(); },
      useMap: useMap,
      refreshPanel: function () { panel(); },
      redraw: function () { drawObjs(); },
      /* tela da mesa: enquadrar o trecho que o Mestre está vendo, buscar mudanças na hora e mostrar o ponteiro dele */
      focus: function (m) { tvF = m && m.map ? m : null; applyFocus(true); },
      poke: function (k) { k = String(k || 'opfv'); if (k.indexOf('v') >= 0 && !owner) loadView(); if (k.indexOf('o') >= 0) pollObjs(); if (k.indexOf('p') >= 0) pollPings(); if (k.indexOf('f') >= 0) fightLoad(); },
      pointer: function (m) { if (!m) { laserEnd(); return; } if (curMapId() && m.map === curMapId()) laserPush(num(m.x, 0), num(m.y, 0)); },
      viewNow: function () { voLast = ''; viewOut(); },
      sound: function (n) { snd(n); },
      state: function () { return { map: map, P: P, objs: objs, view: view, tool: tool, sel: sel, fight: fight, fog: fog, G: G, FG: FG, fitMode: fitMode, limits: limits() }; }
    };
  }

  window.HTMap = { mount: mount, geom: makeGeom, sfx: SFX };
})();
