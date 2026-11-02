import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');
const ctx = await esbuild.context({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/app.js',
  format: 'esm',
  target: ['chrome110'],
  loader: { '.woff2': 'dataurl' },
  sourcemap: watch ? 'inline' : false,
  minify,
  logLevel: 'info',
});
if (watch) {
  await ctx.watch();
  console.log('[build] watching…');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('[build] done');
}
