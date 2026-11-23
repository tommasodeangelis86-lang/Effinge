/*!
 * Effinge — Scrivi: un editor di libri sotto una lampada.
 *
 * - Opere fatte di sezioni ordinate: copertina, parti, capitoli (un «foglio» = un capitolo).
 * - A sinistra le anteprime di tutte le sezioni, come il riquadro di spostamento di Word.
 * - Editor con formattazione (contenteditable + comandi del browser), salvato in IndexedDB.
 * - Ogni lettera appena scritta si accende: un riflesso dorato sovrapposto alla lettera vera,
 *   che non tocca il testo (annulla/ripeti e correttore restano quelli del browser).
 * - La lampada segue il mouse; mentre scrivi segue il cursore di testo.
 * - Concentrazione: mentre scrivi, il paragrafo corrente resta acceso e gli altri si attenuano.
 * Niente lascia il dispositivo: nessun account, nessun invio.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var app = document.querySelector('[data-scrivi-app]');
  if (!app) return;
  var versione = (document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src) || [])[1] || '';

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var editor = $('.scrivi-editor', app);
  var riscrivi = $('[data-riscrivi]', app);
  var copia = null, timerRiscrivi = 0;
  var foglio = editor.closest('.foglio');
  var luci = $('.scrivi-luci', app);
  var titolo = $('#titolo-sezione');
  var etichetta = $('[data-etichetta]');
  var stato = $('[data-stato]');
  var elencoEl = $('[data-capitoli]');
  var totaliEl = $('[data-totali]');
  var nomeOpera = $('#nome-opera');
  var pannelloCap = $('#capitoli');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PREF = 'effinge-scrivi-', CORR = 'effinge-opera-corrente';
  var fmt = new Intl.NumberFormat('it-IT');
  var fmt1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function leggi(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function scriviPref(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function id(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function avviso(msg, ms) {
    var a = document.createElement('div');
    a.className = 'avviso'; a.setAttribute('role', 'status'); a.textContent = msg;
    document.body.appendChild(a);
    setTimeout(function () { a.remove(); }, ms || 2600);
  }

  /* ——— Pulizia dell'HTML: solo ciò che un testo letterario usa ——— */
  var BLOCCHI = { P: 'p', H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3', BLOCKQUOTE: 'blockquote', UL: 'ul', OL: 'ol', LI: 'li', HR: 'hr', DIV: 'p' };
  var INLINE = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', S: 's', STRIKE: 's', DEL: 's', SUP: 'sup', SUB: 'sub', BR: 'br' };
  var CLASSI = ['centro', 'destra', 'giustificato', 'sinistra', 'stacco', 'note', 'nota'];
  var ALLINEA = { center: 'centro', right: 'destra', justify: 'giustificato', left: 'sinistra', start: 'sinistra', end: 'destra' };
  function pulisci(html) {
    var d = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    var out = document.createElement('div');
    function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName;
        if (/^(SCRIPT|STYLE|TEMPLATE|IFRAME|OBJECT|EMBED|SVG|MATH|IMG|VIDEO|AUDIO|CANVAS|INPUT|TEXTAREA|SELECT|BUTTON|META|LINK|HEAD|TITLE)$/.test(tag)) return;
        var el;
        if (tag === 'DIV' && n.classList.contains('note')) el = document.createElement('div');
        else if (BLOCCHI[tag]) el = document.createElement(BLOCCHI[tag]);
        else if (INLINE[tag]) el = document.createElement(INLINE[tag]);
        else {
          // span di Word/Google Docs: conserva grassetto, corsivo, sottolineato
          var st = n.style || {}, w = st.fontWeight, wrap = dst;
          if (w === 'bold' || parseInt(w, 10) >= 600) { var b = document.createElement('strong'); wrap.appendChild(b); wrap = b; }
          if (st.fontStyle === 'italic') { var i = document.createElement('em'); wrap.appendChild(i); wrap = i; }
          if (/underline/.test(st.textDecoration || '')) { var u = document.createElement('u'); wrap.appendChild(u); wrap = u; }
          walk(n, wrap);
          return;
        }
        if (BLOCCHI[tag] || el.tagName === 'DIV') {
          var cls = (n.getAttribute('class') || '').split(/\s+/).filter(function (c) { return CLASSI.indexOf(c) >= 0; });
          var al = (n.style && ALLINEA[n.style.textAlign]) || (n.getAttribute('align') && ALLINEA[n.getAttribute('align').toLowerCase()]);
          if (al) cls = cls.filter(function (c) { return !/^(centro|destra|giustificato|sinistra)$/.test(c); }).concat(al);
          if (cls.length) el.className = cls.join(' ');
        }
        if (el.tagName !== 'HR' && el.tagName !== 'BR') walk(n, el);
        dst.appendChild(el);
      });
    }
    walk(d.body, out);
    // il testo sciolto al primo livello va dentro un paragrafo
    var fin = document.createElement('div'), p = null;
    Array.prototype.slice.call(out.childNodes).forEach(function (n) {
      var blocco = n.nodeType === 1 && /^(P|H1|H2|H3|BLOCKQUOTE|UL|OL|HR|DIV)$/.test(n.tagName);
      if (blocco) { p = null; fin.appendChild(n); return; }
      if (n.nodeType === 3 && !n.nodeValue.trim() && !p) return;
      if (n.nodeType === 1 && n.tagName === 'LI') { p = null; var ul = document.createElement('ul'); ul.appendChild(n); fin.appendChild(ul); return; }
      if (!p) { p = document.createElement('p'); fin.appendChild(p); }
      p.appendChild(n);
    });
    return fin.innerHTML;
  }

  function testoDi(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html || '').replace(/<\/(p|h1|h2|h3|li|blockquote|div)>/gi, '\n</$1>').replace(/<br\s*\/?>/gi, '\n');
    return t.content.textContent || '';
  }
  function conta(text) {
    var m = text.trim().match(/\S+/g);
    return { parole: m ? m.length : 0, battute: Array.from(text.replace(/\r?\n/g, '')).length };
  }
  function cartella() { return leggi('effinge-scrivi-cartella') === '1800' ? 1800 : 2000; }
  function riassunto(c) {
    var k = c.battute / cartella();
    return fmt.format(c.parole) + (c.parole === 1 ? ' parola' : ' parole') + ' · ' + fmt.format(c.battute) + ' battute · ' + fmt1.format(k) + (k === 1 ? ' cartella' : ' cartelle');
  }
  function escape(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function testoInHtml(t) { return String(t || '').split(/\n/).map(function (r) { return '<p>' + (escape(r) || '<br>') + '</p>'; }).join(''); }

  /* ——— Archivio: IndexedDB (un romanzo intero non sta nel localStorage) ——— */
  var memoria = { opere: {}, sezioni: {} }, DB = null;
  function apriDB() {
    return new Promise(function (ok) {
      if (!window.indexedDB) return ok(null);
      var r;
      try { r = indexedDB.open('effinge-scrivi', 1); } catch (e) { return ok(null); }
      r.onupgradeneeded = function () {
        var db = r.result;
        db.createObjectStore('opere', { keyPath: 'id' });
        db.createObjectStore('sezioni', { keyPath: 'id' }).createIndex('opera', 'operaId');
      };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ok(null); };
      r.onblocked = function () { ok(null); };
    });
  }
  function req(store, mode, fn) {
    return new Promise(function (ok, ko) {
      var t = DB.transaction(store, mode), s = t.objectStore(store), out = fn(s);
      t.oncomplete = function () { ok(out && out.result !== undefined ? out.result : undefined); };
      t.onerror = function () { ko(t.error); };
      t.onabort = function () { ko(t.error); };
    });
  }
  function valori(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
  var archivio = {
    opere: function () { return DB ? req('opere', 'readonly', function (s) { return s.getAll(); }) : Promise.resolve(valori(memoria.opere)); },
    sezioni: function (operaId) { return DB ? req('sezioni', 'readonly', function (s) { return s.index('opera').getAll(operaId); }) : Promise.resolve(valori(memoria.sezioni).filter(function (x) { return x.operaId === operaId; })); },
    salvaOpera: function (o) { if (!DB) { memoria.opere[o.id] = o; return Promise.resolve(); } return req('opere', 'readwrite', function (s) { s.put(o); }); },
    salvaSezioni: function (list) { if (!DB) { list.forEach(function (x) { memoria.sezioni[x.id] = x; }); return Promise.resolve(); } return req('sezioni', 'readwrite', function (s) { list.forEach(function (x) { s.put(x); }); }); },
    elimina: function (store, ids) { if (!DB) { ids.forEach(function (i) { delete memoria[store][i]; }); return Promise.resolve(); } return req(store, 'readwrite', function (s) { ids.forEach(function (i) { s.delete(i); }); }); }
  };

  /* ——— Stato ——— */
  var opera = null;        // { id, titolo, ordine: [id], creata, aggiornata, ultima }
  var sezioni = {};        // id -> { id, operaId, tipo, titolo, html, parole, battute, aggiornata }
  var corrente = null;     // id della sezione aperta

  function nuovaSezione(tipo, extra, operaId) {
    var s = { id: id('s'), operaId: operaId || opera.id, tipo: tipo, titolo: '', html: '', parole: 0, battute: 0, aggiornata: Date.now() };
    for (var k in extra || {}) s[k] = extra[k];
    return s;
  }
  function etichettaDi(sid) {
    var n = 0, num = 0;
    opera.ordine.forEach(function (x) { var s = sezioni[x]; if (s && s.tipo === 'capitolo') { n++; if (x === sid) num = n; } });
    var s = sezioni[sid];
    if (!s) return { breve: '', lungo: '', segnaposto: '' };
    if (s.tipo === 'copertina') return { breve: 'Copertina', lungo: s.titolo || 'Copertina', segnaposto: 'Copertina' };
    if (s.tipo === 'parte') return { breve: 'Parte', lungo: s.titolo || 'Parte', segnaposto: 'Titolo della parte (es. Parte I)' };
    return { breve: 'Capitolo ' + num, numero: num, lungo: s.titolo ? num + ' · ' + s.titolo : 'Capitolo ' + num, segnaposto: 'Titolo del capitolo' };
  }

  /* ——— Salvataggio ——— */
  var timerSalva = 0, timerMini = 0;
  function aggiornaCorrenteDaEditor() {
    var s = sezioni[corrente]; if (!s) return null;
    s.html = pulisci(editor.innerHTML);
    s.titolo = titolo.value.trim();
    var c = conta(testoDi(s.html));
    s.parole = c.parole; s.battute = c.battute; s.aggiornata = Date.now();
    return s;
  }
  function salva(subito) {
    clearTimeout(timerSalva);
    var go = function () {
      var s = aggiornaCorrenteDaEditor(); if (!s) return Promise.resolve();
      opera.aggiornata = Date.now();
      totali();
      return Promise.all([archivio.salvaSezioni([s]), archivio.salvaOpera(opera)]).then(function () {
        if (s.id === corrente) stato.textContent = riassunto(s) + ' · salvato';
      }, function () { stato.textContent = riassunto(s) + ' · non salvato: memoria del browser piena o bloccata'; });
    };
    if (subito) return go();
    timerSalva = setTimeout(go, 500);
    return Promise.resolve();
  }
  function aggiornaConteggioVivo() { stato.textContent = riassunto(conta(editor.innerText || '')); }

  /* ——— Anteprime a sinistra ——— */
  function miniHtml(s) {
    var tmp = document.createElement('div');
    tmp.innerHTML = s.html || '';
    var blocchi = Array.prototype.slice.call(tmp.children, 0, s.tipo === 'copertina' ? 16 : 9);
    var testa = '';
    if (s.tipo === 'capitolo') testa = '<h1>' + escape(String(etichettaDi(s.id).numero || '')) + '</h1>' + (s.titolo ? '<h2>' + escape(s.titolo) + '</h2>' : '');
    if (s.tipo === 'parte') testa = '<h1>' + escape(s.titolo || 'Parte') + '</h1>';
    return testa + blocchi.map(function (b) { return b.outerHTML; }).join('');
  }
  function totali() {
    var t = { parole: 0, battute: 0 }, cap = 0;
    opera.ordine.forEach(function (x) { var s = sezioni[x]; if (!s) return; t.parole += s.parole || 0; t.battute += s.battute || 0; if (s.tipo === 'capitolo') cap++; });
    totaliEl.textContent = 'Opera: ' + cap + (cap === 1 ? ' capitolo' : ' capitoli') + ' · ' + riassunto(t);
  }
  var ICONA_X = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function renderElenco() {
    elencoEl.replaceChildren();
    opera.ordine.forEach(function (sid, i) {
      var s = sezioni[sid]; if (!s) return;
      var e = etichettaDi(sid);
      var li = document.createElement('li');
      li.dataset.id = sid;
      li.draggable = true;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'anteprima tipo-' + s.tipo;
      if (sid === corrente) b.setAttribute('aria-current', 'true');
      b.innerHTML = '<span class="miniatura" aria-hidden="true"><span class="mini-pagina ' + s.tipo + '"></span></span><span class="etichetta"><span class="n"></span><span class="m"></span></span>';
      $('.mini-pagina', b).innerHTML = miniHtml(s);
      $('.n', b).textContent = e.lungo;
      $('.m', b).textContent = s.tipo === 'capitolo' ? fmt.format(s.parole || 0) + ' parole' : s.tipo === 'parte' ? 'Parte' : '';
      b.addEventListener('click', function () { apri(sid); chiudiPannello(); });
      li.appendChild(b);
      var az = document.createElement('div');
      az.className = 'azioni-cap';
      az.innerHTML = '<button type="button" class="su" aria-label="Sposta su"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button><button type="button" class="giu" aria-label="Sposta giù"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><button type="button" class="elimina" aria-label="Elimina">' + ICONA_X + '</button>';
      $('.su', az).disabled = i === 0;
      $('.giu', az).disabled = i === opera.ordine.length - 1;
      $('.su', az).addEventListener('click', function () { sposta(sid, -1); });
      $('.giu', az).addEventListener('click', function () { sposta(sid, 1); });
      var del = $('.elimina', az), armato = 0;
      del.addEventListener('click', function () {
        if (!armato) {
          del.textContent = 'Conferma'; del.classList.add('armato');
          armato = setTimeout(function () { armato = 0; del.classList.remove('armato'); del.innerHTML = ICONA_X; }, 3000);
          return;
        }
        clearTimeout(armato);
        eliminaSezione(sid);
      });
      li.appendChild(az);
      // trascina per riordinare
      li.addEventListener('dragstart', function (ev) { ev.dataTransfer.setData('text/plain', sid); ev.dataTransfer.effectAllowed = 'move'; });
      li.addEventListener('dragover', function (ev) { ev.preventDefault(); li.classList.add('trascina-sopra'); });
      li.addEventListener('dragleave', function () { li.classList.remove('trascina-sopra'); });
      li.addEventListener('drop', function (ev) {
        ev.preventDefault(); li.classList.remove('trascina-sopra');
        var da = ev.dataTransfer.getData('text/plain'); if (!da || da === sid || !sezioni[da]) return;
        var o = opera.ordine.filter(function (x) { return x !== da; });
        o.splice(o.indexOf(sid), 0, da);
        opera.ordine = o; archivio.salvaOpera(opera); renderElenco(); intestazione();
      });
      elencoEl.appendChild(li);
    });
    var att = $('[aria-current="true"]', elencoEl);
    if (att) {
      var lr = elencoEl.getBoundingClientRect(), ar = att.getBoundingClientRect();
      if (ar.top < lr.top || ar.bottom > lr.bottom) elencoEl.scrollTop += ar.top - lr.top - lr.height / 3;
    }
    totali();
  }
  function aggiornaMiniatura() {
    var s = sezioni[corrente]; if (!s) return;
    var b = $('li[data-id="' + corrente + '"] .anteprima', elencoEl); if (!b) return;
    $('.mini-pagina', b).innerHTML = miniHtml(s);
    $('.n', b).textContent = etichettaDi(corrente).lungo;
    if (s.tipo === 'capitolo') $('.m', b).textContent = fmt.format(s.parole || 0) + ' parole';
  }
  function sposta(sid, d) {
    var i = opera.ordine.indexOf(sid), j = i + d;
    if (j < 0 || j >= opera.ordine.length) return;
    opera.ordine.splice(i, 1); opera.ordine.splice(j, 0, sid);
    archivio.salvaOpera(opera); renderElenco(); intestazione();
  }
  function eliminaSezione(sid) {
    var i = opera.ordine.indexOf(sid);
    opera.ordine.splice(i, 1);
    delete sezioni[sid];
    archivio.elimina('sezioni', [sid]);
    if (!opera.ordine.length) { var s = nuovaSezione('capitolo'); sezioni[s.id] = s; opera.ordine.push(s.id); archivio.salvaSezioni([s]); }
    archivio.salvaOpera(opera);
    if (sid === corrente) { corrente = null; apri(opera.ordine[Math.min(i, opera.ordine.length - 1)]); }
    else renderElenco();
  }
  function aggiungi(tipo) {
    salva(true);
    var s = nuovaSezione(tipo);
    sezioni[s.id] = s;
    var i = opera.ordine.indexOf(corrente);
    opera.ordine.splice(tipo === 'copertina' ? 0 : i + 1, 0, s.id);
    archivio.salvaSezioni([s]); archivio.salvaOpera(opera);
    apri(s.id);
    (tipo === 'capitolo' ? editor : titolo).focus();
  }

  /* ——— Aprire una sezione ——— */
  function intestazione() {
    var s = sezioni[corrente]; if (!s) return;
    var e = etichettaDi(corrente);
    etichetta.textContent = e.breve;
    titolo.placeholder = e.segnaposto;
    app.classList.remove('tipo-copertina', 'tipo-parte', 'tipo-capitolo');
    app.classList.add('tipo-' + s.tipo);
  }
  function apri(sid) {
    fermaRiscrittura();
    if (corrente && corrente !== sid && sezioni[corrente]) salva(true);
    corrente = sid;
    var s = sezioni[sid];
    editor.innerHTML = s.html || '<p><br></p>';
    titolo.value = s.titolo || '';
    luci.replaceChildren();
    intestazione();
    vuoto();
    stato.textContent = riassunto({ parole: s.parole || 0, battute: s.battute || 0 });
    renderElenco();
    fuoco(null);
    window.scrollTo({ top: 0 });
  }
  function vuoto() {
    riscrivi.disabled = !editor.textContent.trim();
    editor.classList.toggle('vuoto', !(editor.textContent || '').trim() && !editor.querySelector('hr,li'));
  }

  /* ——— Opere ——— */
  function caricaOpera(o) {
    return archivio.sezioni(o.id).then(function (list) {
      opera = o; sezioni = {};
      list.forEach(function (s) { sezioni[s.id] = s; });
      opera.ordine = (opera.ordine || []).filter(function (x) { return sezioni[x]; });
      list.forEach(function (s) { if (opera.ordine.indexOf(s.id) < 0) opera.ordine.push(s.id); });
      if (!opera.ordine.length) { var s = nuovaSezione('capitolo'); sezioni[s.id] = s; opera.ordine.push(s.id); archivio.salvaSezioni([s]); }
      scriviPref(CORR, opera.id);
      nomeOpera.value = opera.titolo || '';
      corrente = null;
      var primo = opera.ordine.filter(function (x) { return sezioni[x].tipo === 'capitolo'; })[0] || opera.ordine[0];
      apri(opera.ultima && sezioni[opera.ultima] ? opera.ultima : primo);
    });
  }
  function creaOpera(tit, elenco) {
    var o = { id: id('o'), titolo: tit, ordine: [], creata: Date.now(), aggiornata: Date.now() };
    var lista = (elenco && elenco.length ? elenco : [{ tipo: 'capitolo', titolo: '', html: '' }]).map(function (x) {
      var s = nuovaSezione(x.tipo, { titolo: x.titolo || '', html: pulisci(x.html || '') }, o.id);
      var c = conta(testoDi(s.html)); s.parole = c.parole; s.battute = c.battute;
      o.ordine.push(s.id);
      return s;
    });
    return archivio.salvaSezioni(lista).then(function () { return archivio.salvaOpera(o); }).then(function () { return caricaOpera(o); });
  }
  function migraVecchiFogli() {
    if (leggi('effinge-fogli-migrati') === '1') return null;
    var vecchi;
    try { vecchi = JSON.parse(leggi('effinge-fogli') || '[]'); } catch (e) { vecchi = []; }
    if (!Array.isArray(vecchi)) return null;
    var el = vecchi.filter(function (f) { return f && typeof f.testo === 'string' && (f.testo.trim() || (f.titolo || '').trim()); })
      .map(function (f) { return { tipo: 'capitolo', titolo: f.titolo || '', html: testoInHtml(f.testo) }; });
    scriviPref('effinge-fogli-migrati', '1');
    return el.length ? el : null;
  }

  var dlgOpere = $('#opere');
  function renderOpere() {
    archivio.opere().then(function (list) {
      var ul = $('[data-elenco-opere]');
      ul.replaceChildren();
      list.sort(function (a, b) { return (b.aggiornata || 0) - (a.aggiornata || 0); }).forEach(function (o) {
        var li = document.createElement('li');
        if (opera && o.id === opera.id) li.className = 'attuale';
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'apri';
        b.innerHTML = '<span class="t"></span><span class="m"></span>';
        $('.t', b).textContent = o.titolo || 'Senza titolo';
        $('.m', b).textContent = 'Modificata il ' + new Date(o.aggiornata || o.creata).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + (o.ordine || []).length + ' sezioni';
        b.addEventListener('click', function () { salva(true); caricaOpera(o); dlgOpere.close(); });
        var del = document.createElement('button');
        del.type = 'button'; del.className = 'pill elimina'; del.textContent = 'Elimina';
        var armato = 0;
        del.addEventListener('click', function () {
          if (!armato) { del.textContent = 'Conferma'; del.classList.add('armato'); armato = setTimeout(function () { armato = 0; del.textContent = 'Elimina'; del.classList.remove('armato'); }, 3000); return; }
          clearTimeout(armato);
          archivio.sezioni(o.id).then(function (ss) {
            return archivio.elimina('sezioni', ss.map(function (x) { return x.id; }));
          }).then(function () { return archivio.elimina('opere', [o.id]); }).then(function () {
            if (opera && o.id === opera.id) {
              return archivio.opere().then(function (rest) { return rest.length ? caricaOpera(rest[0]) : creaOpera('La mia opera'); });
            }
          }).then(renderOpere);
        });
        li.append(b, del);
        ul.appendChild(li);
      });
    });
  }

  /* ——— La lampada: segue il mouse; mentre scrivi, il cursore di testo ——— */
  var L = window.EffingeLampada ? new window.EffingeLampada(foglio) : null;
  if (L) { L.lag = reduce ? 1 : 150; L.intensity = .9; }
  function lampadaA(x, y, int) {
    if (!L) return;
    var r = foglio.getBoundingClientRect();
    L.to(x - r.left, y - r.top);
    L.intensity = int;
  }
  function rettangoloCursore() {
    var sel = getSelection(); if (!sel.rangeCount || !editor.contains(sel.focusNode)) return null;
    var r = sel.getRangeAt(0).cloneRange(); r.collapse(false);
    var rects = r.getClientRects(), rc = rects[rects.length - 1];
    if (!rc || (!rc.width && !rc.height)) {
      var n = sel.focusNode.nodeType === 1 ? sel.focusNode : sel.focusNode.parentElement;
      rc = n && n.getBoundingClientRect();
    }
    return rc;
  }
  function lampadaSulCursore() {
    var rc = rettangoloCursore(); if (!rc) return;
    lampadaA(rc.left + 6, rc.top + rc.height / 2, .85);
  }
  // Mentre scrivi, Chrome segnala «movimenti» del mouse anche quando è fermo (la pagina si
  // riorganizza sotto il puntatore). Si torna a leggere solo con un movimento vero.
  var ultimoMouse = null, ancora = null, SOGLIA = 40;
  function modoScrittura() { root.classList.add('sta-scrivendo'); ancora = ultimoMouse; }
  document.addEventListener('pointermove', function (e) {
    if (copia || e.pointerType !== 'mouse') return;
    var prima = ultimoMouse;
    ultimoMouse = { x: e.clientX, y: e.clientY };
    if (prima && prima.x === e.clientX && prima.y === e.clientY) return;            // movimento fantasma
    if (root.classList.contains('sta-scrivendo')) {
      if (ancora && Math.hypot(e.clientX - ancora.x, e.clientY - ancora.y) < SOGLIA) return;   // piccolo tremolio
      root.classList.remove('sta-scrivendo');   // leggere: tutto torna acceso
    }
    lampadaA(e.clientX, e.clientY, 1);
  }, { passive: true });

  /* ——— Concentrazione: attenua gli altri blocchi mentre scrivi ——— */
  var stileFuoco = document.createElement('style');
  document.head.appendChild(stileFuoco);
  var bloccoFuoco = -1;
  function bloccoDelCursore() {
    var sel = getSelection(); if (!sel.rangeCount) return null;
    var n = sel.focusNode;
    if (!n || !editor.contains(n) || n === editor) return null;
    while (n && n.parentNode !== editor) n = n.parentNode;
    return n;
  }
  function fuoco(b) {
    var i = b ? Array.prototype.indexOf.call(editor.children, b) : -1;
    if (i === bloccoFuoco) return;
    bloccoFuoco = i;
    stileFuoco.textContent = i < 0 ? '' : '.scrittura-concentrata.sta-scrivendo .scrivi-editor > :not(:nth-child(' + (i + 1) + ')){opacity:.3}';
  }

  /* ——— Luce sulle lettere appena scritte ——— */
  function luce(data) {
    if (reduce || !data || data.length > 40) return;
    var sel = getSelection(); if (!sel.rangeCount) return;
    var node = sel.focusNode, off = sel.focusOffset;
    if (!node || node.nodeType !== 3) return;
    var start = off - data.length;
    if (start < 0 || node.nodeValue.slice(start, off) !== data) return;
    var base = luci.getBoundingClientRect();
    var cs = getComputedStyle(node.parentElement);
    var i = start, k = 0;
    Array.from(data).forEach(function (ch) {
      var n = ch.length;
      if (/\s/.test(ch)) { i += n; return; }
      var r = document.createRange();
      r.setStart(node, i); r.setEnd(node, i + n);
      var rc = r.getBoundingClientRect();
      i += n;
      if (!rc.width) return;
      var s = document.createElement('span');
      s.className = 'luce-lettera';
      s.textContent = ch;
      s.style.left = (rc.left - base.left) + 'px';
      s.style.top = (rc.top - base.top) + 'px';
      s.style.height = rc.height + 'px';
      s.style.lineHeight = rc.height + 'px';
      s.style.fontFamily = cs.fontFamily; s.style.fontSize = cs.fontSize; s.style.fontWeight = cs.fontWeight;
      s.style.fontStyle = cs.fontStyle; s.style.letterSpacing = cs.letterSpacing;
      s.style.animationDelay = (k * 22) + 'ms';
      var dur = 1100 + k * 22; k++;
      luci.appendChild(s);
      setTimeout(function () { s.remove(); }, dur);
    });
  }

  // La riproduzione usa una copia visiva. Salvataggio e annulla leggono sempre l’editor.
  function fermaRiscrittura() {
    if (!copia) return;
    clearTimeout(timerRiscrivi);
    copia.remove();
    copia = null;
    editor.classList.remove('in-riproduzione');
    riscrivi.textContent = 'Riscrivi';
  }

  riscrivi.addEventListener('click', function () {
    if (copia) { fermaRiscrittura(); return; }
    if (!editor.textContent.trim()) return;
    if (reduce) { avviso('Il testo è già visibile. Movimento ridotto attivo.'); return; }
    var d = riscrivi.dataset;
    var o = { speed: Number(d.speed) || 85, fade: Number(d.fade) || 340,
      intensity: Number(d.intensity), color: d.color };
    var ink = getComputedStyle(editor).color;
    var passo = Math.max(1, Math.ceil(editor.textContent.length / 320));
    var segmentatore = Intl.Segmenter && new Intl.Segmenter('it', { granularity: 'grapheme' });
    copia = editor.cloneNode(true);
    copia.removeAttribute('contenteditable');
    copia.setAttribute('aria-hidden', 'true');
    copia.inert = true;
    copia.classList.add('riscrittura');
    var walker = document.createTreeWalker(copia, NodeFilter.SHOW_TEXT);
    var nodi = [], nodo;
    while ((nodo = walker.nextNode())) if (nodo.length) nodi.push(nodo);
    editor.after(copia);
    editor.classList.add('in-riproduzione');
    root.classList.remove('sta-scrivendo');
    riscrivi.textContent = 'Interrompi';
    var indice = 0, lettere, resto, precedente;
    function avanza() {
      if (!lettere) {
        if (indice === nodi.length) {
          timerRiscrivi = setTimeout(fermaRiscrittura, o.fade + 160);
          return;
        }
        resto = nodi[indice++];
        lettere = (segmentatore ? segmentatore.segment(resto.data) : resto.data)[Symbol.iterator]();
      }
      var gruppo = '';
      while (gruppo.length < passo) {
        var prossimo = lettere.next();
        if (prossimo.done) { lettere = null; break; }
        gruppo += segmentatore ? prossimo.value.segment : prossimo.value;
      }
      if (gruppo) {
        var g = document.createElement('span');
        if (precedente) precedente.classList.remove('ultima');
        g.className = 'lettere-rivelate ultima';
        precedente = g;
        g.textContent = gruppo;
        resto.before(g);
        resto.deleteData(0, gruppo.length);
        window.EffingeIlluminaGlifo(g, o, ink);
        var rects = g.getClientRects(), fine = rects[rects.length - 1];
        if (fine) {
          if (fine.bottom > innerHeight - 24 || fine.bottom < 0) g.scrollIntoView({ block: 'center' });
          var righe = g.getClientRects();
          fine = righe[righe.length - 1];
          if (fine) lampadaA(fine.right, fine.top + fine.height / 2, o.intensity);
        }
      }
      timerRiscrivi = setTimeout(avanza, gruppo ? o.speed : 0);
    }
    avanza();
  });
  editor.addEventListener('focus', fermaRiscrittura);
  editor.addEventListener('beforeinput', fermaRiscrittura);
  document.addEventListener('pointerdown', function (e) {
    if (copia && !riscrivi.contains(e.target)) fermaRiscrittura();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (copia && e.key === 'Escape') fermaRiscrittura();
  });

  /* ——— Editor ——— */
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
  editor.addEventListener('beforeinput', modoScrittura);
  editor.addEventListener('input', function (e) {
    if (e.inputType === 'insertText') luce(e.data);
    if (!editor.firstElementChild && (editor.textContent || '').trim()) document.execCommand('formatBlock', false, 'p');
    vuoto();
    if (luci.childElementCount > 120) luci.replaceChildren();
    fuoco(bloccoDelCursore());
    if (e.inputType && e.inputType.indexOf('insert') === 0) lampadaSulCursore();
    aggiornaConteggioVivo();
    salva(false);
    clearTimeout(timerMini); timerMini = setTimeout(aggiornaMiniatura, 1200);
  });
  editor.addEventListener('keydown', function (e) {
    if (/^Arrow|^(Home|End|PageUp|PageDown|Enter|Backspace|Delete)$/.test(e.key)) {
      modoScrittura();
      requestAnimationFrame(function () { fuoco(bloccoDelCursore()); lampadaSulCursore(); });
    }
  });
  document.addEventListener('selectionchange', function () {
    if (document.activeElement !== editor) return;
    fuoco(bloccoDelCursore());
    statoComandi();
  });
  editor.addEventListener('blur', function () { root.classList.remove('sta-scrivendo'); });
  // incolla: solo testo e formattazione essenziale
  editor.addEventListener('paste', function (e) {
    var cd = e.clipboardData; if (!cd) return;
    e.preventDefault();
    var html = cd.getData('text/html'), txt = cd.getData('text/plain');
    if (!html && txt.indexOf('\n') < 0) { document.execCommand('insertText', false, txt); return; }
    document.execCommand('insertHTML', false, html ? pulisci(html.replace(/<!--[\s\S]*?-->/g, '')) : testoInHtml(txt));
  });
  titolo.addEventListener('input', function () { salva(false); clearTimeout(timerMini); timerMini = setTimeout(aggiornaMiniatura, 600); });
  titolo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); } });
  nomeOpera.addEventListener('change', function () { opera.titolo = nomeOpera.value.trim() || 'Senza titolo'; nomeOpera.value = opera.titolo; archivio.salvaOpera(opera); });
  nomeOpera.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); nomeOpera.blur(); } });
  addEventListener('pagehide', function () { salva(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) salva(true); });

  /* ——— Formattazione (a destra) ——— */
  var formato = $('.formato');
  formato.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });   // non perdere la selezione
  formato.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var sel = getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) {
      editor.focus();
      var r = document.createRange(); r.selectNodeContents(editor.lastElementChild || editor); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
    }
    var cmd = b.dataset.cmd, blocco = b.dataset.blocco;
    if (blocco) {
      var attuale = '';
      try { attuale = (document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch (err) {}
      document.execCommand('formatBlock', false, attuale === blocco && blocco !== 'p' ? 'p' : blocco);
    } else if (b.dataset.inserisci === 'stacco') {
      document.execCommand('insertHTML', false, '<p class="stacco">*</p><p><br></p>');
    } else if (cmd === 'pulisci') {
      document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'p');
    } else if (cmd) {
      document.execCommand(cmd, false, null);
    }
    vuoto(); salva(false);
    clearTimeout(timerMini); timerMini = setTimeout(aggiornaMiniatura, 800);
    statoComandi();
  });
  function statoComandi() {
    $$('[data-cmd]', formato).forEach(function (b) {
      var c = b.dataset.cmd;
      if (/^(undo|redo|pulisci)$/.test(c)) return;
      var on = false; try { on = document.queryCommandState(c); } catch (e) {}
      b.setAttribute('aria-pressed', String(!!on));
    });
    var blocco = '';
    try { blocco = (document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch (e) {}
    $$('.stili [data-blocco]', formato).forEach(function (b) {
      var x = b.dataset.blocco;
      b.setAttribute('aria-pressed', String(x === blocco || (x === 'p' && (blocco === 'p' || blocco === 'div' || !blocco))));
    });
  }

  /* ——— Preferenze della barra ——— */
  function preferenza(nome, classe, btn, predefinita) {
    var v = leggi(PREF + nome), on = v == null ? predefinita : v === '1';
    var set = function (x) { on = x; root.classList.toggle(classe, on); if (btn) btn.setAttribute('aria-pressed', String(on)); scriviPref(PREF + nome, on ? '1' : '0'); };
    set(on);
    if (btn) btn.addEventListener('click', function () { set(!on); });
  }
  preferenza('concentrazione', 'scrittura-concentrata', $('[data-comando="concentrazione"]'), true);
  preferenza('lampada', 'scrittura-lampada', $('[data-comando="lampada"]'), !reduce);
  preferenza('manoscritto', 'manoscritto', $('[data-comando="manoscritto"]'), false);
  // cartella editoriale da 2000 (scelta iniziale) o da 1800 battute (la più diffusa)
  var btnCartella = $('[data-comando="cartella"]');
  function segnaCartella() { btnCartella.textContent = 'Cartella ' + cartella(); }
  btnCartella.addEventListener('click', function () {
    scriviPref('effinge-scrivi-cartella', cartella() === 2000 ? '1800' : '2000');
    segnaCartella(); aggiornaConteggioVivo(); totali();
  });
  segnaCartella();

  /* ——— Pulsanti ——— */
  var btnCap = $('[data-apri-capitoli]');
  function chiudiPannello() { pannelloCap.classList.remove('aperto'); if (btnCap) btnCap.setAttribute('aria-expanded', 'false'); }
  if (btnCap) btnCap.addEventListener('click', function () { var on = !pannelloCap.classList.contains('aperto'); pannelloCap.classList.toggle('aperto', on); btnCap.setAttribute('aria-expanded', String(on)); });
  $('[data-chiudi-capitoli]').addEventListener('click', chiudiPannello);
  $$('[data-nuova]').forEach(function (b) { b.addEventListener('click', function () { aggiungi(b.dataset.nuova); chiudiPannello(); }); });
  $('[data-comando="opere"]').addEventListener('click', function () { salva(true); renderOpere(); dlgOpere.showModal(); });
  $('[data-nuova-opera]').addEventListener('click', function () { salva(true); creaOpera('Nuova opera').then(function () { dlgOpere.close(); nomeOpera.focus(); nomeOpera.select(); }); });
  $$('dialog [data-chiudi]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });
  $$('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); });

  /* ——— Word: importa ed esporta (il modulo si carica solo quando serve) ——— */
  function word() {
    if (window.EffingeWord) return Promise.resolve(window.EffingeWord);
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = '/assets/js/scrivi-word.js' + (versione ? '?v=' + versione : '');
      s.onload = function () { ok(window.EffingeWord); };
      s.onerror = function () { ko(new Error('Impossibile caricare il modulo Word')); };
      document.head.appendChild(s);
    });
  }
  var fileIn = $('[data-file-word]'), dlgImp = $('#importa'), daImportare = null;
  $('[data-comando="importa"]').addEventListener('click', function () { fileIn.value = ''; fileIn.click(); });
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0]; if (!f) return;
    avviso('Lettura di «' + f.name + '»…', 1800);
    word().then(function (W) { return W.importa(f); }).then(function (r) {
      daImportare = r;
      var n = { copertina: 0, parte: 0, capitolo: 0 }, tot = { parole: 0, battute: 0 };
      r.sezioni.forEach(function (s) { n[s.tipo]++; var c = conta(testoDi(s.html)); tot.parole += c.parole; tot.battute += c.battute; });
      var c = $('[data-riepilogo-import]');
      c.replaceChildren();
      var p1 = document.createElement('p'); p1.textContent = 'In «' + f.name + '» ho trovato:'; c.appendChild(p1);
      var ul = document.createElement('ul'); c.appendChild(ul);
      [[n.copertina, 'copertina', 'copertine'], [n.parte, 'parte', 'parti'], [n.capitolo, 'capitolo', 'capitoli']].forEach(function (x) {
        if (!x[0]) return;
        var li = document.createElement('li'), st = document.createElement('strong');
        st.textContent = x[0]; li.appendChild(st); li.appendChild(document.createTextNode(' ' + (x[0] === 1 ? x[1] : x[2])));
        ul.appendChild(li);
      });
      var p2 = document.createElement('p'); p2.textContent = riassunto(tot) + '. Diventerà una nuova opera: quella aperta ora non viene toccata.'; c.appendChild(p2);
      (r.avvisi || []).forEach(function (t) { var a = document.createElement('p'); a.textContent = t; c.appendChild(a); });
      dlgImp.showModal();
    }).catch(function (err) { avviso('Non riesco a leggere questo file: è un .docx di Word?', 4000); if (window.console) console.error(err); });
  });
  $('[data-conferma-import]').addEventListener('click', function () {
    if (!daImportare) return;
    var r = daImportare; daImportare = null;
    salva(true);
    creaOpera(r.titolo, r.sezioni).then(function () { dlgImp.close(); avviso('Opera importata: ' + r.sezioni.length + ' sezioni'); });
  });
  $('[data-comando="esporta"]').addEventListener('click', function () {
    salva(true);
    avviso('Preparo il file Word…', 1500);
    var elenco = opera.ordine.map(function (x) { return sezioni[x]; }).filter(Boolean);
    word().then(function (W) { return W.esporta(opera, elenco); }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (opera.titolo || 'opera').replace(/[\\/:*?"<>|]+/g, '').trim() + '.docx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }).catch(function (err) { avviso('Esportazione non riuscita', 4000); if (window.console) console.error(err); });
  });

  /* ——— Autore: pubblicare sul sito (solo dove è stata inserita la chiave GitHub) ———
     La chiave è un «fine-grained token» di GitHub con permesso Contents: lettura e scrittura,
     limitato al repository del sito. Resta in questo browser. Il capitolo diventa un file
     src/testi/AAAA-MM-GG-titolo.md, lo stesso formato del pannello. Il commit avvia GitHub Pages. */
  var API = 'https://api.github.com', KEY_AUTORE = 'effinge-autore';
  var autore = null;
  try { autore = JSON.parse(leggi(KEY_AUTORE) || 'null'); } catch (e) { autore = null; }
  var dlgAut = $('#autore'), dlgPub = $('#pubblica'), btnPub = $('[data-comando="pubblica"]');
  function gh(path, opt) {
    opt = opt || {};
    var h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Authorization': 'Bearer ' + (opt.token || autore.token) };
    if (opt.body) h['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opt.method || 'GET', headers: h, cache: 'no-store', body: opt.body ? JSON.stringify(opt.body) : undefined }).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) { var err = new Error((j && j.message) || ('HTTP ' + r.status)); err.status = r.status; throw err; } return j; });
    });
  }
  function mostraAutore() {
    var dentro = !!autore;
    if (btnPub) btnPub.hidden = !dentro;
    $('[data-autore-fuori]').hidden = dentro;
    $('[data-autore-dentro]').hidden = !dentro;
    $('[data-collega-autore]').hidden = dentro;
    $('[data-scollega-autore]').hidden = !dentro;
    if (dentro) $('[data-autore-chi]').textContent = 'Collegato come ' + autore.login + ' al repository ' + autore.repo + ' (ramo ' + autore.ramo + ').';
  }
  function esito(el, msg, tipo) { el.textContent = msg; el.className = 'esito' + (tipo ? ' ' + tipo : ''); }
  $('[data-apri-autore]').addEventListener('click', function () { dlgOpere.close(); mostraAutore(); esito($('[data-esito-autore]'), ''); dlgAut.showModal(); });
  $('[data-collega-autore]').addEventListener('click', function () {
    var token = $('#chiave-autore').value.trim(), out = $('[data-esito-autore]');
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(token)) { esito(out, 'Questa non sembra una chiave GitHub: deve iniziare con github_pat_.', 'errore'); return; }
    esito(out, 'Verifico la chiave…');
    var login, uid;
    gh('/user', { token: token }).then(function (u) {
      login = u.login; uid = u.id;
      return gh('/user/repos?per_page=100&sort=updated', { token: token });
    }).then(function (repos) {
      var r = (repos || []).filter(function (x) { return x.permissions && x.permissions.push; });
      var scelto = r.filter(function (x) { return /(^|\/)effinge$/i.test(x.full_name); })[0] || (r.length === 1 ? r[0] : null);
      if (!scelto) throw new Error('La chiave non dà accesso in scrittura al repository Effinge. Controlla di averla limitata a Effinge con il permesso «Contents: Read and write».');
      return gh('/repos/' + scelto.full_name + '/contents/.pages.yml?ref=' + encodeURIComponent(scelto.default_branch || 'main'), { token: token }).then(function () { return scelto; });
    }).then(function (rep) {
      autore = { token: token, login: login, id: uid, repo: rep.full_name, ramo: rep.default_branch || 'main' };
      scriviPref(KEY_AUTORE, JSON.stringify(autore));
      $('#chiave-autore').value = '';
      mostraAutore();
      avviso('Accesso autore attivo su questo dispositivo');
    }).catch(function (e) {
      esito(out, e.status === 401 ? 'GitHub non riconosce questa chiave: forse è scaduta o copiata male.' : e.message, 'errore');
    });
  });
  $('[data-scollega-autore]').addEventListener('click', function () {
    autore = null;
    try { localStorage.removeItem(KEY_AUTORE); } catch (e) {}
    mostraAutore();
  });

  // HTML del foglio → Markdown del sito (il formato del pannello). Ciò che il Markdown non sa dire resta HTML.
  function md(html) {
    var t = document.createElement('div'); t.innerHTML = html || '';
    function esc(x) { return x.replace(/\\/g, '\\\\').replace(/([`*_\[\]<>~])/g, '\\$1').replace(/\s+/g, ' '); }
    function inl(n) {
      var out = '';
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) { out += esc(c.nodeValue); return; }
        if (c.nodeType !== 1) return;
        var x = inl(c), m = /^(\s*)([\s\S]*?)(\s*)$/.exec(x);
        if (!m[2] && c.tagName !== 'BR') { out += x; return; }
        switch (c.tagName) {
          case 'STRONG': case 'B': out += m[1] + '**' + m[2] + '**' + m[3]; break;
          case 'EM': case 'I': out += m[1] + '*' + m[2] + '*' + m[3]; break;
          case 'S': out += m[1] + '~~' + m[2] + '~~' + m[3]; break;
          case 'U': out += '<u>' + x + '</u>'; break;
          case 'SUP': out += '<sup>' + x + '</sup>'; break;
          case 'SUB': out += '<sub>' + x + '</sub>'; break;
          case 'BR': out += '<br>'; break;
          default: out += x;
        }
      });
      return out.trim();
    }
    function inizio(x) { return x.replace(/^(#{1,6}\s|>|[-+]\s|\d+[.)]\s)/, '\\$1'); }
    var blocchi = [];
    Array.prototype.forEach.call(t.children, function (el) {
      var tag = el.tagName, cl = el.classList;
      if (tag === 'P') {
        if (cl.contains('stacco')) blocchi.push('***');
        else if (cl.contains('centro') || cl.contains('destra')) blocchi.push('<p class="' + (cl.contains('centro') ? 'centro' : 'destra') + '">' + el.innerHTML + '</p>');
        else { var x = inl(el); if (x) blocchi.push(inizio(x)); }
      } else if (tag === 'H1' || tag === 'H2') blocchi.push('## ' + inl(el));
      else if (tag === 'H3') blocchi.push('### ' + inl(el));
      else if (tag === 'BLOCKQUOTE') {
        var ps = el.querySelectorAll('p');
        blocchi.push((ps.length ? Array.prototype.map.call(ps, inl) : [inl(el)]).map(function (r) { return '> ' + r; }).join('\n>\n'));
      } else if (tag === 'UL' || tag === 'OL') {
        blocchi.push(Array.prototype.map.call(el.children, function (li, i) { return (tag === 'UL' ? '- ' : (i + 1) + '. ') + inl(li); }).join('\n'));
      } else if (tag === 'HR') blocchi.push('***');
      else if (tag === 'DIV') blocchi.push('<div class="note">\n' + el.innerHTML + '\n</div>');
    });
    return blocchi.join('\n\n') + '\n';
  }
  function yaml(v) { return JSON.stringify(String(v == null ? '' : v)); }
  function slug(x) {
    return String(x || 'testo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'testo';
  }
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function oggi() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  if (btnPub) btnPub.addEventListener('click', function () {
    salva(true);
    var s = sezioni[corrente], p = s.pubblicato || {};
    var testo = testoDi(String(s.html || '').replace(/<p class="stacco">[^<]*<\/p>/g, '')).replace(/\s+/g, ' ').trim();
    $('#pub-titolo').value = p.titolo || s.titolo || (s.tipo === 'capitolo' ? (opera.titolo || '') + ' — ' + etichettaDi(s.id).breve : opera.titolo || '');
    $('#pub-categoria').value = p.categoria || (s.tipo === 'capitolo' ? 'Capitolo' : '');
    $('#pub-data').value = p.data || oggi();
    var auto = testo.length > 220 ? testo.slice(0, 220).replace(/\s+\S*$/, '') + '…' : testo;
    $('#pub-estratto').value = p.estratto && p.estrattoAMano ? p.estratto : auto;
    $('#pub-estratto').dataset.auto = auto;
    $('#pub-evidenza').checked = !!p.evidenza;
    $('#pub-seo').value = p.seo_descrizione || '';
    esito($('[data-esito-pubblica]'), p.path ? 'Questo capitolo è già sul sito: pubblicandolo di nuovo lo aggiorni.' : '');
    $('[data-conferma-pubblica]').textContent = p.path ? 'Aggiorna sul sito' : 'Pubblica';
    $('[data-conferma-pubblica]').disabled = false;
    dlgPub.showModal();
  });
  $('[data-conferma-pubblica]').addEventListener('click', function () {
    var out = $('[data-esito-pubblica]'), btn = this;
    var s = sezioni[corrente];
    var tit = $('#pub-titolo').value.trim(), data = $('#pub-data').value || oggi();
    if (!tit) { esito(out, 'Scrivi un titolo.', 'errore'); $('#pub-titolo').focus(); return; }
    if (!testoDi(s.html).trim()) { esito(out, 'Il capitolo è vuoto: non c’è niente da pubblicare.', 'errore'); return; }
    var bozza = (document.querySelector('input[name="pub-modo"]:checked') || {}).value === 'bozza';
    var info = { titolo: tit, categoria: $('#pub-categoria').value.trim(), data: data, estratto: $('#pub-estratto').value.trim(), evidenza: $('#pub-evidenza').checked };
    info.estrattoAMano = info.estratto !== ($('#pub-estratto').dataset.auto || '').trim();
    info.seo_descrizione = $('#pub-seo').value.trim();
    var file = '---\n' +
      'titolo: ' + yaml(info.titolo) + '\n' +
      'date: ' + data + '\n' +
      (info.categoria ? 'categoria: ' + yaml(info.categoria) + '\n' : '') +
      (info.estratto ? 'estratto: ' + yaml(info.estratto) + '\n' : '') +
      'in_evidenza: ' + info.evidenza + '\n' +
      'bozza: ' + bozza + '\n' +
      (info.seo_descrizione ? 'seo_descrizione: ' + yaml(info.seo_descrizione) + '\n' : '') +
      '---\n' + md(s.html);
    var vecchio = s.pubblicato && s.pubblicato.path;
    var path = 'src/testi/' + data + '-' + slug(tit) + '.md';
    var repo = '/repos/' + autore.repo;
    var enc = function (x) { return x.split('/').map(encodeURIComponent).join('/'); };
    btn.disabled = true;
    esito(out, 'Pubblicazione in corso…');
    function esiste(p) {
      return gh(repo + '/contents/' + enc(p) + '?ref=' + encodeURIComponent(autore.ramo)).then(function () { return true; }, function (e) { if (e.status === 404) return false; throw e; });
    }
    function commit(tentativo) {
      var ref, base;
      var conId = autore.id ? Promise.resolve() : gh('/user').then(function (u) { autore.id = u.id; scriviPref(KEY_AUTORE, JSON.stringify(autore)); }, function () {});
      return conId.then(function () { return gh(repo + '/git/ref/heads/' + encodeURIComponent(autore.ramo)); }).then(function (r) {
        ref = r.object.sha;
        return gh(repo + '/git/commits/' + ref);
      }).then(function (c) {
        base = c.tree.sha;
        var voci = [{ path: path, mode: '100644', type: 'blob', content: file }];
        if (vecchio && vecchio !== path) voci.push({ path: vecchio, mode: '100644', type: 'blob', sha: null });
        return gh(repo + '/git/trees', { method: 'POST', body: { base_tree: base, tree: voci } });
      }).then(function (t) {
        var azione = !vecchio ? 'Pubblica' : vecchio !== path ? 'Rinomina e aggiorna' : 'Aggiorna';
        // firma con l'indirizzo anonimo di GitHub: l'email personale non finisce nella cronologia pubblica
        var firma = { name: autore.login, email: (autore.id ? autore.id + '+' : '') + autore.login + '@users.noreply.github.com', date: new Date().toISOString() };
        return gh(repo + '/git/commits', { method: 'POST', body: { message: azione + ' «' + tit + '» da Scrivi', tree: t.sha, parents: [ref], author: firma, committer: firma } });
      }).then(function (c) {
        return gh(repo + '/git/refs/heads/' + encodeURIComponent(autore.ramo), { method: 'PATCH', body: { sha: c.sha, force: false } });
      }).catch(function (e) {
        // qualcuno ha modificato il ramo nel frattempo (es. il pannello): si riparte dall'ultima versione
        if ((e.status === 409 || e.status === 422) && tentativo < 2) return commit(tentativo + 1);
        throw e;
      });
    }
    var CONSERVA = /^(seo_titolo|seo_descrizione|immagine|immagine_alt|colore_carta|noindex):/;
    function campiDelPannello() {
      if (!vecchio) return Promise.resolve();
      return gh(repo + '/contents/' + enc(vecchio) + '?ref=' + encodeURIComponent(autore.ramo)).then(function (f) {
        var bin = atob(String(f.content || '').replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var testa = (/^---\r?\n([\s\S]*?)\r?\n---/.exec(new TextDecoder().decode(bytes)) || ['', ''])[1];
        var extra = testa.split(/\r?\n/).filter(function (r) { return CONSERVA.test(r) && !(info.seo_descrizione && /^seo_descrizione:/.test(r)); });
        if (!info.seo_descrizione) { var d = extra.filter(function (r) { return /^seo_descrizione:/.test(r); })[0]; if (d) { try { info.seo_descrizione = JSON.parse(d.replace(/^seo_descrizione:\s*/, '')); } catch (e) {} } }
        if (extra.length) file = file.replace(/\n---\n/, '\n' + extra.join('\n') + '\n---\n');
      }, function () {});
    }
    // se il nuovo indirizzo appartiene già a un altro testo, non lo si sovrascrive: si aggiunge un suffisso
    campiDelPannello().then(function () { return path !== vecchio ? esiste(path) : false; }).then(function (occupato) {
      if (occupato) path = path.replace(/\.md$/, '-' + Date.now().toString(36).slice(-4) + '.md');
      return commit(0);
    }).then(function () {
      var fileSlug = path.replace(/^.*\//, '').replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
      var url = (bozza ? '/anteprima/' : '/testi/') + fileSlug + '/';
      info.path = path;
      s.pubblicato = info;
      salva(true);
      esito(out, '');
      out.append(document.createTextNode((bozza ? 'Bozza salvata.' : 'Pubblicato.') + ' Sarà online tra uno o due minuti: '));
      var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = location.host + url; out.append(a);
      out.className = 'esito ok';
      btn.textContent = 'Aggiorna sul sito';
      btn.disabled = false;
    }).catch(function (e) {
      btn.disabled = false;
      esito(out, e.status === 401 || e.status === 403 ? 'GitHub ha rifiutato la chiave: forse è scaduta o non ha il permesso di scrittura. Rifai «Accesso autore».' : 'Pubblicazione non riuscita: ' + e.message, 'errore');
    });
  });
  mostraAutore();

  /* ——— Focus totale: solo la pagina; schermo intero dove si può; Esc per uscire ——— */
  var btnFocus = $('[data-comando="focus"]'), schermoIntero = false, ancoraQuiete = null;
  function focus(on) {
    root.classList.toggle('focus-totale', on);
    root.classList.remove('focus-quiete');
    btnFocus.setAttribute('aria-pressed', String(on));
    if (on) {
      var de = document.documentElement;
      if (de.requestFullscreen && document.fullscreenEnabled && !document.fullscreenElement) {
        de.requestFullscreen().then(function () { schermoIntero = true; }, function () { schermoIntero = false; });
      }
    } else {
      chiudiPannello();
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      schermoIntero = false;
    }
    requestAnimationFrame(function () { if (L) lampadaSulCursore(); });
  }
  btnFocus.addEventListener('click', function () { focus(!root.classList.contains('focus-totale')); });
  // uscendo dallo schermo intero (con Esc il browser lo chiude da sé) si esce anche dal focus
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && schermoIntero && root.classList.contains('focus-totale')) focus(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !root.classList.contains('focus-totale')) return;
    if (document.querySelector('dialog[open]') || pannelloCap.classList.contains('aperto')) return;
    var sf = document.getElementById('sfondi-scelta'); if (sf && !sf.hidden) return;
    focus(false);
  });
  // mentre si scrive i comandi si dissolvono; tornano con un movimento vero del mouse o un tocco fuori dal foglio
  editor.addEventListener('beforeinput', function () {
    if (!root.classList.contains('focus-totale')) return;
    root.classList.add('focus-quiete');
    ancoraQuiete = ultimoMouse;
  });
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !root.classList.contains('focus-quiete')) return;
    if (ancoraQuiete && Math.hypot(e.clientX - ancoraQuiete.x, e.clientY - ancoraQuiete.y) < 40) return;
    root.classList.remove('focus-quiete');
  }, { passive: true });
  document.addEventListener('touchstart', function (e) {
    if (root.classList.contains('focus-quiete') && !editor.contains(e.target)) root.classList.remove('focus-quiete');
  }, { passive: true });

  // usato dal modulo Word e dai test
  window.EffingeScrivi = {
    pulisci: pulisci,
    markdown: md,
    opera: function () { return opera; },
    sezioni: function () { return opera ? opera.ordine.map(function (x) { return sezioni[x]; }) : []; },
    pronto: null
  };

  /* ——— Avvio ——— */
  window.EffingeScrivi.pronto = apriDB().then(function (db) {
    DB = db;
    if (!DB) avviso('Questo browser non permette di salvare: quello che scrivi si perde chiudendo la pagina.', 5000);
    return archivio.opere();
  }).then(function (list) {
    var mig = migraVecchiFogli();
    if (mig) return creaOpera('I miei fogli', mig);
    if (!list.length) return creaOpera('La mia opera');
    var scelta = list.filter(function (o) { return o.id === leggi(CORR); })[0] || list.sort(function (a, b) { return (b.aggiornata || 0) - (a.aggiornata || 0); })[0];
    return caricaOpera(scelta);
  });
  // ricorda l'ultima sezione aperta
  setInterval(function () { if (opera && corrente && opera.ultima !== corrente) { opera.ultima = corrente; archivio.salvaOpera(opera); } }, 4000);
})();
