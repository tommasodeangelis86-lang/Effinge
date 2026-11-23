/*!
 * Effinge — Scrivi: il Narratore.
 *
 * - Lettura ad alta voce: voci del sistema (gratis), oppure OpenAI ed ElevenLabs con la chiave
 *   di chi scrive. La parola letta si accende e la lampada la segue.
 * - Lettura mentre scrivi: Manuale (solo con «Leggi»), Frase (a ogni punto), Auto (dopo 1,5 s di pausa).
 * - Suggerimenti: Migliora, Taglia, Stile, con Claude, OpenAI o Gemini e la chiave di chi scrive.
 *   Niente cambia nel testo finché l'autore non tocca «Accetta».
 * - Le chiavi restano in questo browser (o solo in questa scheda) e vanno direttamente al fornitore:
 *   nessun server di Effinge.
 */
(function () {
  'use strict';
  var app = document.querySelector('[data-scrivi-app]');
  if (!app) return;
  var root = document.documentElement;
  var versione = (document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src) || [])[1] || '';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var editor = $('.scrivi-editor', app);
  var area = $('.scrivi-area', app);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = function () { return window.EffingeScrivi || {}; };

  function avviso(msg, ms) {
    var a = document.createElement('div');
    a.className = 'avviso'; a.setAttribute('role', 'status'); a.textContent = msg;
    document.body.appendChild(a);
    setTimeout(function () { a.remove(); }, ms || 3200);
  }
  function leggiJSON(store, k) { try { return JSON.parse(store.getItem(k) || 'null'); } catch (e) { return null; } }
  function scriviJSON(store, k, v) { try { if (v == null) store.removeItem(k); else store.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ——— Preferenze (non segrete) ——— */
  var PREF = 'effinge-voce';
  var pref = Object.assign({ motore: 'sistema', voceSistema: '', voceOpenai: 'nova', voceEleven: '21m00Tcm4TlvDq8ikWAM', velocita: 1, modo: 'manuale', fornitore: 'anthropic' }, leggiJSON(localStorage, PREF) || {});
  function salvaPref() { scriviJSON(localStorage, PREF, pref); }

  /* ——— Le mie chiavi AI: solo in questo browser ——— */
  var CHIAVI = 'effinge-chiavi-ai';
  var MODELLI = { anthropic: 'claude-opus-5-5', openai: 'gpt-4.1-mini', gemini: 'gemini-2.5-flash' };
  function chiavi() {
    var c = leggiJSON(localStorage, CHIAVI) || leggiJSON(sessionStorage, CHIAVI) || {};
    c.modelli = Object.assign({}, MODELLI, c.modelli || {});
    return c;
  }
  function salvaChiavi(c, ricorda) {
    scriviJSON(localStorage, CHIAVI, null); scriviJSON(sessionStorage, CHIAVI, null);
    scriviJSON(ricorda ? localStorage : sessionStorage, CHIAVI, c);
  }
  function chiaveRicordata() { return !!leggiJSON(localStorage, CHIAVI); }

  /* ——— Il testo come lo legge la voce: blocchi separati da un a capo ——— */
  function mappa() {
    var testo = '', nodi = [];
    Array.prototype.forEach.call(editor.children, function (b, i) {
      if (i) testo += '\n';
      var w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      for (var n = w.nextNode(); n; n = w.nextNode()) { nodi.push({ n: n, da: testo.length }); testo += n.nodeValue; }
    });
    return { testo: testo, nodi: nodi };
  }
  function intervallo(m, da, lun) {
    var a = null, b = null, fine = da + lun;
    for (var i = 0; i < m.nodi.length; i++) {
      var x = m.nodi[i], l = x.n.nodeValue.length;
      if (!a && da >= x.da && da <= x.da + l) a = { n: x.n, o: da - x.da };
      if (fine >= x.da && fine <= x.da + l) { b = { n: x.n, o: fine - x.da }; if (a) break; }
    }
    if (!a || !b) return null;
    var r = document.createRange();
    try { r.setStart(a.n, a.o); r.setEnd(b.n, b.o); } catch (e) { return null; }
    return r;
  }
  function offsetDi(m, node, off) {
    for (var i = 0; i < m.nodi.length; i++) if (m.nodi[i].n === node) return m.nodi[i].da + off;
    return -1;
  }

  /* ——— Lo strato dei segni: parola letta e suggerimenti (sopra il testo, senza toccarlo) ——— */
  var strato = document.createElement('div');
  strato.className = 'scrivi-segni'; strato.setAttribute('aria-hidden', 'true');
  area.appendChild(strato);
  var segnoParola = document.createElement('span');
  segnoParola.className = 'voce-parola'; segnoParola.hidden = true;
  strato.appendChild(segnoParola);
  function rettangoliIn(r) {
    var base = area.getBoundingClientRect();
    return Array.prototype.map.call(r.getClientRects(), function (q) { return { x: q.left - base.left, y: q.top - base.top, w: q.width, h: q.height, cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; })
      .filter(function (q) { return q.w > 0 && q.h > 0; });
  }

  /* ——— Lettura ad alta voce ——— */
  var parlando = false, coda = [], audio = null, rafAudio = 0, letti = 0, prossimo = null, gen = 0;
  var stato = $('[data-voce-stato]');
  function mostraStato(t) { if (stato) stato.textContent = t || ''; }
  function segna(on) {
    parlando = on;
    root.classList.toggle('voce-attiva', on);
    $$('[data-voce="leggi"]').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (!on) segnoParola.hidden = true;
  }
  function evidenzia(da, lun) {
    var m = mappa(), r = intervallo(m, da, lun); if (!r) return;
    var q = rettangoliIn(r)[0]; if (!q) return;
    segnoParola.hidden = false;
    segnoParola.style.transform = 'translate(' + (q.x - 3).toFixed(1) + 'px,' + (q.y - 1).toFixed(1) + 'px)';
    segnoParola.style.width = (q.w + 6).toFixed(1) + 'px';
    segnoParola.style.height = (q.h + 2).toFixed(1) + 'px';
    if (S().lampada) S().lampada(q.cx, q.cy, 1);
    var vis = q.cy;
    if (vis < 90 || vis > innerHeight - 90) window.scrollBy({ top: vis - innerHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
  }
  function ferma() {
    gen++;
    coda = []; prossimo = null;
    try { speechSynthesis.cancel(); } catch (e) {}
    if (audio) { audio.pause(); if (audio.src) URL.revokeObjectURL(audio.src); audio.removeAttribute('src'); audio = null; }
    cancelAnimationFrame(rafAudio);
    segna(false);
  }
  // pezzi a confine di frase, al massimo «max» caratteri
  function pezzi(testo, offset, max) {
    var out = [], re = /[^.!?…\n]+[.!?…]*["»”’)]*\s*|\n+/g, m, cur = '', da = offset, pos = offset;
    while ((m = re.exec(testo))) {
      var f = m[0];
      if (cur && cur.length + f.length > max) { out.push({ t: cur, da: da }); cur = ''; da = pos; }
      while (f.length > max) { out.push({ t: f.slice(0, max), da: pos }); pos += max; f = f.slice(max); da = pos; }
      if (!cur) da = pos;
      cur += f; pos += f.length;
    }
    if (cur.trim()) out.push({ t: cur, da: da });
    return out.filter(function (p) { return p.t.trim(); });
  }

  // 1. Voci del sistema (Microsoft Neural, Google, Apple): gratis, nel browser
  var voci = [];
  function caricaVoci() {
    if (!('speechSynthesis' in window)) return;
    var tutte = speechSynthesis.getVoices();
    var qual = function (v) { var n = v.name.toLowerCase(); return /neural|natural|premium|enhanced/.test(n) ? 0 : /microsoft/.test(n) ? 1 : /google/.test(n) ? 2 : 3; };
    voci = tutte.filter(function (v) { return /^it/i.test(v.lang); }).sort(function (a, b) { return qual(a) - qual(b); });
    if (!voci.length) voci = tutte.slice();
    riempiVoci();
  }
  if ('speechSynthesis' in window) { caricaVoci(); speechSynthesis.addEventListener('voiceschanged', caricaVoci); }
  function voceSistema() { return voci.filter(function (v) { return v.name === pref.voceSistema; })[0] || voci[0] || null; }
  function leggiSistema(lista, mia) {
    if (!('speechSynthesis' in window)) { mostraStato('Questo browser non ha voci di sistema.'); segna(false); return; }
    var v = voceSistema();
    lista.forEach(function (p, i) {
      var u = new SpeechSynthesisUtterance(p.t);
      u.lang = (v && v.lang) || 'it-IT'; if (v) u.voice = v; u.rate = pref.velocita;
      u.onboundary = function (e) {
        if (mia !== gen || e.name !== 'word') return;
        var lun = e.charLength || ((/^\S+/.exec(p.t.slice(e.charIndex)) || [''])[0].length);
        evidenzia(p.da + e.charIndex, lun);
      };
      if (i === lista.length - 1) u.onend = function () { if (mia === gen) segna(false); };
      u.onerror = function (e) { if (mia === gen && e.error !== 'interrupted' && e.error !== 'canceled') { mostraStato('La voce si è interrotta (' + e.error + ').'); segna(false); } };
      speechSynthesis.speak(u);
    });
  }

  // 2. Voci premium: OpenAI ed ElevenLabs, con la chiave di chi scrive
  function erroreHttp(r, chi) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      var msg = (j.error && (j.error.message || j.error)) || (j.detail && (j.detail.message || j.detail)) || '';
      if (r.status === 401 || r.status === 403) throw new Error('La chiave ' + chi + ' non è valida o non ha i permessi.');
      if (r.status === 429) throw new Error(chi + ': troppe richieste o credito esaurito. Riprova tra poco.');
      throw new Error(chi + ': errore ' + r.status + (msg && typeof msg === 'string' ? ' — ' + msg : ''));
    });
  }
  function sintesi(p) {
    var c = chiavi();
    if (pref.motore === 'openai') {
      if (!c.openai) return Promise.reject(new Error('Manca la chiave OpenAI: aggiungila in «Chiavi AI».'));
      return fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + c.openai, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1-hd', input: p.t, voice: pref.voceOpenai, speed: Math.min(4, Math.max(.25, pref.velocita)), response_format: 'mp3' })
      }).then(function (r) { return r.ok ? r.blob() : erroreHttp(r, 'OpenAI'); });
    }
    if (!c.elevenlabs) return Promise.reject(new Error('Manca la chiave ElevenLabs: aggiungila in «Chiavi AI».'));
    return fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(pref.voceEleven), {
      method: 'POST', headers: { 'xi-api-key': c.elevenlabs, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text: p.t, model_id: 'eleven_multilingual_v2', voice_settings: { stability: .5, similarity_boost: .75, speed: Math.min(1.2, Math.max(.7, pref.velocita)) } })
    }).then(function (r) { return r.ok ? r.blob() : erroreHttp(r, 'ElevenLabs'); });
  }
  function leggiPremium(lista, mia) {
    coda = lista.slice();
    var carica = function () { var p = coda.shift(); return p ? { p: p, blob: sintesi(p) } : null; };
    prossimo = carica();
    mostraStato('Preparo la voce…');
    (function suona() {
      if (mia !== gen) return;
      var cur = prossimo; if (!cur) { segna(false); mostraStato(''); return; }
      prossimo = carica();   // il pezzo dopo si prepara mentre questo suona
      cur.blob.then(function (blob) {
        if (mia !== gen) return;
        mostraStato('');
        audio = new Audio(URL.createObjectURL(blob));
        if (pref.motore === 'elevenlabs' && pref.velocita > 1.2) audio.playbackRate = pref.velocita / 1.2;
        var parole = [], re = /\S+/g, m;
        while ((m = re.exec(cur.p.t))) parole.push({ i: m.index, l: m[0].length });
        var ultima = -1;
        var segui = function () {
          if (mia !== gen || !audio) return;
          if (audio.duration && isFinite(audio.duration)) {
            var pos = audio.currentTime / audio.duration * cur.p.t.length, k = 0;
            while (k < parole.length - 1 && parole[k + 1].i <= pos) k++;
            if (k !== ultima && parole[k]) { ultima = k; evidenzia(cur.p.da + parole[k].i, parole[k].l); }
          }
          rafAudio = requestAnimationFrame(segui);
        };
        audio.onplay = function () { cancelAnimationFrame(rafAudio); segui(); };
        audio.onended = function () { cancelAnimationFrame(rafAudio); URL.revokeObjectURL(audio.src); suona(); };
        audio.onerror = function () { mostraStato('Non riesco a riprodurre l’audio.'); ferma(); };
        return audio.play();
      }).catch(function (e) { if (mia === gen) { mostraStato(''); avviso(e.message || 'La voce non è disponibile.', 5200); ferma(); } });
    })();
  }

  function narra(testo, offset) {
    if (!testo || !testo.trim()) return;
    var mia = ++gen;
    try { speechSynthesis.cancel(); } catch (e) {}
    if (audio) { audio.pause(); audio = null; }
    segna(true);
    var lista = pezzi(testo, offset, pref.motore === 'sistema' ? 260 : pref.motore === 'openai' ? 4000 : 2400);
    if (pref.motore === 'sistema') leggiSistema(lista, mia); else leggiPremium(lista, mia);
  }
  function leggiTutto() {
    if (parlando) { ferma(); return; }
    var m = mappa(), sel = getSelection(), da = 0;
    if (sel.rangeCount && editor.contains(sel.anchorNode)) {
      var r = sel.getRangeAt(0);
      if (!r.collapsed) {
        var a = offsetDi(m, r.startContainer, r.startOffset), b = offsetDi(m, r.endContainer, r.endOffset);
        if (a >= 0 && b > a) { letti = b; narra(m.testo.slice(a, b), a); return; }
      }
    }
    letti = m.testo.length;
    narra(m.testo.slice(da), da);
  }

  // lettura mentre scrivi
  var timerAuto = 0;
  editor.addEventListener('input', function () {
    if (pref.modo === 'manuale') return;
    var t = mappa().testo;
    if (letti > t.length) letti = t.length;
    if (pref.modo === 'auto') {
      clearTimeout(timerAuto);
      timerAuto = setTimeout(function () {
        var t2 = mappa().testo, nuovo = t2.slice(letti);
        if (nuovo.trim()) { var da = letti; letti = t2.length; narra(nuovo, da); }
      }, 1500);
    } else {
      var m = /^([\s\S]*?[.!?…]["»”’)]*)\s/.exec(t.slice(letti));
      if (m && m[1].trim()) { var da = letti; letti += m[0].length; narra(m[1], da); }
    }
  });
  app.addEventListener('effinge:sezione', function () { ferma(); letti = 0; togliSuggerimenti(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && parlando) ferma(); });
  addEventListener('pagehide', ferma);

  /* ——— Finestra «Voce» ——— */
  var dlgVoce = $('#voce'), dlgChiavi = $('#chiavi-ai');
  function riempiVoci() {
    var sel = $('#voce-sistema'); if (!sel) return;
    sel.replaceChildren();
    voci.forEach(function (v) { var o = document.createElement('option'); o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')'; sel.appendChild(o); });
    if (!voci.length) { var o = document.createElement('option'); o.textContent = 'Nessuna voce italiana in questo browser'; o.value = ''; sel.appendChild(o); }
    sel.value = (voceSistema() || {}).name || '';
  }
  function mostraMotore() {
    $$('[data-motore-campo]', dlgVoce).forEach(function (el) { el.hidden = el.dataset.motoreCampo !== pref.motore; });
    var c = chiavi();
    var manca = (pref.motore === 'openai' && !c.openai) || (pref.motore === 'elevenlabs' && !c.elevenlabs);
    $('[data-manca-chiave]', dlgVoce).hidden = !manca;
  }
  function apriVoce() {
    $$('input[name="voce-motore"]', dlgVoce).forEach(function (r) { r.checked = r.value === pref.motore; });
    $$('input[name="voce-modo"]', dlgVoce).forEach(function (r) { r.checked = r.value === pref.modo; });
    $('#voce-openai').value = pref.voceOpenai; $('#voce-eleven').value = pref.voceEleven;
    $('#voce-velocita').value = String(pref.velocita);
    riempiVoci(); mostraMotore();
    dlgVoce.showModal();
  }
  if (dlgVoce) {
    dlgVoce.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'voce-motore') { pref.motore = t.value; ferma(); mostraMotore(); }
      if (t.name === 'voce-modo') { pref.modo = t.value; ferma(); letti = mappa().testo.length; }
      if (t.id === 'voce-sistema') pref.voceSistema = t.value;
      if (t.id === 'voce-openai') pref.voceOpenai = t.value;
      if (t.id === 'voce-eleven') pref.voceEleven = t.value;
      if (t.id === 'voce-velocita') pref.velocita = parseFloat(t.value) || 1;
      salvaPref();
    });
    $('[data-prova-voce]', dlgVoce).addEventListener('click', function () { narra('Così suona questa voce sul tuo foglio.', -1e9); });
    $('[data-vai-chiavi]', dlgVoce).addEventListener('click', function () { dlgVoce.close(); apriChiavi(); });
  }
  $$('[data-voce="leggi"]').forEach(function (b) { b.addEventListener('click', leggiTutto); });
  $$('[data-voce="ferma"]').forEach(function (b) { b.addEventListener('click', ferma); });
  $$('[data-voce="impostazioni"]').forEach(function (b) { b.addEventListener('click', apriVoce); });

  /* ——— Finestra «Le mie chiavi AI» ——— */
  var CAMPI = ['anthropic', 'openai', 'gemini', 'elevenlabs'];
  function apriChiavi() {
    var c = chiavi();
    CAMPI.forEach(function (k) { var i = $('#chiave-' + k); i.value = ''; i.placeholder = c[k] ? 'Salvata ••••' + c[k].slice(-4) : i.dataset.esempio; });
    ['anthropic', 'openai', 'gemini'].forEach(function (k) { $('#modello-' + k).value = c.modelli[k]; });
    $('#chiavi-ricorda').checked = chiaveRicordata() || !leggiJSON(sessionStorage, CHIAVI);
    dlgChiavi.showModal();
  }
  if (dlgChiavi) {
    $('[data-salva-chiavi]', dlgChiavi).addEventListener('click', function () {
      var c = chiavi();
      CAMPI.forEach(function (k) { var v = $('#chiave-' + k).value.trim(); if (v) c[k] = v; });
      ['anthropic', 'openai', 'gemini'].forEach(function (k) { var v = $('#modello-' + k).value.trim(); c.modelli[k] = v || MODELLI[k]; });
      salvaChiavi(c, $('#chiavi-ricorda').checked);
      dlgChiavi.close(); avviso('Chiavi salvate in questo browser.');
    });
    $('[data-cancella-chiavi]', dlgChiavi).addEventListener('click', function () {
      salvaChiavi(null, true); scriviJSON(localStorage, CHIAVI, null);
      dlgChiavi.close(); avviso('Chiavi cancellate da questo browser.');
    });
  }
  $$('[data-apri-chiavi]').forEach(function (b) { b.addEventListener('click', apriChiavi); });

  /* ——— Suggerimenti ——— */
  var AZIONI = {
    migliora: 'Correggi ciò che inciampa: refusi, ripetizioni, punteggiatura, frasi poco chiare, concordanze.',
    taglia: 'Togli ciò che è superfluo: parole, incisi e frasi ridondanti. La proposta deve essere più breve dell’originale.',
    stile: 'Lavora sul ritmo e sulla precisione delle immagini, mantenendo la voce e il registro dell’autore. Niente abbellimenti generici.'
  };
  var SCHEMA = { type: 'object', additionalProperties: false, required: ['suggerimenti'], properties: { suggerimenti: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['originale', 'proposta', 'nota'],
    properties: { originale: { type: 'string' }, proposta: { type: 'string' }, nota: { type: 'string' } } } } } };
  function istruzioni(azione) {
    return 'Sei un editor letterario che lavora su testi narrativi in italiano. Rispetta la voce dell’autore: proponi interventi mirati, non riscrivere il testo. ' +
      AZIONI[azione] + ' Rispondi solo con il JSON richiesto. Al massimo 4 interventi; se il brano va bene così, restituisci un elenco vuoto. ' +
      'Per ogni intervento: «originale» è un brano copiato carattere per carattere dal testo (tra 15 e 160 caratteri, senza a capo), «proposta» è lo stesso brano riscritto, «nota» spiega il perché in una frase breve.';
  }
  function domanda(pezzo) { return 'Testo:\n<<<\n' + pezzo + '\n>>>'; }

  var sdk = null;
  function caricaSdk() {
    if (window.EffingeAnthropic) return Promise.resolve(window.EffingeAnthropic);
    if (sdk) return sdk;
    sdk = new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = '/assets/vendor/anthropic-1.12.0.js' + (versione ? '?v=' + versione : '');
      s.onload = function () { ok(window.EffingeAnthropic); };
      s.onerror = function () { sdk = null; ko(new Error('Impossibile caricare il modulo di Claude.')); };
      document.head.appendChild(s);
    });
    return sdk;
  }
  function chiediClaude(c, azione, pezzo) {
    return caricaSdk().then(function (Anthropic) {
      var client = new Anthropic({ apiKey: c.anthropic, dangerouslyAllowBrowser: true, maxRetries: 1 });
      return client.beta.messages.create({
        model: c.modelli.anthropic,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
        system: istruzioni(azione),
        messages: [{ role: 'user', content: domanda(pezzo) }]
      }).then(function (r) {
        if (r.stop_reason === 'refusal') throw new Error('Claude ha preferito non rispondere su questo brano.');
        var t = (r.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
        return JSON.parse(t);
      }, function (e) {
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new Error('La chiave Claude non è valida o non ha i permessi.');
        if (e instanceof Anthropic.RateLimitError) throw new Error('Claude: troppe richieste o credito esaurito. Riprova tra poco.');
        if (e instanceof Anthropic.NotFoundError) throw new Error('Claude: il modello «' + c.modelli.anthropic + '» non esiste. Controllalo in «Chiavi AI».');
        if (e instanceof Anthropic.APIConnectionError) throw new Error('Claude non risponde: controlla la connessione.');
        if (e instanceof Anthropic.APIError) throw new Error('Claude: errore ' + (e.status || '') + ' — ' + e.message);
        throw e;
      });
    });
  }
  function chiediOpenai(c, azione, pezzo) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + c.openai, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: c.modelli.openai, messages: [{ role: 'system', content: istruzioni(azione) }, { role: 'user', content: domanda(pezzo) }],
        response_format: { type: 'json_schema', json_schema: { name: 'suggerimenti', strict: true, schema: SCHEMA } } })
    }).then(function (r) { return r.ok ? r.json() : erroreHttp(r, 'OpenAI'); })
      .then(function (j) { return JSON.parse(j.choices[0].message.content); });
  }
  function chiediGemini(c, azione, pezzo) {
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(c.modelli.gemini) + ':generateContent', {
      method: 'POST', headers: { 'x-goog-api-key': c.gemini, 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: istruzioni(azione) }] }, contents: [{ role: 'user', parts: [{ text: domanda(pezzo) }] }],
        generationConfig: { responseMimeType: 'application/json' } })
    }).then(function (r) { return r.ok ? r.json() : erroreHttp(r, 'Gemini'); })
      .then(function (j) { return JSON.parse(j.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('')); });
  }

  var suggerimenti = [], segniSug = [], lavoro = 0;
  var fornitore = $('#ai-fornitore');
  if (fornitore) { fornitore.value = pref.fornitore; fornitore.addEventListener('change', function () { pref.fornitore = fornitore.value; salvaPref(); }); }
  var NOMI = { anthropic: 'Claude', openai: 'OpenAI', gemini: 'Gemini' };

  function suggerisci(azione) {
    var c = chiavi(), f = pref.fornitore;
    if (!c[f]) { avviso('Per i suggerimenti con ' + NOMI[f] + ' serve la tua chiave: aggiungila in «Chiavi AI».', 4200); apriChiavi(); return; }
    var m = mappa(), testo = m.testo, base = 0, sel = getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode) && !sel.getRangeAt(0).collapsed) {
      var r = sel.getRangeAt(0), a = offsetDi(m, r.startContainer, r.startOffset), b = offsetDi(m, r.endContainer, r.endOffset);
      if (a >= 0 && b > a) { base = a; testo = testo.slice(a, b); }
    }
    if (!testo.trim()) { avviso('Scrivi qualcosa prima di chiedere suggerimenti.'); return; }
    var lista = [], PASSO = 1800, SOV = 200;
    for (var i = 0; i < testo.length; i += PASSO - SOV) { lista.push(testo.slice(i, i + PASSO)); if (i + PASSO >= testo.length) break; }
    var MAX = 12, tagliato = lista.length > MAX;
    lista = lista.slice(0, MAX);
    var chiedi = f === 'anthropic' ? chiediClaude : f === 'openai' ? chiediOpenai : chiediGemini;
    var mio = ++lavoro;
    togliSuggerimenti();
    root.classList.add('ai-lavora');
    mostraStato(NOMI[f] + ' sta leggendo' + (lista.length > 1 ? ' ' + lista.length + ' parti' : '') + '…');
    Promise.all(lista.map(function (p) {
      return chiedi(c, azione, p).then(function (j) { return (j && j.suggerimenti) || []; }, function (e) { return { errore: e }; });
    })).then(function (risposte) {
      if (mio !== lavoro) return;
      root.classList.remove('ai-lavora'); mostraStato('');
      var errori = risposte.filter(function (r) { return r && r.errore; });
      if (errori.length === risposte.length) { avviso(errori[0].errore.message || 'Nessuna risposta.', 6000); return; }
      var visti = {}, t = mappa().testo;
      risposte.forEach(function (r) {
        if (!Array.isArray(r)) return;
        r.forEach(function (s) {
          if (!s || typeof s.originale !== 'string' || typeof s.proposta !== 'string') return;
          var o = s.originale.trim(); if (o.length < 4 || visti[o] || o === s.proposta.trim()) return;
          var pos = t.indexOf(o, base); if (pos < 0) pos = t.indexOf(o); if (pos < 0) return;
          visti[o] = true;
          suggerimenti.push({ originale: o, proposta: s.proposta.trim(), nota: String(s.nota || '').trim(), pos: pos, tipo: azione });
        });
      });
      disegnaSuggerimenti();
      avviso(suggerimenti.length ? suggerimenti.length + (suggerimenti.length === 1 ? ' suggerimento: tocca il testo sottolineato.' : ' suggerimenti: tocca il testo sottolineato.') : 'Nessun suggerimento: il testo va bene così.', 4200);
      if (tagliato) avviso('Ho letto le prime 12 parti. Seleziona un brano per il resto.', 5200);
    });
  }
  function trova(s, m) {
    var pos = m.testo.indexOf(s.originale, Math.max(0, s.pos - 400));
    if (pos < 0) pos = m.testo.indexOf(s.originale);
    if (pos >= 0) s.pos = pos;
    return pos;
  }
  function disegnaSuggerimenti() {
    segniSug.forEach(function (el) { el.remove(); }); segniSug = [];
    var m = mappa();
    suggerimenti = suggerimenti.filter(function (s) { return trova(s, m) >= 0; });
    suggerimenti.forEach(function (s, i) {
      var r = intervallo(m, s.pos, s.originale.length); if (!r) return;
      rettangoliIn(r).forEach(function (q) {
        var el = document.createElement('span');
        el.className = 'ai-segno ai-' + s.tipo; el.dataset.i = i;
        el.style.transform = 'translate(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px)';
        el.style.width = q.w.toFixed(1) + 'px'; el.style.height = q.h.toFixed(1) + 'px';
        strato.appendChild(el); segniSug.push(el);
      });
    });
    var barra = $('[data-ai-elenco]');
    if (barra) { barra.hidden = !suggerimenti.length; $('[data-ai-conta]').textContent = suggerimenti.length + (suggerimenti.length === 1 ? ' suggerimento' : ' suggerimenti'); }
  }
  function togliSuggerimenti() { suggerimenti = []; chiudiNota(); disegnaSuggerimenti(); }
  var ridisegna = 0;
  editor.addEventListener('input', function () { if (suggerimenti.length) { cancelAnimationFrame(ridisegna); ridisegna = requestAnimationFrame(disegnaSuggerimenti); } chiudiNota(); });
  addEventListener('resize', function () { if (suggerimenti.length) disegnaSuggerimenti(); });

  // la nota: si apre toccando il testo sottolineato
  var nota = document.createElement('div');
  nota.className = 'ai-nota'; nota.setAttribute('role', 'dialog'); nota.setAttribute('aria-label', 'Suggerimento'); nota.hidden = true;
  nota.innerHTML = '<p class="ai-nota-perche"></p><p class="ai-nota-proposta"></p><div class="ai-nota-azioni"><button type="button" class="pill primario" data-accetta>Accetta</button><button type="button" class="pill" data-ignora>Ignora</button></div>';
  document.body.appendChild(nota);
  var aperta = -1;
  function chiudiNota() { nota.hidden = true; aperta = -1; }
  function apriNota(i) {
    var s = suggerimenti[i]; if (!s) return;
    aperta = i;
    $('.ai-nota-perche', nota).textContent = s.nota || 'Proposta';
    $('.ai-nota-proposta', nota).textContent = s.proposta;
    nota.hidden = false;
    var m = mappa(), r = intervallo(m, s.pos, s.originale.length), q = r && r.getClientRects()[0];
    var x = q ? q.left : innerWidth / 2 - 160, y = q ? q.bottom + 10 : innerHeight / 2;
    var w = nota.offsetWidth, h = nota.offsetHeight;
    if (y + h > innerHeight - 12 && q) y = q.top - h - 10;
    nota.style.left = Math.max(12, Math.min(x, innerWidth - w - 12)) + 'px';
    nota.style.top = Math.max(12, y) + 'px';
    $('[data-accetta]', nota).focus({ preventScroll: true });
  }
  editor.addEventListener('click', function () {
    if (!suggerimenti.length) return;
    var sel = getSelection(); if (!sel.rangeCount || !sel.getRangeAt(0).collapsed) return;
    var m = mappa(), off = offsetDi(m, sel.anchorNode, sel.anchorOffset); if (off < 0) return;
    for (var i = 0; i < suggerimenti.length; i++) {
      var s = suggerimenti[i];
      if (off >= s.pos && off <= s.pos + s.originale.length) { apriNota(i); return; }
    }
    chiudiNota();
  });
  $('[data-accetta]', nota).addEventListener('click', function () {
    var s = suggerimenti[aperta]; if (!s) return;
    var m = mappa(); if (trova(s, m) < 0) { chiudiNota(); return; }
    var r = intervallo(m, s.pos, s.originale.length); if (!r) return;
    editor.focus({ preventScroll: true });
    var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    suggerimenti.splice(aperta, 1);
    chiudiNota();
    document.execCommand('insertText', false, s.proposta);   // annullabile con Ctrl+Z; salva come ogni modifica
    disegnaSuggerimenti();
  });
  $('[data-ignora]', nota).addEventListener('click', function () { suggerimenti.splice(aperta, 1); chiudiNota(); disegnaSuggerimenti(); editor.focus({ preventScroll: true }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !nota.hidden) chiudiNota(); });
  document.addEventListener('pointerdown', function (e) { if (!nota.hidden && !nota.contains(e.target) && !editor.contains(e.target)) chiudiNota(); });
  $$('[data-suggerisci]').forEach(function (b) { b.addEventListener('click', function () { suggerisci(b.dataset.suggerisci); }); });
  $$('[data-ai-cancella]').forEach(function (b) { b.addEventListener('click', togliSuggerimenti); });

  window.EffingeVoce = { narra: narra, ferma: ferma, mappa: mappa, suggerimenti: function () { return suggerimenti; } };
})();
