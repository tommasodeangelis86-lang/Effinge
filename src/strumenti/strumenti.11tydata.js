export default {
  layout: 'strumento.njk',
  eleventyComputed: {
    permalink: (data) => data.page.inputPath.endsWith('.md') ? `/strumenti/${data.page.fileSlug}/` : data.permalink,
  },
};
