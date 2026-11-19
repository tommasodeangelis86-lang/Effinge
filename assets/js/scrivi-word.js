/*!
 * Effinge — Scrivi: importazione ed esportazione Word (.docx), tutto nel browser.
 *
 * Importa (mammoth.js): ogni paragrafo con uno stile di titolo apre una nuova sezione.
 *   Riconosce gli stili di Word «Titolo», «Sottotitolo», «Titolo 1…», «Heading…» e anche
 *   stili personalizzati che contengono «titolo», «title», «heading», «capitolo» o «chapter».
 *   - «Parte …», «Libro …», «Sezione …» senza numerazione automatica → sezione di tipo parte;
 *   - tutti gli altri titoli → capitolo (il numero automatico di Word diventa la numerazione);
 *   - ciò che precede il primo titolo → copertina;
 *   - un titolo finale senza testo (es. «Fine») → chiude l'ultimo capitolo;
 *   - «*», «***», «* * *» → stacco tra scene; le note a piè di pagina vanno in fondo al capitolo.
 * Esporta (docx.js): un manoscritto A4 con margini 2,3 cm, interlinea 1,5, rientro 0,42 cm,
 *   Times New Roman 12; ogni parte e capitolo comincia su una pagina nuova con stile Titolo 1,
 *   così il file si può reimportare con la stessa struttura.
 */
(function () {
  'use strict';
  var caricati = {};
  function carica(src) {
    if (!caricati[src]) caricati[src] = new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('Impossibile caricare ' + src)); };
      document.head.appendChild(s);
    });
    return caricati[src];
  }
  var MAMMOTH = '/assets/vendor/mammoth-1.13.0.min.js';
  var DOCX = '/assets/vendor/docx-9.15.2.js';
  var pulisci = function (h) { return window.EffingeScrivi ? window.EffingeScrivi.pulisci(h) : h; };

  /* ——— Importa ——— */
  function testoElemento(el) {
    if (!el) return '';
    if (el.type === 'text') return el.value || '';
    return (el.children || []).map(testoElemento).join('');
  }
  function ruoloStile(nome) {
    nome = String(nome || '').trim();
    if (!nome) return null;
    if (/^(subtitle|sottotitolo)$/i.test(nome)) return 'sottotitolo';
    if (/^(title|titolo)$/i.test(nome)) return 'titolo';
    if (/^(heading|titolo|intestazione)\s*1$/i.test(nome)) return 'titolo';
    if (/^(heading|titolo|intestazione)\s*[2-9]$/i.test(nome)) return 'sottotitolo';
    if (/titol|title|heading|capitolo|chapter/i.test(nome)) return 'titolo';
    return null;
  }
  var PARTE = /^(parte|part|libro|book|sezione|section|atto)\b/i;
  var SOLO_NUMERO = /^(capitolo|chapter|cap\.?)?\s*([0-9]+|[ivxlcdm]+)\.?$/i;
  var STACCO = /^(\*\s*){1,3}$|^⁂$|^#$/;

  function importa(file) {
    return carica(MAMMOTH).then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var m = window.mammoth;
      var trasforma = m.transforms.paragraph(function (p) {
        var ruolo = ruoloStile(p.styleName);
        if (ruolo) {
          var copia = Object.assign({}, p, { styleName: 'Effinge ' + ruolo + (p.numbering ? ' numerato' : ''), numbering: null });
          return copia;
        }
        if (p.alignment === 'center' && !p.numbering) return Object.assign({}, p, { styleName: 'Effinge centro' });
        if (p.alignment === 'right' && !p.numbering) return Object.assign({}, p, { styleName: 'Effinge destra' });
        return p;
      });
      return m.convertToHtml({ arrayBuffer: buf }, {
        transformDocument: trasforma,
        ignoreEmptyParagraphs: false,
        includeDefaultStyleMap: true,
        styleMap: [
          "p[style-name='Effinge titolo'] => h1.sezione:fresh",
          "p[style-name='Effinge titolo numerato'] => h1.sezione.numerato:fresh",
          "p[style-name='Effinge sottotitolo'] => h2.sotto:fresh",
          "p[style-name='Effinge sottotitolo numerato'] => h2.sotto.numerato:fresh",
          "p[style-name='Effinge centro'] => p.centro:fresh",
          "p[style-name='Effinge destra'] => p.destra:fresh",
          "u => u",
          "strike => s"
        ]
      });
    }).then(function (res) {
      return dividi(res.value, file.name);
    });
  }

  function dividi(html, nomeFile) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    var body = doc.body;
    // note a piè di pagina: mammoth le mette tutte in fondo
    var note = {};
    Array.prototype.forEach.call(body.querySelectorAll('li[id^="footnote-"],li[id^="endnote-"]'), function (li) {
      Array.prototype.forEach.call(li.querySelectorAll('a[href^="#footnote-ref"],a[href^="#endnote-ref"]'), function (a) { a.remove(); });
      note[li.id] = li.innerHTML;
      var ol = li.parentNode; li.remove();
      if (ol && !ol.children.length) ol.remove();
    });
    // quale livello divide il libro: «titolo» se ce ne sono almeno due, altrimenti «sottotitolo»
    var h1 = body.querySelectorAll('h1.sezione').length, h2 = body.querySelectorAll('h2.sotto').length;
    var divisore = h1 >= 2 ? 'H1' : h2 >= 2 ? 'H2' : null;
    var sezioni = [], copertina = [], cur = null, avvisi = [];
    function nuova(el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      var numerato = el.classList.contains('numerato');
      var tipo = !numerato && PARTE.test(t) ? 'parte' : 'capitolo';
      var tit = tipo === 'capitolo' ? (SOLO_NUMERO.test(t) ? '' : t.replace(/^(capitolo|chapter)?\s*[0-9]+[.)]?\s+/i, '')) : t;
      cur = { tipo: tipo, titolo: tit, blocchi: [], numerato: numerato, vuotoTitolo: !t };
      sezioni.push(cur);
    }
    Array.prototype.slice.call(body.children).forEach(function (el) {
      var testo = (el.textContent || '').replace(/ /g, ' ').trim();
      if (divisore && el.tagName === divisore && (el.classList.contains('sezione') || el.classList.contains('sotto'))) { nuova(el); return; }
      if (el.tagName === 'H1' && el.classList.contains('sezione') && !testo) return;   // titoli vuoti non divisori
      if (el.tagName === 'P' && !testo && !el.querySelector('img')) return;           // righe vuote
      if (el.tagName === 'P' && STACCO.test(testo)) { el.className = 'stacco'; el.textContent = '*'; }
      if (el.tagName === 'H1' || el.tagName === 'H2') {                               // titoli interni al capitolo
        var h = doc.createElement(el.tagName === 'H1' ? 'h2' : 'h3'); h.innerHTML = el.innerHTML; el = h;
      }
      (cur ? cur.blocchi : copertina).push(el);
    });
    // «Fine» e simili: ultimo titolo senza testo dopo di sé → chiude il capitolo precedente
    while (sezioni.length > 1) {
      var ult = sezioni[sezioni.length - 1];
      if (ult.blocchi.length || ult.tipo !== 'capitolo' || ult.numerato || !ult.titolo) break;
      var p = doc.createElement('p'); p.className = 'centro'; p.textContent = ult.titolo;
      sezioni.pop();
      sezioni[sezioni.length - 1].blocchi.push(p);
    }
    var out = [];
    var testoCop = copertina.map(function (e) { return e.textContent; }).join('').trim();
    if (testoCop) {
      copertina.forEach(function (e) { if (e.tagName === 'P' && !e.classList.contains('destra')) e.className = 'centro'; });
      out.push({ tipo: 'copertina', titolo: '', html: pulisci(copertina.map(function (e) { return e.outerHTML; }).join('')) });
    }
    sezioni.forEach(function (s) {
      var wrap = doc.createElement('div');
      s.blocchi.forEach(function (b) { wrap.appendChild(b); });
      // riferimenti alle note: [n] → n in apice, note in fondo al capitolo
      var qui = [];
      Array.prototype.forEach.call(wrap.querySelectorAll('a[href^="#footnote-"],a[href^="#endnote-"]'), function (a) {
        var key = a.getAttribute('href').slice(1);
        if (!note[key]) return;
        qui.push(note[key]);
        var sup = doc.createElement('sup'); sup.textContent = String(qui.length);
        var padre = a.parentNode && a.parentNode.tagName === 'SUP' ? a.parentNode : a;
        padre.replaceWith(sup);
      });
      if (qui.length) {
        var d = doc.createElement('div'); d.className = 'note';
        qui.forEach(function (n, i) { var p = doc.createElement('p'); p.innerHTML = '<sup>' + (i + 1) + '</sup> ' + n.replace(/^<p>|<\/p>$/g, ''); d.appendChild(p); });
        wrap.appendChild(d);
      }
      out.push({ tipo: s.tipo, titolo: s.titolo, html: pulisci(wrap.innerHTML) });
    });
    if (!divisore) avvisi.push('Non ho trovato titoli di capitolo: il documento diventa un capitolo unico. Usa lo stile «Titolo» o «Titolo 1» per ogni capitolo.');
    if (!out.length) out.push({ tipo: 'capitolo', titolo: '', html: '' });
    var titolo = String(nomeFile || 'Opera importata').replace(/\.docx$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { titolo: titolo, sezioni: out, avvisi: avvisi };
  }

  /* ——— Esporta ——— */
  var CM = 566.93; // twip per centimetro
  function esporta(opera, elenco) {
    return carica(DOCX).then(function () {
      var D = window.docx;
      var AL = { centro: D.AlignmentType.CENTER, destra: D.AlignmentType.RIGHT, giustificato: D.AlignmentType.JUSTIFIED, sinistra: D.AlignmentType.LEFT };
      function allineamento(el, pred) {
        for (var k in AL) if (el.classList && el.classList.contains(k)) return AL[k];
        return pred;
      }
      function runs(node, f) {
        var out = [];
        Array.prototype.forEach.call(node.childNodes, function (n) {
          if (n.nodeType === 3) { if (n.nodeValue) out.push(new D.TextRun({ text: n.nodeValue.replace(/\s+/g, ' '), bold: f.b, italics: f.i, underline: f.u ? {} : undefined, strike: f.s, superScript: f.sup })); return; }
          if (n.nodeType !== 1) return;
          var t = n.tagName, g = Object.assign({}, f);
          if (t === 'BR') { out.push(new D.TextRun({ text: '', break: 1 })); return; }
          if (t === 'STRONG' || t === 'B') g.b = true;
          if (t === 'EM' || t === 'I') g.i = true;
          if (t === 'U') g.u = true;
          if (t === 'S') g.s = true;
          if (t === 'SUP') g.sup = true;
          out = out.concat(runs(n, g));
        });
        return out;
      }
      var corpo = { line: 360 }, rientro = { firstLine: Math.round(0.42 * CM) };
      function blocchi(html, tipo) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        var out = [];
        Array.prototype.forEach.call(tmp.children, function (el) {
          var t = el.tagName, f = {};
          if (t === 'P') {
            var stacco = el.classList.contains('stacco');
            var al = stacco ? D.AlignmentType.CENTER : allineamento(el, tipo === 'copertina' ? D.AlignmentType.CENTER : D.AlignmentType.JUSTIFIED);
            var centrato = al === D.AlignmentType.CENTER || al === D.AlignmentType.RIGHT;
            out.push(new D.Paragraph({ children: runs(el, f), alignment: al, spacing: corpo, indent: centrato || tipo === 'copertina' ? undefined : rientro }));
          } else if (t === 'H2' || t === 'H3') {
            out.push(new D.Paragraph({ children: runs(el, f), heading: t === 'H2' ? D.HeadingLevel.HEADING_2 : D.HeadingLevel.HEADING_3, alignment: allineamento(el, D.AlignmentType.CENTER), spacing: { before: 240, after: 240, line: 360 } }));
          } else if (t === 'BLOCKQUOTE') {
            var ps = el.querySelectorAll('p');
            (ps.length ? Array.prototype.slice.call(ps) : [el]).forEach(function (p) {
              out.push(new D.Paragraph({ children: runs(p, { i: true }), indent: { left: Math.round(1 * CM) }, spacing: corpo }));
            });
          } else if (t === 'UL' || t === 'OL') {
            Array.prototype.forEach.call(el.children, function (li) {
              out.push(new D.Paragraph({ children: runs(li, f), bullet: t === 'UL' ? { level: 0 } : undefined, numbering: t === 'OL' ? { reference: 'numeri', level: 0 } : undefined, spacing: corpo }));
            });
          } else if (t === 'HR') {
            out.push(new D.Paragraph({ children: [new D.TextRun('*')], alignment: D.AlignmentType.CENTER, spacing: corpo }));
          } else if (t === 'DIV') {
            out.push(new D.Paragraph({ children: [], spacing: corpo }));
            Array.prototype.forEach.call(el.children, function (p) { out.push(new D.Paragraph({ children: runs(p, f), spacing: { line: 276 }, style: 'Nota' })); });
          } else if (t === 'H1') {
            out.push(new D.Paragraph({ children: runs(el, f), alignment: D.AlignmentType.CENTER, spacing: corpo }));
          }
        });
        return out;
      }
      var figli = [], n = 0, prima = true;
      elenco.forEach(function (s) {
        var nuovaPagina = !prima;
        if (s.tipo === 'copertina') {
          var b = blocchi(s.html, 'copertina');
          if (b.length && nuovaPagina) figli.push(new D.Paragraph({ children: [new D.PageBreak()] }));
          figli = figli.concat(b);
        } else if (s.tipo === 'parte') {
          figli.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, pageBreakBefore: nuovaPagina, spacing: { before: 2400, after: 1200 }, children: [new D.TextRun(s.titolo || 'Parte')] }));
          figli = figli.concat(blocchi(s.html, 'parte'));
        } else {
          n++;
          figli.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, pageBreakBefore: nuovaPagina, spacing: { before: 1440, after: 720 }, children: [new D.TextRun(s.titolo ? n + '. ' + s.titolo : String(n))] }));
          figli = figli.concat(blocchi(s.html, 'capitolo'));
        }
        prima = false;
      });
      var doc = new D.Document({
        creator: 'Effinge',
        title: opera.titolo || '',
        styles: {
          default: {
            document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 360 } } },
            heading1: { run: { font: 'Times New Roman', size: 28, bold: false, color: '000000' }, paragraph: { alignment: D.AlignmentType.CENTER, keepNext: true } },
            heading2: { run: { font: 'Times New Roman', size: 26, italics: true, color: '000000' }, paragraph: { keepNext: true } },
            heading3: { run: { font: 'Times New Roman', size: 24, bold: true, color: '000000' }, paragraph: { keepNext: true } }
          },
          paragraphStyles: [{ id: 'Nota', name: 'Nota', basedOn: 'Normal', run: { size: 20 } }]
        },
        numbering: { config: [{ reference: 'numeri', levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.START }] }] },
        sections: [{
          properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: Math.round(2.3 * CM), right: Math.round(2.3 * CM), bottom: Math.round(2.3 * CM), left: Math.round(2.3 * CM) } } },
          footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: [D.PageNumber.CURRENT], size: 20 })] })] }) },
          children: figli.length ? figli : [new D.Paragraph('')]
        }]
      });
      return D.Packer.toBlob(doc);
    });
  }

  window.EffingeWord = { importa: importa, esporta: esporta, _dividi: dividi };
})();
