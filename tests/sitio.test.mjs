import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { armarSitio } from '../tools/armar-sitio.mjs';

// El sitio publicado solo lleva la lista permitida: nada de docs, migraciones, pruebas ni código fuente.
const dir = mkdtempSync(join(tmpdir(), 'auracare-sitio-'));
armarSitio(dir);
test.after(() => rmSync(dir, { recursive: true, force: true }));

const todos = (base) => readdirSync(base).flatMap((f) => {
  const ruta = join(base, f);
  return statSync(ruta).isDirectory() ? todos(ruta) : [relative(dir, ruta).replaceAll('\\', '/')];
});

test('el sitio incluye la landing y la app compilada', () => {
  for (const ruta of ['index.html', 'landing.css', 'src/index.html', 'src/dist/app.js', 'src/dist/app.css']) {
    assert.ok(existsSync(join(dir, ruta)), `falta ${ruta}`);
  }
});

test('el sitio no publica documentación, esquema, pruebas ni código fuente', () => {
  const archivos = todos(dir);
  const prohibido = /^(docs|supabase|tests|tools|node_modules|\.impeccable|\.github|\.git)\/|\.(md|sql|jsx|mjs)$|^package(-lock)?\.json$|^build\.mjs$/;
  const fugas = archivos.filter((f) => prohibido.test(f));
  assert.deepEqual(fugas, [], `se publicarían: ${fugas.join(', ')}`);
  assert.ok(archivos.every((f) => !f.startsWith('src/') || f === 'src/index.html' || /^src\/(dist|icons|fonts)\//.test(f) || /^src\/(manifest\.webmanifest|sw\.js)$/.test(f)),
    'solo src/index.html y los recursos permitidos de src/');
});
