// Arma la carpeta que publica GitHub Pages con una lista permitida (no todo el repo).
// Uso: `node tools/armar-sitio.mjs [destino]` (por defecto `_site`). Lo usa .github/workflows/pages.yml.
// Quedan fuera a propósito: docs/, supabase/, tests/, tools/, .impeccable/, *.md, código fuente de src/.
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Obligatorios: si falta alguno, el sitio quedaría roto y el armado falla.
export const OBLIGATORIOS = ['index.html', 'landing.css', 'src/index.html', 'src/dist'];

// Opcionales: se copian si existen (llegan en fases posteriores).
export const OPCIONALES = [
  '404.html', 'robots.txt', 'sitemap.xml', 'privacidad.html', 'terminos.html',
  'fonts', 'icons', 'og',
  'src/manifest.webmanifest', 'src/sw.js', 'src/icons', 'src/fonts',
];

export function armarSitio(destino = join(RAIZ, '_site')) {
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  const copiados = [];
  for (const ruta of [...OBLIGATORIOS, ...OPCIONALES]) {
    const origen = join(RAIZ, ruta);
    if (!existsSync(origen)) {
      if (OBLIGATORIOS.includes(ruta)) throw new Error(`Falta ${ruta}: corre \`npm run build\` antes de armar el sitio.`);
      continue;
    }
    const fin = join(destino, ruta);
    mkdirSync(dirname(fin), { recursive: true });
    cpSync(origen, fin, { recursive: statSync(origen).isDirectory() });
    copiados.push(ruta);
  }
  return copiados;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const destino = resolve(process.argv[2] ?? join(RAIZ, '_site'));
  const copiados = armarSitio(destino);
  console.log(`Sitio armado en ${destino}:\n  ` + copiados.join('\n  '));
}
