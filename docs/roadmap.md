# Effinge — le prossime fasi

Ordine deciso con l’autore. Ogni fase si apre solo quando quella prima è chiusa.

## Fatto — Focus totale in Scrivi
Dall’idea di Narrator: tutti i comandi ridotti a icone, solo la pagina in vista.
Il sito della barra in alto sparisce, la barra dell’opera diventa icone che si dissolvono mentre
si scrive, i capitoli si aprono a richiesta, la formattazione diventa una colonna stretta. Schermo
intero dove il browser lo consente; Esc per uscire.

## Fatto (novembre 2026) — Fase 2: Narrator, voci e suggerimenti con le chiavi di chi scrive
In `assets/js/scrivi-voce.js`. Scelte fatte: lettura «Manuale» come predefinita (Frase e Auto a richiesta); Claude con l'SDK ufficiale e modello `claude-opus-5-5` (cambiabile in «Chiavi AI»); OpenAI `gpt-4.1-mini` e Gemini `gemini-2.5-flash` come modelli predefiniti, cambiabili; al massimo 12 parti per richiesta (si può selezionare un brano). Restano da decidere i punti sotto «Da decidere».

Riferimento: `design_handoff_narrator_features/` (README e prototipo `Narrator.html`, non nel
repository).

- **Voci del sistema per tutti, gratis**: narrazione Auto (dopo 1,5 s di pausa) / Frase (alla
  fine di ogni frase) / Manuale; Play, Stop, velocità 0,75–2; voce italiana salvata.
  Evidenziazione della parola letta con `onboundary`; in Effinge la segue la lampada.
- **Voci premium con la propria chiave** («porta la tua chiave»): OpenAI (`tts-1-hd`, voci
  alloy/echo/fable/onyx/nova/shimmer) ed ElevenLabs (`eleven_multilingual_v2`). Testi lunghi
  divisi **per frasi** in pezzi da al massimo 4096 caratteri, letti in coda.
- **Suggerimenti AI con la propria chiave**: Migliora / Taglia / Stile, con Claude, OpenAI o
  Gemini a scelta di chi scrive; pezzi da 1800 caratteri con 200 di sovrapposizione; risposte in
  JSON; niente cambia finché l’autore non tocca «Accetta».
- **Le chiavi**: inserite da ciascuno in «Le mie chiavi AI», solo nel proprio browser (opzione «non
  ricordare»); chiamate dirette dal browser al fornitore, nessun server di Effinge. L’abbonamento
  alla chat (ChatGPT Plus, Claude Pro) non include l’API: servono le chiavi API a consumo
  (ElevenLabs invece include l’API nel piano; Gemini ha una fascia gratuita).
- **Sicurezza**: la regola CSP si apre solo agli indirizzi dei fornitori (api.openai.com,
  api.elevenlabs.io, api.anthropic.com, generativelanguage.googleapis.com) e a `media-src blob:`
  per l’audio.
- **Da decidere**: pulsante «Ascolta» per i visitatori nelle pagine di lettura; apice, pedice,
  rientro, copia formato nella barra; colori ed evidenziatore come annotazioni private.
- **Limiti noti**: su iPhone la voce parte solo dopo un primo tocco su Play; alcune voci Google in
  Chrome non segnalano la parola letta (evidenziazione stimata).

## Fase 3 — Accedi e registrazione
Rimandata perché i rischi superano, per ora, i vantaggi.

- **Tecnica**: Supabase (UE, Francoforte) per accesso e database con regole per cui ognuno vede
  solo i propri testi; email da @effinge.it con Resend o Brevo e record SPF/DKIM/DMARC su Aruba;
  antibot Cloudflare Turnstile; pagine Accedi, Registrati, Profilo (cambia password, scarica i miei
  dati, elimina account); sincronizzazione di Scrivi tra dispositivi; chiavi AI salvabili cifrate.
- **Regola assoluta**: la chiave «service_role» di Supabase non va mai nel sito, in chat o su GitHub.
- **Legale (GDPR)**: l’autore diventa titolare del trattamento: informativa privacy, termini d’uso,
  età minima 14 anni, diritti di accesso e cancellazione, notifica di violazioni entro 72 ore, DPA
  con Supabase. Bozza da far rivedere a un professionista.
- **Contenuti**: testi privati = rischio basso; testi pubblicati dagli utenti = moderazione,
  obblighi DSA, responsabilità su diffamazione e plagio.
- **Sicurezza**: regole del database testate con attacchi simulati, verifica in due passaggi su
  tutti gli account dell’amministratore, limiti ai tentativi, copie di sicurezza.
- **Costi indicativi**: Supabase gratis per iniziare, Pro circa 25 $/mese per un servizio stabile
  (il gratuito va in pausa dopo una settimana senza attività); email gratis fino a qualche migliaio
  al mese; documenti legali da circa 30 €/anno. Da verificare prima di partire.
- **Se si fa pagare**: partita IVA, IVA UE sui servizi digitali, recesso 14 giorni, Stripe:
  sentire un commercialista.
