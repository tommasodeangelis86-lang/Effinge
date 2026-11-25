# Archivio privato di Foglio Effinge

La prima attivazione è per un solo autore, con accesso tramite email e password. Da ospite si scrive e si esporta in Word, e le nuove bozze restano nella scheda aperta. **Accedi** si trova nella barra sopra il foglio. Le opere e i capitoli vengono salvati automaticamente in Supabase. **Salva** apre l’archivio privato con il comando **Salva ora**. **Esci** nella barra chiude la sessione dopo aver salvato le modifiche in sospeso.

## Attivazione

1. Crea un progetto Supabase sul piano Free. Per Effinge è preferibile una regione UE.
2. In **Authentication → Providers**, tieni attivo l’accesso email con password. In **Authentication → Sign In / Providers** disattiva **Allow new users to sign up** e **Allow anonymous sign-ins**. Nel pannello **Authentication → Users** aggiungi e conferma il tuo utente. Inserisci lì la password che userai in Effinge.
3. Apri **SQL Editor**, esegui il file [202611250001_archivio_privato.sql](../supabase/migrations/202611250001_archivio_privato.sql) e abilita il tuo utente con questa query. Sostituisci l’indirizzo d’esempio nel pannello Supabase.

   ```sql
   insert into public.effinge_autori (utente)
   select id from auth.users where lower(email) = lower('autore@example.com')
   on conflict do nothing;
   ```

4. Il progetto Effinge è indicato in [Pubblica il sito](../.github/workflows/pubblica.yml) con il suo **Project URL** e la **Publishable key**. In caso di cambio progetto, aggiorna lì i due valori pubblici forniti dalla schermata **Connect**.
5. Esegui il workflow **Pubblica il sito**. Apri Scrivi, digita come ospite, usa **Accedi** e verifica di ritrovare la bozza dopo l’accesso da un altro browser.

Le regole del database limitano lettura e scrittura all’account abilitato e al suo archivio. Quando si prova a salvare una versione superata da un altro dispositivo, la scheda mostra un avviso e conserva il testo aperto. Prima di ricaricare si può esportare la propria versione in Word.

Le opere salvate con la versione precedente di Scrivi si possono aprire da **Opere → Bozze di questo browser**. Le copie originali rimangono su quel dispositivo. Le bozze vengono inviate a Supabase dopo l’accesso, quando sono state aperte in questa scheda.

Una build locale senza configurazione Supabase usa il salvataggio IndexedDB.

## Termini e informativa per l’apertura dell’archivio

I **Termini d’uso** e l’**Informativa privacy** saranno consultabili dal piè di pagina e dalla finestra di accesso. Prima di attivare per la prima volta il salvataggio online, l’utente può leggere entrambi i documenti e selezionare «Accetto i Termini d’uso». Effinge mostrerà l’informativa prima dell’invio delle credenziali. La scrittura come ospite e l’esportazione in Word rimangono disponibili anche senza accesso.

I Termini spiegano che l’autore conserva i diritti sulle opere, come funziona l’archivio e come esportare o cancellare i testi. L’Informativa descrive i dati di accesso e le opere salvate su Supabase, le preferenze e le bozze nel browser, i fornitori esterni usati su richiesta per voce e suggerimenti e i diritti di chi usa il servizio. Per le richieste privacy l’indirizzo indicato è `effingeart@gmail.com`.

Prima di pubblicare l’informativa occorre confermare l’identità del titolare, la regione del progetto Supabase e le modalità di conservazione e cancellazione dei dati. L’accettazione dei Termini va registrata su Supabase per account, con versione dei Termini e data, e riproposta quando serve per una nuova versione. Il salvataggio online potrà essere abilitato a seguito dell’accettazione della versione richiesta.

## Prova locale

Nel terminale del progetto, usa un URL e una chiave fittizi per compilare il sito di test.

```sh
EFFINGE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co \
EFFINGE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_chiave_test_effinge \
npm run build
node tests/scrivi-cloud.mjs
```

La prova simula le API Auth e REST. Il comando `node tools/vendor-supabase.mjs` rigenera il client Auth locale dalla dipendenza bloccata in `package-lock.json`.
