(function () {
  'use strict';
  var elenco = document.querySelector('[data-elenco-editori]');
  if (!elenco) return;
  var filtro = elenco.querySelector('[data-filtro-editori]');
  var select = filtro.querySelector('select');
  var totale = filtro.querySelector('[data-totale-editori]');
  var gruppi = elenco.querySelectorAll('[data-gruppo-editori]');

  function filtra() {
    var visibili = 0;
    gruppi.forEach(function (gruppo) {
      var presenti = 0;
      gruppo.querySelectorAll('[data-generi]').forEach(function (riga) {
        riga.hidden = !!select.value && !riga.dataset.generi.split(' ').includes(select.value);
        if (!riga.hidden) presenti++;
      });
      gruppo.hidden = presenti === 0;
      elenco.querySelector('[data-indice-editori="' + gruppo.id + '"]').hidden = gruppo.hidden;
      visibili += presenti;
    });
    totale.textContent = visibili === 1 ? '1 editore' : visibili + ' editori';
  }

  select.addEventListener('change', filtra);
  filtro.hidden = false;
  filtra();
})();
