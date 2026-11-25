/* Archivio privato di Scrivi. Il client Auth e gli endpoint Supabase sono separati dalla pubblicazione. */
(function () {
  'use strict';

  function conflitto() {
    const errore = new Error('L’archivio è cambiato in un’altra scheda o su un altro dispositivo. Il testo di questa scheda è ancora aperto e puoi esportarlo in Word.');
    errore.conflitto = true;
    return errore;
  }

  function accediDiNuovo() {
    const errore = new Error('Accedi di nuovo con lo stesso account per salvare queste modifiche.');
    errore.accesso = true;
    return errore;
  }

  window.EffingeCloud = function (url, chiave) {
    const auth = new window.EffingeSupabaseAuth({
      url: url + '/auth/v1',
      headers: { apikey: chiave, Authorization: 'Bearer ' + chiave },
      storageKey: 'effinge-archivio-' + new URL(url).hostname.split('.')[0],
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });

    async function sessione() {
      const { data, error } = await auth.getSession();
      if (error) throw error;
      return data.session;
    }

    async function richiesta(tabella, sessione, parametri, opzioni = {}) {
      let risposta;
      try {
        risposta = await fetch(url + '/rest/v1/' + tabella + '?' + new URLSearchParams(parametri), {
          method: opzioni.metodo || 'GET',
          headers: {
            apikey: chiave, Authorization: 'Bearer ' + sessione.access_token,
            ...(opzioni.dati ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
          },
          body: opzioni.dati ? JSON.stringify(opzioni.dati) : undefined,
          cache: 'no-store',
          signal: AbortSignal.timeout(12000),
        });
      } catch {
        throw new Error('L’archivio non risponde. Riprova quando torna la connessione.');
      }
      if (risposta.status === 409) throw conflitto();
      if (risposta.status === 401 || risposta.status === 403) throw accediDiNuovo();
      if (!risposta.ok) throw new Error('Il salvataggio non è riuscito. Puoi esportare il testo in Word o riprovare.');
      return risposta.json();
    }

    return {
      sessione,
      async entra(email, password) {
        const { data, error } = await auth.signInWithPassword({ email, password });
        if (error || !data.session) throw new Error('Accesso non riuscito. Controlla email, password e connessione.');
      },
      async apri() {
        const corrente = await sessione();
        if (!corrente) return null;
        const utente = 'eq.' + corrente.user.id;
        const abilitato = await richiesta('effinge_autori', corrente, { utente, select: 'utente' });
        if (!abilitato.length) throw new Error('Questo account non è abilitato all’archivio di Effinge.');
        const record = await richiesta('effinge_archivi', corrente, { utente, select: 'versione,dati' });
        return { utente: corrente.user.id, email: corrente.user.email, ...record[0] };
      },
      async salva(utente, versione, dati) {
        const corrente = await sessione().catch(() => { throw accediDiNuovo(); });
        if (corrente?.user.id !== utente) throw accediDiNuovo();
        const parametri = { select: 'versione' };
        const riga = { dati, versione: versione + 1 };
        if (versione) Object.assign(parametri, { utente: 'eq.' + utente, versione: 'eq.' + versione });
        else riga.utente = utente;
        const record = await richiesta('effinge_archivi', corrente, parametri, {
          metodo: versione ? 'PATCH' : 'POST',
          dati: riga,
        });
        if (record.length !== 1) throw conflitto();
        return record[0].versione;
      },
      async esci() {
        const { error } = await auth.signOut({ scope: 'local' });
        if (error) throw error;
      },
    };
  };
})();
