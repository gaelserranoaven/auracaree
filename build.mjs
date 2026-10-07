// Empaqueta src/main.jsx -> src/dist/ (React + Supabase locales, sin CDN ni Babel en el navegador).
// Uso: `npm run build` (una vez) o `npm run dev` (watch). El resultado (src/dist) se versiona
// porque GitHub Pages sirve archivos estáticos sin paso de build.
import { build, context } from 'esbuild';
import { rmSync, readFileSync, writeFileSync } from 'node:fs';

// Hora de compilación (Bogotá): se ve en el menú Más y versiona las URL de dist/ para saltar la caché de GitHub Pages
const ahora = new Date();
const sello = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }).format(ahora);
const version = String(ahora.getTime());

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
  define: { 'process.env.NODE_ENV': '"production"', __COMPILACION__: JSON.stringify(sello) },
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
  const html = readFileSync('src/index.html', 'utf8')
    .replace(/\.\/dist\/app\.css(\?v=\d+)?/, './dist/app.css?v=' + version)
    .replace(/\.\/dist\/app\.js(\?v=\d+)?/, './dist/app.js?v=' + version);
  writeFileSync('src/index.html', html);
}
