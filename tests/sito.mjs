// Verifica visiva del sito: fotogrammi della scrittura e delle sezioni della home,
// su desktop e smartphone, più controlli senza JavaScript e con movimento ridotto.
//   node tests/sito.mjs        (OUT=cartella per cambiare destinazione)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(new URL('..', import.meta.url).pathname);
const out = process.env.OUT || join(root, 'tests', 'screens');
mkdirSync(out, { recursive: true });
// Serve il sito generato (_site/) su un server locale: esegui prima `npm run build`.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
const site = join(root, '_site');
const impostazioni = JSON.parse(await readFile(join(root, 'src/_data/impostazioni.json'), 'utf8'));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(join(site, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;
const home = base + '/';
const arch = base + '/archivio/';
const problems = [];
const b = await chromium.launch();

async function noSideScroll(page, tag) {
  const x = await page.evaluate(() => { scrollTo(9999, scrollY); const x = scrollX; scrollTo(0, scrollY); return x; });
  if (x) problems.push(`${tag}: scroll orizzontale ${x}px`);
}

for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'tel']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`${tag}: ${e.message}`));
  await page.goto(home);
  // SEO: titolo, descrizione, immagine di anteprima e dati strutturati leggibili
  const seo = await page.evaluate(() => { let jsonOk = true; document.querySelectorAll('script[type="application/ld+json"]').forEach(x => { try { JSON.parse(x.textContent); } catch (e) { jsonOk = false; } }); return { t: document.title, d: (document.querySelector('meta[name=description]') || {}).content || '', og: (document.querySelector('meta[property="og:image"]') || {}).content || '', jsonOk, h2: !!document.querySelector('.apertura h2') }; });
  if (seo.t !== impostazioni.sito.titolo_home || seo.d.length < 80 || !/effinge-anteprima\.png$/.test(seo.og) || !seo.jsonOk || !seo.h2) problems.push(`${tag}: SEO homepage ` + JSON.stringify(seo));
  const sf0 = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-sfondo'), bg: getComputedStyle(document.body, '::before').backgroundImage }));
  // cursore del buio: parte scuro, arriva al nero assoluto
  const velo0 = await page.evaluate(() => getComputedStyle(document.body, '::after').opacity);
  if (velo0 !== '0.55') problems.push(`${tag}: buio di partenza ${velo0} invece di 0.55`);
  if (tag === 'desk') {
    await page.click('[data-apri-sfondi]');
    await page.screenshot({ path: join(out, 'sfondi-pannello.png') });
    await page.$eval('[data-buio]', el => { el.value = 100; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    const velo1 = await page.evaluate(() => getComputedStyle(document.body, '::after').opacity);
    if (velo1 !== '1') problems.push(`desk: cursore al massimo, velo ${velo1} invece di 1`);
    await page.reload(); await page.waitForTimeout(300);
    const velo2 = await page.evaluate(() => getComputedStyle(document.body, '::after').opacity);
    if (velo2 !== '1') problems.push(`desk: buio non ricordato dopo il ricaricamento (${velo2})`);
    await page.evaluate(() => localStorage.removeItem('effinge-buio')); await page.reload(); await page.waitForTimeout(2600);
  }
  if (sf0.attr !== 'grafite' || !/gradient/.test(sf0.bg)) problems.push(`${tag}: sfondo predefinito non applicato ` + JSON.stringify(sf0));
  const apertura = await page.evaluate(() => {
    const apertura = document.querySelector('main > .apertura');
    const foglio = apertura.querySelector('.foglio');
    return foglio.contains(document.querySelector('#progetto')) &&
      apertura.querySelectorAll('.foglio').length === 1 &&
      apertura.nextElementSibling.id === 'scrivi' && apertura.offsetHeight <= innerHeight + 2;
  });
  if (!apertura) problems.push(`${tag}: attesi un foglio con la presentazione e Scrivi dopo una schermata`);
  await page.locator('[data-riaccendi]').focus();
  await page.keyboard.press('Enter');
  await page.locator('.apertura h1.scrivendo').waitFor();
  await page.locator('.apertura #progetto p.scrivendo').first().waitFor();
  await page.screenshot({ path: join(out, `${tag}-01-scrittura.png`) });
  // Anche un secondo avvio a metà della presentazione riparte dal titolo.
  await page.keyboard.press('Enter');
  await page.locator('.apertura h1.scrivendo').waitFor();
  await page.waitForFunction(() => !document.querySelector('.apertura :is(.scrivendo,.scrittura-attesa)'));
  await page.screenshot({ path: join(out, `${tag}-02-scritta.png`) });
  await page.evaluate(() => document.querySelector('#scrivi').scrollIntoView()); await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${tag}-05-scrivi-mentre.png`) });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: join(out, `${tag}-05-scrivi.png`) });
  // «Ultimo testo» e «Dall'archivio» esistono solo quando ci sono testi pubblicati
  const ciSonoTesti = await page.evaluate(() => !!document.querySelector('#ultimo'));
  const segnaposto = await page.evaluate(() => /Qui comparirà|segnaposto|canali da scegliere/i.test(document.body.innerText));
  if (segnaposto) problems.push(`${tag}: testo segnaposto visibile sul sito pubblico`);
  if (ciSonoTesti) {
    await page.evaluate(() => document.querySelector('#ultimo').scrollIntoView()); await page.waitForTimeout(1400);
    await page.screenshot({ path: join(out, `${tag}-05-ultimo.png`) });
  }
  if (await page.evaluate(() => !!document.querySelector('#archivio'))) {
    await page.evaluate(() => document.querySelector('#archivio').scrollIntoView()); await page.waitForTimeout(1400);
    await page.screenshot({ path: join(out, `${tag}-06-archivio.png`) });
  }
  await noSideScroll(page, tag + ' home');
  const primo = await page.evaluate(() => { const a = document.querySelector('a[href^="/testi/"]'); return a && a.getAttribute('href'); });
  if (!primo) { await ctx.close(); continue; }
  await page.goto(base + primo); await page.waitForTimeout(500);
  await page.evaluate(() => scrollTo(0, innerHeight * .9)); await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, `${tag}-07-lettura.png`) });
  await noSideScroll(page, tag + ' lettura');
  await ctx.close();
}
for (const [label, opts] of [['nojs', { javaScriptEnabled: false }], ['ridotto', { reducedMotion: 'reduce' }]]) {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, ...opts });
  const page = await ctx.newPage();
  await page.goto(home); await page.waitForTimeout(400);
  const t = await page.evaluate(() => { const h = document.querySelector('h1'); return getComputedStyle(h).opacity + '|' + (h.getAttribute('aria-label') || h.textContent).trim(); });
  if (!t.startsWith('1|Effinge')) problems.push(`${label}: titolo non leggibile (${t})`);
  const righe = await page.locator('.apertura #progetto p').evaluateAll(ps =>
    ps.filter(p => getComputedStyle(p).opacity === '1').map(p => p.textContent.trim()));
  if (JSON.stringify(righe) !== JSON.stringify(impostazioni.progetto.righe)) problems.push(`${label}: presentazione non leggibile`);
  await page.screenshot({ path: join(out, `${label}.png`), fullPage: true });
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`archivio: ${e.message}`));
  await page.goto(arch); await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'archivio.png') });
  const filtri = await page.$$eval('[data-filtro]', b => b.map(x => x.getAttribute('data-filtro')).filter(Boolean));
  if (filtri.length) {
    await page.click(`[data-filtro="${filtri[0]}"]`); await page.waitForTimeout(300);
    const errati = await page.$$eval('[data-elenco] li:not([hidden])', (l, f) => l.filter(x => x.dataset.categoria !== f).length, filtri[0]);
    if (errati) problems.push(`archivio: il filtro mostra ${errati} testi di altre categorie`);
    await page.screenshot({ path: join(out, 'archivio-filtro.png') });
  }
  await ctx.close();
}
await b.close();
server.close();
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'Nessun problema rilevato.');
