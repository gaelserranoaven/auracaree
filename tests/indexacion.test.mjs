import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Guardias de indexación y privacidad: la landing se indexa, la app no, y nada carga analítica de terceros.
const leer = (ruta) => readFileSync(ruta, 'utf8');
const ROBOTS_NOINDEX = /<meta\s+name=["']robots["'][^>]*noindex/i;

// Dominios y llamadas de analítica, píxeles y grabación de sesión conocidos.
const RASTREADORES = [
  /googletagmanager\.com/i, /google-analytics\.com/i, /\bgtag\s*\(/, /\bfbq\s*\(/, /connect\.facebook\.net/i,
  /hotjar\.com/i, /clarity\.ms/i, /plausible\.io/i, /umami/i, /cdn\.segment\.com/i, /mixpanel/i, /posthog/i,
  /tiktok\.com\/i18n\/pixel/i, /snap\.licdn\.com/i,
];

const htmlPublicos = () => [
  ...readdirSync('.').filter((f) => f.endsWith('.html')),
  'src/index.html',
];

test('la landing es indexable (sin noindex)', () => {
  assert.doesNotMatch(leer('index.html'), ROBOTS_NOINDEX);
});

test('la app (src/index.html) conserva noindex, nofollow', () => {
  assert.match(leer('src/index.html'), /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i);
});

test('ningún HTML publicado carga analítica ni píxeles de terceros', () => {
  for (const archivo of htmlPublicos()) {
    const html = leer(archivo);
    for (const patron of RASTREADORES) assert.doesNotMatch(html, patron, `${archivo} contiene ${patron}`);
  }
});

test('el bundle de la app no incluye analítica', () => {
  const dist = 'src/dist';
  assert.ok(existsSync(join(dist, 'app.js')), 'falta src/dist/app.js: corre npm run build');
  const archivos = ['app.js', ...readdirSync(join(dist, 'chunks')).map((f) => join('chunks', f))];
  for (const f of archivos) {
    const js = leer(join(dist, f));
    for (const patron of RASTREADORES) assert.doesNotMatch(js, patron, `src/dist/${f} contiene ${patron}`);
  }
});
