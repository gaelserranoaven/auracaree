import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

// Enlaces de las páginas estáticas: anclas con destino, archivos locales existentes y target="_blank" seguro.
const SITIO = 'https://gaelserranoaven.github.io/auracaree/';
const paginas = [...readdirSync('.').filter((f) => f.endsWith('.html')), 'src/index.html'];

const atributos = (html, nombre) => [...html.matchAll(new RegExp(`\\b${nombre}="([^"]*)"`, 'g'))].map((m) => m[1]);
const etiquetas = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const base = (html) => html.match(/<base\s+href="([^"]+)"/)?.[1];

// Convierte un href/src local en ruta del repo. `base` de GitHub Pages (/auracaree/) equivale a la raíz del repo.
function rutaLocal(pagina, html, url) {
  const limpia = url.split('#')[0].split('?')[0];
  if (!limpia) return null;
  if (base(html)) return posix.join('.', limpia.replace(/^\/auracaree\//, '')) || '.';
  return join(dirname(pagina), limpia);
}

const esExterna = (url) => /^(https?:|mailto:|tel:|data:)/.test(url);

test('cada ancla #id de una página tiene su destino', () => {
  for (const pagina of paginas) {
    const html = readFileSync(pagina, 'utf8');
    const ids = new Set(atributos(html, 'id'));
    for (const href of atributos(html, 'href').filter((h) => h.startsWith('#') && h.length > 1)) {
      assert.ok(ids.has(href.slice(1)), `${pagina}: ${href} no tiene destino`);
    }
  }
});

test('cada ruta local enlazada existe', () => {
  for (const pagina of paginas) {
    const html = readFileSync(pagina, 'utf8');
    for (const url of [...atributos(html, 'href'), ...atributos(html, 'src')]) {
      if (esExterna(url) || url.startsWith('#')) continue;
      const ruta = rutaLocal(pagina, html, url);
      if (ruta === null) continue;
      const destino = ruta === '.' || ruta.endsWith('/') ? join(ruta, 'index.html') : ruta;
      assert.ok(existsSync(destino) || existsSync(join(destino, 'index.html')), `${pagina}: ${url} no existe (${destino})`);
    }
  }
});

test('ningún target="_blank" sin rel="noopener"', () => {
  for (const pagina of paginas) {
    for (const a of etiquetas(readFileSync(pagina, 'utf8'), 'a').filter((t) => /target="_blank"/.test(t))) {
      assert.match(a, /rel="[^"]*noopener[^"]*"/, `${pagina}: ${a}`);
    }
  }
});

test('las URL absolutas del propio sitio (canonical, og, JSON-LD, sitemap) apuntan a archivos que existen', () => {
  const textos = [...paginas.map((p) => readFileSync(p, 'utf8')), readFileSync('sitemap.xml', 'utf8'), readFileSync('robots.txt', 'utf8')];
  for (const texto of textos) {
    for (const [url] of texto.matchAll(/https:\/\/gaelserranoaven\.github\.io\/auracaree\/[^"'\s<#]*/g)) {
      const ruta = url.slice(SITIO.length);
      const destino = ruta === '' || ruta.endsWith('/') ? join(ruta || '.', 'index.html') : ruta;
      assert.ok(existsSync(destino), `${url} no existe en el repo (${destino})`);
    }
  }
});

test('la landing tiene canonical, vista previa completa y JSON-LD válido sin reseñas ni precios', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/gaelserranoaven\.github\.io\/auracaree\/">/);
  for (const p of ['og:url', 'og:site_name', 'og:locale', 'og:image', 'og:image:alt', 'og:image:width', 'og:image:height']) {
    assert.match(html, new RegExp(`property="${p}"`), `falta ${p}`);
  }
  for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) assert.match(html, new RegExp(`name="${n}"`), `falta ${n}`);
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(bloques.length >= 1, 'falta JSON-LD');
  for (const b of bloques) {
    const json = JSON.parse(b);
    assert.doesNotMatch(JSON.stringify(json), /aggregateRating|"review"|"offers"|"price"/, 'el JSON-LD no puede afirmar reseñas ni precios');
  }
});

test('la página 404 no se indexa y la app tiene ícono', () => {
  assert.match(readFileSync('404.html', 'utf8'), /<meta name="robots" content="noindex">/);
  assert.match(readFileSync('src/index.html', 'utf8'), /rel="icon"/);
});
