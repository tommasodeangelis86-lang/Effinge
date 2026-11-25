// Prova gli strumenti e l’apertura di una nuova opera con una build Eleventy.
// SITE permette di usare anche la build di prova con Supabase configurato.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const sito = resolve(process.env.SITE || new URL('../_site/', import.meta.url).pathname);
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = join(sito, url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname);
  try {
    const dati = await readFile(file);
    res.writeHead(200, { 'Content-Type': tipi[extname(file)] || 'application/octet-stream' }).end(dati);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}`;
const cartelle = '/strumenti/calcola-cartelle-editoriali/';
const ripetizioni = '/strumenti/analizzatore-ripetizioni-testo/';
const modello = '/strumenti/modello-manoscritto-word/';
const browser = await chromium.launch();

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 880 }, reducedMotion: 'reduce' });
  const pagina = await ctx.newPage();
  const errori = [];
  pagina.on('pageerror', e => errori.push(e.message));
  const richieste = [];
  pagina.on('request', richiesta => richieste.push(richiesta.url()));
  await pagina.goto(base + '/strumenti/');
  await pagina.getByRole('link', { name: 'Calcolo cartelle editoriali online' }).click();
  const campo = pagina.getByRole('textbox', { name: 'Incolla o scrivi il tuo testo' });
  const misura = (nome) => pagina.locator(`[data-misura="${nome}"]`).textContent();
  await campo.fill('x'.repeat(1799) + ' \n🕯a');
  assert.equal(await misura('battute'), '1802');
  assert.equal(await misura('senzaSpazi'), '1801');
  assert.equal(await misura('parole'), '2');
  assert.equal(await misura('cartelle1800'), '1');
  assert.equal(await misura('cartelle2000'), '0,9');
  assert.equal(await misura('lettura'), '1 s');
  assert.ok(richieste.every(url => url.startsWith(base)), 'Analisi e pagina indice usano soltanto risorse locali');

  // La bozza con cui si sta già lavorando resta nel proprio archivio.
  const foglio = await ctx.newPage();
  foglio.on('dialog', dialogo => dialogo.accept());
  await foglio.goto(base + '/scrivi/');
  await foglio.evaluate(() => window.EffingeScrivi.pronto);
  const cloud = await foglio.locator('[data-archivio-url]').count() > 0;
  if (!cloud) {
    await foglio.locator('.scrivi-editor[contenteditable]').fill('La mia prima bozza.');
    await foglio.waitForFunction(() => document.querySelector('[data-stato]').textContent.endsWith(' · salvato'));
  }
  await foglio.close();
  const testo = '<script>testo non eseguibile</script>\nUna seconda riga.';
  await campo.fill(testo);
  await pagina.getByRole('button', { name: 'Apri questo testo in Foglio Effinge' }).click();
  await pagina.waitForURL(base + '/scrivi/');
  await pagina.evaluate(() => window.EffingeScrivi.pronto);
  assert.deepEqual(await pagina.locator('.scrivi-editor[contenteditable] p').allTextContents(), testo.split('\n'));
  assert.equal(await pagina.locator('.scrivi-editor script').count(), 0);
  assert.equal(await pagina.locator('#nome-opera').inputValue(), 'Testo dagli strumenti');
  assert.equal(await pagina.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('effinge-strumenti-bozza:'))), false);
  if (!cloud) {
    await pagina.getByRole('button', { name: 'Opere', exact: true }).click();
    await pagina.getByRole('button', { name: /La mia opera/ }).click();
    await pagina.waitForFunction(() => document.querySelector('.scrivi-editor[contenteditable]').innerText === 'La mia prima bozza.');
  }

  pagina.on('dialog', dialogo => dialogo.accept());
  richieste.length = 0;
  await pagina.goto(base + ripetizioni);
  await campo.fill('La porta e la porta. Velocemente l’amica osservò. Amica lentamente, mente.');
  await pagina.locator('[data-tabella-ripetizioni] tbody tr').first().waitFor();
  assert.deepEqual(await pagina.locator('[data-tabella-ripetizioni] tbody tr').allTextContents(), ['amica2', 'porta2']);
  assert.equal(await misura('avverbi'), '2');
  assert.equal(await misura('mediaFrase'), '3,67');
  assert.equal(await misura('densita'), '72,73%');
  assert.equal(await pagina.locator('[data-testo-evidenziato] mark').count(), 4);
  assert.equal(await pagina.locator('[data-testo-evidenziato] .avverbio').count(), 2);
  assert.ok(richieste.every(url => url.startsWith(base)));
  await campo.fill('');
  await pagina.locator('[data-ripetizioni]').waitFor({ state: 'hidden' });
  assert.equal(await pagina.getByRole('button', { name: 'Continua l’editing su Foglio Effinge' }).isDisabled(), true);
  await campo.fill('Una piccola revisione.');
  await pagina.getByRole('button', { name: 'Continua l’editing su Foglio Effinge' }).click();
  await pagina.waitForURL(base + '/scrivi/');
  assert.equal(await pagina.locator('.scrivi-editor[contenteditable]').innerText(), 'Una piccola revisione.');

  await pagina.goto(base + modello);
  for (const [nome, estensione] of [['Scarica Word (.docx)', 'docx'], ['Scarica OpenDocument (.odt)', 'odt']]) {
    const download = pagina.waitForEvent('download');
    await pagina.getByRole('link', { name: nome }).click();
    const file = await download;
    assert.equal(file.suggestedFilename(), `manoscritto-1800-effinge.${estensione}`);
    assert.equal(await file.failure(), null);
  }
  for (const width of [320, 390, 568, 768, 1440]) {
    await pagina.setViewportSize({ width, height: 880 });
    for (const percorso of [cartelle, ripetizioni, modello, '/scrivi/']) {
      await pagina.goto(base + percorso);
      const entra = await pagina.evaluate(async () => {
        await document.fonts.ready;
        const tondino = document.querySelector('.barra-principale .tondino');
        const barra = document.querySelector('.scrivi-barra');
        const fineMenu = document.querySelector('header.barra').getBoundingClientRect().bottom;
        return document.documentElement.scrollWidth <= innerWidth && tondino.getBoundingClientRect().right <= innerWidth &&
          (!barra || fineMenu <= barra.getBoundingClientRect().top);
      });
      assert.ok(entra, `${percorso} entra nello schermo a ${width}px`);
    }
  }
  assert.deepEqual(errori, []);
  console.log('Calcolo, analisi, trasferimento, archivio separato, download e navigazione responsive verificati.');
} finally {
  await browser.close();
  server.close();
}
