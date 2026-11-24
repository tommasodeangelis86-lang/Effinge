// DOCX sintetico: verifica controlli, correzioni e conservazione delle parti del documento.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { zipSync, unzipSync } from '../assets/vendor/fflate-0.8.2.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const tipo = mime + '.main+xml';
const b = s => Buffer.from(s);
const sorgente = {
  '[Content_Types].xml': b(`<Types xmlns="${CT}">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Override PartName="/word/document.xml" ContentType="${tipo}"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  </Types>`),
  '_rels/.rels': b(`<Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`),
  'word/_rels/document.xml.rels': b(`<Relationships xmlns="${REL}">
    <Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/>
    <Relationship Id="rId2" Type="${R}/footnotes" Target="footnotes.xml"/>
  </Relationships>`),
  'word/document.xml': b(`<w:document xmlns:w="${W}"><w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/><w:jc w:val="center"/></w:pPr><w:r><w:t>Manoscritto di prova</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capitolo 1</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Un testo di prova  con spazi.</w:t></w:r></w:p>
    <w:p><w:r><w:t>*</w:t></w:r></w:p>
    <w:p><w:r><w:t>Capitolo 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>La frase rimane identica.</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body></w:document>`),
  'word/styles.xml': b(`<w:styles xmlns:w="${W}">
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>
  </w:styles>`),
  'docProps/core.xml': b('<core xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Autore di prova</dc:creator></core>'),
  'word/footnotes.xml': b(`<w:footnotes xmlns:w="${W}"><w:footnote w:id="1"><w:p><w:r><w:t>Nota di prova.</w:t></w:r></w:p></w:footnote></w:footnotes>`),
};

const out = process.env.OUT || '/tmp';
await mkdir(out, { recursive: true });
const root = new URL('../_site/', import.meta.url).pathname;
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const remoto = process.env.EFFINGE_CHECK_URL;
const server = remoto ? null : createServer(async (req, res) => {
  const percorso = new URL(req.url, 'http://localhost').pathname;
  const file = join(root, percorso.endsWith('/') ? percorso + 'index.html' : percorso);
  try {
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': tipi[extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = remoto || `http://localhost:${server.address().port}`;
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
  const errori = [];
  const richieste = [];
  page.on('pageerror', err => errori.push(err.message));
  page.on('request', req => richieste.push([req.method(), req.url()]));
  await page.goto(base + '/checkmanoscritto/');
  const nav = page.getByRole('navigation', { name: 'Principale' });
  const link = await nav.locator('a').evaluateAll(voci => voci.map(v => v.getAttribute('href')));
  const indice = link.indexOf('/checkmanoscritto/');
  assert.deepEqual(link.slice(indice - 1, indice + 2), ['/guide/', '/checkmanoscritto/', '/art/']);
  assert.equal(await page.locator('[data-check]').count(), 8);
  assert.equal(await page.evaluate(() => {
    const ultimo = document.querySelector('.barra-principale .tondino').getBoundingClientRect();
    return ultimo.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
  }), true);
  await page.screenshot({ path: join(out, 'checkmanoscritto-mobile.png'), fullPage: true });

  const file = page.locator('#check-file');
  const carica = buffer => file.setInputFiles({ name: 'prova.docx', mimeType: mime, buffer });
  await carica(Buffer.from(zipSync(sorgente)));
  await page.waitForFunction(() => document.querySelector('[data-esito]').textContent.includes('controllo completato'));
  const riga = nome => page.locator('[data-check="' + nome + '"]');
  assert.equal(await riga('formato').getAttribute('data-esito'), 'attenzione');
  assert.match(await riga('formato').innerText(), /Letter verticale.*A4 verticale/);
  assert.match(await riga('formato').innerText(), /Calibri.*Times New Roman/);
  assert.equal(await riga('lunghezza').getAttribute('data-esito'), 'ok');
  assert.equal(await riga('pulizia').getAttribute('data-esito'), 'attenzione');

  await page.locator('.check-profilo summary').click();
  await page.locator('#check-profilo').selectOption('personalizzato');
  await page.locator('[name="margini"]').fill('3');
  await page.locator('[name="margini"]').press('Tab');
  assert.match(await riga('formato').innerText(), /previsto 3 cm/);
  await page.getByRole('button', { name: 'Applica formato personalizzato' }).click();
  assert.equal(await riga('formato').getAttribute('data-esito'), 'ok');
  await page.locator('#check-profilo').selectOption('effinge');
  await page.getByRole('button', { name: 'Applica formato Effinge' }).click();
  assert.equal(await riga('formato').getAttribute('data-esito'), 'ok');

  await riga('capitoli').locator('summary').click();
  assert.equal(await riga('capitoli').locator('[data-titolo]').count(), 2);
  assert.match(await riga('capitoli').innerText(), /Capitolo 3.*interruzione da aggiungere.*numerazione da verificare/);
  await riga('capitoli').getByRole('checkbox', { name: /Ho verificato ordine/ }).check();
  await page.getByRole('button', { name: 'Metti i capitoli su pagina nuova' }).click();
  assert.equal(await riga('capitoli').getAttribute('data-esito'), 'ok');

  await riga('lunghezza').locator('summary').click();
  await page.locator('[data-limite]').fill('10');
  await page.locator('[data-limite]').press('Tab');
  assert.equal(await riga('lunghezza').getAttribute('data-esito'), 'attenzione');
  await page.locator('[data-limite]').fill('');
  await page.locator('[data-limite]').press('Tab');
  assert.equal(await riga('lunghezza').getAttribute('data-esito'), 'ok');

  await riga('frontespizio').locator('summary').click();
  await page.getByRole('checkbox', { name: /richiede l’anonimato/ }).check();
  assert.match(await riga('frontespizio').innerText(), /Autore di prova/);
  assert.equal(await riga('frontespizio').getAttribute('data-esito'), 'attenzione');

  const downloadInAttesa = page.waitForEvent('download');
  await page.getByRole('button', { name: /Scarica copia DOCX/ }).click();
  const download = await downloadInAttesa;
  assert.equal(download.suggestedFilename(), 'prova-effinge.docx');
  await download.saveAs(join(out, 'prova-effinge.docx'));
  const risultato = await readFile(await download.path());
  const parti = unzipSync(risultato);
  const doc = Buffer.from(parti['word/document.xml']).toString();
  assert.match(doc, /w:pgSz w:w="11906" w:h="16838"/);
  assert.match(doc, /w:pageBreakBefore w:val="1"/);
  assert.match(doc, /Un testo di prova  con spazi\./);
  assert.match(doc, /<w:i\/>/);
  assert.match(Buffer.from(parti['word/footerEffinge.xml']).toString(), /w:instr=" PAGE "/);
  assert.deepEqual(Buffer.from(parti['word/footnotes.xml']), sorgente['word/footnotes.xml']);
  assert.deepEqual(Buffer.from(parti['docProps/core.xml']), sorgente['docProps/core.xml']);
  assert.deepEqual(Buffer.from(parti['word/styles.xml']), sorgente['word/styles.xml']);

  await riga('finale').locator('summary').click();
  await riga('finale').getByRole('checkbox').check();
  assert.equal(await riga('finale').getAttribute('data-esito'), 'ok');

  await carica(risultato);
  await page.waitForFunction(() => document.querySelector('[data-esito]').textContent.includes('controllo completato'));
  assert.equal(await riga('formato').getAttribute('data-esito'), 'ok');
  await carica(b('file non valido'));
  await page.waitForFunction(() => document.querySelector('[data-esito]').hasAttribute('data-errore'));
  assert.equal(await page.getByRole('button', { name: /Scarica copia DOCX/ }).isEnabled(), true);
  assert.ok(richieste.every(([method, url]) => method === 'GET' && url.startsWith(base)));
  assert.deepEqual(errori, []);
  console.log('Checklist manoscritto: menu, rapporto, formato, capitoli, conteggi, anonimato, export e riapertura verificati.');
} finally {
  await browser.close();
  server?.close();
}
