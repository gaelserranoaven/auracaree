import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Fase D: privacidad y términos públicos, en borrador, enlazados desde la landing y la app,
// y la política alineada con lo que la app guarda de verdad en el navegador.
const leer = (ruta) => readFileSync(ruta, 'utf8');
const LEGALES = ['privacidad.html', 'terminos.html'];
const SITIO = 'https://gaelserranoaven.github.io/auracaree/';

test('las páginas legales son públicas, indexables, sin JavaScript y con su canonical', () => {
  for (const p of LEGALES) {
    const html = leer(p);
    assert.doesNotMatch(html, /<meta\s+name=["']robots["'][^>]*noindex/i, `${p} no debe tener noindex`);
    assert.match(html, /script-src 'none'/, `${p}: CSP sin scripts`);
    assert.doesNotMatch(html, /<script(?![^>]*application\/ld\+json)/, `${p} no lleva JavaScript`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITIO.replace(/\./g, '\\.')}${p.replace('.', '\\.')}">`), `${p}: canonical`);
  }
  const sitemap = leer('sitemap.xml');
  for (const p of LEGALES) assert.ok(sitemap.includes(SITIO + p), `sitemap sin ${p}`);
});

test('cada página legal lleva el aviso visible de borrador pendiente de revisión jurídica', () => {
  for (const p of LEGALES) assert.match(leer(p), /<div class="borrador" role="note">\s*<b>Borrador, pendiente de revisión jurídica<\/b>/, p);
});

test('todo dato faltante es un marcador [PENDIENTE: …] visible, nunca un dato inventado', () => {
  for (const p of LEGALES) {
    const html = leer(p);
    const marcadores = html.match(/\[PENDIENTE:/g) ?? [];
    const visibles = html.match(/<span class="pendiente">\[PENDIENTE:/g) ?? [];
    assert.ok(marcadores.length > 0, `${p}: se esperaban marcadores mientras sea borrador`);
    assert.equal(visibles.length, marcadores.length, `${p}: hay marcadores [PENDIENTE: …] fuera de <span class="pendiente">`);
    assert.doesNotMatch(html, /NIT\s*:?\s*\d|\d{3}\.\d{3}\.\d{3}-\d/, `${p}: parece un NIT o una cédula escritos a mano`);
  }
});

test('la landing y las páginas legales enlazan privacidad, términos, correo y teléfono en el pie', () => {
  for (const p of ['index.html', ...LEGALES]) {
    const pie = leer(p).match(/<footer class="pie">([\s\S]*?)<\/footer>/)?.[1];
    assert.ok(pie, `${p} sin pie`);
    for (const enlace of ['href="privacidad.html"', 'href="terminos.html"', 'href="mailto:', 'href="tel:+57']) {
      assert.ok(pie.includes(enlace), `${p}: el pie no tiene ${enlace}`);
    }
  }
  assert.doesNotMatch(leer('index.html'), /dentro de la aplicaci[oó]n/, 'la landing ya no puede decir que los términos están dentro de la app');
});

test('los enlaces entre páginas legales apuntan a secciones que existen', () => {
  const ids = Object.fromEntries(LEGALES.map((p) => [p, new Set([...leer(p).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))]));
  for (const p of [...LEGALES, 'index.html']) {
    for (const [, destino, ancla] of leer(p).matchAll(/href="((?:privacidad|terminos)\.html)#([^"]+)"/g)) {
      assert.ok(ids[destino].has(ancla), `${p}: ${destino}#${ancla} no existe`);
    }
  }
});

// Claves de almacenamiento que usa el código fuente de la app (no el bundle)
function clavesDeLaApp() {
  const archivos = (dir) => readdirSync(dir).flatMap((f) => {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) return f === 'dist' ? [] : archivos(ruta);
    return /\.(jsx?|mjs)$/.test(f) ? [ruta] : [];
  });
  const claves = new Set();
  for (const f of archivos('src')) {
    for (const [, clave] of leer(f).matchAll(/['"`](auracare_[a-z_]+)/g)) claves.add(clave);
  }
  return claves;
}

test('la política describe cada clave que la app guarda en el navegador', () => {
  const politica = leer('privacidad.html');
  const claves = clavesDeLaApp();
  assert.ok(claves.size >= 4, `se esperaban al menos 4 claves auracare_*, hay ${claves.size}`);
  for (const clave of claves) assert.ok(politica.includes(clave), `privacidad.html no menciona la clave ${clave}`);
  assert.match(politica, /sb-…-auth-token/, 'falta la sesión de Supabase');
  assert.match(politica, /sessionStorage|solo vive en esa pestaña/, 'el borrador clínico debe constar como dato de esa pestaña');
});

test('la app enlaza las páginas públicas y el aviso no ofrece una elección que no cambia nada', () => {
  const legal = leer('src/components/Legal.jsx');
  assert.match(legal, /'\.\.\/privacidad\.html'/);
  assert.match(legal, /'\.\.\/terminos\.html'/);
  assert.doesNotMatch(legal, /Solo necesarias/);
  assert.doesNotMatch(legal, /Fundación Construyendo Futuro/, 'el texto legal es de la plataforma, no de un cliente');
  for (const a of legal.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? []) assert.match(a, /rel="noopener"/, a);
  const js = leer('src/dist/app.js');
  assert.ok(js.includes('../privacidad.html') && js.includes('../terminos.html'), 'el bundle no está recompilado con los enlaces');
});
