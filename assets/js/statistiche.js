/* Il contenitore Google viene richiesto soltanto a consenso già espresso. */
(function () {
  'use strict';
  var preferenze = document.querySelector('[data-statistiche-preferenze]');
  var pannello = document.getElementById('preferenze-statistiche');
  var titolo = document.getElementById('statistiche-titolo');
  var chiave = 'effinge-statistiche-v1';
  var disabilitaGA4 = 'ga-disable-G-EK905T9Y8W';
  var caricato = false;

  function leggiScelta() {
    try { return localStorage.getItem(chiave); } catch (errore) { return null; }
  }

  function mostra(visibile) {
    pannello.hidden = !visibile;
    preferenze.setAttribute('aria-expanded', String(visibile));
  }

  function avvia() {
    if (caricato) return;
    caricato = true;
    window[disabilitaGA4] = false;
    var dati = window.dataLayer = window.dataLayer || [];
    function gtag() { dati.push(arguments); }
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('set', {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname
    });
    dati.push({ 'gtm.blocklist': ['customScripts', 'customPixels', 'nonGoogleScripts', 'nonGooglePixels', 'nonGoogleIframes'] });
    dati.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-MPW2T34Z';
    document.head.appendChild(script);
  }

  function ferma() {
    window[disabilitaGA4] = true;
    document.cookie.split(';').forEach(function (cookie) {
      var nome = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(nome)) return;
      var scaduto = nome + '=; Max-Age=0; Path=/';
      document.cookie = scaduto;
      if (/(^|\.)effinge\.it$/.test(location.hostname)) document.cookie = scaduto + '; Domain=effinge.it';
    });
    // Riparte con la scelta salvata, senza il codice Google già eseguito.
    if (caricato) location.reload();
  }

  function applica(scelta) {
    mostra(scelta !== 'si' && scelta !== 'no');
    if (scelta === 'si') avvia();
    else if (scelta === 'no' || caricato) ferma();
  }

  preferenze.hidden = false;
  preferenze.addEventListener('click', function () {
    mostra(pannello.hidden);
    if (!pannello.hidden) titolo.focus();
  });
  pannello.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Escape') return;
    mostra(false);
    preferenze.focus();
  });
  pannello.querySelectorAll('[data-statistiche-scelta]').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
      var scelta = bottone.dataset.statisticheScelta;
      try { localStorage.setItem(chiave, scelta); } catch (errore) {}
      applica(scelta);
    });
  });
  addEventListener('storage', function (evento) {
    if (evento.key === chiave || evento.key === null) applica(leggiScelta());
  });
  addEventListener('pageshow', function (evento) {
    if (evento.persisted) applica(leggiScelta());
  });
  applica(leggiScelta());
})();
