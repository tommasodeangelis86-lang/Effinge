// Pagine libere (Il progetto, Contatti, e qualsiasi pagina nuova creata dal pannello).
export default {
  layout: 'pagina.njk',
  eleventyComputed: {
    permalink: (data) => (data.bozza ? `/anteprima/${data.page.fileSlug}/` : `/${data.page.fileSlug}/`),
    noindex: (data) => data.bozza === true,
  },
};
