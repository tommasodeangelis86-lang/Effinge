// Crea assets/vendor/anthropic-1.12.0.js: l'SDK ufficiale di Anthropic in un solo file per il browser
// (window.EffingeAnthropic). Si rigenera con: npm run vendor:anthropic
import { build } from 'esbuild';
await build({
  stdin: { contents: "import Anthropic from '@anthropic-ai/sdk'; window.EffingeAnthropic = Anthropic;", resolveDir: process.cwd() },
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2019',
  outfile: 'assets/vendor/anthropic-1.12.0.js', legalComments: 'eof',
});
console.log('assets/vendor/anthropic-1.12.0.js pronto');
