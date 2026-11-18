// Ogni testo usa il modello di lettura. Le bozze non compaiono nel sito:
// sono visibili solo all'indirizzo /anteprima/<nome-file>/ e non vengono indicizzate.
export default {
  layout: 'testo.njk',
  tags: [],
  eleventyComputed: {
    permalink: (data) => (data.bozza ? `/anteprima/${data.page.fileSlug}/` : `/testi/${data.page.fileSlug}/`),
    noindex: (data) => data.bozza === true || data.noindex === true,
  },
};
