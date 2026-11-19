/*!
 * Effinge — la pagina e la lampada.
 *
 * 1. Lampada: un cono di luce fioca che si muove su un foglio con uno smorzamento morbido.
 * 2. Scrittura: la scritta d'apertura compare lettera per lettera; ogni lettera si
 *    accende sotto la lampada e poi torna inchiostro (come il focus di Alhora).
 * 3. Scene: l'apertura e il progetto sono legati allo scorrimento, in stile Apple.
 * 4. Lettura: il paragrafo che si sta leggendo resta acceso, gli altri si attenuano.
 *
 * Impostazioni della scritta (collegabili al CMS) come attributi sull'<h1 data-scrittura>:
 *   data-enabled, data-speed (ms/lettera), data-delay (ms), data-fade (ms),
 *   data-intensity (0–1, luminosità della lampada), data-color (#RRGGBB),
 *   data-cursor (true/false), data-repeat (sempre/sessione).
 * Senza JavaScript, o con «riduci movimento», tutto è subito leggibile e fermo.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'effinge-scritta-vista';

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function num(v, d, a, b) { var n = parseFloat(v); return clamp(isFinite(n) ? n : d, a, b); }
  function bool(v, d) { return v == null || v === '' ? d : !/^(false|0|no|off)$/i.test(v); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ——— 1. Lampada ——— */
  function Lampada(foglio) {
    this.foglio = foglio;
    this.buio = document.createElement('span');
    this.buio.className = 'lampada buio';
    this.calore = document.createElement('span');
    this.calore.className = 'lampada calore';
    this.buio.setAttribute('aria-hidden', 'true');
    this.calore.setAttribute('aria-hidden', 'true');
    foglio.appendChild(this.buio);
    foglio.appendChild(this.calore);
    var w = foglio.clientWidth, h = foglio.clientHeight;
    this.x = this.tx = w * .5; this.y = this.ty = h * .4;
    this.lag = 220;          // ms: più alto, più lenta e morbida
    this.intensity = 1;
    this.on = true;
    this.last = 0;
    this.loop = this.loop.bind(this);
    this.apply();
    requestAnimationFrame(this.loop);
  }
  Lampada.prototype.to = function (x, y, lag) { this.tx = x; this.ty = y; if (lag) this.lag = lag; };
  Lampada.prototype.jump = function (x, y) { this.x = this.tx = x; this.y = this.ty = y; this.apply(); };
  Lampada.prototype.apply = function () {
    var t = 'translate3d(' + this.x.toFixed(1) + 'px,' + this.y.toFixed(1) + 'px,0) translate(-50%,-50%)';
    this.buio.style.transform = t;
    this.calore.style.transform = t;
    this.buio.style.opacity = String(lerp(.99, .86, this.intensity));
    this.calore.style.opacity = String(.35 + .65 * this.intensity);
  };
  Lampada.prototype.loop = function (now) {
    var dt = Math.min(now - (this.last || now) || 16, 50);
    this.last = now;
    var k = 1 - Math.exp(-dt / this.lag);
    var dx = this.tx - this.x, dy = this.ty - this.y;
    if (Math.abs(dx) > .05 || Math.abs(dy) > .05) {
      this.x += dx * k; this.y += dy * k; this.apply();
    }
    requestAnimationFrame(this.loop);
  };
  Lampada.prototype.at = function (el, fx, fy) {
    var a = el.getBoundingClientRect(), b = this.foglio.getBoundingClientRect();
    // coordinate interne al foglio, al netto della scala dovuta alla prospettiva
    var sx = b.width / this.foglio.offsetWidth || 1, sy = b.height / this.foglio.offsetHeight || 1;
    return { x: (a.left - b.left + a.width * (fx == null ? .5 : fx)) / sx, y: (a.top - b.top + a.height * (fy == null ? .5 : fy)) / sy };
  };

  /* ——— 2. Scrittura della scritta ——— */
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  function Scrittura(h1, lampada) {
    this.el = h1; this.lampada = lampada; this.timers = [];
    var text = h1.textContent.replace(/\s+/g, ' ').trim();
    h1.setAttribute('aria-label', text);
    h1.textContent = '';
    var chars = window.Intl && Intl.Segmenter ? Array.from(new Intl.Segmenter('it', { granularity: 'grapheme' }).segment(text), function (s) { return s.segment; }) : Array.from(text);
    this.glifi = chars.map(function (c) {
      var s = document.createElement('span');
      s.className = 'glifo'; s.setAttribute('aria-hidden', 'true');
      s.textContent = c === ' ' ? ' ' : c;
      h1.appendChild(s); return s;
    });
    this.cursore = document.createElement('span');
    this.cursore.className = 'cursore'; this.cursore.setAttribute('aria-hidden', 'true');
    h1.appendChild(this.cursore);
    h1.classList.add('pronto');
  }
  Scrittura.prototype.opts = function () {
    var d = this.el.dataset;
    return {
      enabled: bool(d.enabled, true), speed: num(d.speed, 85, 20, 600), delay: num(d.delay, 250, 0, 3000),
      fade: num(d.fade, 340, 120, 1200), intensity: num(d.intensity, .8, 0, 1),
      color: /^#[0-9a-f]{6}$/i.test(d.color || '') ? d.color : '#F0CB8A',
      cursor: bool(d.cursor, true), repeat: d.repeat === 'sessione' ? 'sessione' : 'sempre'
    };
  };
  Scrittura.prototype.stop = function () {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.el.classList.remove('scrivendo');
  };
  Scrittura.prototype.play = function (force, done) {
    var self = this, o = this.opts(), L = this.lampada;
    this.stop();
    root.style.setProperty('--luce', o.color);
    if (L) L.intensity = o.intensity;
    var seen = store(KEY) === '1';
    if (!o.enabled || reduce || (!force && o.repeat === 'sessione' && seen)) { if (done) done(); return; }
    this.cursore.style.display = o.cursor ? '' : 'none';
    this.el.classList.add('scrivendo');
    var ink = getComputedStyle(this.el).color;
    var peak = '0 0 .05em ' + rgba(o.color, (.9 * o.intensity).toFixed(2)) + ', 0 0 .22em ' + rgba(o.color, (.55 * o.intensity).toFixed(2));
    if (L) { var p = L.at(this.glifi[0], -.4, .55); L.lag = Math.max(90, o.speed * 1.3); L.to(p.x, p.y); }
    this.glifi.forEach(function (g, i) {
      self.timers.push(setTimeout(function () {
        g.classList.add('acceso');
        g.after(self.cursore);
        if (L) { var p = L.at(g, .6, .55); L.to(p.x, p.y); }
        if (g.animate) {
          g.animate([{ opacity: 0, filter: 'blur(.05em)' }, { opacity: 1, filter: 'blur(0)' }], { duration: Math.max(160, o.speed * 2.2), easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' });
          g.animate([
            { color: o.color, textShadow: peak, offset: 0 },
            { color: o.color, textShadow: peak, offset: .15 },
            { color: ink, textShadow: '0 0 .02em ' + rgba(o.color, .25), offset: .6 },
            { color: ink, textShadow: '0 0 0 rgba(0,0,0,0)', offset: 1 }
          ], { duration: o.fade + 160, easing: 'cubic-bezier(.22,.61,.36,1)' });
        }
      }, o.delay + i * o.speed));
    });
    this.timers.push(setTimeout(function () {
      self.el.classList.remove('scrivendo');
      self.el.appendChild(self.cursore);
      store(KEY, '1');
      if (L) L.lag = 900;
      if (done) done();
    }, o.delay + this.glifi.length * o.speed + o.fade));
  };

  /* ——— 3. Scene a scorrimento ——— */
  var scene = [];
  function progress(sec) {
    var r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
  }

  function scenaApertura(sec) {
    var foglio = sec.querySelector('.foglio');
    var L = new Lampada(foglio);
    var h1 = sec.querySelector('[data-scrittura]');
    var sub = sec.querySelector('.sottotitolo');
    var indizio = sec.querySelector('.indizio');
    var scrittura = new Scrittura(h1, L);
    var written = false;
    var start = function () { scrittura.play(false, function () { written = true; }); };
    if (document.fonts && document.fonts.ready) { var once = false; var go = function () { if (!once) { once = true; start(); } }; document.fonts.ready.then(go); setTimeout(go, 900); } else start();
    var replay = sec.querySelector('[data-riaccendi]');
    if (replay) replay.addEventListener('click', function () { written = false; scrittura.play(true, function () { written = true; }); });

    var tilt = !reduce;
    return function () {
      var p = progress(sec);
      var a = ease(clamp(p / .55, 0, 1));
      if (tilt) {
        foglio.style.setProperty('--rx', lerp(26, 0, a).toFixed(2) + 'deg');
        foglio.style.setProperty('--s', lerp(.84, 1, ease(clamp(p / .9, 0, 1))).toFixed(4));
        foglio.style.setProperty('--ty', lerp(4, 2.5, a).toFixed(2) + 'svh');
      }
      if (indizio) indizio.style.setProperty('--indizio', String(1 - clamp(p * 6, 0, 1)));
      // Dopo la scrittura la lampada scende lentamente verso il sottotitolo e poi si abbassa.
      if (written) {
        var t = L.at(h1, .5, .5), s = L.at(sub, .3, .5);
        var k = ease(clamp((p - .15) / .5, 0, 1));
        L.to(lerp(t.x, s.x, k), lerp(t.y, s.y, k));
        L.intensity = lerp(scrittura.opts().intensity, .25, ease(clamp((p - .7) / .3, 0, 1)));
      }
    };
  }

  function scenaProgetto(sec) {
    var foglio = sec.querySelector('.foglio');
    var L = new Lampada(foglio);
    L.lag = 420;
    var righe = Array.prototype.slice.call(sec.querySelectorAll('.righe li'));
    var last = -1;
    var first = L.at(righe[0], .35, .5); L.jump(first.x, first.y);
    return function () {
      var p = progress(sec);
      var i = clamp(Math.floor(p * righe.length * 1.08), 0, righe.length - 1);
      if (i !== last) {
        righe.forEach(function (r, n) { r.classList.toggle('attiva', n === i); r.classList.toggle('letta', n < i); });
        last = i;
      }
      // la lampada scorre lungo la riga mentre la si legge
      var local = clamp(p * righe.length * 1.08 - i, 0, 1);
      var pos = L.at(righe[i], lerp(.15, .7, local), .5);
      L.to(pos.x, pos.y);
      L.intensity = p < .02 ? .5 : .85;
    };
  }

  function lampadaAlPuntatore(foglio) {
    var L = new Lampada(foglio);
    L.lag = 260; L.intensity = .55;
    var rest = function () { L.to(foglio.clientWidth * .52, foglio.clientHeight * .62); L.intensity = .9; };
    rest(); L.jump(L.tx, L.ty);
    foglio.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var b = foglio.getBoundingClientRect();
      L.to(e.clientX - b.left, e.clientY - b.top); L.intensity = 1;
    });
    foglio.addEventListener('pointerleave', rest);
  }

  function fogliettoScrivi(foglio) {
    var L = new Lampada(foglio);
    var frase = foglio.querySelector('[data-scrittura]');
    var s = new Scrittura(frase, L);
    var pronto = false;
    var p0 = L.at(frase, 0, .5); L.jump(p0.x, p0.y); L.intensity = .7;
    if (!reduce) { frase.classList.add('scrivendo'); s.glifi[0].before(s.cursore); }   // foglietto bianco, cursore all'inizio, finché non arriva sullo schermo
    var parti = function () { s.play(true, function () { pronto = true; L.lag = 260; }); };
    if (reduce) { pronto = true; }
    else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { io.disconnect(); setTimeout(parti, 250); } }, { threshold: .55 });
      io.observe(foglio);
    } else parti();
    foglio.addEventListener('pointermove', function (e) {
      if (!pronto || e.pointerType !== 'mouse') return;
      var b = foglio.getBoundingClientRect();
      L.to(e.clientX - b.left, e.clientY - b.top); L.intensity = 1;
    });
    foglio.addEventListener('pointerleave', function () { if (!pronto) return; var p = L.at(frase, 1, .5); L.to(p.x, p.y); L.intensity = .7; });
  }

  function archivio(list) {
    list.addEventListener('pointermove', function (e) {
      var a = e.target.closest && e.target.closest('a'); if (!a) return;
      var b = a.getBoundingClientRect();
      a.style.setProperty('--mx', (e.clientX - b.left) + 'px');
    });
  }

  /* ——— 4. Lettura ——— */
  function lettura(corpo) {
    var blocchi = Array.prototype.slice.call(corpo.children);
    var foglio = corpo.closest('.foglio');
    var focusBtn = document.querySelector('[data-comando="concentrazione"]');
    var lightBtn = document.querySelector('[data-comando="lampada"]');
    function set(name, cls, btn, on) {
      root.classList.toggle(cls, on);
      if (btn) btn.setAttribute('aria-pressed', String(on));
      store('effinge-' + name, on ? '1' : '0');
    }
    var f = store('effinge-concentrazione'), l = store('effinge-lampada');
    set('concentrazione', 'concentrazione', focusBtn, f == null ? true : f === '1');
    set('lampada', 'lampada-accesa', lightBtn, l == null ? true : l === '1');
    if (focusBtn) focusBtn.addEventListener('click', function () { set('concentrazione', 'concentrazione', focusBtn, !root.classList.contains('concentrazione')); });
    if (lightBtn) lightBtn.addEventListener('click', function () { set('lampada', 'lampada-accesa', lightBtn, !root.classList.contains('lampada-accesa')); });
    var current = null;
    // La lampada: con il mouse lo segue; altrimenti (telefono, tastiera) illumina il paragrafo che si legge.
    var L = new Lampada(foglio);
    L.lag = reduce ? 1 : 260; L.intensity = 1;
    var ultimoMouse = null, modoMouse = false;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (ultimoMouse && ultimoMouse.x === e.clientX && ultimoMouse.y === e.clientY) return;   // movimento fantasma
      ultimoMouse = { x: e.clientX, y: e.clientY };
      modoMouse = true;
      var r = foglio.getBoundingClientRect();
      L.to(e.clientX - r.left, e.clientY - r.top);
    }, { passive: true });
    var ultimoScroll = scrollY;
    return function () {
      // scorrendo con la rotella il mouse resta fermo ma la pagina si sposta: la lampada resta sotto il puntatore
      if (modoMouse && ultimoMouse) {
        var rr = foglio.getBoundingClientRect();
        L.to(ultimoMouse.x - rr.left, ultimoMouse.y - rr.top);
      }
      ultimoScroll = scrollY;
      var mid = innerHeight * .46, best = null, dist = Infinity;
      blocchi.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (d < dist) { dist = d; best = b; }
      });
      if (best !== current) {
        if (current) current.classList.remove('fuoco');
        if (best) best.classList.add('fuoco');
        current = best;
      }
      if (!modoMouse && best) { var p = L.at(best, .45, .5); L.to(p.x, p.y); }
    };
  }

  /* ——— Archivio: filtro per categoria (senza JS si vedono tutti i testi) ——— */
  function filtri(box) {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-elenco] li[data-categoria]'));
    var buttons = Array.prototype.slice.call(box.querySelectorAll('[data-filtro]'));
    box.hidden = false;
    function apply(cat) {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filtro') === cat)); });
      items.forEach(function (li) { li.hidden = !!cat && li.getAttribute('data-categoria') !== cat; });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.getAttribute('data-filtro');
        apply(cat);
        try { history.replaceState(null, '', cat ? '#' + cat : location.pathname); } catch (e) {}
      });
    });
    var start = decodeURIComponent(location.hash.slice(1));
    if (start && buttons.some(function (b) { return b.getAttribute('data-filtro') === start; })) apply(start);
  }

  // La lampada è usata anche dalla pagina «Scrivi» (assets/js/scrivi.js).
  window.EffingeLampada = Lampada;

  /* ——— Sfondo: un tondino in alto, cinque sfumati; la scelta resta in questo browser ——— */
  function sfondi() {
    var tondino = document.querySelector('[data-apri-sfondi]'), scelta = document.getElementById('sfondi-scelta');
    if (!tondino || !scelta) return;
    var bottoni = Array.prototype.slice.call(scelta.querySelectorAll('[data-scegli]'));
    function segna() { var att = root.getAttribute('data-sfondo'); bottoni.forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.scegli === att)); }); }
    function chiudi() { scelta.hidden = true; tondino.setAttribute('aria-expanded', 'false'); }
    tondino.addEventListener('click', function (e) {
      e.stopPropagation();
      var apri = scelta.hidden;
      scelta.hidden = !apri; tondino.setAttribute('aria-expanded', String(apri));
      if (apri) { segna(); (scelta.querySelector('[aria-checked="true"]') || bottoni[0]).focus(); }
    });
    scelta.addEventListener('click', function (e) {
      var b = e.target.closest('[data-scegli]'); if (!b) return;
      root.setAttribute('data-sfondo', b.dataset.scegli);
      store('effinge-sfondo', b.dataset.scegli);
      segna();
    });
    scelta.addEventListener('keydown', function (e) {
      var i = bottoni.indexOf(document.activeElement);
      if (i < 0) return;   // le frecce sul cursore muovono il cursore
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); bottoni[(i + 1) % bottoni.length].focus(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); bottoni[(i - 1 + bottoni.length) % bottoni.length].focus(); }
    });
    // cursore del buio: 0 = sfumato originale, 100 = nero assoluto
    var cursore = scelta.querySelector('[data-buio]');
    if (cursore) {
      var attuale = parseFloat(getComputedStyle(root).getPropertyValue('--buio'));
      cursore.value = Math.round((isFinite(attuale) ? attuale : .55) * 100);
      cursore.addEventListener('input', function () { root.style.setProperty('--buio', String(cursore.value / 100)); });
      cursore.addEventListener('change', function () { store('effinge-buio', String(cursore.value)); });
    }
    document.addEventListener('click', function (e) { if (!scelta.hidden && !e.target.closest('.sfondi')) chiudi(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !scelta.hidden) { chiudi(); tondino.focus(); } });
    segna();
  }

  /* ——— Avvio ——— */
  function init() {
    sfondi();
    // Scrivi: se dopo qualche secondo l'editor non è partito, avvisa invece di restare muto
    if (document.querySelector('[data-scrivi-app]')) setTimeout(function () { if (!window.EffingeScrivi) { var g = document.getElementById('scrivi-guasto'); if (g) g.hidden = false; } }, 5000);
    var s;
    if ((s = document.querySelector('.apertura'))) scene.push(scenaApertura(s));
    if ((s = document.querySelector('.progetto'))) scene.push(scenaProgetto(s));
    Array.prototype.forEach.call(document.querySelectorAll('[data-lampada-puntatore]'), lampadaAlPuntatore);
    Array.prototype.forEach.call(document.querySelectorAll('[data-scrittura-al-passaggio]'), fogliettoScrivi);
    Array.prototype.forEach.call(document.querySelectorAll('.archivio'), archivio);
    Array.prototype.forEach.call(document.querySelectorAll('[data-filtri]'), filtri);
    var c = document.querySelector('[data-lettura]');
    if (c) scene.push(lettura(c));

    var barra = document.querySelector('.barra');
    var ticking = false;
    function frame() {
      ticking = false;
      scene.forEach(function (fn) { fn(); });
      if (barra) barra.classList.toggle('piena', scrollY > innerHeight * .9 || !document.querySelector('.apertura'));
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    frame();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px' });
      Array.prototype.forEach.call(document.querySelectorAll('.sale'), function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(document.querySelectorAll('.sale'), function (el) { el.classList.add('visto'); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
