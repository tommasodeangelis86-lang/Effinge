/*!
 * Effinge — «Scrivi»: un foglio su cui scrivere davvero.
 *
 * Un <textarea> vero (tastiera, correttore, copia/incolla, iPhone) con il testo trasparente,
 * sopra uno «specchio» che disegna lo stesso testo con lo stesso a capo. Sullo specchio:
 *   - ogni carattere appena scritto si accende di luce calda e torna inchiostro;
 *   - la lampada segue il cursore;
 *   - il paragrafo in cui si scrive resta acceso, gli altri si attenuano (come Alhora).
 *
 * I fogli sono salvati solo in questo browser (localStorage). Il modello dati
 * ({ id, titolo, testo, creato, aggiornato }) è pensato per passare in futuro a un
 * archivio online con account personali.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var area = document.querySelector('[data-scrivi]');
  if (!area) return;

  var ta = area.querySelector('textarea');
  var specchio = area.querySelector('.scrivi-specchio');
  var foglio = area.closest('.foglio');
  var titolo = document.getElementById('titolo-foglio');
  var stato = document.querySelector('[data-stato]');
  var dialog = document.getElementById('fogli');
  var elenco = document.querySelector('[data-elenco-fogli]');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FADE = 900;         // ms: durata della luce su ogni carattere appena scritto
  var MAX_LUCE = 40;      // oltre questi caratteri (un incolla lungo) niente bagliore
  var KEY = 'effinge-fogli', CUR = 'effinge-foglio-corrente', PREF = 'effinge-scrivi-';

  /* ——— Archivio dei fogli (solo in questo browser) ——— */
  var memoria = true;
  function leggi(k) { try { return localStorage.getItem(k); } catch (e) { memoria = false; return null; } }
  function scrivi(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { memoria = false; return false; } }
  function nuovoFoglio() { var t = Date.now(); return { id: 'f' + t.toString(36) + Math.random().toString(36).slice(2, 6), titolo: '', testo: '', creato: t, aggiornato: t }; }
  var fogli;
  try { fogli = JSON.parse(leggi(KEY) || '[]'); } catch (e) { fogli = []; }
  if (!Array.isArray(fogli)) fogli = [];
  fogli = fogli.filter(function (f) { return f && typeof f.id === 'string' && typeof f.testo === 'string'; });
  if (!fogli.length) fogli.push(nuovoFoglio());
  var corrente = fogli.filter(function (f) { return f.id === leggi(CUR); })[0] || fogli[0];

  function parole(t) { var m = t.trim().match(/\S+/g); return m ? m.length : 0; }
  function setStato(msg) { if (stato) stato.textContent = msg; }
  function riepilogo() { var n = parole(ta.value); return n + (n === 1 ? ' parola' : ' parole'); }

  var timerSalva = 0;
  function salva(subito) {
    clearTimeout(timerSalva);
    var go = function () {
      corrente.testo = ta.value;
      corrente.titolo = titolo.value.trim();
      corrente.aggiornato = Date.now();
      var ok = scrivi(KEY, JSON.stringify(fogli)) && scrivi(CUR, corrente.id);
      setStato(ok ? riepilogo() + ' · salvato' : riepilogo() + ' · non salvato: il browser blocca la memoria');
    };
    if (subito) go(); else { setStato(riepilogo()); timerSalva = setTimeout(go, 450); }
  }

  /* ——— Lo specchio ——— */
  var prev = '';
  var recenti = [];   // { i: indice nel testo, t: istante in cui si accende }

  function paragrafoDi(text, pos) { var n = 0; for (var i = 0; i < pos && i < text.length; i++) if (text.charCodeAt(i) === 10) n++; return n; }

  function disegna() {
    var text = ta.value;
    var caret = ta.selectionEnd == null ? text.length : ta.selectionEnd;
    var now = performance.now();
    recenti = recenti.filter(function (r) { return now - r.t < FADE + 50; });
    var mappa = {};
    recenti.forEach(function (r) { mappa[r.i] = r.t; });
    var fuoco = paragrafoDi(text, caret);
    var frag = document.createDocumentFragment();
    var righe = text.split('\n');
    var base = 0;
    var segno = null;
    righe.forEach(function (riga, n) {
      var p = document.createElement('div');
      p.className = 'p' + (n === fuoco ? ' fuoco' : '');
      var buf = '';
      var i = 0;
      var flush = function () { if (buf) { p.appendChild(document.createTextNode(buf)); buf = ''; } };
      for (var ch of riga) {
        var idx = base + i;
        if (idx === caret) { flush(); segno = document.createElement('span'); segno.className = 'segno'; p.appendChild(segno); }
        if (mappa[idx] !== undefined) {
          flush();
          var s = document.createElement('span');
          s.className = 'nuovo';
          s.style.animationDelay = Math.round(mappa[idx] - now) + 'ms';
          s.textContent = ch;
          p.appendChild(s);
        } else buf += ch;
        i += ch.length;
      }
      flush();
      if (base + riga.length === caret) { segno = document.createElement('span'); segno.className = 'segno'; p.appendChild(segno); }
      if (!riga.length) p.appendChild(document.createTextNode('​'));
      frag.appendChild(p);
      base += riga.length + 1;
    });
    specchio.replaceChildren(frag);
    return segno;
  }

  /* ——— La lampada segue il cursore ——— */
  var L = window.EffingeLampada && !root.classList.contains('lampada-spenta-forzata') ? new window.EffingeLampada(foglio) : null;
  var inattivo = 0;
  if (L) { L.lag = reduce ? 1 : 170; L.intensity = .9; }

  function segui(segno, scorri) {
    if (!segno) return;
    if (L) {
      var p = L.at(segno, 0, .5);
      L.to(p.x + 4, p.y);
      L.intensity = .8;
      clearTimeout(inattivo);
      // fermi un momento: la lampada si apre un po' per rileggere
      inattivo = setTimeout(function () { L.intensity = 1; }, 1600);
    }
    if (scorri) {
      var r = segno.getBoundingClientRect();
      var h = window.visualViewport ? window.visualViewport.height : innerHeight;
      var basso = h - 120, alto = 110;
      if (r.bottom > basso) window.scrollBy({ top: r.bottom - basso, behavior: reduce ? 'auto' : 'smooth' });
      else if (r.top < alto) window.scrollBy({ top: r.top - alto, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function aggiorna(scorri) { segui(disegna(), scorri); }

  ta.addEventListener('input', function () {
    var cur = ta.value;
    var a = 0;
    while (a < prev.length && a < cur.length && prev.charCodeAt(a) === cur.charCodeAt(a)) a++;
    var ep = prev.length, ec = cur.length;
    while (ep > a && ec > a && prev.charCodeAt(ep - 1) === cur.charCodeAt(ec - 1)) { ep--; ec--; }
    var delta = (ec - a) - (ep - a);
    recenti = recenti.filter(function (r) { return r.i < a || r.i >= ep; }).map(function (r) { return r.i >= ep ? { i: r.i + delta, t: r.t } : r; });
    var inseriti = ec - a;
    if (!reduce && inseriti > 0 && inseriti <= MAX_LUCE) {
      var now = performance.now();
      for (var k = a, n = 0; k < ec; k++) {
        if (!/\s/.test(cur[k])) recenti.push({ i: k, t: now + n * 22 });
        n++;
      }
    }
    prev = cur;
    aggiorna(true);
    salva(false);
  });
  document.addEventListener('selectionchange', function () { if (document.activeElement === ta) aggiorna(false); });
  ta.addEventListener('focus', function () { aggiorna(false); });
  titolo.addEventListener('input', function () { salva(false); });
  titolo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ta.focus(); } });
  addEventListener('resize', function () { aggiorna(false); });
  addEventListener('pagehide', function () { salva(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) salva(true); });

  function apri(f) {
    if (corrente && corrente !== f) salva(true);
    corrente = f;
    ta.value = f.testo;
    titolo.value = f.titolo || '';
    prev = ta.value;
    recenti = [];
    scrivi(CUR, f.id);
    setStato(riepilogo() + (memoria ? ' · salvato' : ''));
    aggiorna(false);
  }

  /* ——— Comandi ——— */
  function preferenza(nome, classe, btn, predefinita) {
    var v = leggi(PREF + nome);
    var on = v == null ? predefinita : v === '1';
    var set = function (x) { on = x; root.classList.toggle(classe, on); if (btn) btn.setAttribute('aria-pressed', String(on)); scrivi(PREF + nome, on ? '1' : '0'); };
    set(on);
    if (btn) btn.addEventListener('click', function () { set(!on); ta.focus({ preventScroll: true }); });
  }
  preferenza('concentrazione', 'scrittura-concentrata', document.querySelector('[data-comando="concentrazione"]'), true);
  preferenza('lampada', 'scrittura-lampada', document.querySelector('[data-comando="lampada"]'), !reduce);

  var copia = document.querySelector('[data-comando="copia"]');
  if (copia) copia.addEventListener('click', function () {
    var testo = (titolo.value.trim() ? titolo.value.trim() + '\n\n' : '') + ta.value;
    var fatto = function () { setStato('Copiato'); setTimeout(function () { setStato(riepilogo() + ' · salvato'); }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(testo).then(fatto, function () { ta.focus(); ta.select(); setStato('Seleziona e copia'); });
    else { ta.focus(); ta.select(); setStato('Seleziona e copia'); }
  });

  /* ——— I miei fogli ——— */
  function data(t) { return new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function riempiElenco() {
    elenco.replaceChildren();
    fogli.slice().sort(function (a, b) { return b.aggiornato - a.aggiornato; }).forEach(function (f) {
      var li = document.createElement('li');
      if (f === corrente) li.className = 'attuale';
      var apriBtn = document.createElement('button');
      apriBtn.type = 'button';
      apriBtn.className = 'apri';
      var t = document.createElement('span'); t.className = 't'; t.textContent = f.titolo || 'Senza titolo';
      var m = document.createElement('span'); m.className = 'm'; m.textContent = data(f.aggiornato) + ' · ' + parole(f.testo) + ' parole';
      apriBtn.append(t, m);
      apriBtn.addEventListener('click', function () { apri(f); dialog.close(); ta.focus(); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'elimina';
      del.textContent = 'Elimina';
      del.setAttribute('aria-label', 'Elimina «' + (f.titolo || 'Senza titolo') + '»');
      var armato = 0;
      del.addEventListener('click', function () {
        if (!armato) {
          del.textContent = 'Conferma';
          del.classList.add('armato');
          armato = setTimeout(function () { armato = 0; del.textContent = 'Elimina'; del.classList.remove('armato'); }, 3000);
          return;
        }
        clearTimeout(armato);
        fogli = fogli.filter(function (x) { return x !== f; });
        if (!fogli.length) fogli.push(nuovoFoglio());
        if (f === corrente) { corrente = null; apri(fogli[0]); }
        scrivi(KEY, JSON.stringify(fogli));
        riempiElenco();
      });
      li.append(apriBtn, del);
      elenco.appendChild(li);
    });
  }
  var apriFogli = document.querySelector('[data-comando="fogli"]');
  if (apriFogli && dialog) apriFogli.addEventListener('click', function () { salva(true); riempiElenco(); dialog.showModal(); });
  var nuovo = document.querySelector('[data-nuovo-foglio]');
  if (nuovo) nuovo.addEventListener('click', function () {
    var f = nuovoFoglio();
    fogli.push(f);
    apri(f);
    salva(true);
    dialog.close();
    titolo.focus();
  });
  var scarica = document.querySelector('[data-scarica]');
  if (scarica) scarica.addEventListener('click', function () {
    salva(true);
    var testo = (corrente.titolo ? corrente.titolo + '\n\n' : '') + corrente.testo;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([testo], { type: 'text/plain;charset=utf-8' }));
    a.download = (corrente.titolo || 'foglio').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-').toLowerCase() + '.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
  var chiudi = document.querySelector('[data-chiudi-fogli]');
  if (chiudi) chiudi.addEventListener('click', function () { dialog.close(); });
  if (dialog) dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  apri(corrente);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { aggiorna(false); });
  if (!memoria) setStato('Attenzione: questo browser non permette di salvare i fogli');
})();
