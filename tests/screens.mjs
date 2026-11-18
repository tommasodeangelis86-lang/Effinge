// Verifica visiva: cattura ogni pagina a più larghezze, a metà animazione,
// senza JavaScript e con prefers-reduced-motion. Uso:
//   node tests/screens.mjs [pagina.html ...]   (default: tutte le pagine in direzioni/)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = process.env.OUT || join(root, 'tests', 'screens');
mkdirSync(out, { recursive: true });
const widths = [390, 768, 1024, 1440];

let pages = process.argv.slice(2).map(p => resolve(p));
if (!pages.length) {
  const dir = join(root, 'direzioni');
  for (const d of readdirSync(dir)) for (const f of ['index.html', 'lettura.html']) {
    const p = join(dir, d, f); if (existsSync(p)) pages.push(p);
  }
}

const browser = await chromium.launch();
const problems = [];
for (const file of pages) {
  const name = relative(root, file).replace(/[\/]/g, '_').replace(/\.html$/, '');
  const url = pathToFileURL(file).href;
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push(`${name}@${w}: ${e.message}`));
    await page.goto(url);
    if (w === 1440 && file.endsWith('index.html')) {
      await page.waitForTimeout(560);
      await page.screenshot({ path: join(out, `${name}-${w}-meta.png`) });
    }
    await page.waitForTimeout(2600);
    const overflow = await page.evaluate(() => { window.scrollTo(9999, window.scrollY); const x = window.scrollX; window.scrollTo(0, window.scrollY); return x; });
    if (overflow > 0) problems.push(`${name}@${w}: scroll orizzontale di ${overflow}px`);
    await page.screenshot({ path: join(out, `${name}-${w}.png`), fullPage: true });
    await ctx.close();
  }
  if (file.endsWith('index.html')) {
    for (const [label, opts] of [['nojs', { javaScriptEnabled: false }], ['ridotto', { reducedMotion: 'reduce' }]]) {
      const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, ...opts });
      const page = await ctx.newPage();
      await page.goto(url);
      await page.waitForTimeout(300);
      const op = await page.evaluate(() => { const h = document.querySelector('h1'); return h ? getComputedStyle(h).opacity + '|' + h.textContent.trim() : 'nessun h1'; });
      if (!op.startsWith('1|')) problems.push(`${name} ${label}: titolo non leggibile (${op})`);
      await page.screenshot({ path: join(out, `${name}-${label}.png`) });
      await ctx.close();
    }
  }
}
await browser.close();
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'Nessun problema rilevato.');
