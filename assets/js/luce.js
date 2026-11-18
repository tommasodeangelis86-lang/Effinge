/*!
 * Effinge — Illuminated Type Reveal
 *
 * Un solo motore per la scritta animata. Ogni impostazione è un attributo
 * data-* sull'elemento, in modo che in Webflow possa essere collegata a un
 * campo della raccolta CMS «Impostazioni homepage» senza toccare il codice.
 *
 *   <h1 data-luce
 *       data-mode="lamp|ink|slit"   tipo di luce (dipende dalla direzione visiva)
 *       data-enabled="true"         animazione attiva / disattiva
 *       data-speed="80"             ms per carattere
 *       data-delay="250"            ritardo iniziale in ms
 *       data-fade="320"             dissolvenza della luce in ms (220–400)
 *       data-intensity="0.75"       intensità luminosa, 0–1
 *       data-color="#C6B08B"        colore della luce
 *       data-cursor="true"          mostra il cursore luminoso
 *       data-repeat="sempre|sessione">EFFINGE</h1>
 *
 * Senza JavaScript, o con prefers-reduced-motion, il titolo resta testo
 * normale e leggibile. Il testo è sempre presente per gli screen reader.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'effinge-luce-vista';
  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var instances = [];

  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    return Math.min(max, Math.max(min, n));
  }

  function bool(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    return !/^(false|0|no|off)$/i.test(String(value).trim());
  }

  function readOptions(el) {
    var d = el.dataset;
    return {
      mode: /^(lamp|ink|slit)$/.test(d.mode || '') ? d.mode : 'lamp',
      enabled: bool(d.enabled, true),
      speed: num(d.speed, 80, 20, 600),
      delay: num(d.delay, 250, 0, 3000),
      fade: num(d.fade, 320, 120, 1200),
      intensity: num(d.intensity, 0.75, 0, 1),
      color: /^#[0-9a-f]{6}$/i.test(d.color || '') ? d.color : '#C6B08B',
      cursor: bool(d.cursor, true),
      repeat: d.repeat === 'sessione' ? 'sessione' : 'sempre'
    };
  }

  function rgba(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha.toFixed(3) + ')';
  }

  function segments(text) {
    if (window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter('it', { granularity: 'grapheme' }).segment(text), function (s) { return s.segment; });
    }
    return Array.from(text);
  }

  function seenThisSession() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }

  function markSeen() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  function releasePending() {
    document.documentElement.classList.remove('luce-attesa');
  }

  function Instance(el) {
    this.el = el;
    this.text = (el.getAttribute('data-text') || el.textContent).replace(/\s+/g, ' ').trim();
    this.timers = [];
    this.anims = [];
    this.frame = 0;
    this.build();
  }

  Instance.prototype.build = function () {
    var el = this.el;
    var text = this.text;
    el.textContent = '';

    var sr = document.createElement('span');
    sr.className = 'luce-sr';
    sr.textContent = text;

    var line = document.createElement('span');
    line.className = 'luce-riga';
    line.setAttribute('aria-hidden', 'true');

    this.glyphs = segments(text).map(function (ch) {
      var g = document.createElement('span');
      g.className = 'luce-glifo' + (ch === ' ' ? ' luce-spazio' : '');
      g.textContent = ch === ' ' ? ' ' : ch;
      line.appendChild(g);
      return g;
    });

    var scene = document.createElement('span');
    scene.className = 'luce-scena';
    scene.setAttribute('aria-hidden', 'true');
    this.trail = document.createElement('span');
    this.trail.className = 'luce-scia';
    this.lamp = document.createElement('span');
    this.lamp.className = 'luce-lampada';
    this.caret = document.createElement('span');
    this.caret.className = 'luce-cursore';
    scene.appendChild(this.trail);
    scene.appendChild(this.lamp);
    scene.appendChild(this.caret);

    el.appendChild(sr);
    el.appendChild(line);
    el.appendChild(scene);
  };

  Instance.prototype.stop = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    this.anims = [];
    cancelAnimationFrame(this.frame);
    this.el.classList.remove('luce-in-corso', 'luce-accesa');
    this.glyphs.forEach(function (g) { g.classList.remove('acceso'); g.style.color = ''; g.style.textShadow = ''; });
  };

  Instance.prototype.centre = function (glyph) {
    var b = glyph.getBoundingClientRect();
    var p = this.el.getBoundingClientRect();
    return { x: b.left - p.left + b.width / 2, right: b.right - p.left, y: b.top - p.top + b.height * 0.52 };
  };

  Instance.prototype.place = function (node, x, y) {
    node.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) translate(-50%,-50%)';
  };

  Instance.prototype.play = function (force) {
    var self = this;
    var o = readOptions(this.el);
    this.stop();
    this.el.style.setProperty('--luce', o.color);
    this.el.style.setProperty('--luce-intensita', String(o.intensity));
    this.el.style.setProperty('--luce-fade', o.fade + 'ms');
    this.el.setAttribute('data-cursor-visible', String(o.cursor));

    var skip = !o.enabled || reduceQuery.matches || (!force && o.repeat === 'sessione' && seenThisSession());
    releasePending();
    if (skip) return;

    var rest = getComputedStyle(this.el).color;
    var glyphs = this.glyphs;
    var i = o.intensity;
    var glowPeak, glowMid, colorPeak;
    if (o.mode === 'ink') {
      colorPeak = o.color;
      glowPeak = '0 0 ' + (0.08 + 0.2 * i).toFixed(3) + 'em ' + rgba(o.color, 0.55 * i);
      glowMid = '0 0 ' + (0.05 + 0.1 * i).toFixed(3) + 'em ' + rgba(o.color, 0.2 * i);
    } else {
      colorPeak = '#FFF9EE';
      glowPeak = '0 0 ' + (0.04 + 0.1 * i).toFixed(3) + 'em rgba(255,247,226,' + (0.95 * i).toFixed(3) + '), 0 0 ' + (0.15 + 0.35 * i).toFixed(3) + 'em ' + rgba(o.color, 0.85 * i);
      glowMid = '0 0 ' + (0.05 + 0.12 * i).toFixed(3) + 'em ' + rgba(o.color, 0.35 * i);
    }
    var none = '0 0 0 rgba(0,0,0,0)';

    this.el.classList.add('luce-in-corso');

    var visible = glyphs.filter(function (g) { return !g.classList.contains('luce-spazio'); });
    if (!visible.length) { this.el.classList.remove('luce-in-corso'); return; }

    var first = this.centre(glyphs[0]);
    var lamp = { x: first.x - o.speed * 0.25, y: first.y, tx: first.x - o.speed * 0.4, ty: first.y };
    var target = { x: lamp.x, y: lamp.y };
    var started = 0;
    var last = 0;

    function tick(now) {
      if (!started) { started = now; last = now; }
      var dt = Math.min(now - last || 16, 48);
      last = now;
      if (o.mode === 'slit') {
        // Fessura: velocità costante, interpolata tra i centri dei caratteri.
        var f = (now - started - o.delay) / o.speed;
        var idx = Math.max(0, Math.min(glyphs.length - 1, Math.floor(f)));
        var a = self.centre(glyphs[idx]);
        var b = self.centre(glyphs[Math.min(glyphs.length - 1, idx + 1)]);
        var k = f < 0 ? 0 : Math.min(1, f - idx);
        lamp.x = f < 0 ? a.x : a.x + (b.x - a.x) * k;
        lamp.y = a.y;
        lamp.tx = lamp.x; lamp.ty = lamp.y;
      } else {
        // Lampada: insegue il carattere corrente con smorzamento esponenziale.
        var e1 = 1 - Math.exp(-dt / Math.max(40, o.speed * 0.55));
        var e2 = 1 - Math.exp(-dt / Math.max(120, o.speed * 2));
        lamp.x += (target.x - lamp.x) * e1;
        lamp.y += (target.y - lamp.y) * e1;
        lamp.tx += (lamp.x - lamp.tx) * e2;
        lamp.ty += (lamp.y - lamp.ty) * e2;
      }
      self.place(self.lamp, lamp.x, lamp.y);
      self.place(self.trail, lamp.tx, lamp.ty);
      self.place(self.caret, target.caret !== undefined ? target.caret : lamp.x, lamp.y);
      self.frame = requestAnimationFrame(tick);
    }

    this.place(this.lamp, lamp.x, lamp.y);
    this.place(this.trail, lamp.tx, lamp.ty);
    this.place(this.caret, first.x, first.y);
    this.frame = requestAnimationFrame(tick);
    // La lampada appare un istante prima della prima lettera.
    this.timers.push(setTimeout(function () { self.el.classList.add('luce-accesa'); }, Math.max(0, o.delay - 160)));

    glyphs.forEach(function (g, n) {
      self.timers.push(setTimeout(function () {
        var c = self.centre(g);
        target.x = c.x;
        target.y = c.y;
        target.caret = c.right + 2;
        g.classList.add('acceso');
        if (g.classList.contains('luce-spazio')) return;
        var reveal = g.animate([
          { opacity: 0, filter: 'blur(0.06em)' },
          { opacity: 1, filter: 'blur(0)' }
        ], { duration: Math.max(140, o.speed * 2.2), easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' });
        var glow = g.animate([
          { color: colorPeak, textShadow: glowPeak, offset: 0 },
          { color: colorPeak, textShadow: glowPeak, offset: 0.18 },
          { color: rest, textShadow: glowMid, offset: 0.55 },
          { color: rest, textShadow: none, offset: 1 }
        ], { duration: o.fade + 120, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
        self.anims.push(reveal, glow);
      }, o.delay + n * o.speed));
    });

    var end = o.delay + (glyphs.length - 1) * o.speed;
    this.timers.push(setTimeout(function () {
      self.el.classList.remove('luce-accesa');
    }, end + Math.round(o.fade * 0.6)));
    this.timers.push(setTimeout(function () {
      cancelAnimationFrame(self.frame);
      self.el.classList.remove('luce-in-corso');
      markSeen();
    }, end + o.fade + 600));
  };

  function init() {
    var nodes = document.querySelectorAll('[data-luce]');
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__luce) return;
      var inst = new Instance(el);
      el.__luce = inst;
      instances.push(inst);
    });
    var go = function () { instances.forEach(function (inst) { inst.play(false); }); };
    var fonts = document.fonts && document.fonts.ready;
    if (fonts) {
      var done = false;
      var once = function () { if (!done) { done = true; go(); } };
      fonts.then(once);
      setTimeout(once, 900);
    } else {
      go();
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-luce-replay]');
      if (!btn) return;
      instances.forEach(function (inst) { inst.play(true); });
    });

    if (reduceQuery.addEventListener) {
      reduceQuery.addEventListener('change', function () {
        if (reduceQuery.matches) instances.forEach(function (inst) { inst.stop(); });
      });
    }
  }

  window.EffingeLuce = {
    /** Riproduce l'animazione su tutte le scritte (ignora «ripetizione: sessione»). */
    replay: function () { instances.forEach(function (inst) { inst.play(true); }); },
    /** Aggiorna le impostazioni di una scritta e la riproduce. */
    configure: function (el, options) {
      var inst = el && el.__luce;
      if (!inst) return;
      Object.keys(options || {}).forEach(function (key) {
        if (key === 'text') {
          inst.text = String(options.text).trim() || inst.text;
          el.setAttribute('data-text', inst.text);
          inst.stop();
          inst.build();
        } else {
          el.dataset[key] = String(options[key]);
        }
      });
      inst.play(true);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
