# Guida per gestire Effinge

Questa guida spiega come mettere online il sito la prima volta (si fa una sola volta) e come
gestirlo ogni giorno: pubblicare testi, creare pagine, cambiare colori e animazione.

Non serve scrivere codice. Tutto si fa da un pannello web, **Pages CMS**. Ogni salvataggio
ripubblica il sito da solo in circa un minuto.

---

## Parte 1 — Messa online (una volta sola)

Servono tre account gratuiti: **GitHub** (dove vive il sito, ce l’hai già), **Netlify**
(che lo pubblica) e **Pages CMS** (il pannello, si entra con GitHub).

### 1. Pubblicare il sito su Netlify

1. Vai su **app.netlify.com** e scegli *Sign up* → *GitHub*.
2. Clicca **Add new project** → **Import an existing project** → **GitHub**.
3. Autorizza Netlify e scegli il repository **Effinge**.
4. Nella schermata successiva controlla:
   - *Branch to deploy*: **main**
   - *Build command*: `npm run build` (già scritto in automatico)
   - *Publish directory*: `_site` (già scritto in automatico)
5. Clicca **Deploy**. Dopo un minuto il sito è online a un indirizzo provvisorio, per esempio
   `qualcosa-123.netlify.app`. Puoi cambiarlo in *Site configuration → Change site name*
   (per esempio `effinge.netlify.app`).

### 2. Collegare il pannello Pages CMS

1. Vai su **app.pagescms.org** e clicca **Sign in with GitHub**.
2. Installa l’app quando te lo chiede e dai accesso al repository **Effinge**.
3. Apri il repository e scegli il ramo **main**.
4. A sinistra vedi tre voci: **Testi**, **Pagine**, **Impostazioni del sito**, più **Media**
   per le immagini.

### 3. Collaudo (prima di collegare effinge.it)

Come previsto dal brief, prova da solo queste due cose sull’indirizzo provvisorio:

- pubblica un testo nuovo (Parte 2, «Pubblicare un testo»);
- cambia la velocità o l’intensità della lampada (Parte 2, «Animazione e lampada»).

Se tutto torna, colleghi il dominio.

### 4. Collegare effinge.it (Aruba)

1. Su Netlify: *Domain management* → **Add a domain** → scrivi `effinge.it` → *Verify* →
   *Add domain*. Netlify mostra i **valori DNS** da copiare: un record per `effinge.it` e
   uno per `www.effinge.it`. Tienili aperti.
2. Su Aruba: entra in **admin.aruba.it** → *Domini* → **effinge.it** →
   **Gestione DNS e name server**.
3. Modifica (o aggiungi) i due record con i valori di Netlify:
   - il record **A** del dominio principale (`@` o `effinge.it`);
   - il record **CNAME** di `www`.
4. **Non toccare i record MX**: sono quelli della posta @effinge.it.
5. Salva. Entro qualche ora (a volte fino a 24) il sito risponde su effinge.it e Netlify attiva da
   solo il certificato https (il lucchetto).
6. Nel pannello, in **Impostazioni del sito → Sito**, attiva **Visibile su Google**.

---

## Parte 2 — L’uso quotidiano

### Pubblicare un testo

1. Pannello → **Testi** → **Add an entry** (Nuovo).
2. Compila **Titolo**, **Data**, **Categoria** (es. Racconto, Frammento) ed **Estratto**.
3. Scrivi nel campo **Testo**. I pulsanti servono per corsivo, grassetto, titoletti, citazioni
   e la **linea orizzontale** (la pausa tra due parti).
4. Il nuovo testo parte come **Bozza**: non è ancora visibile. Salva (**Save**).
5. Per vederlo prima di pubblicarlo apri `https://il-tuo-sito/anteprima/nome-del-testo/`
   (il nome del file senza la data: lo vedi nell’elenco dei testi).
6. Quando è pronto, togli la spunta **Bozza** e salva. Dopo circa un minuto è online: in
   homepage come «Ultimo testo», nell’archivio e con la sua pagina di lettura.

**Modificare** un testo: aprilo dall’elenco, cambia e salva.
**Togliere** un testo dal sito: rimetti la spunta **Bozza**, oppure eliminalo (*Delete*).
**Metterlo in evidenza** in homepage: spunta **In evidenza in homepage**.

All’inizio non ci sono testi pubblicati: le sezioni «Ultimo testo» e «Dall’archivio» della homepage compaiono da sole con il primo testo. Le pagine «Il progetto» e «Contatti» sono in bozza: scrivile e togli la spunta «Bozza» per farle comparire nel menu.

### Creare una nuova pagina

1. Pannello → **Pagine** → **Add an entry**.
2. Scrivi **Titolo** e **Testo**.
3. **Mostra nel menu in alto** la aggiunge al menu; **Posizione nel menu** decide l’ordine.
4. Salva. La pagina sarà all’indirizzo `/titolo-della-pagina/`.

«Il progetto» e «Contatti» si modificano allo stesso modo.

### Cambiare i colori

Pannello → **Impostazioni del sito → Colori**. Ogni colore è un codice come `#ECE7DC`.

| Cosa | Predefinito | Alternative suggerite |
|---|---|---|
| Carta | `#ECE7DC` avorio | `#F3F1EC` bianco, `#E4DED2` sabbia, `#DCD9D2` grigio perla |
| Stanza (sfondo) | `#0A0A09` | `#0E0D0B` caldo, `#090A0C` freddo |
| Inchiostro | `#1A1916` | `#22201C` più morbido |

Un singolo testo o una singola pagina può avere una carta diversa: compila il suo campo
**Colore della carta**. Lascialo vuoto per usare il colore generale.

### Animazione e lampada

Pannello → **Impostazioni del sito**:

- **Apertura della homepage**: la scritta animata, il sottotitolo e le piccole scritte del foglio.
- **Animazione della scritta**: attiva o disattiva; velocità (millisecondi per lettera, più basso
  = più veloce); attesa iniziale; durata della luce su ogni lettera; cursore; se ripeterla a ogni
  visita o una volta sola.
- **Lampada**: colore della luce e intensità (più basso = più fioca).
- **Il progetto**: le righe che si accendono scorrendo (aggiungi, togli, riordina).
- **Homepage**: quali sezioni mostrare, quanti testi in «Dall’archivio», la frase finale.

Chi ha attivato «riduci movimento» nel telefono o nel computer vede sempre il sito fermo:
è una scelta di accessibilità, non un errore.

### Immagini

Un testo può avere un’**Immagine** facoltativa: caricala dal campo o da **Media**, e scrivi la
**Descrizione dell’immagine** per chi non può vederla.

---

### Scrivere: la pagina Scrivi

La pagina **Scrivi** (nel menu in alto e nella sezione «Scrivi» della homepage) è un piccolo
programma di scrittura per libri, sotto la lampada.

- **Al centro il foglio.** Ogni lettera che scrivi si accende di luce dorata e torna inchiostro.
  La **lampada segue il mouse**: per rileggere basta muovere il mouse sul punto che ti interessa.
  Mentre scrivi, invece, segue il cursore. Con **Concentrazione** attiva, mentre scrivi il
  paragrafo corrente resta acceso e gli altri si attenuano; quando muovi il mouse torna tutto acceso.
- **A sinistra i capitoli**, come il riquadro di spostamento di Word: un’anteprima per ogni
  copertina, parte e capitolo, in ordine, con il numero di parole. Tocca un’anteprima per aprirla.
  Con le frecce la sposti su o giù (sul computer puoi anche trascinarla); con la × la elimini
  (tocca di nuovo «Conferma»). In fondo: **+ Capitolo**, **+ Parte**, **+ Copertina** e il
  totale dell’opera in parole, battute e cartelle. Sul telefono il pannello si apre con «Capitoli».
- **A destra la formattazione**, come in Word: stili (Normale, Sottotitolo, Titoletto,
  Citazione), grassetto, corsivo, sottolineato, barrato, allineamenti, elenchi, stacco tra scene
  (*), annulla, ripeti e cancella formattazione. Funzionano anche Ctrl/Cmd + B, I, U, Z.
- **In alto**: il titolo dell’opera (si modifica toccandolo), **Opere** per passare da un’opera
  all’altra o crearne una nuova, **Importa da Word** ed **Esporta in Word**.
- Sotto il titolo di ogni capitolo: parole, battute e cartelle (2000 battute spazi inclusi) e il
  pulsante **Manoscritto** (A4, margini 2,3 cm, interlinea 1,5, rientro 0,42 cm).

**Importa da Word.** Scegli un file .docx: il programma ti mostra cosa ha trovato (copertina, parti,
capitoli, parole) e, se confermi, crea una nuova opera senza toccare quella aperta. Ogni paragrafo
con uno stile di titolo apre un capitolo: funzionano «Titolo», «Sottotitolo», «Titolo 1», «Titolo 2»
e anche stili personalizzati con «titolo» nel nome (come il tuo «TA titolo capitolo»). I titoli
«Parte …» diventano parti; quello che sta prima del primo titolo diventa la copertina; i titoli
numerati in automatico da Word diventano capitoli numerati; gli asterischi tra le scene diventano
stacchi; le note a piè di pagina vanno in fondo al loro capitolo.

**Esporta in Word.** Crea un .docx in formato manoscritto (A4, margini 2,3 cm, interlinea 1,5,
rientro 0,42 cm, Times New Roman 12, numeri di pagina): copertina, poi ogni parte e capitolo su una
pagina nuova con lo stile «Titolo 1». Il file si può reimportare con la stessa struttura. Le note
a piè di pagina diventano note in fondo al capitolo, non note di Word.

**Dove finisce quello che scrivi.** Tutto resta **nel browser del dispositivo che usi**: quello che
scrivi su iPhone non compare sul computer, e niente viene inviato a te o al sito. Se cancelli i dati
del browser, le opere si perdono: esporta in Word regolarmente come copia di sicurezza.
Chiunque visiti il sito può usare Scrivi, ma ognuno vede solo le proprie opere.

## Cosa richiede ancora me (o un tecnico)

- cambiare l’impaginazione, i caratteri o il comportamento della lampada oltre le impostazioni;
- aggiungere nuovi tipi di sezione in homepage.

Il resto lo gestisci tu.
