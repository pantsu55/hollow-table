/* Hollow Table — assistente de criação de personagem de Daggerheart (nível 1).
   Usa window.DH (daggerheart-dados.js). HTCriadorDH.open({ state, name, hasItems, onApply, onClose }) */
(function () {
  'use strict';
  const D = window.DH;
  const ARTE = 'https://ksucnjrmcagzepxahync.supabase.co/storage/v1/object/public/arte/';
  const POOL = [2, 1, 1, 0, 0, -1];
  const TRN = {}; D.trs.forEach(function (t) { TRN[t[0]] = t[1]; });
  const IX = { c: {}, s: {}, a: {}, m: {}, w: {}, r: {}, k: {} };
  D.classes.forEach(function (x) { IX.c[x.k] = x; });
  D.subs.forEach(function (x) { IX.s[x.k] = x; });
  D.anc.forEach(function (x) { IX.a[x.k] = x; });
  D.com.forEach(function (x) { IX.m[x.k] = x; });
  D.weapons.forEach(function (x) { IX.w[x.k] = x; });
  D.armor.forEach(function (x) { IX.r[x.k] = x; });
  D.cards.forEach(function (x) { IX.k[x.k] = x; });
  const STEPS = [['classe', 'Classe'], ['heranca', 'Herança'], ['tracos', 'Traços'], ['equip', 'Equipamento'], ['exp', 'Experiências'], ['cartas', 'Cartas'], ['fim', 'Pronto']];
  let S = null, root = null, prevOverflow = '', ART = null;

  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const sgn = function (n) { return n > 0 ? '+' + n : String(n); };
  const rich = function (t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); };
  const plain = function (t) { return String(t || '').replace(/\*\*/g, ''); };
  const both = function (x) { return x.en && x.en !== x.n ? esc(x.n) + ' <small class="cr-en">(' + esc(x.en) + ')</small>' : esc(x.n); };
  function fresh() { return { step: 0, name: '', cls: '', sub: '', anc: '', mix: false, anc2: '', com: '', tr: { agi: null, for: null, acu: null, ins: null, pre: null, con: null }, eq: { pri: '', sec: '', arm: '', pot: 'vida', item: 0 }, exps: ['', ''], clank: 0, cards: [], bq: ['', '', ''], cn: '', add: false }; }

  /* ---------- artes (bucket público "arte"; chaves dh-c-*, dh-a-*, dh-m-*) ---------- */
  function artLoad() {
    try { const c = JSON.parse(localStorage.getItem('ht-arte') || 'null'); if (c && c.itens) ART = c.itens; } catch (e) { /* ok */ }
    fetch(ARTE + 'creditos.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.itens) return;
      const changed = JSON.stringify(j.itens) !== JSON.stringify(ART);
      ART = j.itens; try { localStorage.setItem('ht-arte', JSON.stringify(j)); } catch (e) { /* ok */ }
      if (changed && root) paint(true);
    }).catch(function () { /* sem rede */ });
  }
  function art(key) { return ART ? ART[key] || null : null; }
  function credit(a) { return '<a href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer">' + esc(a.by) + '</a>' + (a.src && a.src !== a.by ? ' · ' + esc(a.src) : ''); }
  function artFig(a, alt) { return a ? '<figure class="cr-art"><img src="' + esc(ARTE + a.p) + '" alt="' + esc(alt) + '" decoding="async"><figcaption>Arte: ' + credit(a) + '</figcaption></figure>' : ''; }
  function card(attr, a, inner, on) {
    return '<button type="button" class="cr-card' + (a ? ' cr-has' : '') + (on ? ' cr-on' : '') + '" ' + attr + '>' + (a ? '<span class="cr-cimg"><img src="' + esc(ARTE + a.p) + '" alt="" loading="lazy" decoding="async"></span>' : '') + '<span class="cr-ctx">' + inner + (a ? '<small class="cr-by">arte: ' + esc(a.by) + '</small>' : '') + '</span></button>';
  }
  const gimg = function () { return ART ? ' cr-gimg' : ''; };
  function feats(L) { return '<ul class="cr-fl">' + L.map(function (f) { return '<li><div><b>' + esc(f[0]) + '.</b> ' + rich(f[1]) + '</div></li>'; }).join('') + '</ul>'; }
  const chip = function (attr, label, on, dis) { return '<button type="button" class="cr-chip" ' + attr + ' aria-pressed="' + !!on + '"' + (dis ? ' disabled' : '') + '>' + label + '</button>'; };

  /* ---------- derivados ---------- */
  const C = function () { return IX.c[S.cls] || null; };
  const SUB = function () { return IX.s[S.sub] || null; };
  const A = function () { return IX.a[S.anc] || null; };
  const A2 = function () { return S.mix ? IX.a[S.anc2] || null : null; };
  const M = function () { return IX.m[S.com] || null; };
  function ancFeats() { const a = A(), b = A2(); if (!a) return []; return b ? [a.f[0], b.f[1]] : a.f; }
  function hasAnc(name) { return ancFeats().some(function (f) { return f[0] === name; }); }
  function ancName() { const a = A(), b = A2(); return a ? (b ? a.n + ' / ' + b.n : a.n) : ''; }
  function eqList() { return [IX.w[S.eq.pri], IX.w[S.eq.sec], IX.r[S.eq.arm]].filter(Boolean); }
  function mod(k) { let v = 0; eqList().forEach(function (x) { v += (x.x && x.x[k]) || 0; }); return v; }
  function trFinal(k) { return (S.tr[k] == null ? 0 : S.tr[k]) + mod(k); }
  function evasion() { const c = C(); return c ? c.ev + mod('ev') + (hasAnc('Ágil') ? 1 : 0) : 0; }
  function hpMax() { const c = C(); return c ? c.hp + (hasAnc('Resistência') ? 1 : 0) + (S.sub === 'escola-da-guerra' ? 1 : 0) : 0; }
  function stressMax() { return 6 + (hasAnc('Vigor') ? 1 : 0) + (S.sub === 'vinganca' ? 1 : 0); }
  function armorInfo() {
    const r = IX.r[S.eq.arm], s = IX.w[S.eq.sec];
    let sc = r ? r.sc : 0; if (s && s.x && s.x.asc) sc += s.x.asc;
    const add = 1 + (S.sub === 'inabalavel' ? 1 : 0) + (hasAnc('Casco') ? 1 : 0);
    return { sc: sc, thr: r ? [r.thr[0] + add, r.thr[1] + add] : [0, 0], name: r ? r.n : '' };
  }
  function cardMax() { return S.sub === 'escola-do-conhecimento' ? 3 : 2; }
  function cardPool() { const c = C(); return c ? D.cards.filter(function (k) { return c.dom.indexOf(k.dom) >= 0; }) : []; }
  function poolLeft(skip) { const used = []; Object.keys(S.tr).forEach(function (k) { if (k !== skip && S.tr[k] != null) used.push(S.tr[k]); }); const left = POOL.slice(); used.forEach(function (v) { const i = left.indexOf(v); if (i >= 0) left.splice(i, 1); }); return left; }
  function dmgStr(w) { return '1' + w.dmg; }

  function issues(step) {
    const L = [];
    if (step === 'classe') { if (!S.cls) L.push('Escolha uma classe.'); else if (!S.sub) L.push('Escolha a subclasse.'); }
    if (step === 'heranca') { if (!S.anc) L.push('Escolha a ancestralidade.'); else if (S.mix && (!S.anc2 || S.anc2 === S.anc)) L.push('Escolha a segunda ancestralidade.'); if (!S.com) L.push('Escolha a comunidade.'); }
    if (step === 'tracos') { if (Object.keys(S.tr).some(function (k) { return S.tr[k] == null; })) L.push('Distribua +2, +1, +1, 0, 0 e −1 entre os traços.'); }
    if (step === 'equip') { if (!S.eq.pri) L.push('Escolha a arma principal.'); if (!S.eq.arm) L.push('Escolha a armadura.'); }
    if (step === 'exp') { if (S.exps.filter(function (x) { return x.trim(); }).length < 2) L.push('Escreva as duas Experiências.'); }
    if (step === 'cartas') { if (S.cards.length < cardMax()) L.push('Escolha ' + cardMax() + ' cartas de domínio.'); }
    if (step === 'fim') { if (!S.name.trim()) L.push('Dê um nome ao personagem.'); }
    return L;
  }

  /* ---------- passos ---------- */
  function hClasse() {
    const c = C();
    let h = '<section class="cr-sec"><h3>Classe</h3><p class="cr-mut sm">A classe diz o que o personagem faz de melhor: os dois domínios de onde vêm as cartas, a Evasão e os Pontos de Vida.</p><div class="cr-grid' + gimg() + '">' +
      D.classes.map(function (x) { return card('data-ca="cls" data-k="' + x.k + '"', art('dh-c-' + x.k), '<b>' + both(x) + '</b><span>' + esc(x.dom.map(function (d) { return D.doms[d]; }).join(' e ')) + ' · Evasão ' + x.ev + ' · PV ' + x.hp + '</span>', S.cls === x.k); }).join('') + '</div></section>';
    if (!c) return h;
    const a = art('dh-c-' + c.k);
    h += '<section class="cr-sec cr-pick' + (a ? ' cr-hasart' : '') + '">' + artFig(a, c.n) + '<div class="cr-artbody"><h3>' + both(c) + '</h3><p class="sm">' + esc(c.d) + '</p>' +
      '<p class="cr-tags"><span>Domínios <b>' + esc(c.dom.map(function (d) { return D.doms[d]; }).join(' e ')) + '</b></span><span>Evasão <b>' + c.ev + '</b></span><span>Pontos de Vida <b>' + c.hp + '</b></span></p>' +
      '<div class="cr-blk"><b>Característica de Esperança</b>' + feats([c.hope]) + '</div><div class="cr-blk"><b>Características da classe</b>' + feats(c.f) + '</div>' +
      '<div class="cr-blk"><b>Subclasse</b><div class="cr-opts">' + c.subs.map(function (k) { const s = IX.s[k], sa = art('dh-s-' + k); return '<button type="button" class="cr-opt' + (sa ? ' cr-has' : '') + '" data-ca="sub" data-k="' + k + '" aria-pressed="' + (S.sub === k) + '">' + (sa ? '<span class="cr-cimg"><img src="' + esc(ARTE + sa.p) + '" alt="" loading="lazy" decoding="async"></span>' : '') + '<span class="cr-ctx"><b>' + both(s) + '</b><span>' + esc(s.d) + (s.sp ? ' Conjuração: ' + TRN[s.sp] + '.' : '') + '</span></span></button>'; }).join('') + '</div>' +
      (SUB() ? feats(SUB().f) : '') + '</div></div></section>';
    return h;
  }
  function hHeranca() {
    let h = '<section class="cr-sec"><h3>Ancestralidade</h3><p class="cr-mut sm">O povo do personagem. Cada ancestralidade dá duas características.</p><label class="cr-chk"><input type="checkbox" data-cc="mix"' + (S.mix ? ' checked' : '') + '> Ancestralidade mista: a primeira característica de uma e a segunda de outra</label><div class="cr-grid' + gimg() + '">' +
      D.anc.map(function (x) { const on = S.anc === x.k || (S.mix && S.anc2 === x.k); return card('data-ca="anc" data-k="' + x.k + '"', art('dh-a-' + x.k), '<b>' + both(x) + (S.mix && S.anc === x.k ? ' <small class="cr-tag2">1ª</small>' : '') + (S.mix && S.anc2 === x.k ? ' <small class="cr-tag2">2ª</small>' : '') + '</b><span>' + esc(x.f[0][0] + ' · ' + x.f[1][0]) + '</span>', on); }).join('') + '</div>';
    const a = A();
    if (a) {
      const fa = art('dh-a-' + a.k);
      h += '<div class="cr-blk' + (fa ? ' cr-hasart' : '') + '">' + artFig(fa, a.n) + '<div class="cr-artbody"><b>' + esc(ancName()) + '</b><p class="sm cr-mut">' + esc(a.d) + '</p>' + feats(ancFeats()) + (S.mix && !S.anc2 ? '<p class="cr-note">Toque em outra ancestralidade para escolher a segunda.</p>' : '') + '</div></div>';
    }
    h += '</section><section class="cr-sec"><h3>Comunidade</h3><p class="cr-mut sm">Onde e como o personagem cresceu.</p><div class="cr-grid' + gimg() + '">' +
      D.com.map(function (x) { return card('data-ca="com" data-k="' + x.k + '"', art('dh-m-' + x.k), '<b>' + both(x) + '</b><span>' + esc(x.f[0]) + '</span>', S.com === x.k); }).join('') + '</div>';
    const m = M();
    if (m) { const fm = art('dh-m-' + m.k); h += '<div class="cr-blk' + (fm ? ' cr-hasart' : '') + '">' + artFig(fm, m.n) + '<div class="cr-artbody"><b>' + esc(m.n) + '</b><p class="sm cr-mut">' + esc(m.d) + '</p>' + (m.adj ? '<p class="sm"><i>' + esc(m.adj) + '</i></p>' : '') + feats([m.f]) + '</div></div>'; }
    return h + '</section>';
  }
  function hTracos() {
    const c = C();
    let h = '<section class="cr-sec"><h3>Traços</h3><p class="cr-mut sm">Distribua <b>+2, +1, +1, 0, 0 e −1</b> entre os seis traços. Você rola os Dados de Dualidade e soma o traço que combina com a ação.</p>' +
      (c ? '<div class="cr-row"><span class="cr-mut sm">Sugestão do ' + esc(c.n) + ': ' + D.trs.map(function (t) { return t[1] + ' ' + sgn(c.trs[t[0]]); }).join(', ') + '</span><button type="button" class="cr-btn q sm" data-ca="trsug">Usar a sugestão</button></div>' : '') +
      '<div class="cr-ats">' + D.trs.map(function (t) {
        const left = poolLeft(t[0]), v = S.tr[t[0]], opts = [];
        const vals = left.slice(); if (v != null && vals.indexOf(v) < 0) vals.push(v);
        vals.sort(function (a, b) { return b - a; }).forEach(function (x) { if (opts.indexOf(x) < 0) opts.push(x); });
        const m = mod(t[0]);
        return '<div class="cr-at"><span class="cr-ak">' + esc(t[1].toUpperCase()) + '</span><select class="cr-in sm" data-cs="tr" data-k="' + t[0] + '" aria-label="' + esc(t[1]) + '"><option value="">—</option>' + opts.map(function (x) { return '<option value="' + x + '"' + (v === x ? ' selected' : '') + '>' + sgn(x) + '</option>'; }).join('') + '</select><span class="cr-mut xs" style="text-align:center">' + esc(t[2]) + '</span>' + (m ? '<span class="cr-am">' + sgn(m) + ' equip.</span>' : '') + '</div>';
      }).join('') + '</div>' +
      '<button type="button" class="cr-link" data-ca="trclr">Limpar os traços</button></section>';
    return h;
  }
  function wOpt(w, sel, field) {
    const ft = w.ft ? ' · ' + w.ft : '';
    return '<button type="button" class="cr-opt" data-ca="eq" data-f="' + field + '" data-k="' + w.k + '" aria-pressed="' + (sel === w.k) + '"><b>' + esc(w.n) + (w.mag ? ' <small class="cr-tag2">mágica</small>' : '') + '</b><span>' + esc(TRN[w.tr] + ' · ' + D.rng[w.rng] + ' · ' + w.dmg + (w.mag ? ' mágico' : ' físico') + ' · ' + (w.hands === 2 ? 'duas mãos' : 'uma mão') + ft) + '</span></button>';
  }
  function hEquip() {
    const c = C(), p = IX.w[S.eq.pri];
    const pri = D.weapons.filter(function (w) { return !w.sec; }), sec = D.weapons.filter(function (w) { return w.sec; });
    let h = '<section class="cr-sec"><h3>Arma principal</h3>' + (c ? '<p class="cr-mut sm">Sugestão do ' + esc(c.n) + ': ' + esc(IX.w[c.pri].n) + (c.sec ? ' + ' + esc(IX.w[c.sec].n) : '') + ', ' + esc(IX.r[c.arm].n) + '. <button type="button" class="cr-link" data-ca="eqsug">Usar a sugestão</button></p>' : '') +
      '<p class="cr-mut sm">Armas físicas, que qualquer um usa:</p><div class="cr-opts sm">' + pri.filter(function (w) { return !w.mag; }).map(function (w) { return wOpt(w, S.eq.pri, 'pri'); }).join('') + '</div>' +
      '<p class="cr-mut sm">Armas mágicas, para quem tem traço de Conjuração (a subclasse diz qual):</p><div class="cr-opts sm">' + pri.filter(function (w) { return w.mag; }).map(function (w) { return wOpt(w, S.eq.pri, 'pri'); }).join('') + '</div></section>';
    h += '<section class="cr-sec"><h3>Arma secundária</h3>' + (p && p.hands === 2 ? '<p class="cr-mut sm">' + esc(p.n) + ' usa as duas mãos, então não sobra mão para uma arma secundária.</p>' :
      '<p class="cr-mut sm">Opcional, se a principal usa uma mão só.</p><div class="cr-opts sm"><button type="button" class="cr-opt" data-ca="eq" data-f="sec" data-k="" aria-pressed="' + !S.eq.sec + '"><b>Nenhuma</b></button>' + sec.map(function (w) { return wOpt(w, S.eq.sec, 'sec'); }).join('') + '</div>') + '</section>';
    h += '<section class="cr-sec"><h3>Armadura</h3><div class="cr-opts sm">' + D.armor.map(function (r) { return '<button type="button" class="cr-opt" data-ca="eq" data-f="arm" data-k="' + r.k + '" aria-pressed="' + (S.eq.arm === r.k) + '"><b>' + esc(r.n) + '</b><span>Limiares ' + r.thr[0] + '/' + r.thr[1] + ' · Armadura ' + r.sc + (r.ft ? ' · ' + esc(r.ft) : '') + '</span></button>'; }).join('') + '</div></section>';
    h += '<section class="cr-sec"><h3>Itens iniciais</h3><p class="sm">Todo personagem começa com uma tocha, 15 m de corda, suprimentos básicos e um punhado de ouro.</p>' +
      '<div class="cr-blk"><b>Poção</b><div class="cr-seg">' + [['vida', 'Poção de Vida Menor'], ['vigor', 'Poção de Vigor Menor']].map(function (o) { return '<button type="button" data-ca="pot" data-k="' + o[0] + '" aria-pressed="' + (S.eq.pot === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      (c ? '<div class="cr-blk"><b>Item da classe</b><div class="cr-seg">' + c.items.map(function (n, i) { return '<button type="button" data-ca="item" data-k="' + i + '" aria-pressed="' + (S.eq.item === i) + '">' + esc(n) + '</button>'; }).join('') + '</div></div>' : '') +
      (S.com === 'nomade' ? '<p class="cr-note">Como você é Nômade, a <b>Mochila Nômade</b> também vai para o inventário.</p>' : '') + '</section>';
    return h;
  }
  function hExp() {
    let h = '<section class="cr-sec"><h3>Experiências</h3><p class="cr-mut sm">Duas palavras ou frases curtas que resumem algo que o personagem viveu ou sabe fazer, cada uma com +2. Ao usar uma numa rolagem, você gasta 1 de Esperança e soma o bônus. Ex.: <i>Marinheiro de primeira</i>, <i>Fui criado por lobos</i>, <i>Mentiroso compulsivo</i>, <i>Sei onde fica tudo nesta cidade</i>.</p>' +
      S.exps.map(function (x, i) { return '<label class="cr-lab">Experiência ' + (i + 1) + ' (+2)<input class="cr-in" data-ci="exp" data-i="' + i + '" value="' + esc(x) + '" maxlength="60"></label>'; }).join('');
    if (hasAnc('Projeto com Propósito')) h += '<div class="cr-blk"><b>Projeto com Propósito (Clank)</b><p class="sm cr-mut">Qual Experiência combina com o propósito para o qual você foi feito? Ela ganha +1.</p><div class="cr-seg">' + S.exps.map(function (x, i) { return '<button type="button" data-ca="clank" data-k="' + i + '" aria-pressed="' + (S.clank === i) + '">' + esc(x || 'Experiência ' + (i + 1)) + '</button>'; }).join('') + '</div></div>';
    return h + '</section>';
  }
  function hCartas() {
    const c = C(), max = cardMax();
    if (!c) return '<section class="cr-sec"><p>Escolha a classe primeiro.</p></section>';
    let h = '<section class="cr-sec"><div class="cr-row"><h3>Cartas de domínio</h3><span class="cr-cnt' + (S.cards.length >= max ? ' ok' : '') + '">' + S.cards.length + '/' + max + '</span></div><p class="cr-mut sm">Escolha ' + max + ' cartas de nível 1 dos domínios ' + esc(c.dom.map(function (d) { return D.doms[d]; }).join(' e ')) + (max > 2 ? ' (a Escola do Conhecimento dá uma a mais)' : '') + '. O custo de recuperação é quanto de Estresse você marca para trocar a carta durante o jogo.</p>';
    c.dom.forEach(function (d) {
      h += '<div class="cr-blk"><b>' + esc(D.doms[d]) + '</b><ul class="cr-spl">' + D.cards.filter(function (k) { return k.dom === d; }).map(function (k) {
        const on = S.cards.indexOf(k.k) >= 0;
        return '<li class="cr-sp' + (on ? ' on' : '') + '"><button type="button" class="cr-spb" data-ca="card" data-k="' + k.k + '" aria-pressed="' + on + '"' + (!on && S.cards.length >= max ? ' disabled' : '') + ' aria-label="' + (on ? 'Tirar' : 'Escolher') + ' ' + esc(k.n) + '">' + (on ? '✓' : '+') + '</button><details' + (on ? ' open' : '') + '><summary><span class="cr-spn"><b>' + both(k) + '</b></span><span class="cr-tag2">' + esc(k.tp) + ' · recuperação ' + k.rc + '</span></summary><p>' + rich(k.txt) + '</p></details></li>';
      }).join('') + '</ul></div>';
    });
    return h + '</section>';
  }
  function hFim() {
    const c = C(), s = SUB(), ai = armorInfo(), p = IX.w[S.eq.pri], sw = IX.w[S.eq.sec];
    let h = '<section class="cr-sec"><h3>Nome</h3><input class="cr-in" data-ci="name" value="' + esc(S.name) + '" placeholder="Nome do personagem" maxlength="60"></section>';
    h += '<section class="cr-sec"><h3>Resumo</h3><div class="cr-sum">' +
      '<div><span>Personagem</span><b>' + esc([c ? c.n : '', s ? s.n : ''].filter(Boolean).join(' · ')) + '</b><small class="cr-mut">' + esc([ancName(), M() ? M().n : ''].filter(Boolean).join(' · ')) + '</small></div>' +
      '<div><span>Evasão</span><b class="cr-big">' + evasion() + '</b></div><div><span>Pontos de Vida</span><b class="cr-big">' + hpMax() + '</b></div><div><span>Estresse</span><b class="cr-big">' + stressMax() + '</b></div>' +
      '<div><span>Limiares</span><b class="cr-big">' + ai.thr[0] + '/' + ai.thr[1] + '</b></div><div><span>Armadura</span><b class="cr-big">' + ai.sc + '</b></div><div><span>Esperança</span><b class="cr-big">2</b></div>' +
      '</div><p class="cr-tags">' + D.trs.map(function (t) { return '<span>' + esc(t[1]) + ' <b>' + sgn(trFinal(t[0])) + '</b></span>'; }).join('') + '</p>' +
      '<p class="sm">' + esc([p ? p.n + ' (' + dmgStr(p) + ')' : '', sw ? sw.n : '', ai.name].filter(Boolean).join(' · ')) + '</p></section>';
    if (c) h += '<section class="cr-sec"><h3>Perguntas de origem</h3><p class="cr-mut sm">Opcional. As respostas vão para a História na ficha.</p>' + c.bq.map(function (q, i) { return '<label class="cr-lab">' + esc(q) + '<textarea class="cr-in" rows="2" data-ci="bq" data-i="' + i + '">' + esc(S.bq[i] || '') + '</textarea></label>'; }).join('') +
      '<div class="cr-blk"><b>Vínculos</b><p class="cr-mut sm">Na mesa, pergunte a outro jogador:</p><ul class="cr-fl">' + c.cn.map(function (q) { return '<li><div>' + esc(q) + '</div></li>'; }).join('') + '</ul></div></section>';
    if (window.HTCriadorDH.hasItems) h += '<section class="cr-sec"><label class="cr-chk"><input type="checkbox" data-cc="add"' + (S.add ? ' checked' : '') + '> Pôr o equipamento e o ouro na Mochila (ela já tem itens)</label></section>';
    h += '<section class="cr-sec"><button type="button" class="cr-btn cr-full" data-ca="apply"' + (STEPS.some(function (x) { return issues(x[0]).length; }) ? ' disabled' : '') + '>Preencher a ficha</button>' +
      (STEPS.some(function (x) { return issues(x[0]).length; }) ? '<ul class="sm cr-bad">' + STEPS.map(function (x) { return issues(x[0]).map(function (t) { return '<li>' + esc(x[1]) + ': ' + esc(t) + '</li>'; }).join(''); }).join('') + '</ul>' : '') + '</section>';
    return h;
  }
  const FAN = '<p class="cr-fan">Conteúdo do Daggerheart SRD 1.0 © Critical Role LLC, usado sob a Darrington Press Community Gaming License. Arte oficial de Daggerheart (Darrington Press) usada com autorização. Não é um produto oficial.</p>';
  function hStep() { const k = STEPS[S.step][0]; return { classe: hClasse, heranca: hHeranca, tracos: hTracos, equip: hEquip, exp: hExp, cartas: hCartas, fim: hFim }[k](); }

  function paint(keepScroll) {
    if (!root) return;
    const body = root.querySelector('.cr-body'), y = body.scrollTop;
    S.seen = S.seen || {}; S.seen[STEPS[S.step][0]] = 1;
    root.querySelector('.cr-steps').innerHTML = STEPS.map(function (s, i) { const done = s[0] !== 'fim' && S.seen[s[0]] && !issues(s[0]).length; return '<button type="button" data-ca="go" data-v="' + i + '" aria-current="' + (i === S.step ? 'step' : 'false') + '" class="' + (done ? 'ok' : '') + '"><span>' + (done && i !== S.step ? '✓' : i + 1) + '</span>' + s[1] + '</button>'; }).join('');
    body.innerHTML = hStep() + FAN;
    const iss = STEPS[S.step][0] === 'fim' ? [] : issues(STEPS[S.step][0]);
    root.querySelector('.cr-foot').innerHTML = '<button type="button" class="cr-btn q" data-ca="prev"' + (S.step === 0 ? ' disabled' : '') + '>Voltar</button><span class="cr-mut sm cr-iss">' + esc(iss[0] || '') + '</span>' + (S.step < STEPS.length - 1 ? '<button type="button" class="cr-btn" data-ca="next">Próximo</button>' : '');
    body.scrollTop = keepScroll ? y : 0;
    const cur = root.querySelector('.cr-steps [aria-current="step"]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    save();
  }
  function save() { try { localStorage.setItem('ht-crdh-draft', JSON.stringify(S)); } catch (e) { /* ok */ } }

  function onClick(e) {
    const b = e.target.closest('[data-ca]'); if (!b || b.disabled) return;
    const a = b.dataset.ca, k = b.dataset.k;
    if (a === 'close') { close(); return; }
    if (a === 'go') { S.step = +b.dataset.v; paint(false); return; }
    if (a === 'prev') { if (S.step > 0) S.step--; paint(false); return; }
    if (a === 'next') { if (S.step < STEPS.length - 1) S.step++; paint(false); return; }
    if (a === 'apply') { apply(); return; }
    if (a === 'cls') { if (S.cls !== k) { S.cls = k; S.sub = ''; S.cards = []; S.eq.item = 0; } }
    else if (a === 'sub') { S.sub = k; if (S.cards.length > cardMax()) S.cards = S.cards.slice(0, cardMax()); }
    else if (a === 'anc') {
      if (!S.mix) S.anc = k;
      else if (!S.anc || (S.anc2 && S.anc !== k && S.anc2 !== k)) { S.anc = k; S.anc2 = ''; }
      else if (S.anc === k) { S.anc = S.anc2; S.anc2 = ''; }
      else if (S.anc2 === k) S.anc2 = '';
      else S.anc2 = k;
    }
    else if (a === 'com') S.com = k;
    else if (a === 'trsug') { const c = C(); if (c) D.trs.forEach(function (t) { S.tr[t[0]] = c.trs[t[0]]; }); }
    else if (a === 'trclr') D.trs.forEach(function (t) { S.tr[t[0]] = null; });
    else if (a === 'eqsug') { const c = C(); if (c) { S.eq.pri = c.pri; S.eq.sec = c.sec; S.eq.arm = c.arm; } }
    else if (a === 'eq') { S.eq[b.dataset.f] = k; if (b.dataset.f === 'pri' && IX.w[k] && IX.w[k].hands === 2) S.eq.sec = ''; }
    else if (a === 'pot') S.eq.pot = k;
    else if (a === 'item') S.eq.item = +k;
    else if (a === 'clank') S.clank = +k;
    else if (a === 'card') { const i = S.cards.indexOf(k); if (i >= 0) S.cards.splice(i, 1); else if (S.cards.length < cardMax()) S.cards.push(k); }
    paint(true);
  }
  function onChange(e) {
    const t = e.target;
    if (t.dataset.cs === 'tr') { S.tr[t.dataset.k] = t.value === '' ? null : +t.value; paint(true); return; }
    if (t.dataset.cc === 'mix') { S.mix = t.checked; S.anc2 = ''; paint(true); return; }
    if (t.dataset.cc === 'add') { S.add = t.checked; save(); }
  }
  function onInput(e) {
    const t = e.target;
    if (t.dataset.ci === 'name') S.name = t.value;
    else if (t.dataset.ci === 'exp') S.exps[+t.dataset.i] = t.value;
    else if (t.dataset.ci === 'bq') S.bq[+t.dataset.i] = t.value;
    else return;
    save();
    const iss = root.querySelector('.cr-iss'); if (iss) { const L = STEPS[S.step][0] === 'fim' ? [] : issues(STEPS[S.step][0]); iss.textContent = L[0] || ''; }
    const ap = root.querySelector('[data-ca="apply"]');
    if (ap) { const all = []; STEPS.forEach(function (x) { issues(x[0]).forEach(function (t) { all.push(x[1] + ': ' + t); }); }); ap.disabled = all.length > 0; const ul = ap.parentNode.querySelector('ul'); if (ul) { if (all.length) ul.innerHTML = all.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join(''); else ul.remove(); } }
  }

  /* ---------- aplicar ---------- */
  function apply() {
    const c = C(), s = SUB(), m = M(), ai = armorInfo(), p = IX.w[S.eq.pri], sw = IX.w[S.eq.sec], r = IX.r[S.eq.arm];
    const sh = { ancestry: ancName(), community: m ? m.n : '', cls: c.n, sub: s ? s.n : '', level: 1, prof: 1 };
    sh.tr = {}; D.trs.forEach(function (t) { sh.tr[t[0]] = trFinal(t[0]); });
    sh.evasion = evasion();
    sh.armor = { max: ai.sc, v: 0 }; sh.armorName = ai.name; sh.thr = { major: ai.thr[0], severe: ai.thr[1] };
    sh.hp = { max: hpMax(), v: 0 }; sh.stress = { max: stressMax(), v: 0 }; sh.hope = { max: 6, v: 2 };
    sh.exps = S.exps.filter(function (x) { return x.trim(); }).map(function (x, i) { return { n: x.trim(), b: 2 + (hasAnc('Projeto com Propósito') && S.clank === i ? 1 : 0) }; });
    sh.weapons = [p, sw].filter(Boolean).map(function (w) { return { n: w.n, tr: TRN[w.tr], rng: D.rng[w.rng], dmg: dmgStr(w) }; });
    sh.cards = S.cards.map(function (k) { const x = IX.k[k]; return { n: x.n, lvl: 1, txt: x.tp + ' de ' + D.doms[x.dom] + ' · recuperação ' + x.rc + '. ' + plain(x.txt) }; });
    const F = [];
    F.push('— ' + c.n.toUpperCase() + (s ? ' · ' + s.n.toUpperCase() : '') + ' —', '• ' + c.hope[0] + ' (Esperança): ' + plain(c.hope[1]));
    c.f.forEach(function (f) { F.push('• ' + f[0] + ': ' + plain(f[1])); });
    if (s) { if (s.sp) F.push('• Traço de Conjuração: ' + TRN[s.sp] + '.'); s.f.forEach(function (f) { F.push('• ' + f[0] + ': ' + plain(f[1])); }); }
    F.push('', '— ' + ancName().toUpperCase() + ' —'); ancFeats().forEach(function (f) { F.push('• ' + f[0] + ': ' + plain(f[1])); });
    if (m) F.push('', '— ' + m.n.toUpperCase() + ' —', '• ' + m.f[0] + ': ' + plain(m.f[1]));
    const eqn = [p, sw, r].filter(function (x) { return x && x.ft; }); if (eqn.length) { F.push('', '— EQUIPAMENTO —'); eqn.forEach(function (x) { F.push('• ' + x.n + ' — ' + x.ft); }); }
    sh.feats = F.join('\n');
    const bio = [];
    c.bq.forEach(function (q, i) { if ((S.bq[i] || '').trim()) bio.push(q + '\n' + S.bq[i].trim()); });
    sh.bioAdd = bio.join('\n\n');
    sh.crdh = JSON.parse(JSON.stringify(S));
    const items = [];
    const wItem = function (w) { const d = { tr: w.tr, rng: D.rng[w.rng], dmg: w.dmg, hands: w.hands, dt: w.mag ? 'mag' : 'fis' }; if (w.sec) d.sec = true; if (w.x && w.x.asc) d.asc = w.x.asc; if (w.x && w.x.atk) d.atk = w.x.atk; if (w.x && w.x.xd) d.xd = true; return { name: w.n, qty: 1, kind: 'arma', weight: 0, value: '', notes: w.ft || '', equipped: true, data: d }; };
    if (p) items.push(wItem(p)); if (sw) items.push(wItem(sw));
    if (r) items.push({ name: r.n, qty: 1, kind: 'armadura', weight: 0, value: '', notes: r.ft || '', equipped: true, data: { thr: r.thr.slice(), sc: r.sc } });
    items.push(S.eq.pot === 'vida' ? { name: 'Poção de Vida Menor', qty: 1, kind: 'consumivel', weight: 0, value: '', notes: 'Recupere 1d4 PV.', data: { use: '1d4', to: 'hp' } } : { name: 'Poção de Vigor Menor', qty: 1, kind: 'consumivel', weight: 0, value: '', notes: 'Recupere 1d4 de Estresse.', data: { use: '1d4', to: 'stress' } });
    items.push({ name: 'Tocha', qty: 1, kind: 'consumivel', weight: 0, value: '', notes: '', data: {} });
    items.push({ name: 'Corda (15 m)', qty: 1, kind: 'equipamento', weight: 0, value: '', notes: '', data: {} });
    items.push({ name: 'Suprimentos básicos', qty: 1, kind: 'equipamento', weight: 0, value: '', notes: 'O essencial para a estrada: comida, água, cobertor e afins.', data: {} });
    items.push({ name: c.items[S.eq.item] || c.items[0], qty: 1, kind: 'outro', weight: 0, value: '', notes: 'Item da classe ' + c.n + '.', data: {} });
    if (S.com === 'nomade') items.push({ name: 'Mochila Nômade', qty: 1, kind: 'equipamento', weight: 0, value: '', notes: 'Uma vez por sessão, gaste 1 de Esperança para tirar dela um item comum útil para a situação.', data: {} });
    const res = { name: S.name.trim(), sheet: sh, items: items, gold: 1, addItems: !window.HTCriadorDH.hasItems || S.add };
    try { localStorage.removeItem('ht-crdh-draft'); } catch (e) { /* ok */ }
    const cb = window.HTCriadorDH._apply;
    close();
    if (cb) cb(res);
  }

  /* ---------- abrir/fechar ---------- */
  const CSS = '.cr-ov{position:fixed;inset:0;z-index:40;background:var(--bg);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
    '.cr-top{display:flex;align-items:center;gap:12px;padding:12px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));max-width:920px;width:100%;margin:0 auto}' +
    '.cr-top h2{flex:1;font-size:19px}.cr-top h2 small{display:block;font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}' +
    '.cr-steps{display:flex;gap:6px;overflow-x:auto;padding:4px max(16px,env(safe-area-inset-right,0px)) 10px max(16px,env(safe-area-inset-left,0px));max-width:920px;width:100%;margin:0 auto;scrollbar-width:none}' +
    '.cr-steps button{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);color:var(--muted);border-radius:999px;font:inherit;font-size:14px;min-height:38px;padding:0 12px 0 6px;cursor:pointer}' +
    '.cr-steps button span{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--surface-2);font-family:var(--mono);font-size:12px}' +
    '.cr-steps button.ok span{color:var(--ok)}.cr-steps button[aria-current="step"]{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}' +
    '.cr-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px))}.cr-body>*{max-width:888px;margin-left:auto;margin-right:auto}' +
    '.cr-foot{display:flex;align-items:center;gap:10px;padding:10px max(16px,env(safe-area-inset-right,0px)) 12px max(16px,env(safe-area-inset-left,0px));border-top:1px solid var(--line);background:var(--surface)}.cr-foot .cr-iss{flex:1;text-align:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.cr-fan{margin:28px 0 4px;font-size:11px;line-height:1.4;color:var(--muted);opacity:.8}' +
    '.cr-sec{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;display:grid;gap:12px;margin-bottom:12px;min-width:0}.cr-sec h3{font-family:var(--serif);font-size:17px;margin:0;letter-spacing:.03em}.cr-pick{border-color:rgba(167,139,250,.55)}' +
    '.cr-row{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}' +
    '.cr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}.cr-gimg{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}' +
    '.cr-card,.cr-opt{text-align:left;background:var(--bg);border:1px solid var(--line);color:var(--fg);border-radius:12px;padding:12px;font:inherit;cursor:pointer;display:grid;gap:4px;align-content:start;min-width:0}' +
    '.cr-card span,.cr-opt span{font-size:14px;color:var(--muted);line-height:1.4}.cr-card:hover,.cr-opt:hover{border-color:#5a5390}.cr-card.cr-on{border-color:var(--accent);background:var(--accent-soft)}.cr-card.cr-on b{color:var(--accent)}' +
    '.cr-opt[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}.cr-opt[aria-pressed="true"] b{color:var(--accent)}' +
    '.cr-opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.cr-opts.sm{grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}' +
    '.cr-card.cr-has,.cr-opt.cr-has{padding:0;overflow:hidden;gap:0}.cr-card .cr-cimg,.cr-opt .cr-cimg{display:block;aspect-ratio:5/4;background:var(--surface-2);overflow:hidden}.cr-card .cr-cimg img,.cr-opt .cr-cimg img{width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block}.cr-opt.cr-has .cr-ctx{display:grid;gap:4px;padding:10px 12px 12px}.cr-opt .cr-ctx span{font-size:14px;color:var(--muted);line-height:1.4}' +
    '.cr-card .cr-ctx{display:grid;gap:4px;align-content:start;color:var(--fg)}.cr-card.cr-has .cr-ctx{padding:10px 12px 12px}.cr-card .cr-ctx span{font-size:13px}.cr-card small.cr-by{font-size:11px;opacity:.75;color:var(--muted)}' +
    '.cr-en{font-weight:400;font-size:12px;color:var(--muted)}' +
    '.cr-chip{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--line);color:var(--muted);border-radius:999px;font:inherit;font-size:14px;min-height:40px;padding:0 14px;cursor:pointer}.cr-chip[aria-pressed="true"]{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}' +
    '.cr-seg{display:flex;gap:6px;flex-wrap:wrap}.cr-seg>button{flex:1 1 auto;background:var(--bg);border:1px solid var(--line);color:var(--muted);border-radius:10px;font:inherit;font-size:15px;min-height:42px;padding:0 12px;cursor:pointer}.cr-seg>button[aria-pressed="true"]{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}' +
    '.cr-btn{background:var(--accent);color:var(--accent-ink);border:0;border-radius:12px;font:inherit;font-weight:700;min-height:46px;padding:0 18px;cursor:pointer}.cr-btn.q{background:var(--surface-2);color:var(--fg);border:1px solid var(--line);font-weight:400}.cr-btn.sm{min-height:38px;padding:0 12px;font-size:15px}.cr-btn:disabled{opacity:.45;cursor:default}.cr-full{width:100%}' +
    '.cr-x{background:none;border:1px solid var(--line);color:var(--fg);border-radius:10px;width:42px;height:42px;font-size:20px;cursor:pointer}' +
    '.cr-mut{color:var(--muted)}.sm{font-size:14px}.xs{font-size:12px}.cr-bad{color:var(--bad)}.cr-big{font-family:var(--mono);font-size:24px;font-weight:700}' +
    '.cr-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0}.cr-tags span{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:3px 10px;color:var(--muted)}.cr-tags b{color:var(--fg)}' +
    '.cr-fl{list-style:none;margin:0;padding:0;display:grid;gap:8px}.cr-fl li{font-size:15px;line-height:1.45;color:var(--muted)}.cr-fl b{color:var(--fg)}' +
    '.cr-blk{display:grid;gap:8px;border-top:1px solid var(--line);padding-top:10px}.cr-blk p{margin:0}' +
    '.cr-in{background:var(--bg);border:1px solid var(--line);border-radius:12px;color:var(--fg);font:inherit;padding:10px 12px;min-height:46px;width:100%;min-width:0}.cr-in.sm{min-height:38px;padding:6px 8px;font-size:15px;width:auto}' +
    '.cr-lab{display:grid;gap:6px;font-size:14px;color:var(--muted);min-width:0}.cr-chk{display:flex;gap:10px;align-items:flex-start;font-size:15px;color:var(--fg)}.cr-chk input{width:20px;height:20px;min-height:0;margin-top:2px;flex:0 0 auto}' +
    '.cr-ats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.cr-at{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px 6px;display:grid;justify-items:center;gap:6px;min-width:0}' +
    '.cr-ak{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--muted)}.cr-am{font-family:var(--mono);font-size:12px;color:var(--hot)}' +
    '@media(max-width:620px){.cr-ats{grid-template-columns:repeat(3,minmax(0,1fr))}.cr-top h2{font-size:16px}}' +
    '.cr-cnt{font-family:var(--mono);font-size:13px;color:var(--hot);border:1px solid currentColor;border-radius:999px;padding:1px 9px}.cr-cnt.ok{color:var(--ok)}' +
    '.cr-spl{list-style:none;margin:0;padding:0;display:grid;gap:6px}.cr-sp{display:flex;gap:10px;align-items:flex-start;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.cr-sp.on{border-color:rgba(94,225,245,.55)}' +
    '.cr-spb{flex:0 0 auto;width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--fg);font-size:18px;cursor:pointer}.cr-spb[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.cr-spb:disabled{opacity:.45;cursor:default}' +
    '.cr-sp details{flex:1;min-width:0}.cr-sp summary{cursor:pointer;list-style:none;display:grid;gap:2px}.cr-sp summary::-webkit-details-marker{display:none}.cr-sp p{margin:6px 0 2px;font-size:15px;color:var(--fg);line-height:1.45}' +
    '.cr-tag2{font-family:var(--mono);font-size:10px;color:var(--ok);letter-spacing:.04em}' +
    '.cr-sum{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.cr-sum div{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px;display:grid;gap:2px;align-content:start}.cr-sum div:first-child{grid-column:span 2}.cr-sum span{font-size:12px;color:var(--muted);font-family:var(--mono);letter-spacing:.06em;text-transform:uppercase}' +
    '.cr-hasart{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:14px;align-items:start}.cr-artbody{display:grid;gap:10px;min-width:0}' +
    '.cr-art{margin:0;display:grid;gap:4px;min-width:0}.cr-art img{width:100%;aspect-ratio:5/4;object-fit:cover;object-position:50% 30%;border-radius:10px;border:1px solid var(--line);display:block;background:var(--surface-2)}.cr-art figcaption{font-size:11px;color:var(--muted);line-height:1.3}.cr-art figcaption a{color:inherit}' +
    '@media(max-width:620px){.cr-hasart{grid-template-columns:minmax(0,1fr)}.cr-art img{aspect-ratio:auto;max-height:300px}}' +
    '.cr-note{margin:0;font-size:14px;line-height:1.45;color:var(--muted);border-left:3px solid var(--line);padding:4px 0 4px 10px}.cr-link{background:none;border:0;color:var(--accent);font:inherit;padding:0;cursor:pointer;text-decoration:underline;justify-self:start}';
  function open(o) {
    artLoad();
    o = o || {};
    let st = o.state;
    if (!st) { try { st = JSON.parse(localStorage.getItem('ht-crdh-draft') || 'null'); } catch (e) { st = null; } }
    S = Object.assign(fresh(), st || {});
    S.eq = Object.assign(fresh().eq, S.eq || {}); S.tr = Object.assign(fresh().tr, S.tr || {});
    if (o.name && !S.name) S.name = o.name;
    if (o.state) S.step = 0;
    window.HTCriadorDH.hasItems = !!o.hasItems;
    window.HTCriadorDH._apply = o.onApply || null;
    window.HTCriadorDH._close = o.onClose || null;
    if (!S.add && !o.hasItems) S.add = true;
    if (!document.getElementById('crdh-css')) { const s = document.createElement('style'); s.id = 'crdh-css'; s.textContent = CSS; document.head.appendChild(s); }
    root = document.createElement('div');
    root.className = 'cr-ov'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Criar personagem');
    root.innerHTML = '<div class="cr-top"><h2><small>Daggerheart · nível 1</small>Criar personagem</h2><button type="button" class="cr-btn q sm" data-cr="reset">Recomeçar</button><button type="button" class="cr-x" data-ca="close" aria-label="Fechar">✕</button></div><nav class="cr-steps" aria-label="Etapas"></nav><div class="cr-body"></div><div class="cr-foot"></div>';
    document.body.appendChild(root);
    prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    root.addEventListener('click', function (e) { const b = e.target.closest('[data-cr="reset"]'); if (b) { if (b.dataset.sure) { const nm = S.name; S = fresh(); S.name = nm; S.add = !window.HTCriadorDH.hasItems; paint(false); } else { b.dataset.sure = '1'; b.textContent = 'Tem certeza?'; setTimeout(function () { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Recomeçar'; } }, 3000); } return; } onClick(e); });
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    paint(false);
  }
  function close() {
    if (!root) return;
    root.remove(); root = null;
    document.body.style.overflow = prevOverflow;
    const cb = window.HTCriadorDH._close; if (cb) cb();
  }
  window.HTCriadorDH = { open: open, close: close, hasItems: false, _apply: null, _close: null, _state: function () { return S; }, _issues: issues };
})();
