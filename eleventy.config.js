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
    // Solo in Scrivi: il Narratore parla direttamente con i fornitori scelti da chi scrive, con le sue chiavi.
    "connect-src 'self' https://api.github.com" + (/data-scrivi-app/.test(html) ? ' https://api.anthropic.com https://api.openai.com https://api.elevenlabs.io https://generativelanguage.googleapis.com' : ''),
    "media-src 'self'" + (/data-scrivi-app/.test(html) ? ' blob:' : ''),
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
  config.addPassthroughCopy({ 'assets/css/fonts.css': 'assets/css/fonts.css', 'assets/css/sito.css': 'assets/css/sito.css', 'assets/js/sito.js': 'assets/js/sito.js', 'assets/js/scrivi.js': 'assets/js/scrivi.js', 'assets/js/scrivi-word.js': 'assets/js/scrivi-word.js', 'assets/js/scrivi-voce.js': 'assets/js/scrivi-voce.js', 'assets/css/scrivi.css': 'assets/css/scrivi.css', 'assets/vendor': 'assets/vendor', 'assets/effinge-anteprima.png': 'assets/effinge-anteprima.png', media: 'media' });
  config.addPassthroughCopy({ 'assets/fonts': 'assets/fonts' }, { filter: ['cormorant-*', 'eb-garamond-*', 'inter-tight-*'] });
  config.addPassthroughCopy({ 'assets/favicon.png': 'favicon.png' });
  config.addPassthroughCopy({
    'assets/css/checkmanoscritto.css': 'assets/css/checkmanoscritto.css',
    'assets/js/checkmanoscritto.js': 'assets/js/checkmanoscritto.js',
    'assets/js/checkmanoscritto-docx.js': 'assets/js/checkmanoscritto-docx.js',
  });
  config.addPassthroughCopy({ 'assets/css/art.css': 'assets/css/art.css', 'assets/art': 'assets/art' });

  // Testi pubblicati, dal più recente
  config.addCollection('testi', (api) =>
    api.getFilteredByGlob('src/testi/*.md').filter((p) => !isDraft(p.data)).sort((a, b) => b.date - a.date));
  config.addCollection('guide', (api) =>
    api.getFilteredByGlob('src/guide/*.md').sort((a, b) => (a.data.ordine || 0) - (b.data.ordine || 0)));
  config.addFilter('escludi', (arr, url) => (arr || []).filter((x) => x.url !== url));
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
  // Dati strutturati schema.org: rivista (homepage), articolo (testi), applicazione (Scrivi), raccolta (archivio)
  config.addFilter('jsonld', function (d, page, s) {
    d = d || {};
    const base = (s.sito.indirizzo || 'https://www.effinge.it').replace(/\/$/, '');
    const url = base + page.url;
    const editore = { '@type': 'Organization', name: s.sito.nome, url: base + '/' };
    let dati;
    if (page.url === '/') {
      dati = [
        { '@type': 'WebSite', name: s.sito.nome, url: base + '/', inLanguage: 'it-IT', description: s.sito.descrizione },
        { '@type': 'Periodical', name: s.sito.nome, url: base + '/', inLanguage: 'it-IT', description: s.sito.descrizione, publisher: editore },
      ];
    } else if (d.layout === 'testo.njk') {
      dati = { '@type': 'Article', headline: d.titolo, description: d.seo_descrizione || d.estratto || '', datePublished: new Date(page.date).toISOString().slice(0, 10),
        inLanguage: 'it-IT', articleSection: d.categoria || undefined, url, mainEntityOfPage: url, publisher: editore, isPartOf: { '@type': 'Periodical', name: s.sito.nome, url: base + '/' },
        image: d.immagine ? base + d.immagine : base + '/assets/effinge-anteprima.png' };
    } else if (d.layout === 'guida.njk') {
      dati = [{ '@type': 'Article', headline: d.titolo, description: d.seo_descrizione || '', datePublished: new Date(page.date).toISOString().slice(0, 10),
        inLanguage: 'it-IT', url, mainEntityOfPage: url, publisher: editore, image: base + '/assets/effinge-anteprima.png' }];
      if (d.faq && d.faq.length) dati.push({ '@type': 'FAQPage', mainEntity: d.faq.map((q) => ({ '@type': 'Question', name: q.d, acceptedAnswer: { '@type': 'Answer', text: q.r } })) });
    } else if (page.url === '/scrivi/') {
      dati = { '@type': 'WebApplication', name: 'Foglio Effinge', url, applicationCategory: 'ProductivityApplication', operatingSystem: 'Web', inLanguage: 'it-IT',
        description: d.seo_descrizione, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, publisher: editore };
    } else if (page.url === '/archivio/') {
      dati = { '@type': 'CollectionPage', name: d.titolo_completo || d.titolo, url, inLanguage: 'it-IT', description: d.seo_descrizione, isPartOf: { '@type': 'WebSite', name: s.sito.nome, url: base + '/' } };
    } else {
      dati = { '@type': 'WebPage', name: d.titolo, url, inLanguage: 'it-IT', isPartOf: { '@type': 'WebSite', name: s.sito.nome, url: base + '/' } };
    }
    const grafo = { '@context': 'https://schema.org', '@graph': [].concat(dati) };
    // niente «</script>» possibile nel testo: si rende innocuo il carattere «<»
    return JSON.stringify(grafo).replace(/</g, '\\u003c');
  });

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
