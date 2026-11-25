// Da eseguire con una build configurata con il progetto fittizio in docs/archivio-privato.md.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const sito = new URL('../_site/', import.meta.url).pathname;
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  const file = join(sito, p.endsWith('/') ? p + 'index.html' : p);
  try {
    const dati = await readFile(file);
    res.writeHead(200, { 'Content-Type': tipi[extname(file)] || 'application/octet-stream' });
    res.end(dati);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const indirizzo = `http://localhost:${server.address().port}`;
const origine = 'https://abcdefghijklmnopqrst.supabase.co';
const autore = { id: '10000000-0000-4000-8000-000000000001', email: 'autore@example.com', aud: 'authenticated', role: 'authenticated' };
const scadenza = Math.floor(Date.now() / 1000) + 3600;
const codifica = d => Buffer.from(JSON.stringify(d)).toString('base64url');
const jwt = [codifica({ alg: 'HS256', typ: 'JWT' }), codifica({ sub: autore.id, aud: 'authenticated', exp: scadenza }), 'firma-fittizia'].join('.');
const accesso = { access_token: jwt, refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: scadenza, user: autore };
let archivio = null;
let scritture = 0;
let chiamate = 0;
let simulaConflitto = false;

async function prepara(ctx) {
  const pagina = await ctx.newPage();
  await pagina.route(origine + '/**', async route => {
    chiamate++;
    const req = route.request();
    const url = new URL(req.url());
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
    const json = (dati, status = 200) => route.fulfill({ status, json: dati, headers });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') assert.equal(req.postDataJSON().email, autore.email);
      return json(accesso);
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
    assert.equal(req.headers().authorization, 'Bearer ' + jwt);
    if (url.pathname === '/rest/v1/effinge_autori') return json([{ utente: autore.id }]);
    if (url.pathname !== '/rest/v1/effinge_archivi') throw new Error('Endpoint inatteso ' + url.pathname);
    if (req.method() === 'GET') return json(archivio ? [archivio] : []);
    if (simulaConflitto) return json([]);
    if (req.method() === 'PATCH') assert.equal(url.searchParams.get('versione'), 'eq.' + archivio.versione);
    archivio = req.postDataJSON();
    scritture++;
    return json([{ versione: archivio.versione }]);
  });
  await pagina.goto(indirizzo + '/scrivi/');
  await pagina.evaluate(() => window.EffingeScrivi.pronto);
  return pagina;
}

async function entra(pagina) {
  await pagina.getByRole('button', { name: 'Accedi', exact: true }).click();
  await pagina.getByRole('textbox', { name: 'Email' }).fill(autore.email);
  await pagina.getByLabel('Password', { exact: true }).fill('password di prova');
  await pagina.getByRole('button', { name: 'Accedi per salvare' }).click();
  await pagina.getByRole('button', { name: 'Salva ora' }).waitFor();
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const pagina = await prepara(ctx);
  const editor = pagina.locator('.scrivi-editor[contenteditable]');
  const titolo = pagina.locator('#titolo-sezione');
  await pagina.goto(indirizzo + '/');
  await pagina.getByRole('navigation', { name: 'Principale' }).getByRole('link', { name: 'Accedi' }).click();
  await pagina.getByRole('dialog', { name: 'Accedi all’archivio' }).waitFor();
  assert.equal(new URL(pagina.url()).search, '', 'Il login dal menu di altre pagine apre la finestra una volta');
  await pagina.locator('#archivio-privato [data-chiudi]').click();
  await pagina.evaluate(() => new Promise((ok, ko) => {
    const richiesta = indexedDB.open('effinge-scrivi', 1);
    richiesta.onerror = ko;
    richiesta.onsuccess = () => {
      const db = richiesta.result;
      const tx = db.transaction(['opere', 'sezioni'], 'readwrite');
      tx.objectStore('opere').put({ id: 'olocale', titolo: 'Bozza locale', ordine: ['slocale'] });
      tx.objectStore('sezioni').put({ id: 'slocale', operaId: 'olocale', tipo: 'capitolo', titolo: '', html: '<p>Una vecchia bozza.</p>' });
      tx.oncomplete = () => { db.close(); ok(); };
      tx.onerror = ko;
    };
  }));
  await pagina.reload();
  await pagina.evaluate(() => window.EffingeScrivi.pronto);
  const menu = pagina.getByRole('navigation', { name: 'Principale' });
  const accedi = menu.getByRole('button', { name: 'Accedi', exact: true });
  assert.equal(await accedi.isVisible(), true);
  assert.deepEqual(await accedi.evaluate(el => [el.previousElementSibling.textContent, el.nextElementSibling.textContent]), ['Checklist manoscritto', 'Art']);
  for (const width of [320, 568, 390]) {
    await pagina.setViewportSize({ width, height: 844 });
    assert.equal(await pagina.evaluate(async () => {
      await document.fonts.ready;
      const header = document.querySelector('.barra').getBoundingClientRect();
      const toolbar = document.querySelector('.scrivi-barra');
      const ultimo = document.querySelector('.barra-principale .tondino').getBoundingClientRect();
      return ultimo.right <= innerWidth && header.bottom <= toolbar.getBoundingClientRect().top && toolbar.scrollWidth <= toolbar.clientWidth;
    }), true, `Menu e comandi del foglio visibili a ${width}px`);
  }
  assert.equal(await pagina.getByRole('button', { name: 'Esci', exact: true }).isVisible(), false);
  assert.equal(await pagina.locator('#archivio-privato').isVisible(), false);
  assert.equal(await titolo.inputValue(), '');
  assert.equal(await titolo.evaluate(el => el.tagName === 'TEXTAREA' && el.form === null), true);
  assert.equal(await pagina.locator('input[type=password]').evaluateAll(campi => campi.every(campo => campo.form)), true, 'Le credenziali hanno ciascuna il proprio modulo');
  await titolo.fill('Il foglio\nnella notte');
  assert.equal(await titolo.inputValue(), 'Il foglio nella notte');
  await editor.fill('Testo scritto come ospite.');
  await pagina.waitForFunction(() => document.querySelector('[data-stato]').textContent.includes('bozza in questa scheda'));
  const download = pagina.waitForEvent('download');
  await pagina.locator('[data-comando="esporta"]').click();
  assert.match((await download).suggestedFilename(), /\.docx$/);
  await pagina.getByRole('button', { name: 'Salva', exact: true }).click();
  await pagina.getByRole('dialog', { name: 'Accedi all’archivio' }).waitFor();
  await pagina.locator('#archivio-privato [data-chiudi]').click();
  assert.equal(chiamate, 0, 'Scrivere ed esportare da ospite non usa Supabase');
  assert.equal(await pagina.evaluate(() => scrollX === 0 && document.querySelector('.barra-principale .tondino').getBoundingClientRect().right <= innerWidth), true);

  await entra(pagina);
  await pagina.waitForFunction(() => document.querySelector('[data-esito-archivio]').textContent.includes('Salvato'));
  assert.match(archivio.dati.sezioni[0].html, /Testo scritto come ospite\./);
  assert.equal(archivio.dati.sezioni[0].titolo, 'Il foglio nella notte');
  assert.equal(archivio.dati.opere.length, 1, 'L’accesso non importa altre opere locali');
  await pagina.locator('#archivio-privato [data-chiudi]').click();
  assert.equal(await pagina.getByRole('button', { name: 'Salva', exact: true }).isVisible(), true);
  assert.equal(await menu.getByRole('button', { name: 'Esci', exact: true }).isVisible(), true);
  assert.equal(await pagina.evaluate(() => document.querySelector('.barra-principale .tondino').getBoundingClientRect().right <= innerWidth), true);
  await editor.fill('Testo aggiornato nell’archivio.');
  await pagina.waitForFunction(() => document.querySelector('[data-stato]').textContent.includes('salvato nell’archivio'));
  assert.ok(scritture > 1);
  assert.match(archivio.dati.sezioni[0].html, /Testo aggiornato/);

  const altroCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const altraPagina = await prepara(altroCtx);
  await entra(altraPagina);
  assert.equal(await altraPagina.locator('.scrivi-editor[contenteditable]').innerText(), 'Testo aggiornato nell’archivio.');
  await altraPagina.reload();
  await altraPagina.evaluate(() => window.EffingeScrivi.pronto);
  await altraPagina.getByRole('button', { name: 'Esci', exact: true }).click();
  await altraPagina.getByRole('button', { name: 'Accedi per salvare' }).waitFor();
  assert.equal((await altraPagina.locator('.scrivi-editor[contenteditable]').innerText()).trim(), '');
  await altraPagina.reload();
  await altraPagina.evaluate(() => window.EffingeScrivi.pronto);
  assert.equal(await altraPagina.getByRole('button', { name: 'Accedi', exact: true }).isVisible(), true);

  await pagina.locator('[data-comando="opere"]').click();
  await pagina.locator('[data-apri-bozze-locali]').click();
  await pagina.getByRole('button', { name: 'Bozza locale' }).click();
  assert.equal(await editor.innerText(), 'Una vecchia bozza.');
  await pagina.waitForFunction(() => document.querySelector('[data-stato]').textContent.includes('salvato nell’archivio'));
  assert.equal(archivio.dati.opere.length, 2);

  simulaConflitto = true;
  await editor.fill('Versione ancora nella scheda.');
  await pagina.waitForFunction(() => document.querySelector('[data-stato]').textContent.includes('da riprovare'));
  assert.equal(await editor.innerText(), 'Versione ancora nella scheda.');
  assert.match(archivio.dati.sezioni[0].html, /Testo aggiornato/);
  await pagina.getByRole('button', { name: 'Esci', exact: true }).click();
  await pagina.waitForFunction(() => document.querySelector('[data-esito-archivio]').textContent.includes('un’altra scheda'));
  await pagina.locator('#archivio-privato [data-chiudi]').click();
  assert.equal(await editor.innerText(), 'Versione ancora nella scheda.');
  assert.equal(await pagina.getByRole('button', { name: 'Esci', exact: true }).isVisible(), true);
  console.log('Ospite, esportazione, accesso, salvataggio, secondo browser, uscita, recupero locale e conflitto verificati.');
} finally {
  await browser.close();
  server.close();
}
