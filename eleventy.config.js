// Configurazione di Eleventy: trasforma i contenuti (src/) nel sito pubblicato (_site/).
const HEX = /^#[0-9a-fA-F]{6}$/;
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const isDraft = (data) => data && data.bozza === true;

import { createHash } from 'node:crypto';

// Regola di sicurezza (Content Security Policy) per ogni pagina: solo script del sito (gli inline
// sono ammessi solo se identici a quelli generati qui, tramite il loro hash), connessioni solo al
// sito e all'API di GitHub (per «Pubblica sul sito»), niente plugin, form o iframe esterni.
function regolaDiSicurezza(html) {
  const hash = new Set();
  // solo gli script dell'intestazione, scritti nei modelli: mai quelli dentro i contenuti (<body>)
  const testa = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || ['', ''])[1];
  testa.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, corpo) => {
    hash.add("'sha256-" + createHash('sha256').update(corpo, 'utf8').digest('base64') + "'");
    return m;
  });
  return [
    "default-src 'self'",
    "script-src 'self' " + [...hash].join(' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.github.com",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export default function (config) {
  config.addTransform('sicurezza', function (content) {
    const out = this.page && this.page.outputPath;
    if (!out || !String(out).endsWith('.html') || !/<meta charset="utf-8">/i.test(content)) return content;
    const csp = regolaDiSicurezza(content).replace(/"/g, '&quot;');
    return content.replace(/<meta charset="utf-8">/i, (m) => m +
      '\n<meta http-equiv="Content-Security-Policy" content="' + csp + '">' +
      '\n<meta name="referrer" content="strict-origin-when-cross-origin">');
  });
  config.addPassthroughCopy({ 'assets/css/fonts.css': 'assets/css/fonts.css', 'assets/css/sito.css': 'assets/css/sito.css', 'assets/js/sito.js': 'assets/js/sito.js', 'assets/js/scrivi.js': 'assets/js/scrivi.js', 'assets/js/scrivi-word.js': 'assets/js/scrivi-word.js', 'assets/css/scrivi.css': 'assets/css/scrivi.css', 'assets/vendor': 'assets/vendor', media: 'media' });
  config.addPassthroughCopy({ 'assets/fonts': 'assets/fonts' }, { filter: ['cormorant-*', 'eb-garamond-*', 'inter-tight-*'] });

  // Testi pubblicati, dal più recente
  config.addCollection('testi', (api) =>
    api.getFilteredByGlob('src/testi/*.md').filter((p) => !isDraft(p.data)).sort((a, b) => b.date - a.date));
  config.addCollection('pagine', (api) =>
    api.getFilteredByGlob('src/pagine/*.md').filter((p) => !isDraft(p.data)).sort((a, b) => (a.data.ordine || 0) - (b.data.ordine || 0)));

  // Filtri usati nei modelli
  config.addFilter('colore', (value, fallback) => (HEX.test(String(value || '').trim()) ? String(value).trim() : fallback));
  config.addFilter('dataEstesa', (d) => { const x = new Date(d); return `${x.getUTCDate()} ${MESI[x.getUTCMonth()]} ${x.getUTCFullYear()}`; });
  config.addFilter('dataBreve', (d) => { const x = new Date(d); return [x.getUTCDate(), x.getUTCMonth() + 1].map((n) => String(n).padStart(2, '0')).join('.') + '.' + x.getUTCFullYear(); });
  config.addFilter('dataIso', (d) => new Date(d).toISOString().slice(0, 10));
  config.addFilter('anno', (d) => new Date(d).getUTCFullYear());
  config.addFilter('minutiDiLettura', (html) => Math.max(1, Math.round(String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200)));
  config.addFilter('categorie', (testi) => [...new Set(testi.map((t) => t.data.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it')));
  config.addFilter('inEvidenza', (testi, n) => { const f = testi.filter((t) => t.data.in_evidenza); return (f.length ? f : testi).slice(0, n); });
  config.addFilter('limita', (arr, n) => (arr || []).slice(0, n));
  config.addFilter('assoluto', (path, base) => new URL(path, base || 'https://effinge.it').href);
  config.addFilter('json', (v) => JSON.stringify(v));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
