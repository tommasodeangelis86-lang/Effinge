import { apriDocumento, capitoliProposti, correggi, formatoEffinge, rapporto, scaricaDocumento } from './checkmanoscritto-docx.js';

const pagina = document.querySelector('[data-check-manoscritto]');
const campo = selettore => pagina.querySelector(selettore);
const campi = selettore => Array.from(pagina.querySelectorAll(selettore));
const numeri = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const righe = new Map(campi('[data-check]').map(el => [el.dataset.check, el]));
const manuale = nome => campo('[data-manuale="' + nome + '"]');
const fileInput = campo('#check-file');
const profiloInput = campo('#check-profilo');
const personalizzato = campo('[data-personalizzato]');
const esito = campo('[data-esito]');
const esitoCopia = campo('[data-esito-copia]');
const applica = campo('[data-applica]');
const interruzioni = campo('[data-interruzioni]');
const esporta = campo('[data-esporta]');
const cerca = campo('[data-cerca-titolo]');
let file;
let originale;
let documento;
let profilo = formatoEffinge;
let capitoli = new Set();
let titoliInVista = new Set();
let controllo;
let lettura = 0;
let occupato = false;
let scaricato = false;

function elemento(tipo, testo, classe) {
  const e = document.createElement(tipo);
  if (testo) e.textContent = testo;
  if (classe) e.className = classe;
  return e;
}

function paragrafo(testo) {
  return elemento('p', testo);
}

function lista(voci, crea = testo => elemento('li', testo)) {
  const ul = elemento('ul');
  ul.append(...voci.map(crea));
  return ul;
}

function messaggio(testo, errore = false) {
  esito.textContent = testo;
  esito.toggleAttribute('data-errore', errore);
}

function stato(nome, valore) {
  const riga = righe.get(nome);
  riga.dataset.esito = valore;
  riga.querySelector('[data-stato-riga]').textContent = {
    ok: 'Completato', attesa: 'Da fare', attenzione: 'Da verificare',
  }[valore];
}

function datiLunghezza() {
  if (!controllo) return null;
  const { battute, parole } = controllo.totale;
  const cartelle = battute / Number(campo('[data-unita-cartella]').value);
  const selettore = campo('[data-unita-limite]').value;
  const limite = campo('[data-limite]');
  const confronto = { battute, parole, cartelle }[selettore];
  const richiesto = limite.valueAsNumber;
  return { battute, parole, cartelle, selettore, confronto, richiesto,
    valido: limite.validity.valid, superato: Number.isFinite(richiesto) && confronto > richiesto };
}

function anonimatoDaVerificare() {
  return campo('[data-anonimo]').checked && controllo && (controllo.metadati.length > 0 || controllo.emailInApertura);
}

function statoPagina() {
  const lunghezza = datiLunghezza();
  const mancaInterruzione = controllo?.capitoli.some(c => c.interruzione);
  const formatoOk = profilo && controllo?.formato.every(x => x.verificato) && !controllo.parziali;
  stato('formato', !controllo ? 'attesa' : formatoOk ? 'ok' : 'attenzione');
  stato('capitoli', !controllo ? 'attesa' : manuale('capitoli').checked && !mancaInterruzione ? 'ok' : 'attenzione');
  stato('lunghezza', !lunghezza ? 'attesa'
    : lunghezza.superato || !lunghezza.valido || controllo.parziali ? 'attenzione' : 'ok');
  stato('pulizia', !controllo ? 'attesa' : !controllo.pulizia.length || manuale('pulizia').checked ? 'ok' : 'attenzione');
  stato('rilettura', manuale('rilettura').checked ? 'ok' : 'attesa');
  stato('frontespizio', anonimatoDaVerificare() ? 'attenzione' : manuale('frontespizio').checked ? 'ok' : 'attesa');
  stato('allegati', campi('[data-allegato]').every(el => el.checked) ? 'ok' : 'attesa');
  stato('finale', scaricato && manuale('finale').checked ? 'ok' : 'attesa');

  const completati = campi('[data-check][data-esito="ok"]').length;
  campo('progress').value = completati;
  const avanzamento = campo('[data-avanzamento]');
  const testoAvanzamento = completati + ' di ' + righe.size + ' completati';
  if (avanzamento.textContent !== testoAvanzamento) avanzamento.textContent = testoAvanzamento;
  applica.disabled = occupato || !profilo || !controllo || controllo.protetto ||
    !controllo.formato.some(r => !r.verificato && r.prima);
  interruzioni.disabled = occupato || !profilo || !controllo || controllo.protetto ||
    !mancaInterruzione || !manuale('capitoli').checked;
  manuale('capitoli').disabled = occupato || !documento;
  manuale('pulizia').disabled = occupato || !documento || !controllo?.pulizia.length;
  manuale('finale').disabled = occupato || !scaricato;
  esporta.disabled = occupato || !documento;
}

function mostraFormato() {
  const contenitore = campo('[data-rapporto-formato]');
  if (!profilo || !controllo) {
    contenitore.replaceChildren(paragrafo(profilo
      ? 'Apri un DOCX per confrontare l’impaginazione con il formato scelto.'
      : 'Completa i campi delle impostazioni di invio.'));
    return;
  }
  const voci = lista(controllo.formato, r => {
    const li = elemento('li');
    const titolo = elemento('strong', r.nome + ' — ');
    const esitoRiga = r.verificato ? r.trovato + ' ✓'
      : 'Trovato ' + (r.trovato || 'da verificare') + ' · previsto ' + r.atteso + (r.prima ? ' · da ' + r.prima : '');
    li.append(titolo, document.createTextNode(esitoRiga));
    return li;
  });
  contenitore.replaceChildren(voci);
  contenitore.append(paragrafo('Carattere, corpo e interlinea si riferiscono al testo principale. Titoli, liste, tabelle, note ed elementi speciali mantengono il proprio stile.'));
  if (controllo.protetto) contenitore.append(paragrafo('Il file è protetto o firmato. Puoi consultare il rapporto e scaricare la copia originale.'));
  if (controllo.parziali) contenitore.append(paragrafo('Alcune parti collegate richiedono una verifica in Word.'));
}

function voceTitolo(v, capitolo) {
  const li = elemento('li');
  const label = elemento('label', '', 'check-conferma');
  const checkbox = elemento('input');
  checkbox.type = 'checkbox';
  checkbox.checked = capitoli.has(v.indice);
  checkbox.dataset.titolo = String(v.indice);
  const esito = [
    capitolo?.interruzione ? 'interruzione da aggiungere' : '',
    capitolo?.sequenza ? 'numerazione da verificare' : '',
  ].filter(Boolean).join(' · ');
  label.append(checkbox, elemento('span', (v.testo.trim() || 'Titolo senza testo') + (esito ? ' · ' + esito : '')));
  li.append(label);
  return li;
}

function mostraCapitoli() {
  const contenitore = campo('[data-rapporto-capitoli]');
  campo('[data-aggiungi]').hidden = !documento;
  if (!controllo) {
    contenitore.replaceChildren(paragrafo('I titoli individuati nel file appariranno qui.'));
    return;
  }
  const rimettiFocus = document.activeElement?.dataset.titolo;
  const mappa = new Map(controllo.capitoli.map(c => [c.indice, c]));
  const voci = Array.from(titoliInVista, indice => documento.par[indice]).sort((a, b) => a.indice - b.indice);
  contenitore.replaceChildren(paragrafo(voci.length
    ? capitoli.size + ' titoli selezionati. Conferma quali aprono un capitolo o una parte.'
    : 'Nessun capitolo individuato. Puoi cercare un titolo oppure confermare che il testo è in un’unica sezione.'));
  if (controllo.stacchi) contenitore.append(paragrafo('Stacchi di scena riconosciuti · ' + controllo.stacchi));
  if (voci.length) {
    const dettaglio = elemento('div', '', 'check-elenco-titoli');
    dettaglio.append(lista(voci, v => voceTitolo(v, mappa.get(v.indice))));
    contenitore.append(dettaglio);
  }
  if (rimettiFocus) contenitore.querySelector('[data-titolo="' + rimettiFocus + '"]')?.focus();
}

function trovaTitoli() {
  const risultati = campo('[data-risultati-titoli]');
  risultati.replaceChildren();
  const ricerca = cerca.value.trim().toLocaleLowerCase('it');
  if (!documento || ricerca.length < 2) return;
  const voci = [];
  for (const v of documento.par) {
    if (!v.tabella && v.testo.length <= 150 && !titoliInVista.has(v.indice) && v.testo.toLocaleLowerCase('it').includes(ricerca)) {
      voci.push(v);
      if (voci.length === 6) break;
    }
  }
  if (!voci.length) {
    risultati.append(paragrafo('Nessun altro titolo corrispondente.'));
    return;
  }
  risultati.append(lista(voci, v => {
    const li = elemento('li');
    const b = elemento('button', 'Aggiungi «' + v.testo.trim() + '»', 'check-secondario');
    b.type = 'button';
    b.dataset.aggiungiTitolo = String(v.indice);
    li.append(b);
    return li;
  }));
}

function mostraLunghezza() {
  const contenitore = campo('[data-rapporto-lunghezza]');
  const dati = datiLunghezza();
  if (!dati) {
    contenitore.replaceChildren(paragrafo('Apri un file per vedere i conteggi.'));
    return;
  }
  const { battute, parole, cartelle, selettore, richiesto, superato, valido } = dati;
  contenitore.replaceChildren(paragrafo(numeri.format(parole) + ' parole · ' + numeri.format(battute) +
    ' battute · ' + numeri.format(cartelle) + ' cartelle'));
  contenitore.append(paragrafo('Conteggio sul corpo del documento, frontespizio incluso. Note, intestazioni e piè di pagina sono esclusi.'));
  if (Number.isFinite(richiesto) && valido) {
    contenitore.append(paragrafo((superato ? 'Limite superato' : 'Entro il limite') + ' · ' + numeri.format(richiesto) + ' ' + selettore));
  }
  if (!valido) contenitore.append(paragrafo('Inserisci un limite intero maggiore di zero.'));
}

function mostraPulizia() {
  const contenitore = campo('[data-rapporto-pulizia]');
  const avvisi = controllo?.pulizia;
  contenitore.replaceChildren(avvisi?.length ? lista(avvisi) : paragrafo(controllo
    ? 'Nessun segno di lavorazione individuato dai controlli automatici.'
    : 'Il controllo segnala gli elementi da rivedere nel file.'));
}

function mostraFrontespizio() {
  const contenitore = campo('[data-rapporto-frontespizio]');
  const anonimo = campo('[data-anonimo]').checked;
  contenitore.replaceChildren(paragrafo(anonimo
    ? 'Controlla firma, recapiti, nome del file e proprietà del documento prima di un invio anonimo.'
    : 'Verifica titolo, firma, recapiti e lunghezza secondo le richieste dell’invio.'));
  if (!controllo) return;
  const note = [];
  if (controllo.titolo) note.push('Titolo nelle proprietà · ' + controllo.titolo);
  if (controllo.metadati.length) note.push('Nomi nelle proprietà · ' + controllo.metadati.join(', '));
  if (controllo.emailInApertura) note.push('Un indirizzo email è stato individuato nei paragrafi iniziali.');
  if (anonimatoDaVerificare()) note.push('Verifica questi dati in Word e riapri il file aggiornato per ripetere il controllo.');
  if (note.length) contenitore.append(lista(note));
}

function ricalcola() {
  controllo = documento ? rapporto(documento, profilo || formatoEffinge, capitoli) : null;
  mostraFormato();
  mostraCapitoli();
  trovaTitoli();
  mostraLunghezza();
  mostraPulizia();
  mostraFrontespizio();
  statoPagina();
}

function invalidaCopia() {
  scaricato = false;
  manuale('finale').checked = false;
  esitoCopia.textContent = 'Le correzioni si applicano alla copia da scaricare.';
}

function aggiornaProfilo() {
  const personalizza = profiloInput.value === 'personalizzato';
  personalizzato.hidden = !personalizza;
  const etichetta = personalizza ? 'Formato personalizzato' : 'Formato Effinge';
  campo('[data-profilo-label]').textContent = etichetta;
  applica.textContent = personalizza ? 'Applica formato personalizzato' : 'Applica formato Effinge';
  profilo = formatoEffinge;
  if (personalizza) {
    const campiProfilo = Array.from(personalizzato.elements);
    const valori = Object.fromEntries(campiProfilo.map(el => [el.name,
      el.type === 'checkbox' ? el.checked : el.type === 'number' ? el.valueAsNumber : el.value.trim()]));
    profilo = campiProfilo.every(el => el.validity.valid) && valori.carattere ? valori : null;
  }
  campo('[data-riepilogo-formato]').textContent = profilo
    ? profilo.pagina + ' verticale, ' + profilo.carattere + ' ' + numeri.format(profilo.corpo) + ', margini di ' +
      numeri.format(profilo.margini) + ' cm, interlinea ' + numeri.format(profilo.interlinea) +
      ' e rientro di ' + numeri.format(profilo.rientro) + ' cm.'
    : 'Completa i campi del formato personalizzato.';
  invalidaCopia();
  if (documento) ricalcola();
}

function selezionaTitolo(indice, presente) {
  if (presente) capitoli.add(indice);
  else capitoli.delete(indice);
  manuale('capitoli').checked = false;
  invalidaCopia();
  ricalcola();
}

fileInput.addEventListener('change', async () => {
  const scelto = fileInput.files[0];
  if (!scelto) return;
  fileInput.value = '';
  const operazione = ++lettura;
  occupato = true;
  statoPagina();
  messaggio('Lettura di ' + scelto.name + '…');
  try {
    const nuovo = await apriDocumento(scelto);
    if (operazione !== lettura) return;
    // Verifica anche le parti consultate dal rapporto prima di sostituire il file corrente.
    const proposte = capitoliProposti(nuovo);
    rapporto(nuovo, profilo || formatoEffinge, proposte);
    file = scelto;
    originale = documento = nuovo;
    capitoli = proposte;
    titoliInVista = new Set(capitoli);
    cerca.value = '';
    campi('[data-manuale], [data-anonimo], [data-allegato]').forEach(el => { el.checked = false; });
    invalidaCopia();
    messaggio(scelto.name + ' · controllo completato.');
  } catch (errore) {
    if (operazione !== lettura) return;
    messaggio((errore.message || 'Non è stato possibile leggere il file.') +
      (file ? ' Il documento aperto resta ' + file.name + '.' : ''), true);
  } finally {
    if (operazione === lettura) {
      occupato = false;
      ricalcola();
    }
  }
});

pagina.addEventListener('change', evento => {
  const el = evento.target;
  if (el === profiloInput || personalizzato.contains(el)) aggiornaProfilo();
  else if (el.matches('[data-titolo]')) selezionaTitolo(Number(el.dataset.titolo), el.checked);
  else if (el.matches('[data-unita-cartella], [data-unita-limite], [data-limite]')) mostraLunghezza();
  else if (el.matches('[data-anonimo]')) {
    manuale('frontespizio').checked = false;
    mostraFrontespizio();
  }
  statoPagina();
});
cerca.addEventListener('input', trovaTitoli);
campo('[data-risultati-titoli]').addEventListener('click', evento => {
  const indice = evento.target.dataset.aggiungiTitolo;
  if (indice === undefined) return;
  titoliInVista.add(Number(indice));
  cerca.value = '';
  selezionaTitolo(Number(indice), true);
  campo('[data-titolo="' + indice + '"]')?.focus();
});

function applicaCorrezione(azione) {
  const pulsante = azione === 'formato' ? applica : interruzioni;
  if (pulsante.disabled) return;
  try {
    const nuovo = correggi(documento, profilo, capitoli, azione);
    rapporto(nuovo, profilo, capitoli);
    documento = nuovo;
    invalidaCopia();
    messaggio(azione === 'formato' ? 'Formato applicato. Il controllo è stato ripetuto.' :
      'Interruzioni aggiunte ai titoli confermati.');
    ricalcola();
  } catch {
    messaggio('Impossibile applicare le correzioni. La versione aperta è ancora disponibile.', true);
  }
}

applica.addEventListener('click', () => applicaCorrezione('formato'));
interruzioni.addEventListener('click', () => applicaCorrezione('capitoli'));
esporta.addEventListener('click', () => {
  if (esporta.disabled) return;
  try {
    const blob = documento === originale ? file : scaricaDocumento(documento);
    const url = URL.createObjectURL(blob);
    const nome = file.name.replace(/\.docx$/i, '') + '-effinge.docx';
    const link = elemento('a');
    link.href = url;
    link.download = nome;
    pagina.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    scaricato = true;
    esitoCopia.textContent = 'Copia pronta · ' + nome;
    statoPagina();
  } catch {
    esitoCopia.textContent = 'Impossibile preparare la copia. Il documento aperto è ancora disponibile.';
  }
});
