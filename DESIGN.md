# Effinge — identità visiva

Guida per chi modifica il sito (persone o agenti come Codex). I valori qui sotto sono quelli **in uso** in `assets/css/sito.css`, `assets/css/art.css` e `assets/js/sito.js`: se cambi qualcosa nel codice, aggiorna anche questa pagina.

## 1. L'idea

**«La pagina e la lampada».** Una stanza buia, un foglio vero, una lampada fioca. La luce cade sulle parole mentre si scrivono o si leggono, come nell'app Alhora. Tutto il resto è quieto.

- Un solo gesto memorabile: **la luce che accende le lettere**. Non aggiungerne altri.
- Il colore lo portano **la luce calda** e, in Effinge Art, **i quadri**. L'interfaccia resta in carta, inchiostro e buio.
- Lo scorrimento è a **scene** (sticky), una per schermo. In Effinge Art è invece **diretto**: le opere scorrono subito.
- Il tono è letterario, sobrio e italiano.

## 2. Da non fare mai

- Gradienti colorati sui testi, arcobaleni, neon, glassmorphism vistoso, emoji nell'interfaccia.
- Carta antica, macchine da scrivere, texture vintage, polaroid, nastro adesivo, cornici decorative, mosaici "da app".
- Ombre colorate, bagliori viola o blu, angoli molto arrotondati sui fogli (il foglio ha `border-radius: 2px`).
- Nero assoluto `#000` come sfondo della pagina: si usa la **stanza** (`--stanza`) più lo sfondo scelto.
- Caratteri diversi dai tre qui sotto, o un carattere usato fuori dal suo compito.
- Testi, citazioni o biografie **inventati** e attribuiti all'autore o all'artista. Se manca un testo, lascia un segnaposto evidente e chiedi.
- Prezzi delle opere (sono stati tolti di proposito).

## 3. Caratteri

Tre famiglie, ognuna con un compito. I file sono in `assets/fonts/` e vengono serviti in locale: niente Google Fonts o altre CDN.

| Ruolo | Variabile | Famiglia | Pesi | Dove |
|---|---|---|---|---|
| Titoli | `--display` | **Cormorant Garamond** | 300 (titoli grandi), 400 (titoli medi), corsivo 300 | h1, h2, titoli dei testi e delle opere, marchio, frasi d'apertura |
| Lettura | `--lettura` | **EB Garamond** | 400, corsivo | paragrafi, descrizioni, estratti, FAQ, legende |
| Interfaccia | `--ui` | **Inter Tight** | 450–500 | menu, pulsanti, etichette, stati («VENDUTO»), date, contatori |

### Scala tipografica (in uso)

| Elemento | Regola |
|---|---|
| Titolo d'apertura sul foglio | `300 19cqw/.9 --display`, `letter-spacing:-.01em` |
| Sottotitolo d'apertura | `italic 300 5.4cqw/1.25 --display` |
| Titolo di sezione (h2) | `300 clamp(2.5rem,5.5vw,4.75rem)/1 --display`, `letter-spacing:-.01em` |
| Titolo di un testo (h1) | `300 clamp(2.75rem,7vw,4.75rem)/1 --display` |
| Titoli di Effinge Art | h1 `clamp(3.5rem,7vw,7.5rem)`, h2 `clamp(2.65rem,5vw,5rem)`, h3 `clamp(2.2rem,4vw,4.125rem)`; peso 400; `line-height:.98`; `letter-spacing` tra -.045em e -.025em |
| Corpo di lettura | `400 clamp(1.1875rem,1.08rem + .4vw,1.3125rem)/1.72 --lettura`; larghezza massima `34em`; sillabazione attiva |
| Paragrafi | nessuno spazio tra i paragrafi; **rientro della prima riga `1.5em`** dal secondo paragrafo in poi (`.corpo p + p`) |
| Testo in pagina (inviti, presentazioni) | `400 1.1875rem/1.6–1.65 --lettura` |
| Marchio «Effinge» | `400 1.375rem/1 --display`, `letter-spacing:.02em` |
| Menu | `450 .8125rem/1 --ui`, `letter-spacing:.01em` |
| Etichette e occhielli | `500 .6875rem/1 --ui`, maiuscolo, `letter-spacing:.14–.18em` |
| Pulsante | `500 .9375rem/1 --ui` |
| Piè di pagina | `450 .75rem/1.6 --ui` |

Le **guide** usano paragrafi separati da `.9em` di spazio, senza rientro. Nella tabella delle misure del romanzo, Inter Tight e cifre tabulari tengono allineati parole, battute e cartelle. Le celle vanno a capo su telefono.

Gli **strumenti** usano lo stesso foglio e la stessa lampada delle guide. I campi di testo e i contatori riprendono il calcolatore delle cartelle. L’anteprima 30 × 60 mostra la gabbia A4 su carta, con linee sottili. Su schermi stretti le voci Strumenti e Guide si impilano nel menu.

Nella home, dopo **Scrivi** vengono **Checklist manoscritto**, **Strumenti** e **Guide per chi scrive**. L’anteprima della checklist e le schede degli strumenti riprendono la lampada dei fogli della home.

## 4. Palette

### Colori base (`:root` in `sito.css`, sovrascrivibili dal pannello in `src/_data/impostazioni.json`)

| Nome | Variabile | Valore | Uso |
|---|---|---|---|
| Stanza | `--stanza` | `#0A0A09` | fondo della pagina, sotto lo sfondo |
| Stanza 2 | `--stanza-2` | `#121110` | superfici leggermente più chiare |
| Carta | `--carta` | `#ECE7DC` | i fogli, i pulsanti principali |
| Inchiostro | `--inchiostro` | `#1A1916` | testo sulla carta |
| Inchiostro 2 | `--inchiostro-2` | `#5B5850` | testo secondario sulla carta |
| Testo | `--testo` | `#E9E5DB` | testo sul buio |
| Testo 2 | `--testo-2` | `#A29D92` | testo secondario sul buio |
| Testo 3 | `--testo-3` | `#7F7B72` | note e piè di pagina |
| Luce | `--luce` | `#F0CB8A` | **solo** la lampada, l'alone delle lettere, il focus da tastiera e la selezione |
| Filo | `--filo` | `#2A2926` | linee sottili e separatori sul buio |

Alternative della carta proposte nel pannello: `#F3F1EC` bianco, `#E4DED2` sabbia, `#DCD9D2` grigio perla. Alternative della luce: `#F5DDB0`, `#E8E4D8`, `#E9B97A`.

Per le trasparenze si usa `color-mix(in srgb, var(--colore) N%, transparent)`, non colori nuovi.

### Sfondi (pareti)

Lo sfondo si sceglie con il tondino in alto a destra (`html[data-sfondo]`). Sopra c'è un velo nero regolato dal cursore (`--buio`, predefinito 55%).

| Nome | Gradiente |
|---|---|
| `grafite` (predefinito) | `linear-gradient(to bottom,#323232 0%,#3f3f3f 40%,#1c1c1c 150%)` in multiply con `linear-gradient(to top,rgba(255,255,255,.4),rgba(0,0,0,.25) 200%)` |
| `vicious-stance` | `linear-gradient(60deg,#29323c,#485563)` |
| `eternal-constance` | `linear-gradient(to top,#09203f,#537895)` |
| `midnight-bloom` | `linear-gradient(-20deg,#2b5876,#4e4376)` |
| `solid-stone` | `linear-gradient(to right,#243949,#517fa4)` |
| `blu-effinge` (Blu Effinge) | `radial-gradient(ellipse 67% 42% at 73% 66%,#182136 0%,#161e32 50%,#12192b 100%,#101627 150%,#0f1525 220%)`, fondo `#0F1525`, testo `#F2ECE0`, note `#918D83` |

Le sezioni nuove **non** devono avere un fondo proprio: ereditano lo sfondo e il buio. Effinge Art li usa come pareti.

## 5. La lampada

Componente `Lampada` in `assets/js/sito.js` (`window.EffingeLampada`). Due strati dentro un contenitore con `position:relative; overflow:hidden; container-type:inline-size`:

- **`.lampada.buio`**: un gradiente radiale trasparente al centro, che diventa `rgba(9,8,7,.95)` ai bordi. Misura `260cqw`, con `box-shadow: 0 0 0 300vmax rgba(9,8,7,.95)` perché il buio continui oltre il cono. Opacità da `.99` (spenta) a `.86` (intensità piena).
- **`.lampada.calore`**: la luce calda `--luce` in `mix-blend-mode: multiply`. Misura `110cqw`.
- Si muove **solo con `transform`** e un inseguimento morbido esponenziale (`lag` 220 ms di base, 900 ms a riposo, 140 ms col mouse).

Come si comporta:
- **Apertura e foglietto Scrivi**: segue le lettere mentre si scrivono, poi il mouse.
- **Pagina di lettura**: segue il mouse (solo con `(hover:hover) and (pointer:fine)`) oppure il paragrafo a fuoco. Gli strati sono più grandi (buio `520cqw`, calore `170cqw`).
- **Effinge Art, quadri**: `data-lampada-scorrimento` segue lo scorrimento e il mouse. Sui quadri il buio è `150cqw` a opacità `.9` e il calore `75cqw` a `.55`.
- **Effinge Art, mosaico d'apertura**: niente strati. Ogni tessera ha una luminosità `--luce-t = .26 + .78·e^(−d²/.07)`, dove d è la distanza dalla lampada, che gira piano da sola o segue il mouse. Il quadro sotto il cursore si accende del tutto (`brightness(1.02)`) e gli altri scendono a `.22`.
- **Luce piena**: il pulsante con la lampadina (`[data-art-luce]`) aggiunge `html.art-luce-piena` e spegne il buio su tutti i quadri. La scelta è salvata in `localStorage` alla chiave `effinge-art-luce`.

## 6. La scrittura che si accende

Componente `Scrittura` in `sito.js`. Ogni lettera (o parola) diventa uno `<span class="glifo">`, appare e si accende di `--luce` con un alone, poi torna al colore dell'inchiostro.

- Parametri dal pannello (`impostazioni.animazione`): velocità **85 ms** per lettera, attesa **350 ms**, durata della luce **340 ms**, cursore acceso, intensità della lampada **80**.
- Alone: `0 0 .05em luce·.9·intensità, 0 0 .22em luce·.55·intensità`.
- **Titoli**: lettera per lettera (`data-scrittura-alla-vista`).
- **Paragrafi**: parola per parola, in un tempo fisso (`data-unita="parola" data-durata="2600"`). Nei template si usano le macro `scrittura()` e `testo()` di `src/_includes/art-elementi.njk`.
- Lo screen reader legge il testo intero: `aria-label` sui titoli, uno span `.nascosto` sugli altri elementi.
- L'effetto parte quando il testo entra nello schermo.

## 7. Il foglio

- `.foglio`: fondo `--carta`, testo `--inchiostro`, `border-radius:2px`, ombra profonda e scura (mai colorata).
- In apertura è inclinato in prospettiva (`perspective:1600px`, `rotateX` e scala legati allo scorrimento) con formato A4 (`aspect-ratio: 1/1.414`).
- Intestazioni e piedi del foglio: maiuscoletto `--ui` piccolissimo, `--inchiostro-2`.

## 8. Componenti

- **Pulsante principale** `.pulsante` e `.art-azione`: capsula (`border-radius:999px`), fondo carta, testo inchiostro, `15px 24px`, `500 .9375rem --ui`. Alla pressione `scale(.97)`; al passaggio la freccia si allontana.
- **Pulsante secondario** `.art-richiedi` e `.art-azione--secondaria`: capsula trasparente con bordo `--testo` al 30%.
- **Tondino dello sfondo** e **interruttore della luce**: cerchi di circa 26–30 px con bordo sottile.
- **Barra in alto**: fissa e trasparente; diventa piena (`--stanza` al 72% più `blur(18px)`) quando si scorre. In Effinge Art c'è il riquadro «Art» accanto al marchio.
- **Separatori**: linee da 1px (`--filo` sul buio, inchiostro al 14–22% sulla carta).
- **Focus da tastiera**: `outline:1.5px solid var(--luce); outline-offset:4px`. Non va mai tolto.

## 9. Movimento

- Curve: `--ease: cubic-bezier(.23,1,.32,1)` per quasi tutto, `--ease-io: cubic-bezier(.77,0,.175,1)` per i passaggi di scena.
- Durate: 160–200 ms per pressioni e colori, 500–700 ms per entrate e luce.
- Si animano solo `transform`, `opacity` e `filter`. Mai le dimensioni o la posizione del layout.
- **`prefers-reduced-motion: reduce`**: niente scrittura animata, niente lampada in movimento, testi subito visibili, quadri illuminati.
- Senza JavaScript il titolo resta leggibile, e anche i testi.

## 10. Effinge Art

- Stessa grammatica di Effinge: tre caratteri, niente colori nell'interfaccia, pareti e buio del sito.
- **Apertura**:
  - a sinistra l'etichetta «EFFINGE ART», la presentazione che si scrive e i social (solo se compilati nel pannello);
  - sotto una linea, il blocco **COMMISSIONI** con il pulsante «Scrivici per informazioni».
- **Mosaico**:
  - a destra 12 quadri **nudi nel buio** (nessun fondo, cornice o bordo), su 4 colonne;
  - leggermente ruotati in prospettiva (`rotateY(-12deg) rotateX(5deg) rotateZ(-1deg)`);
  - su telefono 3 colonne, dritti e sopra il testo.
- **Galleria**: righe con la foto a sinistra e il titolo a destra. I quadri «Disponibile» hanno **«Richiedi informazioni»**, una mail a `effingeart@gmail.com` con il titolo dell'opera nell'oggetto.
- **Foto**: sempre ritagliate sul solo dipinto (niente muro, cornice o bordi bianchi). Il formato è WebP con il lato lungo di circa 1440px, in `assets/art/<slug>.webp`.
- Titoli delle opere in lingua originale, così come li ha scelti l'artista.

## 11. Layout e misure

- Margine laterale `--margine` (almeno 20px, rispetta le aree sicure). Su telefono il margine dei contenuti è di 16–20px.
- Contenitore di Effinge Art: `min(100% - 2·margine, 76rem)`.
- Punti di rottura usati: 560px, 640px, 760px e 860px.
- Nessuno scorrimento orizzontale (`overflow-x: clip` su html e body).
- Contrasto minimo **WCAG 2.2 AA**.

## 12. Foglio Effinge (Scrivi)

- Editor su carta sotto la lampada. La vista normale usa le icone di Focus nella barra sopra il foglio e nella colonna di formattazione. Il menu del sito e il navigatore dei capitoli restano accessibili. Su schermi stretti la formattazione scorre in orizzontale e i capitoli si aprono dall’icona.
- «Riscrivi», «Cartella» e «Manoscritto» sono sopra il foglio. «Cartella» mostra le battute impostate. Il conteggio e lo stato di salvataggio hanno uno spazio riservato nella stessa area.
- Focus nasconde la navigazione del sito e lascia il foglio al centro. I comandi si attenuano mentre si scrive e ricompaiono al movimento del mouse o al tocco fuori dal foglio.
- **Manoscritto**:
  - A4, margini **2,3 cm**, interlinea **1,5**, rientro **0,42 cm**;
  - esportazione Word in Times New Roman 12.
- **Conteggi**: parole, battute (spazi inclusi, senza gli a capo) e cartelle da **2000** o **1800** battute (pulsante «Cartella»).
- **Narratore** (`assets/js/scrivi-voce.js`), nella colonna di destra, gruppi «Voce» e «Suggerimenti»:
  - la parola letta si accende con `--luce` (pastiglia in `multiply`) e **la lampada la segue**;
  - i suggerimenti sono **sottolineature sopra il testo**, in uno strato a parte (`.scrivi-segni`): il testo non cambia finché non si tocca «Accetta», e l'accettazione si annulla con Ctrl+Z;
  - colori dei suggerimenti, smorzati e mai saturi: Migliora `#B7791F`, Taglia `#6B6A64`, Stile `#4F7A5C`;
  - la nota del suggerimento usa EB Garamond per la proposta, con un filo di `--luce` a sinistra.

## 13. Tecnica e sicurezza (vincoli)

- **Archivio privato**: quando è configurato Supabase, «Accedi» compare nel menu di Effinge, tra «Checklist manoscritto» e «Art». In Scrivi, con una sessione attiva, al suo posto compare «Esci». «Salva» è nella barra degli strumenti sopra il foglio. Il client Auth è servito in locale e solo Scrivi può contattare il progetto Supabase configurato.

- **Checklist manoscritto** (`/checkmanoscritto/`): parte da Blu Effinge, con titoli Cormorant e riquadri apribili a bordo sottile. Il verde salvia identifica la spunta dei controlli completati. DOCX e correzioni sono elaborati nel browser, con il supporto ZIP locale di fflate (`assets/vendor/fflate-0.8.2.js`).

- Eleventy 3: i sorgenti sono in `src/`, il risultato in `_site/`. Si pubblica su GitHub Pages con `.github/workflows/pubblica.yml`.
- I contenuti modificabili stanno in `src/_data/*.json` e `src/testi/*.md`, gestiti dal pannello Pages CMS (`.pages.yml`). Un campo nuovo va aggiunto anche lì.
- **CSP** generata dal transform `sicurezza` in `eleventy.config.js`:
  - script solo locali; script inline solo nel `<head>` (calcolati automaticamente);
  - nessuna risorsa esterna (font, script, immagini, iframe).
- Niente librerie o CDN esterne. Il codice è JavaScript semplice in `sito.js` (un solo IIFE, ES5 compatibile).
- Test: `npx @11ty/eleventy`, poi `node tests/sito.mjs`, `node tests/guide.mjs`, `node tests/art.mjs`, `node tests/scrivi.mjs` e `node tests/voce.mjs` (Playwright; le API dei fornitori sono simulate).
- `node tests/checkmanoscritto.mjs` prova analisi, correzioni, esportazione e riapertura con un DOCX sintetico.
- **Chiavi AI** di chi scrive: solo nel suo browser (`localStorage`, oppure `sessionStorage` se toglie «Ricorda»), inviate solo al fornitore. La CSP apre `api.anthropic.com`, `api.openai.com`, `api.elevenlabs.io`, `generativelanguage.googleapis.com` e `media-src blob:` **solo nella pagina Scrivi**. Claude si chiama con l'SDK ufficiale (`assets/vendor/anthropic-1.12.0.js`, rigenerabile con `npm run vendor:anthropic`), caricato solo quando servono i suggerimenti.
- Nei commit usa l’indirizzo noreply di GitHub come autore, mai un’email personale.
