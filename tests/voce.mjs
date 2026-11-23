// Narratore in Scrivi: voci (sistema e OpenAI), chiavi AI, suggerimenti (Claude, Gemini), sicurezza.
// Le API dei fornitori sono simulate: nessuna chiamata vera, nessuna chiave vera.
import { createRequire } from 'module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('../_site', import.meta.url).pathname;
const tipi = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': tipi[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(4192);
let fallimenti = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fallimenti++; };

// un secondo di silenzio in WAV, per la voce «premium» simulata
function wav(sec = 1.2, rate = 8000) {
  const n = Math.round(sec * rate), b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); b.fill(128, 44);
  return b;
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-expose-headers': '*' };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errori = [], richieste = [];
page.on('pageerror', (e) => errori.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errori.push(m.text()); });

// voce di sistema simulata: emette i confini di parola come un browser vero
await page.addInitScript(() => {
  const voci = [{ name: 'Alice (Neural)', lang: 'it-IT' }, { name: 'Google italiano', lang: 'it-IT' }];
  const ss = { speaking: false, _t: [], getVoices: () => voci, addEventListener() {}, cancel() { this._t.forEach(clearTimeout); this._t = []; },
    speak(u) { const parole = [...u.text.matchAll(/\S+/g)]; let t = 0;
      parole.forEach((p) => { this._t.push(setTimeout(() => u.onboundary && u.onboundary({ name: 'word', charIndex: p.index, charLength: p[0].length }), t += 120)); });
      this._t.push(setTimeout(() => u.onend && u.onend({}), t + 120)); window.__parlato = (window.__parlato || '') + u.text; } };
  Object.defineProperty(window, 'speechSynthesis', { value: ss });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});

await page.route('https://api.anthropic.com/**', async (route) => {
  const q = route.request();
  if (q.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  const corpo = JSON.parse(q.postData());
  richieste.push({ a: 'anthropic', h: q.headers(), corpo });
  const testo = corpo.messages[0].content;
  const sugg = testo.includes('la la la la casa') ? [{ originale: 'la la la la casa era buia', proposta: 'la casa era buia', nota: 'Ripetizione di «la».' }] : [];
  await route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({
    id: 'msg_test', type: 'message', role: 'assistant', model: corpo.model, stop_reason: 'end_turn', stop_sequence: null,
    content: [{ type: 'text', text: JSON.stringify({ suggerimenti: sugg }) }], usage: { input_tokens: 10, output_tokens: 10 } }) });
});
await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
  const q = route.request();
  if (q.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ a: 'gemini', h: q.headers(), corpo: JSON.parse(q.postData()) });
  await route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ suggerimenti: [{ originale: 'Il vento passava sopra i tetti', proposta: 'Il vento passava sui tetti', nota: 'Più asciutto.' }] }) }] } }] }) });
});
await page.route('https://api.openai.com/**', async (route) => {
  const q = route.request();
  if (q.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ a: 'openai', h: q.headers(), corpo: JSON.parse(q.postData()) });
  await route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'audio/wav' }, body: wav() });
});

await page.goto('http://localhost:4192/scrivi/');
await page.waitForFunction(() => window.EffingeScrivi && window.EffingeVoce);
await page.evaluate(() => window.EffingeScrivi.pronto);
await page.evaluate(() => { localStorage.removeItem('effinge-chiavi-ai'); localStorage.removeItem('effinge-voce'); });
const editor = page.locator('.scrivi-editor');
await editor.click();
await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
await page.keyboard.type('Quella sera la la la la casa era buia. Il vento passava sopra i tetti e nessuno parlava.');
await page.waitForTimeout(300);

// 1. voce di sistema: legge, la parola si accende e la lampada la segue
ok(await page.locator('[data-voce="leggi"]').isVisible(), 'pulsante Leggi nella colonna a destra');
await page.click('[data-voce="leggi"]');
await page.waitForTimeout(500);
ok(await page.locator('.voce-parola').isVisible(), 'la parola letta si accende');
ok(await page.getAttribute('[data-voce="leggi"]', 'aria-pressed') === 'true', 'Leggi risulta attivo mentre parla');
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
ok(await page.locator('.voce-parola').isHidden(), 'Esc ferma la voce');
ok((await page.evaluate(() => window.__parlato || '')).includes('Quella sera'), 'legge il testo del foglio');

// 2. finestra Voce: voci italiane e modalità
await page.click('[data-voce="impostazioni"]');
ok(await page.locator('#voce[open]').isVisible(), 'finestra Voce aperta');
ok((await page.locator('#voce-sistema option').count()) === 2, 'elenco delle voci italiane');
await page.check('input[name="voce-modo"][value="frase"]');
await page.click('#voce [data-chiudi]');
await page.evaluate(() => { window.__parlato = ''; });
await editor.click(); await page.keyboard.press('End'); await page.keyboard.press('Control+End');
await page.keyboard.type(' Poi venne il giorno. ');
await page.waitForTimeout(700);
ok((await page.evaluate(() => window.__parlato)).includes('Poi venne il giorno.'), 'modalità Frase: legge la frase appena chiusa');

// 3. chiavi: nel browser, mai sul sito
await page.click('[data-apri-chiavi]');
await page.fill('#chiave-anthropic', 'sk-ant-prova-1234');
await page.fill('#chiave-openai', 'sk-prova-openai-5678');
await page.click('[data-salva-chiavi]');
const salvate = await page.evaluate(() => JSON.parse(localStorage.getItem('effinge-chiavi-ai')));
ok(salvate && salvate.anthropic === 'sk-ant-prova-1234' && salvate.modelli.anthropic === 'claude-opus-5-5', 'chiavi salvate nel browser, modello Claude predefinito');

// 4. suggerimenti con Claude (SDK ufficiale, chiamata diretta dal browser)
await page.click('[data-suggerisci="migliora"]');
await page.waitForSelector('.ai-segno', { timeout: 8000 });
const r1 = richieste.find((x) => x.a === 'anthropic');
ok(r1 && (r1.h['x-api-key'] === 'sk-ant-prova-1234' || r1.h.authorization === 'Bearer sk-ant-prova-1234'), 'la chiave va solo al fornitore, nell’intestazione giusta');
ok(r1 && r1.h['anthropic-dangerous-direct-browser-access'] === 'true', 'chiamata diretta dal browser dichiarata');
ok(r1 && r1.corpo.model === 'claude-opus-5-5' && r1.corpo.fallbacks === 'default' && r1.corpo.output_config.format.type === 'json_schema', 'richiesta: modello, fallback e risposta in JSON');
const prima = await editor.innerText();
const segno = await page.locator('.ai-segno').first().boundingBox();
await page.mouse.click(segno.x + segno.width / 2, segno.y + segno.height / 2);
await page.waitForSelector('.ai-nota:not([hidden])');
ok((await page.locator('.ai-nota-proposta').innerText()) === 'la casa era buia', 'la nota mostra la proposta');
ok((await editor.innerText()) === prima, 'niente cambia prima di «Accetta»');
await page.click('[data-accetta]');
await page.waitForTimeout(200);
const dopo = await editor.innerText();
ok(dopo.includes('Quella sera la casa era buia.') && !dopo.includes('la la la'), 'Accetta sostituisce solo il brano');
await page.keyboard.press('Control+z'); await page.waitForTimeout(100);
ok((await editor.innerText()).includes('la la la la casa'), 'si può annullare con Ctrl+Z');
await page.keyboard.press('Control+y'); await page.waitForTimeout(100);

// 5. Gemini
await page.click('[data-apri-chiavi]');
await page.selectOption('#ai-fornitore', 'gemini');
await page.fill('#chiave-gemini', 'AIza-prova');
await page.click('[data-salva-chiavi]');
await page.click('[data-suggerisci="taglia"]');
await page.waitForSelector('.ai-segno.ai-taglia', { timeout: 8000 });
const rg = richieste.find((x) => x.a === 'gemini');
ok(rg && rg.h['x-goog-api-key'] === 'AIza-prova' && rg.corpo.generationConfig.responseMimeType === 'application/json', 'suggerimenti con Gemini');
await page.click('[data-ai-cancella]');
ok(await page.locator('.ai-segno').count() === 0, '«Togli» cancella i segni senza toccare il testo');

// 6. voce OpenAI con la chiave
await page.click('[data-voce="impostazioni"]');
await page.check('input[name="voce-motore"][value="openai"]');
await page.check('input[name="voce-modo"][value="manuale"]');
await page.click('#voce [data-chiudi]');
await page.click('[data-voce="leggi"]');
await page.waitForFunction(() => !document.querySelector('.voce-parola').hidden, null, { timeout: 8000 }).catch(() => {});
const ro = richieste.find((x) => x.a === 'openai');
ok(ro && ro.h.authorization === 'Bearer sk-prova-openai-5678' && ro.corpo.model === 'tts-1-hd' && ro.corpo.voice === 'nova', 'voce OpenAI: chiave, modello e voce');
ok(await page.locator('.voce-parola').isVisible(), 'voce OpenAI: la parola letta si accende');
await page.click('[data-voce="ferma"]');

// 7. chiave solo per questa scheda, poi cancellata
await page.click('[data-apri-chiavi]');
await page.uncheck('#chiavi-ricorda');
await page.click('[data-salva-chiavi]');
ok(await page.evaluate(() => !localStorage.getItem('effinge-chiavi-ai') && !!sessionStorage.getItem('effinge-chiavi-ai')), '«non ricordare»: chiavi solo nella scheda');
await page.click('[data-apri-chiavi]');
await page.click('[data-cancella-chiavi]');
ok(await page.evaluate(() => !localStorage.getItem('effinge-chiavi-ai') && !sessionStorage.getItem('effinge-chiavi-ai')), '«Cancella tutte» toglie le chiavi');

// 8. sicurezza: i fornitori sono aperti solo in Scrivi
const csp = (p) => fs.readFileSync(path.join(root, p), 'utf8').match(/connect-src[^;]*/)[0];
ok(csp('scrivi/index.html').includes('api.anthropic.com') && !csp('index.html').includes('api.anthropic.com'), 'regola di sicurezza: fornitori AI solo in Scrivi');
ok(errori.length === 0, 'nessun errore nella pagina' + (errori.length ? ': ' + errori.join(' | ') : ''));

await page.screenshot({ path: (process.env.OUT || '/tmp') + '/voce.png' });
await browser.close(); srv.close();
if (fallimenti) { console.log(fallimenti + ' controlli falliti'); process.exit(1); }
