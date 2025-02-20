const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts', 'src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22', // or the version of Node.js you are using
  outdir: 'dist',
  sourcemap: true,
}).catch(() => process.exit(1));