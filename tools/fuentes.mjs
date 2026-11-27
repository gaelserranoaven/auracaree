// Copia las fuentes de la landing (Geist y Geist Mono) de node_modules a fonts/ y reúne las licencias
// de todas las familias del sitio en fonts/LICENCIAS.txt. Uso: `npm run fuentes` (tras `npm ci`).
// La landing no tiene build, por eso sus .woff2 se versionan en fonts/. Las fuentes de la app
// (Sora, IBM Plex Sans, IBM Plex Mono) no pasan por aquí: esbuild las copia a src/dist/fonts/ desde
// src/fuentes.css. Solo subconjuntos latino y latino extendido (español y nombres propios con tildes).
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NM = join(RAIZ, 'node_modules');
const DESTINO = join(RAIZ, 'fonts');

// Archivos de la landing: [paquete, archivo en files/]
const LANDING = [
  ['@fontsource-variable/geist', 'geist-latin-wght-normal.woff2'],
  ['@fontsource-variable/geist', 'geist-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/geist-mono', 'geist-mono-latin-wght-normal.woff2'],
  ['@fontsource-variable/geist-mono', 'geist-mono-latin-ext-wght-normal.woff2'],
];

// Todas las familias publicadas (landing y app): su licencia va en fonts/LICENCIAS.txt.
const FAMILIAS = [
  ['Geist', '@fontsource-variable/geist', 'landing'],
  ['Geist Mono', '@fontsource-variable/geist-mono', 'landing'],
  ['Sora', '@fontsource-variable/sora', 'app'],
  ['IBM Plex Sans', '@fontsource-variable/ibm-plex-sans', 'app'],
  ['IBM Plex Mono', '@fontsource/ibm-plex-mono', 'app'],
];

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

for (const [paquete, archivo] of LANDING) {
  copyFileSync(join(NM, paquete, 'files', archivo), join(DESTINO, archivo));
}

const partes = [
  'Fuentes de AuraCare',
  '',
  'Todas las fuentes se sirven desde este mismo sitio (no se piden a Google Fonts).',
  'Se distribuyen bajo la SIL Open Font License 1.1, cuyo texto completo acompaña a cada familia.',
  'Origen: paquetes de Fontsource en npm (https://fontsource.org), subconjuntos latino y latino extendido.',
  '',
];
for (const [familia, paquete, uso] of FAMILIAS) {
  const meta = JSON.parse(readFileSync(join(NM, paquete, 'package.json'), 'utf8'));
  partes.push('='.repeat(72), `${familia} (${uso}) · ${paquete}@${meta.version}`, '='.repeat(72), '', readFileSync(join(NM, paquete, 'LICENSE'), 'utf8').trim(), '');
}
writeFileSync(join(DESTINO, 'LICENCIAS.txt'), partes.join('\n'));

console.log('fonts/:\n  ' + readdirSync(DESTINO).join('\n  '));
