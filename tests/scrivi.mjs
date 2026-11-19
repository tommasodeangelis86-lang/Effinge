// Verifica della pagina «Scrivi»: editor, luce sulle lettere, lampada, formattazione,
// capitoli, manoscritto, importazione ed esportazione Word.
//   npm run build && node tests/scrivi.mjs
//   DOCX=/percorso/romanzo.docx node tests/scrivi.mjs   (prova anche l'importazione di un file vero)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
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
const ok = (cond, msg) => { if (!cond) problems.push(msg); };
const b = await chromium.launch();

async function pronto(page) { await page.goto(url); await page.evaluate(() => window.EffingeScrivi.pronto); await page.waitForTimeout(300); }
async function contaTipi(page) { return page.evaluate(() => { const n = { copertina: 0, parte: 0, capitolo: 0 }; window.EffingeScrivi.sezioni().forEach(s => n[s.tipo]++); return n; }); }

// ——— Desktop ———
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('desk: ' + e.message));
  await pronto(page);
  await page.click('.scrivi-editor');
  await page.keyboard.type('La lampada segue la penna. Ogni lettera si accende.', { delay: 30 });
  const luci = await page.evaluate(() => document.querySelectorAll('.luce-lettera').length);
  ok(luci > 0, 'nessuna luce sulle lettere mentre si scrive');
  await page.screenshot({ path: join(out, 'scrivi-desk-mentre.png') });
  // la luce è sopra la lettera vera
  await page.keyboard.type('X', { delay: 10 });
  const pos = await page.evaluate(() => {
    const l = [...document.querySelectorAll('.luce-lettera')].pop();
    const ed = document.querySelector('.scrivi-editor'), t = ed.lastElementChild.firstChild;
    const r = document.createRange(); r.setStart(t, t.length - 1); r.setEnd(t, t.length);
    const a = r.getBoundingClientRect(), c = l.getBoundingClientRect();
    return { dx: Math.abs(a.left - c.left), dy: Math.abs(a.top - c.top), testo: l.textContent };
  });
  ok(pos.testo === 'X' && pos.dx < 1.5 && pos.dy < 1.5, 'la luce non è sopra la lettera: ' + JSON.stringify(pos));
  await page.keyboard.press('Backspace');
  // la lampada segue il mouse
  await page.mouse.move(700, 500); await page.mouse.move(900, 700, { steps: 8 }); await page.waitForTimeout(900);
  const lamp = await page.evaluate(() => { const r = document.querySelector('.scrivi-foglio .lampada.calore').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
  ok(Math.abs(lamp.x - 900) < 30 && Math.abs(lamp.y - 700) < 30, 'la lampada non segue il mouse: ' + JSON.stringify(lamp));
  // formattazione: seleziona una parola e grassetto
  await page.evaluate(() => { const t = document.querySelector('.scrivi-editor p').firstChild; const r = document.createRange(); r.setStart(t, 3); r.setEnd(t, 10); getSelection().removeAllRanges(); getSelection().addRange(r); });
  await page.click('[data-cmd="bold"]');
  await page.click('[data-cmd="justifyCenter"]');
  const fmt = await page.evaluate(() => document.querySelector('.scrivi-editor').innerHTML);
  ok(/<(b|strong)>/.test(fmt), 'il grassetto non è stato applicato');
  ok(/text-align: ?center/.test(fmt), 'la centratura non è stata applicata');
  await page.waitForTimeout(700);
  const salvato = await page.evaluate(() => window.EffingeScrivi.sezioni()[0].html);
  ok(/<strong>/.test(salvato) && /class="centro"/.test(salvato), 'formattazione non salvata: ' + salvato.slice(0, 120));
  // capitoli
  await page.click('[data-nuova="capitolo"]'); await page.keyboard.type('Secondo capitolo.', { delay: 5 });
  await page.click('[data-nuova="parte"]'); await page.keyboard.type('Parte II');
  const voci = await page.$$eval('[data-capitoli] li', l => l.length);
  ok(voci === 3, `capitoli a sinistra: ${voci} invece di 3`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, 'scrivi-desk-capitoli.png') });
  // persistenza
  await page.reload(); await page.evaluate(() => window.EffingeScrivi.pronto); await page.waitForTimeout(300);
  const dopo = await contaTipi(page);
  ok(dopo.capitolo === 2 && dopo.parte === 1, 'dopo il ricaricamento: ' + JSON.stringify(dopo));
  // manoscritto
  await page.click('[data-comando="manoscritto"]'); await page.waitForTimeout(600);
  const m = await page.evaluate(() => { const f = document.querySelector('.scrivi-foglio'), c = f.querySelector('.contenuto'), e = document.querySelector('.scrivi-editor'), cm = 96 / 2.54, cs = getComputedStyle(e); const p = e.querySelector('p'); return { larghezza: (f.offsetWidth / cm).toFixed(2), margine: (parseFloat(getComputedStyle(c).paddingLeft) / cm).toFixed(2), interlinea: (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2), rientro: p ? (parseFloat(getComputedStyle(p).textIndent) / cm).toFixed(2) : null }; });
  ok(m.larghezza === '21.01' || m.larghezza === '21.00', 'manoscritto larghezza ' + m.larghezza);
  ok(m.margine === '2.30' && m.interlinea === '1.50', 'manoscritto ' + JSON.stringify(m));
  await page.click('[data-comando="manoscritto"]');

  // ——— Word ———
  const docx = process.env.DOCX;
  if (docx && existsSync(docx)) {
    await page.setInputFiles('[data-file-word]', docx);
    await page.waitForSelector('#importa[open]', { timeout: 60000 });
    const riepilogo = await page.textContent('[data-riepilogo-import]');
    console.log('riepilogo:', riepilogo.replace(/\s+/g, ' ').slice(0, 220));
    await page.click('[data-conferma-import]');
    await page.waitForTimeout(1500);
    const n = await contaTipi(page);
    console.log('importato:', JSON.stringify(n));
    ok(n.capitolo === 36 && n.parte === 2 && n.copertina === 1, 'importazione: ' + JSON.stringify(n));
    await page.screenshot({ path: join(out, 'scrivi-desk-importato.png') });
    await page.evaluate(() => document.querySelectorAll('[data-capitoli] li')[3].querySelector('button').click()); await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, 'scrivi-desk-capitolo.png') });
    // esporta e reimporta
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('[data-comando="esporta"]')]);
    const salvatoIn = join(out, 'esportato.docx'); await dl.saveAs(salvatoIn);
    await page.setInputFiles('[data-file-word]', salvatoIn);
    await page.waitForSelector('#importa[open]', { timeout: 60000 });
    await page.click('[data-conferma-import]'); await page.waitForTimeout(1500);
    const n2 = await contaTipi(page);
    console.log('reimportato:', JSON.stringify(n2));
    ok(n2.capitolo === 36 && n2.parte === 2 && n2.copertina === 1, 'reimportazione: ' + JSON.stringify(n2));
    const parole = await page.evaluate(() => window.EffingeScrivi.sezioni().reduce((a, s) => a + s.parole, 0));
    console.log('parole totali dopo andata e ritorno:', parole);
  } else console.log('(nessun DOCX: importazione reale non provata)');
  await ctx.close();
}
// ——— Telefono ———
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('tel: ' + e.message));
  await pronto(page);
  await page.tap('.scrivi-editor');
  await page.keyboard.type('Dal telefono.', { delay: 20 });
  await page.screenshot({ path: join(out, 'scrivi-tel.png') });
  await page.tap('[data-apri-capitoli]'); await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'scrivi-tel-capitoli.png') });
  const x = await page.evaluate(() => { scrollTo(9999, scrollY); return scrollX; });
  ok(!x, 'telefono: scroll orizzontale ' + x);
  await ctx.close();
}
await b.close(); server.close();
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'Nessun problema rilevato.');
