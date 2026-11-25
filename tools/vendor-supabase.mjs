// Compila solo il client Auth ufficiale, caricato da Scrivi quando l’archivio è configurato.
import { build } from 'esbuild';
await build({
  stdin: {
    contents: "import { GoTrueClient } from '@supabase/auth-js'; window.EffingeSupabaseAuth = GoTrueClient;",
    resolveDir: process.cwd(),
  },
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2019',
  outfile: 'assets/vendor/supabase-auth.js', legalComments: 'eof',
});
