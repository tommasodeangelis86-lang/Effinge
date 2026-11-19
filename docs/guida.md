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

I quattro testi presenti ora sono **segnaposto**: eliminali quando pubblichi i tuoi.

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

### Scrivere sul foglio (spazio privato)

All’indirizzo **/scrivi/** del sito (per esempio `https://effinge.it/scrivi/`) c’è un foglio
su cui scrivere davvero: ogni lettera si accende sotto la lampada, la lampada segue il cursore e
il paragrafo su cui stai scrivendo resta acceso mentre gli altri si attenuano.

- **Fogli**: elenco dei tuoi scritti; da qui ne crei uno nuovo, ne apri uno o lo elimini
  (si tocca «Elimina» e poi «Conferma»). Puoi anche scaricare il foglio aperto in un file .txt.
- **Concentrazione** e **Lampada** accendono o spengono i due effetti.
- **Copia** copia titolo e testo, per incollarli nel pannello quando vuoi pubblicarli.
- Sotto il titolo vedi **parole, battute e cartelle** (cartella editoriale = 2000 battute, spazi
  inclusi, a capo esclusi).
- **Manoscritto** porta il foglio all’impaginazione di un manoscritto reale: foglio A4 (21 cm),
  margini di 2,3 cm su tutti i lati, interlinea 1,5 e rientro di 0,42 cm a ogni paragrafo. Sul
  telefono il foglio è più stretto di 21 cm: margini e rientro restano in proporzione. Il rientro
  è automatico; quando copi o scarichi il testo non viene incluso.

Il salvataggio è automatico, ma **solo nel browser e sul dispositivo che stai usando**: quello che
scrivi su iPhone non compare sul computer. Se cancelli i dati di Safari, i fogli si perdono:
per i testi importanti usa «Copia» o «Scarica».

La pagina non è nel menu e Google non la indicizza, ma chi conosce l’indirizzo può aprirla.
Non vede però i tuoi fogli: ognuno vede solo quelli scritti nel proprio browser. Su iPhone
puoi aggiungerla alla schermata Home (Condividi → Aggiungi alla schermata Home).

## Cosa richiede ancora me (o un tecnico)

- cambiare l’impaginazione, i caratteri o il comportamento della lampada oltre le impostazioni;
- aggiungere nuovi tipi di sezione in homepage.

Il resto lo gestisci tu.
