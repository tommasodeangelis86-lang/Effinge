# Archivio privato di Foglio Effinge

La prima attivazione è per un solo autore, con accesso tramite email e password. Da ospite si scrive e si esporta in Word, e le nuove bozze restano nella scheda aperta. Dopo l’accesso, le opere e i capitoli vengono salvati automaticamente in Supabase. Il pulsante **Salva** apre anche i comandi **Salva ora** ed **Esci**.

## Attivazione

1. Crea un progetto Supabase sul piano Free. Per Effinge è preferibile una regione UE.
2. In **Authentication → Providers**, tieni attivo l’accesso email con password. In **Authentication → Sign In / Providers** disattiva **Allow new users to sign up** e **Allow anonymous sign-ins**. Nel pannello **Authentication → Users** aggiungi e conferma il tuo utente. Inserisci lì la password che userai in Effinge.
3. Apri **SQL Editor**, esegui il file [202611250001_archivio_privato.sql](../supabase/migrations/202611250001_archivio_privato.sql) e abilita il tuo utente con questa query. Sostituisci l’indirizzo d’esempio nel pannello Supabase.

   ```sql
   insert into public.effinge_autori (utente)
   select id from auth.users where lower(email) = lower('autore@example.com')
   on conflict do nothing;
   ```

4. Da **Connect** copia **Project URL** e **Publishable key**. Su GitHub, in **Settings → Secrets and variables → Actions → Variables**, inseriscili rispettivamente come `EFFINGE_SUPABASE_URL` e `EFFINGE_SUPABASE_PUBLISHABLE_KEY`. Solo la chiave `sb_publishable_…` è prevista nel browser.
5. Esegui il workflow **Pubblica il sito**. Apri Scrivi, digita come ospite, usa **Salva** e verifica di ritrovare la bozza dopo l’accesso da un altro browser.

Le regole del database limitano lettura e scrittura all’account abilitato e al suo archivio. Quando si prova a salvare una versione superata da un altro dispositivo, la scheda mostra un avviso e conserva il testo aperto. Prima di ricaricare si può esportare la propria versione in Word.

Le opere salvate con la versione precedente di Scrivi si possono aprire da **Opere → Bozze di questo browser**. Le copie originali rimangono su quel dispositivo. Le bozze vengono inviate a Supabase dopo l’accesso, quando sono state aperte in questa scheda.

Il sito mantiene il salvataggio IndexedDB esistente durante la preparazione del progetto, finché le due variabili di pubblicazione sono vuote.

## Prova locale

Nel terminale del progetto, usa un URL e una chiave fittizi per compilare il sito di test.

```sh
EFFINGE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co \
EFFINGE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_chiave_test_effinge \
npm run build
node tests/scrivi-cloud.mjs
```

La prova simula le API Auth e REST. Il comando `node tools/vendor-supabase.mjs` rigenera il client Auth locale dalla dipendenza bloccata in `package-lock.json`.
