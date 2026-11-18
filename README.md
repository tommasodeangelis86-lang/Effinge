# Effinge

Sito di Effinge, pubblicazione letteraria indipendente (effinge.it).

## Direzione scelta: «La pagina e la lampada»

Un foglio di carta in una stanza buia. Una lampada fioca e calda scorre sulla scrittura;
le lettere della scritta si accendono una alla volta sotto la luce e tornano inchiostro;
le righe del progetto si illuminano mentre si scorre, come nel focus di Alhora. Le scene
sono legate allo scorrimento, in stile Apple (sezioni fissate con `position: sticky`).

- `index.html` — homepage: apertura (il foglio si raddrizza scorrendo), il progetto riga per riga, ultimo testo, archivio.
- `lettura.html` — pagina di lettura su un foglio: il paragrafo che si legge resta acceso; comandi «Concentrazione» e «Lampada» (ricordati nel browser).
- `assets/css/sito.css`, `assets/js/sito.js` — stile e comportamento.
- Font: **Cormorant Garamond** (titoli), **EB Garamond** (lettura), **Inter Tight** (interfaccia), self-hosted.
- Verifica: `node tests/sito.mjs` (fotogrammi della scrittura e delle scene, desktop e smartphone, senza JS, movimento ridotto).

Le tre proposte precedenti (A, B, C) restano in `direzioni/` come archivio.

## Cosa c’è

| Percorso | Contenuto |
|---|---|
| `direzioni/index.html` | Pagina di confronto delle tre proposte precedenti |
| `direzioni/a-afterlight/` | A · Afterlight: buio carbone, lampada che passa di lettera in lettera |
| `direzioni/b-frontespizio/` | B · Frontespizio: avorio piatto, lettere che si scaldano d’oro e si raffreddano in inchiostro |
| `direzioni/c-fessura/` | C · Fessura: buio profondo, asse centrale, lama di luce verticale |
| `assets/js/luce.js` | Motore dell’animazione «Illuminated Type Reveal», comune alle tre direzioni |
| `assets/css/luce.css` | Struttura della luce (ogni direzione ne regola forma e colore) |
| `assets/fonts/` | Newsreader, IBM Plex Sans, IBM Plex Mono, self-hosted (licenza OFL) |
| `riferimenti/v3/` | Prototipo «Luce mobile v3» originale, conservato come riferimento |
| `tests/screens.mjs` | Verifica visiva con Playwright |
| `docs/brief.md` | Il brief di direzione creativa |
| `.claude/skills/` | Skill di design installate per Claude Code (vedi sotto) |

Per vedere le pagine basta aprire `index.html` nel browser: non serve nessun build.

## L’animazione e il CMS

Ogni impostazione della scritta è un attributo `data-*` sull’`<h1 data-scrittura>` (stessi nomi nel sito e nelle proposte). In Webflow ogni attributo
verrà collegato a un campo della raccolta **Impostazioni homepage**, così ogni controllo agisce
davvero sul sito:

| Attributo | Campo CMS | Valore |
|---|---|---|
| testo dell’`<h1>` | Scritta animata | testo |
| `data-enabled` | Animazione attiva | `true` / `false` |
| `data-speed` | Velocità (ms per lettera) | 20–600, brief: 80 |
| `data-delay` | Ritardo iniziale (ms) | brief: 250 |
| `data-fade` | Dissolvenza della luce (ms) | brief: 220–400 |
| `data-intensity` | Intensità luminosa | 0–1 |
| `data-color` | Colore della luce | `#RRGGBB` |
| `data-cursor` | Cursore | `true` / `false` |
| `data-repeat` | Ripetizione | `sempre` / `sessione` |

Garanzie: senza JavaScript il titolo è testo normale; con «riduci movimento» attivo nel sistema
l’animazione non parte; gli screen reader leggono sempre la parola intera; le lettere occupano
il loro spazio fin dall’inizio, quindi il layout non si muove.

## Verifica visiva

```bash
node tests/screens.mjs            # tutte le pagine di direzioni/
OUT=/percorso node tests/screens.mjs direzioni/a-afterlight/index.html
```

Cattura ogni pagina a 390, 768, 1024 e 1440 px, un fotogramma a metà animazione, la home senza
JavaScript e con movimento ridotto, e segnala errori JavaScript e scroll orizzontale.

## Skill di design installate

In `.claude/skills/`, caricate automaticamente da Claude Code in questo repository:

- **impeccable** — [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0): direzione, critica, audit, rifinitura.
- **taste-skill** — [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill): pensata per siti aziendali con molte foto; qui vale solo per i principi generali, perché il brief di Effinge vieta fotografie decorative ed effetti.
- **Skill di Emil Kowalski** — [emilkowalski/skill](https://github.com/emilkowalski/skill): `emil-design-eng`, `animate`, `improve-animations`, `review-animations`, `animation-performance`, `choreograph` e altre. Escluse quelle solo per app native (Swift, Expo).

Il brief ha sempre la precedenza sulle skill.

## Prossimi passi (dal brief)

1. Approvare una direzione.
2. Prototipo navigabile completo: archivio filtrabile, lettura, progetto, contatti, pannello impostazioni.
3. Design system documentato.
4. Costruzione in Webflow con CMS; guida operativa; collaudo con l’autore.
5. Solo alla fine: collegamento del dominio effinge.it.
