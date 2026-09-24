const { buildSync } = require('esbuild');
buildSync({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  outfile: 'updates/app.cjs',
  logLevel: 'info',
});
