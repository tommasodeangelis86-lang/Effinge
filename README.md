# Effinge

Sito di Effinge, spazio per la scrittura immersiva (effinge.it).

## Il sito: «La pagina e la lampada»

Un foglio di carta in una stanza buia. Una lampada fioca accompagna le lettere mentre compaiono
e illumina le righe man mano che scorri.

**Per gestirlo leggi la [guida](docs/guida.md)**: pubblicare testi, creare pagine, cambiare
colori e animazione, mettere il sito online e collegare effinge.it.

| Percorso | Contenuto |
|---|---|
| `src/testi/` | I testi (un file per testo), modificabili dal pannello |
| `src/pagine/` | Pagine libere: Il progetto, Contatti, e le nuove |
| `src/_data/impostazioni.json` | Apertura, animazione, lampada, colori, homepage |
| `src/_includes/` | Modelli: struttura, lettura, pagina |
| `src/index.njk`, `src/archivio.njk` | Homepage e archivio filtrabile |
| `assets/css/sito.css`, `assets/js/sito.js` | Stile e comportamento (lampada, scrittura, scene) |
| `assets/fonts/` | Cormorant Garamond, EB Garamond, Inter Tight (self-hosted, OFL) |
| `.pages.yml` | Configurazione del pannello Pages CMS |
| `netlify.toml` | Pubblicazione su Netlify |
| `media/` | Immagini caricate dal pannello |
| `direzioni/`, `riferimenti/` | Proposte precedenti e prototipo v3, solo come archivio |

```bash
npm install
npm start          # anteprima locale con aggiornamento automatico
npm run build      # genera il sito in _site/
npm test           # verifica visiva (dopo npm run build)
```

Le bozze (`bozza: true`) non compaiono nel sito: sono visibili solo su `/anteprima/<nome>/`,
con `noindex`. Finché in impostazioni «Visibile su Google» è spento, tutto il sito è `noindex`.

## Verifica visiva

```bash
npm run build && npm test          # sito: scene, lettura, archivio, senza JS, movimento ridotto
node tests/screens.mjs             # proposte in direzioni/
```

Cattura fotogrammi su desktop e smartphone e segnala errori JavaScript, scroll orizzontale,
titolo illeggibile senza JavaScript o con movimento ridotto, filtro dell'archivio non funzionante.

## Skill di design installate

In `.claude/skills/`, caricate automaticamente da Claude Code in questo repository:

- **impeccable** — [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0): direzione, critica, audit, rifinitura.
- **taste-skill** — [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill): pensata per siti aziendali con molte foto; qui vale solo per i principi generali, perché il brief di Effinge vieta fotografie decorative ed effetti.
- **Skill di Emil Kowalski** — [emilkowalski/skill](https://github.com/emilkowalski/skill): `emil-design-eng`, `animate`, `improve-animations`, `review-animations`, `animation-performance`, `choreograph` e altre. Escluse quelle solo per app native (Swift, Expo).

Il brief ha sempre la precedenza sulle skill.

## Prossimi passi

1. Collaudo dell'autore sull'indirizzo provvisorio di Netlify (vedi guida).
2. Collegamento di effinge.it su Aruba e attivazione di «Visibile su Google».
