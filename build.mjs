// Empaqueta src/main.jsx -> src/dist/ (React + Supabase locales, sin CDN ni Babel en el navegador).
// Uso: `npm run build` (una vez), `npm run dev` (watch) o `npm run build -- --analizar` (peso del bundle por paquete).
// El resultado (src/dist) se versiona porque GitHub Pages sirve archivos estáticos sin paso de build.
// Las fuentes (src/fuentes.css) salen de node_modules a src/dist/fonts/ con hash en el nombre: no se piden a Google.
import { build, context } from 'esbuild';
import { rmSync, readFileSync, writeFileSync } from 'node:fs';

// Hora de compilación (Bogotá): se ve en el menú Más y versiona las URL de dist/ para saltar la caché de GitHub Pages
const ahora = new Date();
const sello = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }).format(ahora);
const version = String(ahora.getTime());
const analizar = process.argv.includes('--analizar');

const opciones = {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'src/dist',
  entryNames: 'app',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'fonts/[name]-[hash]',
  loader: { '.woff2': 'file' },
  minify: true,
  jsx: 'automatic',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"', __COMPILACION__: JSON.stringify(sello) },
  legalComments: 'none',
  metafile: analizar,
  logLevel: 'info',
};

// Peso de cada salida JS agrupado por paquete de node_modules (lo propio va como "src").
function informe(metafile) {
  for (const [salida, o] of Object.entries(metafile.outputs)) {
    if (!salida.endsWith('.js')) continue;
    const porPaquete = {};
    for (const [entrada, v] of Object.entries(o.inputs)) {
      const m = entrada.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
      const clave = m ? m[1] : 'src';
      porPaquete[clave] = (porPaquete[clave] ?? 0) + v.bytesInOutput;
    }
    const dinamicos = o.imports.filter((i) => i.kind === 'dynamic-import').map((i) => i.path.split('/').pop());
    console.log(`\n${salida}  ${(o.bytes / 1024).toFixed(1)} KB${dinamicos.length ? '  (carga bajo demanda: ' + dinamicos.join(', ') + ')' : ''}`);
    for (const [k, v] of Object.entries(porPaquete).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${(v / 1024).toFixed(1).padStart(7)} KB  ${k}`);
    }
  }
}

if (process.argv.includes('--watch')) {
  const ctx = await context(opciones);
  await ctx.watch();
  console.log('Observando cambios…');
} else {
  rmSync('src/dist', { recursive: true, force: true });
  const resultado = await build(opciones);
  const html = readFileSync('src/index.html', 'utf8')
    .replace(/\.\/dist\/app\.css(\?v=\d+)?/, './dist/app.css?v=' + version)
    .replace(/\.\/dist\/app\.js(\?v=\d+)?/, './dist/app.js?v=' + version);
  writeFileSync('src/index.html', html);
  if (analizar) informe(resultado.metafile);
}
