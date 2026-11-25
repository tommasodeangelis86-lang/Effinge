# Guida per gestire Effinge

Questa guida spiega come mettere online il sito la prima volta (si fa una sola volta) e come
gestirlo ogni giorno: pubblicare testi, creare pagine, cambiare colori e animazione.

Non serve scrivere codice. Tutto si fa da un pannello web, **Pages CMS**. Per aprirlo vai su **effinge.it/admin** (porta a app.pagescms.org). Ogni salvataggio
ripubblica il sito da solo in circa un minuto.

---

## Parte 1 — Pubblicazione e pannello

### Pubblicare con GitHub Pages

Il flusso **Pubblica il sito** compila e pubblica Effinge su **GitHub Pages** a ogni modifica su `main`.
Vale anche per i salvataggi dal pannello e per «Pubblica sul sito» da Scrivi. Puoi seguire la
pubblicazione nella scheda **Actions** del repository Effinge.

In **Settings → Pages**, la fonte di pubblicazione è **GitHub Actions** e il dominio personalizzato
è `www.effinge.it`. L’opzione **Enforce HTTPS** usa una connessione protetta.

### Collegare il pannello Pages CMS

1. Apri **effinge.it/admin** e clicca **Sign in with GitHub**.
2. Autorizza Pages CMS per il repository **Effinge** quando te lo chiede.
3. Apri il repository e scegli il ramo **main**.
4. A sinistra trovi **Testi**, **Pagine**, **Impostazioni del sito** e **Media**.

### DNS di effinge.it su Aruba

Il dominio principale `effinge.it` punta a GitHub Pages con quattro record **A** per `@`
(`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
Il record **CNAME** di `www` punta all’host GitHub Pages dell’account proprietario del repository,
composto dal nome utente GitHub seguito da `.github.io`. I record **MX** gestiscono la posta e sono
indipendenti dalla pubblicazione del sito.

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
   homepage nella sezione «Quaderni», nell’archivio e con la sua pagina di lettura.

**Modificare** un testo: aprilo dall’elenco, cambia e salva.
**Togliere** un testo dal sito: rimetti la spunta **Bozza**, oppure eliminalo (*Delete*).
**Metterlo in evidenza** in homepage: spunta **In evidenza in homepage**.

La sezione «Quaderni» della homepage compare con il primo testo pubblicato. «Dall’archivio» compare dal secondo. Le pagine «Il progetto» e «Contatti» sono in bozza: scrivile e togli la spunta «Bozza» per farle comparire nel menu.

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
- **Animazione della scritta**: puoi attivarla o disattivarla e regolare la velocità in millisecondi
  per lettera, l’attesa iniziale, la durata della luce e la visibilità del cursore. In homepage,
  i titoli «Scrivi», «Guide per chi scrive» e «Quaderni» si animano la prima volta che entrano nello
  schermo. La scelta sulla ripetizione tra visite riguarda la scritta d’apertura.
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
- Sopra il foglio trovi i conteggi del capitolo in parole, battute e cartelle e i comandi **Riscrivi**,
  **Cartella** e **Manoscritto** (A4, margini 2,3 cm, interlinea 1,5, rientro 0,42 cm).

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

**Pubblica sul sito (solo per te).** Dal foglio puoi pubblicare il capitolo aperto come testo di
Effinge, senza passare dal pannello. Il collegamento «Pubblicazione GitHub» va fatto una volta per dispositivo.

1. Su GitHub crea una chiave personale: vai su **github.com/settings/personal-access-tokens/new**.
   - *Token name*: `Effinge Scrivi`; *Expiration*: la durata che preferisci (alla scadenza ne crei un’altra).
   - *Repository access*: **Only select repositories** → **Effinge**.
   - *Permissions* → *Repository permissions* → **Contents: Read and write**.
   - **Generate token** e copia la chiave (inizia con `github_pat_`; GitHub la mostra una volta sola).
2. In Scrivi apri **Opere → Pubblicazione GitHub**, incolla la chiave e premi **Collega**.
3. In alto compare **Pubblica sul sito**: scegli titolo, categoria, data ed estratto, «Pubblica subito» o
   «Salva come bozza», e conferma. Dopo circa un minuto il testo è online (le bozze solo in anteprima).
   Ripubblicando lo stesso capitolo, il testo sul sito viene aggiornato.

La chiave resta solo nel browser di quel dispositivo e può scrivere solo nel repository Effinge. Non
inserirla su computer di altri. Per toglierla: «Scollega»; per revocarla ovunque, eliminala su GitHub.

L’[archivio privato di Scrivi](archivio-privato.md) descrive anche il funzionamento con Supabase quando è attivo.

**Dove finisce quello che scrivi.** Tutto resta **nel browser del dispositivo che usi**: quello che
scrivi su iPhone non compare sul computer, e niente viene inviato a te o al sito. Se cancelli i dati
del browser, le opere si perdono: esporta in Word regolarmente come copia di sicurezza.
Chiunque visiti il sito può usare Scrivi, ma ognuno vede solo le proprie opere.

### Farsi trovare su Google

- **Homepage**: titolo e descrizione per Google si cambiano in **Impostazioni del sito → Sito**
  («Titolo della homepage su Google», «Descrizione della homepage su Google»).
- **Ogni testo**: il titolo per Google si compone da solo («Titolo — Categoria | Effinge»). La
  descrizione si scrive nel campo **Descrizione per Google** del pannello oppure nella finestra
  «Pubblica sul sito» di Scrivi; se resta vuota si usa l’estratto. Conviene spiegare in una frase
  **di cosa parla** il testo, perché i titoli letterari non contengono le parole che le persone cercano.
- La **sitemap** (`https://www.effinge.it/sitemap.xml`) si aggiorna da sola a ogni pubblicazione.
- Quando condividi un link, compare l’immagine del foglio sotto la lampada; un testo con la sua
  **Immagine** usa quella.

## Guide per chi scrive

Le guide stanno in `src/guide/` (una per file, in Markdown). In cima a ogni file: `titolo`, `titolo_completo` (titolo per Google), `seo_descrizione`, `ordine` (posizione nell’elenco) e `faq`, la lista di domande e risposte (`d:` domanda, `r:` risposta) che appare in fondo alla pagina e viene segnalata a Google come FAQ. Escono su `/guide/<nome-file>/`, nell’indice `/guide/` e nella sitemap da sole. Il calcolatore di cartelle è il blocco `data-calcolatore` nella guida sulle cartelle.

## Effinge Art

Nel pannello (https://app.pagescms.org, oppure www.effinge.it/admin/) la voce **Effinge Art** contiene tutti i testi della galleria: la presentazione in apertura (un paragrafo per riquadro), il testo delle commissioni, i social accanto alla foto (compaiono solo se ne inserisci almeno uno), i titoli delle sezioni e la scheda di ogni quadro (titolo, sottotitolo, anno e luogo, stato, descrizione). La casella «Nel mosaico in apertura» sceglie i quadri del mosaico (pensato per 12). Sui quadri «Disponibile» compare da solo il pulsante «Richiedi informazioni», che apre una mail all’indirizzo indicato in alto. L’ordine dei quadri nel pannello è l’ordine nella galleria. Per un quadro nuovo carica la foto nel campo «Foto del quadro» e scegli un «Nome nell’indirizzo» (minuscole e trattini).

## Il Narratore in Scrivi

Nella colonna di destra di Scrivi:
- **Voce**: ▶ legge il capitolo (o solo il brano selezionato), ■ ferma (anche Esc). L’icona accanto apre le impostazioni: chi legge (voce del sistema gratis, oppure OpenAI o ElevenLabs con la propria chiave), voce, velocità e «Mentre scrivi» (Manuale, Frase, Auto).
- **Suggerimenti**: Migliora, Taglia, Stile. Le frasi da rivedere vengono sottolineate; toccandole si vede la proposta con «Accetta» o «Ignora». Il testo non cambia finché non tocchi «Accetta» (e Ctrl+Z annulla).
- **Chiavi AI**: ognuno inserisce le proprie chiavi API (Claude, OpenAI, Gemini, ElevenLabs). Restano nel suo browser e vanno solo al fornitore: Effinge non le vede e non paga i consumi. Le chiavi API si creano nelle console dei fornitori; gli abbonamenti alla chat (ChatGPT Plus, Claude Pro) non le includono.

## Cosa richiede ancora me (o un tecnico)

- cambiare l’impaginazione, i caratteri o il comportamento della lampada oltre le impostazioni;
- aggiungere nuovi tipi di sezione in homepage.

Il resto lo gestisci tu.
