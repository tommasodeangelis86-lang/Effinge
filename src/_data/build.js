// Dati di build. «versione» cambia a ogni pubblicazione e viene aggiunta agli indirizzi di CSS e JS,
// così il browser non usa mai una copia vecchia di uno script con una pagina nuova.
const commit = (process.env.COMMIT_REF || process.env.GITHUB_SHA || '').slice(0, 8);   // Netlify o GitHub
export default { anno: new Date().getFullYear(), versione: commit || Date.now().toString(36) };
