// Effinge Art: apertura con mosaico, lampada, «Richiedi informazioni», luce piena. OUT=cartella per le schermate.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../_site', import.meta.url).pathname, OUT = process.env.OUT || '/tmp';
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const b = await chromium.launch(); const errs = [];
for (const [n, vp] of [['desk', { width: 1440, height: 900 }], ['tel', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/art/'); await p.waitForTimeout(3000);
  ok(await p.locator('.art-tessera').count() === 12, n + ' 12 quadri nel mosaico');
  const luci = await p.$$eval('.art-tessera', ts => ts.map(t => +t.style.getPropertyValue('--luce-t')));
  ok(luci.every(v => v > 0) && Math.max(...luci) - Math.min(...luci) > .2, n + ' la lampada accende alcune tessere più di altre');
  await p.screenshot({ path: `${OUT}/art-${n}.png` });
  if (n === 'desk') {
    const r = await p.locator('.art-tessera').nth(8).boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 6 }); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/art-desk-mouse.png` });
  }
  const mail = await p.getAttribute('.art-richiedi', 'href'); ok(/^mailto:effingeart@gmail\.com\?subject=/.test(mail), n + ' richiedi informazioni: ' + mail);
  await p.locator('.art-richiedi').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/art-${n}-disponibile.png` });
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= vp.width, n + ' niente scorrimento orizzontale');
  await p.goto('http://localhost:8766/art/opere/naples-1882/'); await p.waitForTimeout(800);
  await p.click('.art-tocca'); ok(await p.getAttribute('.art-interruttore', 'aria-pressed') === 'true', n + ' luce piena'); await p.click('.art-tocca');
  await p.close();
}
ok(errs.length === 0, 'nessun errore ' + errs.join(' / '));
await b.close(); srv.close();
