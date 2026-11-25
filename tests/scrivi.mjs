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
  // concentrazione: resta attiva con il mouse fermo o che trema, si spegne con un movimento vero
  await page.keyboard.press('Enter'); await page.keyboard.type('Secondo paragrafo in scrittura', { delay: 15 });
  await page.waitForTimeout(700);
  const opac = () => page.evaluate(() => [...document.querySelectorAll('.scrivi-editor > *')].map(e => getComputedStyle(e).opacity));
  const o1 = await opac();
  ok(o1[0] === '0.3' && o1[o1.length - 1] === '1', 'concentrazione non attiva mentre si scrive: ' + o1);
  const pos0 = await page.evaluate(() => null);
  await page.mouse.move(700, 450); await page.mouse.move(700, 450); await page.mouse.move(712, 455); await page.waitForTimeout(700);
  // per avere un'àncora: riscrivi dopo aver posato il mouse
  await page.keyboard.type(' ancora', { delay: 15 }); await page.mouse.move(700, 450); await page.mouse.move(708, 452); await page.waitForTimeout(700);
  const o2 = await opac();
  ok(o2[0] === '0.3', 'concentrazione spenta da un movimento fantasma o da un tremolio: ' + o2);
  await page.mouse.move(900, 650, { steps: 6 }); await page.waitForTimeout(700);
  const o3 = await opac();
  ok(o3.every(x => x === '1'), 'concentrazione non si spegne muovendo il mouse per leggere: ' + o3);
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
  // incolla da un sito: il carattere e i colori del sito d'origine non devono passare
  await page.click('.scrivi-editor');
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<div style="font-family:Arial;color:red;font-size:30px"><p style="font-family:Arial">Testo <b>incollato</b> da un sito.</p><p>Secondo paragrafo.</p></div>');
    dt.setData('text/plain', 'Testo incollato da un sito.\nSecondo paragrafo.');
    document.querySelector('.scrivi-editor').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  const inc = await page.evaluate(() => { const ed = document.querySelector('.scrivi-editor'); const st = [...ed.querySelectorAll('[style]')].map(e => e.getAttribute('style')).join('|'); const p = [...ed.querySelectorAll('p')].find(x => x.textContent.includes('incollato')); return { stili: st, font: p ? getComputedStyle(p).fontFamily : '' }; });
  ok(!/Arial|red|30px/.test(inc.stili) && /EB Garamond/.test(inc.font), 'incolla: stile esterno passato ' + JSON.stringify(inc));
  // sfondo: Blu Effinge è disponibile e viene ricordato dopo il ricaricamento
  await page.click('[data-apri-sfondi]');
  const nScelte = await page.$$eval('#sfondi-scelta:not([hidden]) [data-scegli]', l => l.length);
  ok(nScelte === 6, `scelte di sfondo: ${nScelte} invece di 6`);
  await page.screenshot({ path: join(out, 'scrivi-sfondi-scelta.png') });
  await page.getByRole('radio', { name: 'Blu Effinge' }).click();
  const sf = await page.evaluate(() => ({ attr: document.documentElement.dataset.sfondo, bg: getComputedStyle(document.body, '::before').backgroundImage }));
  ok(sf.attr === 'blu-effinge' && sf.bg.startsWith('radial-gradient('), 'sfondo non applicato: ' + JSON.stringify(sf));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'scrivi-sfondo-blu.png') });
  await page.reload(); await page.evaluate(() => window.EffingeScrivi.pronto);
  ok((await page.evaluate(() => document.documentElement.dataset.sfondo)) === 'blu-effinge', 'sfondo non ricordato dopo il ricaricamento');
  await page.click('.scrivi-editor'); await page.keyboard.press('Control+End');
  // focus totale: solo la pagina, comandi a icone che si dissolvono scrivendo, Esc per uscire
  await page.click('[data-comando="focus"]');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.barra')).opacity === '0');
  const f1 = await page.evaluate(() => ({ on: document.documentElement.classList.contains('focus-totale'), barraSito: getComputedStyle(document.querySelector('.barra')).opacity, larghezzaFormato: Math.round(document.querySelector('.formato').getBoundingClientRect().width) }));
  ok(f1.on && f1.barraSito === '0' && f1.larghezzaFormato <= 64, 'focus: ' + JSON.stringify(f1));
  await page.click('.scrivi-editor'); await page.keyboard.type(' focus', { delay: 20 }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.classList.contains('focus-quiete')), 'focus: i comandi non si dissolvono mentre si scrive');
  await page.screenshot({ path: join(out, 'scrivi-focus.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(!(await page.evaluate(() => document.documentElement.classList.contains('focus-totale'))), 'focus: Esc non fa uscire');
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
// ——— Pubblicare sul sito (GitHub simulato: niente viene scritto davvero) ———
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('pubblica: ' + e.message));
  const scritti = [], commitFatti = [];
  // un piccolo repository finto: file per percorso, commit con albero
  let ramo = 'c0';
  const alberi = { c0: {} };
  await page.route('https://api.github.com/**', async route => {
    const u = new URL(route.request().url()), m = route.request().method();
    const j = (st, body) => route.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(body) });
    const corpo = () => JSON.parse(route.request().postData() || '{}');
    if (u.pathname === '/user') return j(200, { login: 'autore-prova' });
    if (u.pathname === '/user/repos') return j(200, [{ full_name: 'autore-prova/Effinge', default_branch: 'main', permissions: { push: true } }]);
    if (u.pathname.endsWith('/contents/.pages.yml')) return j(200, { sha: 'x' });
    if (u.pathname.includes('/contents/')) { const p = decodeURIComponent(u.pathname.split('/contents/')[1]); return alberi[ramo][p] ? j(200, { sha: 'f' }) : j(404, { message: 'Not Found' }); }
    if (u.pathname.endsWith('/git/ref/heads/main')) return j(200, { object: { sha: ramo } });
    if (/\/git\/commits\/[^/]+$/.test(u.pathname) && m === 'GET') { const c = u.pathname.split('/').pop(); return j(200, { tree: { sha: 'albero-' + c } }); }
    if (u.pathname.endsWith('/git/trees') && m === 'POST') {
      const b = corpo(), da = b.base_tree.replace('albero-', ''), nuovo = { ...alberi[da] };
      b.tree.forEach(v => { if (v.sha === null) delete nuovo[v.path]; else nuovo[v.path] = v.content; });
      const id = 't' + Object.keys(alberi).length; alberi['albero-' + id] = nuovo; return j(201, { sha: 'albero-' + id });
    }
    if (u.pathname.endsWith('/git/commits') && m === 'POST') { const b = corpo(); const id = 'c' + Object.keys(alberi).length; alberi[id] = alberi[b.tree]; commitFatti.push({ id, parents: b.parents, message: b.message, author: b.author }); return j(201, { sha: id }); }
    if (u.pathname.endsWith('/git/refs/heads/main') && m === 'PATCH') {
      const b = corpo(), c = commitFatti.find(x => x.id === b.sha);
      if (c.parents[0] !== ramo) return j(422, { message: 'Update is not a fast forward' });
      ramo = b.sha; scritti.push({ ramo, file: alberi[ramo], message: c.message }); return j(200, { object: { sha: ramo } });
    }
    return j(404, {});
  });
  await pronto(page);
  ok(await page.isHidden('[data-comando="pubblica"]'), 'il pulsante Pubblica è visibile senza accesso autore');
  await page.click('[data-comando="opere"]'); await page.click('[data-apri-autore]');
  await page.fill('#chiave-autore', 'github_pat_' + 'A'.repeat(40));
  await page.click('[data-collega-autore]');
  await page.waitForSelector('[data-comando="pubblica"]:not([hidden])', { timeout: 5000 });
  await page.click('#autore [data-chiudi]');
  await page.fill('#titolo-sezione', 'La finestra sul canale');
  await page.click('.scrivi-editor');
  await page.keyboard.type('Primo paragrafo con ', { delay: 2 });
  await page.keyboard.press('Control+b'); await page.keyboard.type('grassetto', { delay: 2 }); await page.keyboard.press('Control+b');
  await page.keyboard.type(' e ', { delay: 2 });
  await page.keyboard.press('Control+i'); await page.keyboard.type('corsivo', { delay: 2 }); await page.keyboard.press('Control+i');
  await page.keyboard.type('. Prezzo: 3*4 [nota]', { delay: 2 });
  await page.keyboard.press('Enter'); await page.click('[data-inserisci="stacco"]');
  await page.keyboard.type('Fine centrata', { delay: 2 }); await page.click('[data-cmd="justifyCenter"]');
  await page.waitForTimeout(700);
  await page.click('[data-comando="pubblica"]');
  ok((await page.inputValue('#pub-titolo')) === 'La finestra sul canale', 'titolo non precompilato');
  await page.fill('#pub-categoria', 'Racconto');
  await page.click('[data-conferma-pubblica]');
  await page.waitForSelector('[data-esito-pubblica].ok', { timeout: 5000 });
  ok(scritti.length === 1, `pubblicazioni su GitHub: ${scritti.length}`);
  ok(commitFatti.length && commitFatti.every(c => c.author && /@users\.noreply\.github\.com$/.test(c.author.email)), 'i commit non usano l\'indirizzo anonimo di GitHub: ' + JSON.stringify(commitFatti.map(c => c.author)));
  const percorsi = () => Object.keys(scritti[scritti.length - 1].file).filter(p => p.startsWith('src/testi/'));
  if (scritti[0]) {
    const [percorso] = percorsi();
    const f = scritti[0].file[percorso];
    console.log('file pubblicato:', percorso, '\n' + f);
    ok(/^src\/testi\/\d{4}-\d{2}-\d{2}-la-finestra-sul-canale\.md$/.test(percorso), 'percorso del file: ' + percorso);
    ok(/titolo: "La finestra sul canale"/.test(f) && /bozza: false/.test(f) && /categoria: "Racconto"/.test(f), 'intestazione del file');
    ok(/\*\*grassetto\*\*/.test(f) && /\*corsivo\*/.test(f) && /3\\\*4 \\\[nota\\\]/.test(f) && /\n\*\*\*\n/.test(f) && /<p class="centro">Fine centrata<\/p>/.test(f), 'contenuto Markdown del file');
    if (process.env.FILE_PUBBLICATO) (await import('node:fs')).writeFileSync(process.env.FILE_PUBBLICATO, f);
  }
  // modifico il testo e ripubblico: stesso file, estratto aggiornato
  await page.click('#pubblica [data-chiudi]');
  await page.click('.scrivi-editor'); await page.keyboard.press('Control+Home'); await page.keyboard.type('Nuovo inizio. ', { delay: 2 });
  await page.waitForTimeout(700);
  await page.click('[data-comando="pubblica"]');
  ok(/^Nuovo inizio\./.test(await page.inputValue('#pub-estratto')), 'l\'estratto non segue il testo modificato');
  await page.click('[data-conferma-pubblica]'); await page.waitForSelector('[data-esito-pubblica].ok', { timeout: 5000 });
  ok(scritti.length === 2 && percorsi().length === 1 && /estratto: "Nuovo inizio\./.test(scritti[1].file[percorsi()[0]]), 'aggiornamento: ' + JSON.stringify(percorsi()));
  // il ramo è cambiato altrove (es. dal pannello): si riparte dall'ultima versione e si sovrascrive
  alberi['cX'] = { ...alberi[ramo], 'src/pagine/altro.md': 'dal pannello' }; ramo = 'cX';
  await page.click('[data-conferma-pubblica]'); await page.waitForTimeout(1200);
  ok(scritti.length === 3 && scritti[2].file['src/pagine/altro.md'] === 'dal pannello', 'pubblicazione dopo una modifica esterna non riuscita');
  // cambio titolo: nuovo indirizzo, vecchio file tolto, una sola modifica
  await page.fill('#pub-titolo', 'Il canale di notte');
  await page.click('[data-conferma-pubblica]'); await page.waitForTimeout(1200);
  const dopo = percorsi();
  ok(scritti.length === 4 && dopo.length === 1 && /il-canale-di-notte\.md$/.test(dopo[0]), 'rinomina: ' + JSON.stringify(dopo));
  ok(/\/testi\/il-canale-di-notte\//.test(await page.textContent('[data-esito-pubblica]')), 'il link dopo la rinomina non punta al nuovo indirizzo');
  await page.screenshot({ path: join(out, 'scrivi-pubblica.png') });
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
  await page.evaluate(() => document.fonts.ready);
  const editor = page.locator('.scrivi-editor[contenteditable]');
  const attendiSalvataggio = () => page.waitForFunction(() => / · salvato$/.test(document.querySelector('[data-stato]').textContent));
  const posizione = () => editor.evaluate(el => el.getBoundingClientRect().top + scrollY);
  await attendiSalvataggio();
  const prima = await posizione();
  await page.keyboard.insertText(' Continuo a scrivere.');
  const durante = await posizione();
  await attendiSalvataggio();
  const dopo = await posizione();
  ok(Math.abs(durante - prima) < 1 && Math.abs(dopo - prima) < 1, `telefono: il testo si sposta mentre cambia il conteggio (${prima}, ${durante}, ${dopo})`);
  const comandi = '[data-riscrivi], [data-comando="cartella"], [data-comando="manoscritto"]';
  ok(await page.locator('.scrivi-foglio').locator(comandi).count() === 0, 'i comandi devono stare fuori dal foglio');
  const riscrivi = page.locator('[data-riscrivi]');
  const testo = await editor.innerText();
  await riscrivi.click();
  ok(await riscrivi.textContent() === 'Interrompi', 'Riscrivi non parte');
  await riscrivi.click();
  ok(await editor.innerText() === testo && await riscrivi.textContent() === 'Riscrivi', 'Riscrivi non si interrompe o cambia il testo');
  await page.screenshot({ path: join(out, 'scrivi-tel.png') });
  await page.tap('[data-apri-capitoli]'); await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'scrivi-tel-capitoli.png') });
  const x = await page.evaluate(() => { scrollTo(9999, scrollY); return scrollX; });
  ok(!x, 'telefono: scroll orizzontale ' + x);
  await ctx.close();
}
await b.close(); server.close();
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'Nessun problema rilevato.');
