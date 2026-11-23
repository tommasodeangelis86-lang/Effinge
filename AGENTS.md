# Istruzioni per gli agenti (Codex, Claude e altri)

Prima di toccare grafica, testi o animazioni leggi **[DESIGN.md](DESIGN.md)**: è l'identità visiva di Effinge (caratteri, interlinea, palette, lampada, scrittura che si accende, Effinge Art). Ogni modifica deve rispettarla. Se la cambi di proposito, aggiorna DESIGN.md nello stesso commit.

Regole fisse:
- Non inventare testi, citazioni o biografie attribuiti all'autore o all'artista. I contenuti li scrive il proprietario del sito, dal pannello.
- Niente risorse esterne (CDN, Google Fonts, script di terzi): la CSP le blocca.
- Ogni campo nuovo nei dati (`src/_data/*.json`) va aggiunto anche in `.pages.yml`, così si può modificare dal pannello.
- Rispetta `prefers-reduced-motion`, il focus da tastiera e il contrasto WCAG 2.2 AA. Verifica che non compaia uno scorrimento orizzontale su telefono (390px).
- Prima di consegnare: `npx @11ty/eleventy` e i test in `tests/` (`node tests/sito.mjs`, `tests/guide.mjs`, `tests/art.mjs`, `tests/scrivi.mjs`).
- Non pubblicare file personali (manoscritti, documenti con dati di contatto) nel repository: è pubblico.
- Un agente alla volta: se un'altra sessione sta lavorando sul sito, aspetta che abbia finito.
