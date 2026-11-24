// Lettura e correzioni mirate al pacchetto Word, senza ricostruire il manoscritto.
import { unzipSync, zipSync } from '../vendor/fflate-0.8.2.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const MAIN = 'word/document.xml';
const RELS = 'word/_rels/document.xml.rels';
const TIPI = '[Content_Types].xml';
const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const MB = 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();
const parser = new DOMParser();
const serializer = new XMLSerializer();
const formatoNumero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const cm = valore => Math.round(valore * 566.93);
const pagine = { A4: [11906, 16838], Letter: [12240, 15840] };
const STACCO = /^(\*\s*){1,3}$|^[⁂#]$/;

export const formatoEffinge = Object.freeze({
  pagina: 'A4', margini: 2.3, carattere: 'Times New Roman', corpo: 12,
  interlinea: 1.5, rientro: 0.42, allineamento: 'both', numeri: true, paginaNuova: true,
});

const elementi = (nodo, nome) => Array.from(nodo?.getElementsByTagNameNS(W, nome) || []);
const figli = (nodo, nome) => Array.from(nodo?.children || []).filter(n => n.namespaceURI === W && n.localName === nome);
const figlio = (nodo, nome) => figli(nodo, nome)[0];
const leggi = (nodo, nome = 'val') => nodo?.getAttributeNS(W, nome) ?? null;
const imposta = (nodo, nome, valore) => nodo.setAttributeNS(W, 'w:' + nome, String(valore));
const attivo = nodo => nodo && !['0', 'false', 'off'].includes(leggi(nodo));
const numero = valore => valore === null || valore === undefined || valore === '' ? NaN : Number(valore);
const vicino = (a, b, tolleranza = 2) => Math.abs(a - b) <= tolleranza;
const testo = nodo => nodo?.textContent?.trim() || '';
const finito = (valore, unita = '') => Number.isFinite(valore) ? formatoNumero.format(valore) + unita : 'Da verificare';

function xml(pacchetto, nome) {
  const dati = pacchetto[nome];
  if (!dati) return null;
  if (dati.length > 20 * MB) throw new Error('Una sezione del documento supera il limite di lettura.');
  // Word e LibreOffice usano UTF-8. Il BOM permette di leggere anche le parti in UTF-16.
  const codifica = dati[0] === 255 && dati[1] === 254 ? 'utf-16le'
    : dati[0] === 254 && dati[1] === 255 ? 'utf-16be' : null;
  return leggiXml((codifica ? new TextDecoder(codifica, { fatal: true }) : decoder).decode(dati));
}

function leggiXml(sorgente) {
  if (/<!DOCTYPE/i.test(sorgente)) throw new Error('Il file contiene una definizione XML non supportata.');
  const doc = parser.parseFromString(sorgente, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Una parte del documento Word non è leggibile.');
  return doc;
}

function salvaXml(pacchetto, nome, doc) {
  pacchetto[nome] = encoder.encode(serializer.serializeToString(doc));
}

export async function apriDocumento(file) {
  if (!/\.docx$/i.test(file.name)) throw new Error('Scegli un file con estensione .docx.');
  if (file.size > 25 * MB) throw new Error('Il file supera i 25 MB. Apri un DOCX più piccolo.');
  let peso = 0;
  const dimensioni = new Map();
  let contenuto;
  try {
    contenuto = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter({ name, size, originalSize }) {
        peso += Math.max(size, originalSize);
        if (peso > 100 * MB || dimensioni.size >= 3500 || dimensioni.has(name) ||
            name.startsWith('/') || name.includes('\\') ||
            /(^|\/)(?:\.{1,2}|__proto__|constructor|prototype)(?:\/|$)/.test(name)) {
          throw new Error('Pacchetto Word non supportato.');
        }
        dimensioni.set(name, originalSize);
        return true;
      },
    });
    for (const [nome, dimensione] of dimensioni) {
      if (contenuto[nome]?.length !== dimensione) throw new Error('Dimensione incoerente.');
    }
  } catch {
    throw new Error('Il file è danneggiato, protetto con password o troppo grande da aprire.');
  }
  return modello(contenuto);
}

function modello(pacchetto) {
  const doc = xml(pacchetto, MAIN);
  const corpo = figlio(doc?.documentElement, 'body');
  const tipi = xml(pacchetto, TIPI);
  const tipo = Array.from(tipi?.getElementsByTagNameNS(CT, 'Override') || [])
    .find(voce => voce.getAttribute('PartName') === '/' + MAIN)?.getAttribute('ContentType');
  if (!corpo || tipo !== TIPO_DOCX) throw new Error('Il file non è un normale documento Word DOCX.');
  const tutti = elementi(corpo, 'p').filter(p => !haAntenato(p, 'txbxContent', 'del', 'moveFrom'));
  if (tutti.length > 60000) throw new Error('Il documento contiene troppi paragrafi per questo controllo.');
  const stili = xml(pacchetto, 'word/styles.xml');
  const tema = xml(pacchetto, 'word/theme/theme1.xml');
  const impostazioni = xml(pacchetto, 'word/settings.xml');
  const stilePerId = new Map(elementi(stili, 'style').map(s => [leggi(s, 'styleId'), s]));
  const stileNormale = Array.from(stilePerId.values()).find(s => leggi(s, 'type') === 'paragraph' && /^(1|true|on)$/.test(leggi(s, 'default')));
  const predefiniti = figlio(stili?.documentElement, 'docDefaults');
  const dati = {
    doc, corpo, pacchetto, tipi, impostazioni, stilePerId, stileNormale,
    parBase: figlio(figlio(predefiniti, 'pPrDefault'), 'pPr'),
    carBase: figlio(figlio(predefiniti, 'rPrDefault'), 'rPr'),
    fontTema: Object.fromEntries(['majorFont', 'minorFont'].map(nome => [
      nome, tema?.getElementsByTagNameNS('*', nome)[0]?.getElementsByTagNameNS('*', 'latin')[0]?.getAttribute('typeface'),
    ])),
    sezioni: elementi(corpo, 'sectPr').filter(s => !haAntenato(s, 'sectPrChange', 'pPrChange')),
    par: tutti.map((p, indice) => ({ p, indice, testo: testoParagrafo(p), tabella: haAntenato(p, 'tbl') })),
  };
  dati.par.forEach(v => {
    const prop = figlio(v.p, 'pPr');
    const id = leggi(figlio(prop, 'pStyle'));
    const stile = dati.stilePerId.get(id);
    v.stile = [id, leggi(figlio(stile, 'name'))].filter(Boolean).join(' ');
    v.stili = catenaStile(dati, stile || dati.stileNormale);
    v.parProp = [prop, ...v.stili.map(s => figlio(s, 'pPr')), dati.parBase];
    v.titolo = !v.tabella && v.testo.length <= 150 && (
      /heading[ _-]*1\b|titolo[ _-]*1\b|intestazione[ _-]*1\b|capitolo|chapter/i.test(v.stile) ||
      leggi(proprieta(v.parProp, 'outlineLvl')) === '0' ||
      /^(?:(?:capitolo|parte|libro)\s+[^.!?]{1,80}|prologo|epilogo)$/i.test(v.testo.trim())
    );
  });
  const protezione = figlio(impostazioni?.documentElement, 'documentProtection');
  dati.protetto = ['1', 'true', 'on'].includes(leggi(protezione, 'enforcement')) ||
    Object.keys(pacchetto).some(nome => nome.startsWith('_xmlsignatures/'));
  dati.contenutoCollegato = elementi(corpo, 'altChunk').length > 0;
  return dati;
}

function haAntenato(nodo, ...nomi) {
  for (let p = nodo.parentElement; p; p = p.parentElement) {
    if (p.namespaceURI === W && nomi.includes(p.localName)) return true;
  }
  return false;
}

function testoParagrafo(paragrafo) {
  const frammenti = [];
  const pila = Array.from(paragrafo.children).reverse();
  while (pila.length) {
    const nodo = pila.pop();
    if (nodo.namespaceURI === W) {
      if (['del', 'moveFrom', 'txbxContent', 'pPr', 'rPr'].includes(nodo.localName)) continue;
      if (nodo.localName === 't') frammenti.push(nodo.textContent);
      if (nodo.localName === 'tab') frammenti.push('\t');
      if (['br', 'cr'].includes(nodo.localName)) frammenti.push('\n');
      if (nodo.localName === 'noBreakHyphen') frammenti.push('‑');
    }
    for (let i = nodo.children.length - 1; i >= 0; i--) pila.push(nodo.children[i]);
  }
  return frammenti.join('');
}

function catenaStile(dati, stile) {
  const visti = new Set();
  while (stile && !visti.has(stile)) {
    visti.add(stile);
    stile = dati.stilePerId.get(leggi(figlio(stile, 'basedOn')));
  }
  return Array.from(visti);
}

const proprieta = (livelli, nome) => livelli.map(l => figlio(l, nome)).find(Boolean);
function valore(livelli, nome, attributo = 'val') {
  for (const livello of livelli) {
    const v = leggi(figlio(livello, nome), attributo);
    if (v !== null) return v;
  }
  return null;
}

function font(dati, livelli, gruppo) {
  for (const livello of livelli) {
    const f = figlio(livello, 'rFonts');
    const tema = leggi(f, gruppo + 'Theme');
    if (tema) return dati.fontTema[tema.startsWith('major') ? 'majorFont' : 'minorFont'] || 'Carattere del tema';
    const esplicito = leggi(f, gruppo);
    if (esplicito) return esplicito;
  }
  return null;
}

function frammenti(voce) {
  return elementi(voce.p, 'r').filter(r => !haAntenato(r, 'del', 'moveFrom', 'txbxContent') && figli(r, 't').some(t => t.textContent.trim()));
}

function stileTesto(dati, voce, run) {
  const locale = figlio(run, 'rPr');
  const id = leggi(figlio(locale, 'rStyle'));
  return [locale, ...catenaStile(dati, dati.stilePerId.get(id)).map(s => figlio(s, 'rPr')),
    ...voce.stili.map(s => figlio(s, 'rPr')), dati.carBase];
}

function corpoNarrativo(dati, capitoli) {
  const primo = dati.par.find(v => capitoli.has(v.indice));
  const haFrontespizio = primo && primo.indice <= 20 && dati.par.slice(0, primo.indice).some(v =>
    /^(title|titolo)\b/i.test(v.stile) || valore(v.parProp, 'jc') === 'center') && interruzione(dati, primo);
  return dati.par.filter(v => !v.tabella && v.testo.trim() && !capitoli.has(v.indice) &&
    !(haFrontespizio && v.indice < primo.indice) &&
    !/heading|title|titolo|intestazione|epigrafe|epigraph|quote|citazione|poesia/i.test(v.stile) &&
    !proprieta(v.parProp, 'numPr') && !STACCO.test(v.testo.trim()) &&
    !haAntenato(v.p, 'sdt') && !elementi(v.p, 'drawing').length);
}

function interruzione(dati, voce) {
  if (attivo(proprieta(voce.parProp, 'pageBreakBefore'))) return true;
  // Un'interruzione precedente conta se è dopo l'ultimo testo, anche in un paragrafo vuoto.
  for (let i = voce.indice; i >= 0; i--) {
    const p = dati.par[i].p;
    const sezione = figlio(figlio(p, 'pPr'), 'sectPr');
    if (i < voce.indice && sezione) {
      const seguente = dati.sezioni[dati.sezioni.indexOf(sezione) + 1];
      if (['nextPage', 'oddPage', 'evenPage'].includes(leggi(figlio(seguente, 'type')) ?? 'nextPage')) return true;
    }
    const nodi = elementi(p, '*').filter(n => n.localName === 't' || n.localName === 'br');
    if (i < voce.indice) nodi.reverse();
    for (const n of nodi) {
      if (n.localName === 'br' && leggi(n, 'type') === 'page') return true;
      if (n.localName === 't' && testo(n)) {
        if (i < voce.indice) return false;
        break;
      }
    }
  }
  return true;
}

export function capitoliProposti(dati) {
  return new Set(dati.par.filter(v => v.titolo).map(v => v.indice));
}

export function struttura(dati, scelti, profilo) {
  const capitoli = dati.par.filter(v => scelti.has(v.indice));
  let numeroPrecedente = null;
  return capitoli.map(v => {
    const trovato = v.testo.trim().match(/^(?:capitolo\s+)?(\d+)(?:[.\s:–-]|$)/i);
    const num = trovato ? Number(trovato[1]) : null;
    const sequenza = num !== null && numeroPrecedente !== null && num !== numeroPrecedente + 1;
    if (/^(parte|libro)\b/i.test(v.testo.trim())) numeroPrecedente = null;
    if (num !== null) numeroPrecedente = num;
    return { indice: v.indice, titolo: v.testo.trim(), interruzione: profilo.paginaNuova && !interruzione(dati, v), sequenza };
  });
}

function formato(dati, profilo, capitoli) {
  const controlli = [];
  function controllo(nome, atteso, righe, osserva) {
    const visti = new Map();
    let differenze = 0;
    let prima = '';
    for (const riga of righe) {
      const [valore, coincide] = osserva(riga);
      visti.set(valore, (visti.get(valore) || 0) + 1);
      if (!coincide) {
        differenze += 1;
        prima ||= riga.dove;
      }
    }
    const trovati = Array.from(visti.keys());
    controlli.push({
      nome, atteso, trovato: trovati.slice(0, 4).join(' · ') + (trovati.length > 4 ? ' · altri valori' : ''),
      differenze, prima, verificato: righe.length > 0 && differenze === 0,
    });
  }

  const sezioni = (dati.sezioni.length ? dati.sezioni : [null]).map((s, i) => ({ s, dove: 'sezione ' + (i + 1) }));
  const [larghezza, altezza] = pagine[profilo.pagina];
  controllo('Pagina', profilo.pagina + ' verticale', sezioni, ({ s }) => {
    const pg = figlio(s, 'pgSz');
    const w = numero(leggi(pg, 'w'));
    const h = numero(leggi(pg, 'h'));
    if (!Number.isFinite(w) || !Number.isFinite(h)) return ['Da verificare', false];
    const verticale = w < h && leggi(pg, 'orient') !== 'landscape';
    const nome = Object.keys(pagine).find(k => vicino(Math.min(w, h), pagine[k][0]) && vicino(Math.max(w, h), pagine[k][1]));
    return [nome ? nome + (verticale ? ' verticale' : ' orizzontale') : finito(w / 566.93) + ' × ' + finito(h / 566.93) + ' cm',
      verticale && vicino(w, larghezza) && vicino(h, altezza)];
  });
  controllo('Margini', finito(profilo.margini, ' cm'), sezioni, ({ s }) => {
    const lati = ['top', 'right', 'bottom', 'left'].map(lato => numero(leggi(figlio(s, 'pgMar'), lato)));
    return [Array.from(new Set(lati.map(v => finito(v / 566.93, ' cm')))).join(' / '),
      lati.every(v => vicino(v, cm(profilo.margini), 7))];
  });

  const paragrafi = corpoNarrativo(dati, capitoli).map(v => ({ ...v, dove: 'paragrafo ' + (v.indice + 1) }));
  const parole = paragrafi.flatMap(v => frammenti(v).map(run => ({ v, run, dove: v.dove })));
  controllo('Carattere', profilo.carattere, parole, ({ v, run }) => {
    const livelli = stileTesto(dati, v, run);
    const visibili = Array.from(new Set([
      font(dati, livelli, 'ascii') || font(dati, livelli, 'hAnsi'),
      font(dati, livelli, 'hAnsi') || font(dati, livelli, 'ascii'),
    ].filter(Boolean)));
    return [visibili.join(' / ') || 'Da verificare',
      visibili.length > 0 && visibili.every(f => f.toLowerCase() === profilo.carattere.toLowerCase())];
  });
  controllo('Corpo', finito(profilo.corpo, ' pt'), parole, ({ v, run }) => {
    const punti = numero(valore(stileTesto(dati, v, run), 'sz')) / 2;
    return [finito(punti, ' pt'), punti === profilo.corpo];
  });
  controllo('Interlinea', finito(profilo.interlinea), paragrafi, v => {
    const linea = numero(valore(v.parProp, 'spacing', 'line') ?? '240');
    const tipo = valore(v.parProp, 'spacing', 'lineRule') || 'auto';
    const trovato = tipo === 'auto' ? finito(linea / 240) : finito(linea / 20, ' pt') + (tipo === 'exact' ? ' esatti' : ' minimi');
    return [trovato, tipo === 'auto' && vicino(linea, Math.round(profilo.interlinea * 240), 1)];
  });
  controllo('Rientro prima riga', finito(profilo.rientro, ' cm'), paragrafi, v => {
    const misure = ['firstLine', 'hanging', 'firstLineChars', 'hangingChars'];
    const ind = v.parProp.map(n => figlio(n, 'ind')).find(n => misure.some(m => leggi(n, m) !== null));
    const sospeso = leggi(ind, 'hanging');
    const inCaratteri = leggi(ind, 'firstLineChars') !== null || leggi(ind, 'hangingChars') !== null;
    const rientro = sospeso !== null ? -numero(sospeso) : numero(leggi(ind, 'firstLine') ?? '0');
    return [inCaratteri ? 'Impostato in caratteri' : finito(rientro / 566.93, ' cm'),
      !inCaratteri && vicino(rientro, cm(profilo.rientro), 4)];
  });
  const allineamenti = { both: 'Giustificato', left: 'A sinistra', start: 'A sinistra', right: 'A destra', center: 'Centrato' };
  controllo('Allineamento', allineamenti[profilo.allineamento], paragrafi, v => {
    const jc = valore(v.parProp, 'jc') || 'left';
    return [allineamenti[jc] || jc, jc === profilo.allineamento || (jc === 'start' && profilo.allineamento === 'left')];
  });
  if (profilo.numeri) {
    const conNumeri = partiPagina(dati);
    controllo('Numeri di pagina', 'Campo PAGE in ogni sezione', sezioni, ({ s }) => {
      const trovato = conNumeri.get(s)?.haNumero;
      return [trovato ? 'Presente' : 'Non individuato', Boolean(trovato)];
    });
  }
  return controlli;
}

function riferimenti(dati) {
  const doc = xml(dati.pacchetto, RELS);
  const voci = Array.from(doc?.getElementsByTagNameNS(REL, 'Relationship') || []);
  return { doc, voci, perId: new Map(voci.map(el => [el.getAttribute('Id'), el])) };
}

function percorsoParte(rel) {
  const target = rel?.getAttribute('Target');
  if (!target || rel.getAttribute('TargetMode') === 'External') return null;
  const base = 'https://effinge.invalid/word/';
  try {
    const url = new URL(target, base);
    return url.origin === 'https://effinge.invalid' ? url.pathname.slice(1) : null;
  } catch {
    return null;
  }
}

function contieneNumero(doc) {
  return elementi(doc, 'fldSimple').some(f => /^\s*PAGE(?:\s|$)/i.test(leggi(f, 'instr') || '')) ||
    elementi(doc, 'p').some(p => /(?:^|\s)PAGE(?:\s|$)/i.test(elementi(p, 'instrText').map(n => n.textContent).join('')));
}

function partiPagina(dati) {
  const rel = riferimenti(dati).perId;
  const noti = new Map();
  const risultati = new Map();
  const ereditati = { headerReference: null, footerReference: null };
  for (const s of dati.sezioni) {
    for (const tipo of Object.keys(ereditati)) {
      const ref = figli(s, tipo).find(n => leggi(n, 'type') === 'default');
      if (ref) {
        const voce = rel.get(ref.getAttributeNS(R, 'id'));
        const suffisso = tipo === 'headerReference' ? '/header' : '/footer';
        ereditati[tipo] = voce?.getAttribute('Type') === R + suffisso ? percorsoParte(voce) : null;
      }
    }
    const parti = Object.values(ereditati).filter(Boolean);
    const haNumero = parti.some(nome => {
      if (!noti.has(nome)) noti.set(nome, contieneNumero(xml(dati.pacchetto, nome)));
      return noti.get(nome);
    });
    risultati.set(s, { haNumero, footer: ereditati.footerReference });
  }
  return risultati;
}

function avvisiPulizia(dati) {
  const avvisi = [];
  const marcatori = [
    ['Commenti', elementi(dati.corpo, 'commentRangeStart').length || elementi(dati.corpo, 'commentReference').length],
    ['Revisioni registrate', ['ins', 'del', 'moveFrom', 'moveTo', 'pPrChange', 'rPrChange', 'sectPrChange', 'tblPrChange']
      .reduce((somma, nome) => somma + elementi(dati.corpo, nome).length, 0)],
    ['Evidenziature', elementi(dati.corpo, 'highlight').filter(n => leggi(n) !== 'none').length],
  ];
  marcatori.forEach(([nome, quanti]) => { if (quanti) avvisi.push(nome + ' individuati · ' + quanti); });
  const prove = [
    ['Possibili segnaposto', /\b(?:TODO|TBD|XXX)\b|\[(?:inserire|aggiungere|controllare)[^\]]*\]/i],
    ['Spazi ripetuti o tabulazioni', / {2,}|\t/],
  ];
  for (const [nome, rx] of prove) {
    const trovati = dati.par.filter(v => rx.test(v.testo));
    if (trovati.length) avvisi.push(nome + ' · ' + trovati.length + ' paragrafi, dal n. ' + (trovati[0].indice + 1));
  }
  let vuoti = 0;
  for (const v of dati.par) {
    if (v.testo.trim() || v.tabella || elementi(v.p, 'drawing').length || elementi(v.p, 'br').length) {
      vuoti = 0;
    } else if (++vuoti === 3) {
      avvisi.push('Sequenza di righe vuote dal paragrafo ' + (v.indice - 1));
      break;
    }
  }
  if (Object.keys(dati.pacchetto).some(n => /^word\/(?:footnotes|endnotes)\.xml$/.test(n))) {
    avvisi.push('Sono presenti note. Controlla il richiamo e l’impaginazione nella copia finale.');
  }
  if (dati.sezioni.some(s => figli(s, 'footerReference').some(f => leggi(f, 'type') !== 'default'))) {
    avvisi.push('Sono presenti piè di pagina distinti. Verifica prima pagina e pagine pari nella copia finale.');
  }
  if (dati.contenutoCollegato) avvisi.push('Il documento contiene parti collegate. Verifica il testo in Word e confronta i conteggi.');
  return avvisi;
}

export function rapporto(dati, profilo, capitoli) {
  const stringhe = dati.par.map(v => v.testo);
  const totale = stringhe.reduce((acc, s) => {
    acc.battute += Array.from(s.replace(/[\r\n]/g, '')).length;
    acc.parole += s.trim().match(/\S+/g)?.length || 0;
    return acc;
  }, { battute: 0, parole: 0 });
  const core = xml(dati.pacchetto, 'docProps/core.xml');
  const metadati = ['creator', 'lastModifiedBy'].map(n => testo(core?.getElementsByTagNameNS('*', n)[0])).filter(Boolean);
  const prima = [];
  const primoCapitolo = dati.par.find(v => capitoli.has(v.indice))?.indice ?? dati.par.length;
  for (const v of dati.par.slice(0, Math.min(primoCapitolo, 20))) {
    if (v.testo.trim()) prima.push(v.testo);
    if (interruzioneInterna(v.p)) break;
  }
  return {
    formato: formato(dati, profilo, capitoli), capitoli: struttura(dati, capitoli, profilo), totale,
    pulizia: avvisiPulizia(dati), metadati: Array.from(new Set(metadati)),
    stacchi: stringhe.filter(s => STACCO.test(s.trim())).length,
    emailInApertura: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(prima.join(' ')),
    titolo: testo(core?.getElementsByTagNameNS('*', 'title')[0]),
    parziali: dati.contenutoCollegato, protetto: dati.protetto,
  };
}

const interruzioneInterna = p => elementi(p, 'br').some(n => leggi(n, 'type') === 'page') || figlio(figlio(p, 'pPr'), 'sectPr');

const ORDINE = {
  p: 'pPr',
  r: 'rPr',
  pPr: 'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange',
  rPr: 'rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang eastAsianLayout specVanish oMath rPrChange',
  sectPr: 'headerReference footerReference footnotePr endnotePr type pgSz pgMar paperSrc pgBorders lnNumType pgNumType cols formProt vAlign noEndnote titlePg textDirection bidi rtlGutter docGrid printerSettings sectPrChange',
};

function aggiungi(nodo, nome, attributi = {}, sempre = false) {
  let el = sempre ? null : figlio(nodo, nome);
  if (!el) {
    el = nodo.ownerDocument.createElementNS(W, 'w:' + nome);
    const ordine = (ORDINE[nodo.localName] || '').split(' ');
    const posizione = ordine.indexOf(nome);
    const dopo = nome === 'pPr' || nome === 'rPr' ? nodo.firstChild
      : posizione >= 0 ? Array.from(nodo.children).find(child => ordine.indexOf(child.localName) > posizione) : null;
    nodo.insertBefore(el, dopo || null);
  }
  for (const [chiave, val] of Object.entries(attributi)) imposta(el, chiave, val);
  return el;
}

function aggiungiNumero(doc) {
  const p = aggiungi(doc.documentElement, 'p', {}, true);
  aggiungi(aggiungi(p, 'pPr'), 'jc', { val: 'center' });
  const campo = aggiungi(p, 'fldSimple', { instr: ' PAGE ' });
  aggiungi(aggiungi(campo, 'r'), 't').textContent = '1';
}

function numeroPagina(dati) {
  const sezioni = partiPagina(dati);
  const rel = riferimenti(dati);
  const daSalvare = new Map();
  let nuovoId;
  for (const [sezione, info] of sezioni) {
    if (info.haNumero) continue;
    if (info.footer && dati.pacchetto[info.footer]) {
      if (!daSalvare.has(info.footer)) {
        const doc = xml(dati.pacchetto, info.footer);
        aggiungiNumero(doc);
        daSalvare.set(info.footer, doc);
      }
      continue;
    }
    if (!nuovoId) {
      let indice = 1;
      let parte = 'word/footerEffinge.xml';
      while (dati.pacchetto[parte]) parte = 'word/footerEffinge' + indice++ + '.xml';
      indice = 1;
      do { nuovoId = 'rIdEffinge' + indice++; } while (rel.perId.has(nuovoId));
      const doc = leggiXml('<w:ftr xmlns:w="' + W + '"/>');
      aggiungiNumero(doc);
      daSalvare.set(parte, doc);
      rel.doc ||= leggiXml('<Relationships xmlns="' + REL + '"/>');
      const item = rel.doc.createElementNS(REL, 'Relationship');
      item.setAttribute('Id', nuovoId);
      item.setAttribute('Type', R + '/footer');
      item.setAttribute('Target', parte.slice(5));
      rel.doc.documentElement.append(item);
      const override = dati.tipi.createElementNS(CT, 'Override');
      override.setAttribute('PartName', '/' + parte);
      override.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml');
      dati.tipi.documentElement.append(override);
    }
    const corrente = figli(sezione, 'footerReference').find(n => leggi(n, 'type') === 'default');
    const riferimento = corrente || aggiungi(sezione, 'footerReference', { type: 'default' }, true);
    riferimento.setAttributeNS(R, 'r:id', nuovoId);
  }
  for (const [nome, doc] of daSalvare) salvaXml(dati.pacchetto, nome, doc);
  if (nuovoId) {
    salvaXml(dati.pacchetto, RELS, rel.doc);
    salvaXml(dati.pacchetto, TIPI, dati.tipi);
  }
}

export function correggi(originale, profilo, capitoli, azione) {
  if (originale.protetto) throw new Error('La protezione o la firma digitale del file impediscono di applicare correzioni.');
  const dati = modello({ ...originale.pacchetto });
  if (azione === 'capitoli') {
    for (const c of struttura(dati, capitoli, profilo).filter(c => c.interruzione)) {
      aggiungi(aggiungi(dati.par[c.indice].p, 'pPr'), 'pageBreakBefore', { val: 1 });
    }
  } else {
    if (!dati.sezioni.length) dati.sezioni.push(aggiungi(dati.corpo, 'sectPr'));
    for (const s of dati.sezioni) {
      const [w, h] = pagine[profilo.pagina];
      const misura = aggiungi(s, 'pgSz', { w, h, orient: 'portrait' });
      misura.removeAttributeNS(W, 'code');
      const margine = cm(profilo.margini);
      const mar = aggiungi(s, 'pgMar', { top: margine, right: margine, bottom: margine, left: margine });
      for (const [nome, val] of [['header', 720], ['footer', 720], ['gutter', 0]]) {
        if (leggi(mar, nome) === null) imposta(mar, nome, val);
      }
    }
    for (const v of corpoNarrativo(dati, capitoli)) {
      const prop = aggiungi(v.p, 'pPr');
      aggiungi(prop, 'spacing', { line: Math.round(profilo.interlinea * 240), lineRule: 'auto' });
      const ind = aggiungi(prop, 'ind', { firstLine: cm(profilo.rientro) });
      ind.removeAttributeNS(W, 'hanging');
      ind.removeAttributeNS(W, 'firstLineChars');
      ind.removeAttributeNS(W, 'hangingChars');
      aggiungi(prop, 'jc', { val: profilo.allineamento });
      for (const run of frammenti(v)) {
        const pr = aggiungi(run, 'rPr');
        const carattere = profilo.carattere;
        const f = aggiungi(pr, 'rFonts', { ascii: carattere, hAnsi: carattere, eastAsia: carattere, cs: carattere });
        for (const attr of ['asciiTheme', 'hAnsiTheme', 'eastAsiaTheme', 'cstheme']) f.removeAttributeNS(W, attr);
        aggiungi(pr, 'sz', { val: profilo.corpo * 2 });
        aggiungi(pr, 'szCs', { val: profilo.corpo * 2 });
      }
    }
    if (profilo.numeri) numeroPagina(dati);
  }
  salvaXml(dati.pacchetto, MAIN, dati.doc);
  return modello(dati.pacchetto);
}

export function scaricaDocumento(dati) {
  return new Blob([zipSync(dati.pacchetto, { level: 3 })], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
