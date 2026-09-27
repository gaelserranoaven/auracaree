// Empaqueta src/main.jsx -> src/dist/ (React + Supabase locales, sin CDN ni Babel en el navegador).
// Uso: `npm run build` (una vez) o `npm run dev` (watch). El resultado (src/dist) se versiona
// porque GitHub Pages sirve archivos estáticos sin paso de build.
import { build, context } from 'esbuild';
import { rmSync } from 'node:fs';

const opciones = {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'src/dist',
  entryNames: 'app',
  chunkNames: 'chunks/[name]-[hash]',
  minify: true,
  jsx: 'automatic',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(opciones);
  await ctx.watch();
  console.log('Observando cambios…');
} else {
  rmSync('src/dist', { recursive: true, force: true });
  await build(opciones);
}
