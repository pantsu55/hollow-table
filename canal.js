/* Hollow Table · canal ao vivo entre o app do Mestre e a página da TV.
   Usa o Realtime do Supabase direto por WebSocket (sem biblioteca): entra num canal privado,
   que só a própria conta consegue abrir, e troca mensagens curtas ("broadcast").
   Reconecta sozinho, mantém o batimento e renova o token de acesso. */
(function () {
  'use strict';
  window.HTCanal = function (o) {
    var ws = null, joined = false, dead = false, ref = 0, joinRef = '', beat = null, tokT = null, retry = 0, retryT = null, lastPong = 0;
    var topic = 'realtime:' + o.topic;
    function state(on, why) { if (joined === on && !why) return; joined = on; try { o.onState && o.onState(on, why || ''); } catch (e) { /* ok */ } }
    function raw(msg) { try { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(msg)); return true; } } catch (e) { /* cai no retorno */ } return false; }
    function clear() { clearInterval(beat); clearInterval(tokT); beat = tokT = null; }
    function again(ms) {
      if (dead) return;
      clearTimeout(retryT);
      retry = Math.min(retry + 1, 6);
      retryT = setTimeout(open, ms != null ? ms : Math.min(15000, 600 * Math.pow(2, retry)));
    }
    function drop(why) {
      clear();
      var w = ws; ws = null;
      if (w) { w.onopen = w.onmessage = w.onclose = w.onerror = null; try { w.close(); } catch (e) { /* ok */ } }
      state(false, why);
    }
    async function open() {
      if (dead) return;
      drop();
      var tok;
      try { tok = await o.token(); } catch (e) { state(false, 'sessao'); again(8000); return; }
      if (dead) return;
      var w;
      try { w = new WebSocket(o.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(o.key) + '&vsn=1.0.0'); }
      catch (e) { again(); return; }
      ws = w;
      w.onopen = function () {
        joinRef = String(++ref); lastPong = Date.now();
        raw({ topic: topic, event: 'phx_join', ref: joinRef, join_ref: joinRef, payload: { config: { broadcast: { ack: false, self: false }, presence: { key: '' }, postgres_changes: [], private: true }, access_token: tok } });
        beat = setInterval(function () {
          if (Date.now() - lastPong > 70000) { drop('silencio'); again(500); return; }
          raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) });
        }, 25000);
        tokT = setInterval(async function () {
          try { var t = await o.token(); raw({ topic: topic, event: 'access_token', payload: { access_token: t }, ref: String(++ref), join_ref: joinRef }); } catch (e) { /* tenta no próximo */ }
        }, 600000);
      };
      w.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        lastPong = Date.now();
        if (m.event === 'phx_reply' && m.ref === joinRef && m.topic === topic) {
          if (m.payload && m.payload.status === 'ok') { retry = 0; state(true); }
          else { drop('recusado'); again(10000); }
          return;
        }
        if (m.topic !== topic) return;
        if (m.event === 'broadcast' && m.payload && m.payload.event === 'm') { try { o.onMsg(m.payload.payload || {}); } catch (e) { /* uma mensagem ruim não derruba o canal */ } return; }
        if (m.event === 'phx_error' || m.event === 'phx_close') { drop('fechado'); again(); }
      };
      w.onclose = function () { if (ws === w) { drop('queda'); again(); } };
      w.onerror = function () { /* o onclose vem em seguida */ };
    }
    function wake() { if (!dead && !joined && (!ws || ws.readyState > 1)) { retry = 0; again(200); } }
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
    open();
    return {
      send: function (obj) { return joined && raw({ topic: topic, event: 'broadcast', ref: String(++ref), join_ref: joinRef, payload: { type: 'broadcast', event: 'm', payload: obj } }); },
      get on() { return joined; },
      close: function () { dead = true; clearTimeout(retryT); drop(); window.removeEventListener('online', wake); }
    };
  };
})();
