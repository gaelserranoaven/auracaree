import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guardia sobre src/lib/api.js: una consulta con tope debe pedir primero lo más nuevo.
// `order(..., { ascending: true }).limit(n)` devuelve las n filas más ANTIGUAS: al crecer la base, la ficha y el
// panel dejaban de mostrar las notas recientes sin ningún error.
const api = readFileSync('src/lib/api.js', 'utf8');
const sinComentarios = api.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('ninguna consulta combina orden ascendente con limit', () => {
  const malas = sinComentarios.split('\n').filter((l) => /ascending:\s*true\s*\}\)(\.\w+\([^)]*\))*\.limit\(/.test(l));
  assert.deepEqual(malas.map((l) => l.trim().slice(0, 90)), []);
});

test('las tres consultas de notas piden las más recientes y se devuelven en orden cronológico', () => {
  const notas = sinComentarios.split('\n').filter((l) => /from\('notas'\)\.select/.test(l) && /\.limit\(/.test(l));
  assert.equal(notas.length, 3, 'se esperaban tres consultas de notas con tope: panel, ficha y Sección 6');
  for (const l of notas) assert.match(l, /ascending:\s*false/, l.trim().slice(0, 90));
  assert.match(sinComentarios, /notas:\s*enOrden\(notas\)\.map\(mNota\)/);                 // panel
  assert.equal((sinComentarios.match(/return enOrden\(ok\(await db\.from\('notas'\)/g) || []).length, 2); // ficha y Sección 6
});

test('las pertenencias traen primero lo que sigue en custodia', () => {
  const l = sinComentarios.split('\n').find((x) => /from\('pertenencias'\)\.select/.test(x) && /\.limit\(/.test(x));
  assert.ok(l, 'no se encontró la consulta de pertenencias');
  assert.ok(l.indexOf("order('estado'") > 0 && l.indexOf("order('estado'") < l.indexOf("order('fecha_recibo'"), 'el estado debe ordenar antes que la fecha');
});
