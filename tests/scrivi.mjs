// Verifica della pagina «Scrivi»: scrittura, allineamento testo/specchio, salvataggio, fogli.
//   npm run build && node tests/scrivi.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(new URL('..', import.meta.url).pathname);
const out = process.env.OUT || join(root, 'tests', 'screens');
mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(root, '_site', p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/scrivi/`;
const problems = [];
const b = await chromium.launch();
const testo = 'La lampada segue la penna.\nOgni lettera si accende e torna inchiostro, poi la riga successiva prende la luce mentre quella sopra si attenua piano, come nelle app di scrittura.\n\nUn nuovo paragrafo.';

for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'tel']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`${tag}: ${e.message}`));
  await page.goto(url); await page.waitForTimeout(600);
  await page.fill('#titolo-foglio', 'Prova');
  await page.click('#testo-foglio');
  await page.keyboard.type(testo, { delay: 25 });
  await page.waitForTimeout(80);
  await page.screenshot({ path: join(out, `scrivi-${tag}-mentre.png`) });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, `scrivi-${tag}-fermo.png`) });
  // allineamento: lo specchio deve avere la stessa altezza e lo stesso numero di righe del testo vero
  const al = await page.evaluate(() => {
    const ta = document.querySelector('#testo-foglio'), sp = document.querySelector('.scrivi-specchio');
    const lh = parseFloat(getComputedStyle(ta).lineHeight);
    return { righeTesto: Math.round(ta.scrollHeight / lh), righeSpecchio: Math.round(sp.scrollHeight / lh), testo: ta.value.length };
  });
  if (al.righeTesto !== al.righeSpecchio) problems.push(`${tag}: testo ${al.righeTesto} righe, specchio ${al.righeSpecchio}`);
  // sovrapposizione visiva: rendo visibile il testo vero in rosso sopra lo specchio
  await page.addStyleTag({ content: '.scrivi-testo{color:rgba(255,0,0,.55)!important;-webkit-text-fill-color:rgba(255,0,0,.55)!important}.lampada{display:none}' });
  await page.screenshot({ path: join(out, `scrivi-${tag}-allineamento.png`) });
  // salvataggio
  await page.reload(); await page.waitForTimeout(600);
  const salvato = await page.evaluate(() => [document.querySelector('#testo-foglio').value.length, document.querySelector('#titolo-foglio').value]);
  if (salvato[0] !== testo.length || salvato[1] !== 'Prova') problems.push(`${tag}: dopo il ricaricamento ${salvato}`);
  // fogli: nuovo foglio, poi elenco con due fogli
  await page.click('[data-comando="fogli"]'); await page.waitForTimeout(200);
  await page.click('[data-nuovo-foglio]'); await page.waitForTimeout(200);
  await page.click('[data-comando="fogli"]'); await page.waitForTimeout(300);
  const n = await page.$$eval('[data-elenco-fogli] li', l => l.length);
  if (n !== 2) problems.push(`${tag}: ${n} fogli invece di 2`);
  await page.screenshot({ path: join(out, `scrivi-${tag}-fogli.png`) });
  const x = await page.evaluate(() => { scrollTo(9999, scrollY); return scrollX; });
  if (x) problems.push(`${tag}: scroll orizzontale ${x}px`);
  await ctx.close();
}
await b.close(); server.close();
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'Nessun problema rilevato.');
// Manoscritto: misure e allineamento
{
  const b2 = await chromium.launch();
  const server2 = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const x = await readFile(join(root, '_site', p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(x); } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  const u = `http://localhost:${server2.address().port}/scrivi/`;
  const probs = [];
  for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'tel']]) {
    const ctx = await b2.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', e => probs.push(`${tag}: ${e.message}`));
    await page.goto(u); await page.waitForTimeout(500);
    await page.click('#testo-foglio');
    await page.keyboard.type(testo + '\n' + 'Una frase lunga per riempire la riga e vedere il rientro di ogni paragrafo. '.repeat(3), { delay: 2 });
    await page.click('[data-comando="manoscritto"]'); await page.waitForTimeout(1300);
    const m = await page.evaluate(() => {
      const f = document.querySelector('.scrivi-foglio'), c = f.querySelector('.contenuto'), ta = document.querySelector('#testo-foglio'), cs = getComputedStyle(c), ts = getComputedStyle(ta);
      const cm = 96 / 2.54, lh = parseFloat(ts.lineHeight);
      return { larghezza: (f.offsetWidth / cm).toFixed(2), margine: (parseFloat(cs.paddingLeft) / cm * 21 / (f.offsetWidth / cm)).toFixed(2), interlinea: (lh / parseFloat(ts.fontSize)).toFixed(2), rientro: (parseFloat(getComputedStyle(ta).tabSize) / cm * 21 / (f.offsetWidth / cm)).toFixed(2), tab: ta.value.split('\n').filter(Boolean).every(r => r.startsWith('\t')), salvatoSenzaTab: !JSON.parse(localStorage.getItem('effinge-fogli')).some(f => f.testo.includes('\t')), righeT: Math.round(ta.scrollHeight / lh), righeS: Math.round(document.querySelector('.scrivi-specchio').scrollHeight / lh), stato: document.querySelector('[data-stato]').textContent };
    });
    console.log(tag, JSON.stringify(m));
    if (m.righeT !== m.righeS) probs.push(`${tag} manoscritto: testo ${m.righeT} righe, specchio ${m.righeS}`);
    if (m.margine !== '2.30' || m.interlinea !== '1.50' || (tag === 'desk' && m.rientro !== '0.42') || !m.tab || !m.salvatoSenzaTab) probs.push(`${tag} manoscritto: misure ${JSON.stringify(m)}`);
    await page.keyboard.press('Enter'); await page.keyboard.type('Nuovo', { delay: 20 });
    const conTab = await page.evaluate(() => document.querySelector('#testo-foglio').value.endsWith('\n\tNuovo'));
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    const unito = await page.evaluate(() => { const v = document.querySelector('#testo-foglio').value; return !v.includes('\n\tNuovo') && v.endsWith('Nuovo'); });
    if (!conTab || !unito) probs.push(`${tag} manoscritto: rientro su nuovo paragrafo ${conTab}, unione con cancella ${unito}`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(out, `scrivi-${tag}-manoscritto.png`) });
    await page.addStyleTag({ content: '.scrivi-testo{color:rgba(255,0,0,.55)!important;-webkit-text-fill-color:rgba(255,0,0,.55)!important}.lampada{display:none}' });
    await page.screenshot({ path: join(out, `scrivi-${tag}-manoscritto-allineamento.png`) });
    await ctx.close();
  }
  await b2.close(); server2.close();
  console.log(probs.length ? 'PROBLEMI manoscritto:\n' + probs.join('\n') : 'Manoscritto: nessun problema.');
}
