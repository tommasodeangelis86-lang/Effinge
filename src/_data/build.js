// Dati di build. «versione» cambia a ogni pubblicazione e viene aggiunta agli indirizzi di CSS e JS,
// così il browser non usa mai una copia vecchia di uno script con una pagina nuova.
const commit = (process.env.COMMIT_REF || '').slice(0, 8);
export default { anno: new Date().getFullYear(), versione: commit || Date.now().toString(36) };
