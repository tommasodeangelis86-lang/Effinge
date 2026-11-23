import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../_site', import.meta.url).pathname, OUT = process.env.OUT;
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
const b = await chromium.launch();
for (const [n, vp] of [['desk', { width: 1440, height: 900 }], ['tel', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  for (const [k,u] of [['art','/art/'],['opera','/art/opere/naples-1882/']]) {
    await p.goto('http://localhost:8766'+u); await p.waitForTimeout(3500);
    await p.screenshot({ path: `${OUT}/${k}-${n}.png` });
    if (k==='opera') { await p.click('.art-tocca'); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${k}-${n}-luce.png` }); console.log(n,'pressed', await p.getAttribute('.art-interruttore','aria-pressed')); await p.click('.art-tocca'); }
    if (k==='art') { await p.evaluate(()=>scrollTo(0,innerHeight*1.2)); await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/${k}-${n}-2.png` }); }
  }
  console.log(n,'errori',errs);
  const sw = await p.evaluate(()=>document.documentElement.scrollWidth); console.log('larghezza', sw);
}
await b.close(); srv.close();
