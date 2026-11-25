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
    if (url.pathname === '/auth/v1/token') return json(accesso);
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
  await pagina.locator('[data-salva-archivio]').click();
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
  await editor.fill('Testo scritto come ospite.');
  await pagina.waitForFunction(() => document.querySelector('[data-stato]').textContent.includes('bozza in questa scheda'));
  const download = pagina.waitForEvent('download');
  await pagina.locator('[data-comando="esporta"]').click();
  assert.match((await download).suggestedFilename(), /\.docx$/);
  assert.equal(chiamate, 0, 'Scrivere ed esportare da ospite non usa Supabase');
  assert.equal(await pagina.evaluate(() => scrollX === 0 && document.querySelector('[data-salva-archivio]').getBoundingClientRect().right <= innerWidth), true);

  await entra(pagina);
  await pagina.waitForFunction(() => document.querySelector('[data-esito-archivio]').textContent.includes('Salvato'));
  assert.match(archivio.dati.sezioni[0].html, /Testo scritto come ospite\./);
  assert.equal(archivio.dati.opere.length, 1, 'L’accesso non importa altre opere locali');
  await pagina.locator('#archivio-privato [data-chiudi]').click();
  await editor.fill('Testo aggiornato nell’archivio.');
  await pagina.waitForFunction(() => document.querySelector('[data-stato]').textContent.includes('salvato nell’archivio'));
  assert.ok(scritture > 1);
  assert.match(archivio.dati.sezioni[0].html, /Testo aggiornato/);

  const altroCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const altraPagina = await prepara(altroCtx);
  await entra(altraPagina);
  assert.equal(await altraPagina.locator('.scrivi-editor[contenteditable]').innerText(), 'Testo aggiornato nell’archivio.');
  await altraPagina.locator('[data-esci-archivio]').click();
  await altraPagina.getByRole('button', { name: 'Accedi per salvare' }).waitFor();
  assert.equal((await altraPagina.locator('.scrivi-editor[contenteditable]').innerText()).trim(), '');

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
  console.log('Ospite, esportazione, accesso, salvataggio, secondo browser, uscita, recupero locale e conflitto verificati.');
} finally {
  await browser.close();
  server.close();
}
