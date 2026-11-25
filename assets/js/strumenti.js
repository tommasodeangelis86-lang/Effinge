(function () {
  'use strict';

  const strumento = document.querySelector('[data-strumento]');
  if (!strumento) return;
  const campo = strumento.querySelector('textarea');
  const apri = strumento.querySelector('[data-apri-testo]');
  const errore = strumento.querySelector('[data-errore-strumento]');
  const stato = strumento.querySelector('[data-stato-strumento]');
  const formato = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
  const segmenta = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('it', { granularity: 'sentence' }) : null;
  const paroleItaliane = /\p{L}[\p{L}\p{M}]*(?:['’][\p{L}\p{M}]+)*/gu;
  const stopword = new Set(`a ad ai al allo alla alle agli all anche alcune alcuni altro altri altra altre ancora avere aveva avevano aver abbiamo
    che chi ci c coi col come con contro così cui da dal dallo dalla dalle dagli dai de del dello della delle degli dei dell dentro di d dopo dove
    e è ed era erano essere esser essendo fa fai fare fra fu furono gli ha hai hanno ho i il in io l la là le lei li lo loro lui ma me mentre mi mia mie mio miei
    ne né nei nel nello nella nelle negli nell noi non nostra nostre nostro nostri o od ogni oltre per però più poi prima proprio qua quale quali quando quanto quasi
    quel quella quelle quelli quello quest queste questi questa questo qui s se sei senza si sì sia siamo siete sopra sono sotto sta stato stessa stesso su sui sul sullo
    sulla sulle sugli sull sua sue suo suoi te ti tra tre tu tua tue tuo tuoi un una uno vi voi vostra vostre vostro vostri già pure tutto tutti tutte tutta`.split(/\s+/));
  const nonAvverbi = new Set(['mente', 'semente', 'clemente', 'inclemente', 'demente', 'veemente']);
  const prefisso = 'effinge-strumenti-bozza:';
  const durataBozza = 600000;
  const anteprimaMassima = 24000;
  let timer;

  function mostra(misure) {
    for (const el of strumento.querySelectorAll('[data-misura]')) {
      const valore = misure[el.dataset.misura];
      el.textContent = typeof valore === 'number' ? formato.format(valore) : valore;
    }
  }

  function calcola(testo) {
    const misure = window.EffingeMisuraTesto(testo);
    const secondi = Math.ceil(misure.parole * 60 / 200);
    const minuti = Math.floor(secondi / 60);
    mostra({
      ...misure,
      cartelle1800: misure.battute / 1800,
      cartelle2000: misure.battute / 2000,
      lettura: minuti ? `${formato.format(minuti)} min ${secondi % 60} s` : `${secondi} s`,
    });
    stato.textContent = `${formato.format(misure.parole)} parole, ${formato.format(misure.battute)} battute con spazi.`;
  }

  function normalizza(valore) {
    const parola = valore.normalize('NFC').toLocaleLowerCase('it').replace(/’/g, "'");
    const apostrofo = parola.indexOf("'");
    return apostrofo > 0 && stopword.has(parola.slice(0, apostrofo)) ? parola.slice(apostrofo + 1) : parola;
  }

  function eAvverbio(parola) {
    return parola.endsWith('mente') && !nonAvverbi.has(parola);
  }

  const analisi = strumento.querySelector('[data-ripetizioni]');
  const tabella = strumento.querySelector('[data-tabella-ripetizioni]');
  const evidenziato = strumento.querySelector('[data-testo-evidenziato]');

  function analizza(testo) {
    let parole = 0, significative = 0, avverbi = 0, frasi = 0;
    const frequenze = new Map();
    for (const [valore] of testo.matchAll(paroleItaliane)) {
      const parola = normalizza(valore);
      parole++;
      if (eAvverbio(parola)) avverbi++;
      if (stopword.has(parola)) continue;
      significative++;
      frequenze.set(parola, (frequenze.get(parola) || 0) + 1);
    }
    const segmenti = segmenta ? segmenta.segment(testo) : testo.split(/[.!?…]+/).map(segment => ({ segment }));
    for (const { segment } of segmenti) if (/\p{L}/u.test(segment)) frasi++;
    const top = [...frequenze].filter(([, n]) => n > 1)
      .sort(([a, n], [b, m]) => m - n || a.localeCompare(b, 'it')).slice(0, 15);
    mostra({ avverbi, mediaFrase: frasi ? parole / frasi : 0, densita: `${formato.format(parole ? 100 * significative / parole : 0)}%` });
    stato.textContent = `${top.length} parole ripetute in tabella. ${avverbi} possibili avverbi.`;
    analisi.hidden = !testo.trim();
    tabella.hidden = !top.length;
    strumento.querySelector('[data-nessuna-ripetizione]').hidden = !!top.length;
    tabella.tBodies[0].replaceChildren(...top.map(([parola, n]) => {
      const riga = document.createElement('tr');
      const titolo = document.createElement('th');
      titolo.scope = 'row';
      titolo.textContent = parola;
      riga.append(titolo);
      riga.insertCell().textContent = formato.format(n);
      return riga;
    }));

    const anteprima = testo.slice(0, anteprimaMassima);
    strumento.querySelector('[data-anteprima-ridotta]').hidden = testo.length === anteprima.length;
    const paroleEvidenziate = new Set(top.map(([parola]) => parola));
    const frammento = document.createDocumentFragment();
    let cursore = 0;
    for (const corrispondenza of anteprima.matchAll(paroleItaliane)) {
      const valore = corrispondenza[0], parola = normalizza(valore), posizione = corrispondenza.index;
      const ripetuta = paroleEvidenziate.has(parola), avverbio = eAvverbio(parola);
      if (!ripetuta && !avverbio) continue;
      frammento.append(anteprima.slice(cursore, posizione));
      const segno = document.createElement(ripetuta ? 'mark' : 'span');
      if (avverbio) segno.className = 'avverbio';
      segno.textContent = valore;
      frammento.append(segno);
      cursore = posizione + valore.length;
    }
    frammento.append(anteprima.slice(cursore));
    evidenziato.replaceChildren(frammento);
  }

  function aggiorna() {
    const testo = campo.value;
    apri.disabled = !testo.trim();
    errore.hidden = true;
    clearTimeout(timer);
    if (analisi) timer = setTimeout(() => analizza(testo), 160);
    else calcola(testo);
  }
  campo.addEventListener('input', aggiorna);
  addEventListener('pageshow', aggiorna);
  aggiorna();

  apri.addEventListener('click', () => {
    if (!campo.value.trim()) return;
    try {
      const adesso = Date.now();
      for (const chiave of Object.keys(localStorage)) {
        if (!chiave.startsWith(prefisso)) continue;
        let bozza;
        try { bozza = JSON.parse(localStorage.getItem(chiave)); } catch {}
        if (!bozza || !Number.isFinite(bozza.data) || adesso - bozza.data > durataBozza) localStorage.removeItem(chiave);
      }
      const id = crypto.randomUUID();
      localStorage.setItem(prefisso + id, JSON.stringify({ testo: campo.value, data: adesso }));
      location.assign('/scrivi/?testo=' + id);
    } catch {
      errore.textContent = 'Il browser non riesce a trasferire il testo. Puoi copiarlo e incollarlo nel Foglio.';
      errore.hidden = false;
    }
  });
})();
