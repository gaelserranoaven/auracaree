import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { armarSitio } from '../tools/armar-sitio.mjs';

// Fase C: las fuentes se sirven desde el propio sitio. Ninguna página publicada le pide nada a Google Fonts
// (que recibiría la IP de cada visita, también la del personal que usa la app clínica).
const GOOGLE_FONTS = /fonts\.(googleapis|gstatic)\.com/i;
const leer = (ruta) => readFileSync(ruta, 'utf8');

const dir = mkdtempSync(join(tmpdir(), 'auracare-fuentes-'));
armarSitio(dir);
test.after(() => rmSync(dir, { recursive: true, force: true }));

const todos = (base) => readdirSync(base).flatMap((f) => {
  const ruta = join(base, f);
  return statSync(ruta).isDirectory() ? todos(ruta) : [ruta];
});

test('ningún archivo publicado referencia Google Fonts', () => {
  const texto = todos(dir).filter((f) => /\.(html|css|js|txt|xml|json|webmanifest)$/.test(f));
  assert.ok(texto.length > 0);
  for (const f of texto) assert.doesNotMatch(leer(f), GOOGLE_FONTS, `${relative(dir, f)} pide fuentes a Google`);
});

test('los CSP solo permiten fuentes del propio sitio', () => {
  for (const archivo of ['index.html', '404.html', 'src/index.html']) {
    const csp = leer(archivo).match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
    assert.ok(csp, `${archivo} sin CSP`);
    assert.match(csp, /font-src 'self'(;|$)/, `${archivo}: font-src debe ser solo 'self'`);
    assert.doesNotMatch(csp, /googleapis|gstatic/, `${archivo}: el CSP aún nombra a Google`);
  }
});

// Cada url() de un CSS publicado apunta a un archivo que existe en el sitio armado
function urlsDe(css) {
  return [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]).filter((u) => !/^(data:|https?:|#)/.test(u));
}

test('las fuentes de la landing y de la app existen donde las piden los CSS', () => {
  for (const css of ['landing.css', 'src/dist/app.css']) {
    const urls = urlsDe(leer(join(dir, css))).filter((u) => u.endsWith('.woff2'));
    assert.ok(urls.length >= 4, `${css}: se esperaban al menos 4 fuentes, hay ${urls.length}`);
    for (const u of urls) assert.ok(existsSync(join(dir, dirname(css), u)), `${css} pide ${u}, que no se publica`);
  }
});

test('la landing precarga su fuente principal y el archivo existe', () => {
  const pre = leer('index.html').match(/<link rel="preload" href="([^"]+\.woff2)" as="font" type="font\/woff2" crossorigin>/);
  assert.ok(pre, 'falta el preload de la fuente');
  assert.ok(existsSync(join(dir, pre[1])), `el preload apunta a ${pre[1]}, que no se publica`);
});

test('las licencias de las cinco familias se publican junto a las fuentes', () => {
  const lic = leer(join(dir, 'fonts/LICENCIAS.txt'));
  for (const familia of ['Geist (landing)', 'Geist Mono (landing)', 'Sora (app)', 'IBM Plex Sans (app)', 'IBM Plex Mono (app)']) {
    assert.ok(lic.includes(familia), `falta la licencia de ${familia}`);
  }
  assert.match(lic, /SIL OPEN FONT LICENSE Version 1\.1/i);
});
