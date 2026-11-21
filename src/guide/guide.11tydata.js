// Guide per chi scrive: pagine informative con domande frequenti (e dati strutturati per Google).
export default {
  layout: 'guida.njk',
  eleventyComputed: {
    permalink: (data) => (data.page.inputPath.endsWith('.md') ? `/guide/${data.page.fileSlug}/` : data.permalink),
  },
};
