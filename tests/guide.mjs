import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../_site', import.meta.url).pathname, OUT = process.env.OUT;
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.woff2':'font/woff2', '.png':'image/png', '.json':'application/json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8765);
const b = await chromium.launch(); const errs = [];
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
for (const [nome, vp] of [['desk', { width: 1280, height: 900 }], ['tel', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8765/guide/cartelle-editoriali/');
  await p.fill('#calcola-testo', 'a'.repeat(1799) + ' ' + '\n' + 'ciao mondo');
  const r = await p.$$eval('[data-r]', els => Object.fromEntries(els.map(e => [e.dataset.r, e.textContent])));
  if (nome === 'desk') { console.log(JSON.stringify(r)); ok(r.battute === '1810' && r.parole === '3' && r.c1800 === '1' && r.senza === '1808', 'calcolatore'); }
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= vp.width, nome + ' niente scorrimento orizzontale (' + sw + ')');
  await p.click('.faq summary'); ok(await p.$eval('.faq details', d => d.open), nome + ' faq si apre');
  await p.screenshot({ path: OUT + '/guida-' + nome + '.png', fullPage: true });
  await p.goto('http://localhost:8765/guide/impaginare-manoscritto/'); await p.screenshot({ path: OUT + '/guida2-' + nome + '.png', fullPage: true });
  await p.goto('http://localhost:8765/guide/'); await p.screenshot({ path: OUT + '/guide-' + nome + '.png' });
  await p.close();
}
const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8765/scrivi/'); await p.waitForTimeout(800);
const btn = p.locator('[data-comando="cartella"]'); ok((await btn.textContent()) === 'Cartella 2000', 'scrivi parte da 2000');
await p.click('.scrivi-editor'); await p.keyboard.type('x'.repeat(36)); await p.waitForTimeout(400);
const s1 = await p.textContent('.scrivi-stato'); await btn.click(); await p.waitForTimeout(200); const s2 = await p.textContent('.scrivi-stato');
console.log(s1, '|', s2); ok((await btn.textContent()) === 'Cartella 1800' && s1 !== s2, 'scrivi passa a 1800');
await p.reload(); await p.waitForTimeout(600); ok((await btn.textContent()) === 'Cartella 1800', 'preferenza ricordata');
ok(errs.length === 0, 'nessun errore ' + errs.join(' / '));
await b.close(); srv.close();
