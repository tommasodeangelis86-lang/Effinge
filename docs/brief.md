# EFFINGE — Creative Direction & Digital Experience

Concept 01 — Afterlight. *Afterlight è il nome provvisorio della direzione visiva, non il nome pubblico del sito.*

## 1. Visione
Effinge è una pubblicazione letteraria indipendente, costruita intorno alla parola e alla sua permanenza. Non deve assomigliare a un blog, a un portfolio di scrittore o a una landing page commerciale. Il riferimento è l’editoria culturale contemporanea, con una forte identità tipografica.

**Principio guida:** il sito deve essere quasi immobile. La luce che accompagna le lettere è l’unico gesto visivo memorabile.

## 2. Identità visiva
| Elemento | Specifica iniziale |
|---|---|
| Fondo | Carbone profondo #0B0D0C |
| Superfici | Grafite #141715 |
| Testo | Avorio tenue #E8E6DF |
| Testo secondario | Grigio #A3A49D |
| Luce | Oro desaturato #C6B08B |
| Separatori | Grigio scuro #323632 |

Tipografia: Newsreader per titoli e prosa, IBM Plex Sans per la navigazione, IBM Plex Mono solo per piccoli elementi editoriali. Nessuna imitazione di carta antica, nessuna fotografia decorativa di macchine da scrivere, nessuna texture vintage, nessun effetto neon.

## 3. Homepage
L’apertura è dominata dalla scritta EFFINGE, con ampio spazio negativo. Le lettere emergono progressivamente dal buio; su ciascuna compare un bagliore localizzato che si attenua lasciando il carattere perfettamente nitido. Sotto il titolo può apparire un sottotitolo editoriale, modificabile dall’autore. Il resto del sito resta accessibile senza attendere la fine dell’animazione. Le sezioni successive presentano l’ultimo testo, una selezione dell’archivio e il progetto editoriale.

## 4. Animazione «Illuminated Type Reveal»
Deve richiamare la sensazione del Typewriter Focus di Alhora senza copiarne l’interfaccia.
- Rivelazione progressiva dei caratteri, circa 80 ms ciascuno.
- Ritardo iniziale di circa 250 ms.
- Alone luminoso morbido, localizzato e caldo.
- Dissolvenza della luce in 220–400 ms.
- Nessun suono automatico. Nessun loop continuo. Nessun movimento del layout durante la scrittura.

Disattivabile, rispettosa di prefers-reduced-motion. Senza JavaScript il titolo resta leggibile.

## 5. Architettura
- **Home** — identità e testi in evidenza.
- **Archivio** — tutte le pubblicazioni, filtrabili per categoria e ordinate cronologicamente.
- **Pagina di lettura** — testo protagonista; colonna di circa 62–68 caratteri, tipografia ampia, interlinea generosa.
- **Il progetto** — presentazione editoriale dell’autore e delle finalità di Effinge.
- **Contatti** — soltanto i canali che l’autore sceglierà di rendere pubblici.

## 6. Webflow CMS
Almeno due raccolte.
- **Testi:** titolo, categoria, contenuto, data, estratto, immagine facoltativa, evidenza in homepage, metadati SEO, stato di pubblicazione.
- **Impostazioni homepage:** scritta animata, sottotitolo, animazione attiva/disattiva, velocità, intensità luminosa, colore della luce, cursore, ripetizione, sezioni visibili.

Ogni controllo deve essere realmente collegato al comportamento del sito.

## 7. Autonomia dell’autore
Senza codice: pubblicare, modificare e rimuovere testi; gestire bozze e anteprime; modificare l’apertura; regolare velocità e luminosità; disattivare l’effetto; scegliere i contenuti in evidenza. Le modifiche all’architettura grafica richiedono il Webflow Designer.

## 8. Requisiti tecnici
Responsive (smartphone, tablet, desktop); WCAG 2.2 AA; prefers-reduced-motion; animazione leggera; semantica corretta; SEO e prestazioni. Test visivo su più dimensioni dello schermo.

## 9. Deliverable
1. Tre proposte visive realmente differenti.
2. Un prototipo navigabile della proposta selezionata.
3. Un design system documentato.
4. Il sito Webflow completo con CMS configurato.
5. Verifica di responsive, animazione, accessibilità e navigazione.
6. Una guida operativa per gestire il sito.
7. Un collaudo in cui l’autore pubblica autonomamente un testo e modifica l’effetto della homepage.

## 10. Vincoli editoriali
Non inventare prose, citazioni, biografie o frammenti attribuiti all’autore. Non pubblicare capitoli del romanzo senza approvazione. Effinge deve poter crescere come identità letteraria indipendente dai singoli libri.

## 11. Processo
Prima si approvano le tre direzioni artistiche. Poi si realizza e si rifinisce l’animazione. Poi archivio e pagine di lettura, CMS, verifica dell’autonomia dell’autore. Il dominio effinge.it (Aruba) sarà collegato soltanto dopo il collaudo e l’approvazione finale.

**Criterio di successo:** Effinge deve essere riconoscibile per la propria tipografia, la precisione dello spazio e la qualità dell’esperienza di lettura. Non per la quantità degli effetti visivi.
