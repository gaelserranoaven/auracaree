import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Empaqueta la entrada de humo para Node y renderiza todas las pantallas: detecta variables/props mal escritas.
const dir = mkdtempSync(join(tmpdir(), 'auracare-smoke-'));
const salida = join(dir, 'smoke.mjs');
await build({
  entryPoints: ['tests/smoke-entry.jsx'], bundle: true, platform: 'node', format: 'esm', outfile: salida,
  jsx: 'automatic', logLevel: 'silent', loader: { '.css': 'empty' },
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
const { renderizar } = await import(pathToFileURL(salida).href);
const html = renderizar();
test.after(() => rmSync(dir, { recursive: true, force: true }));

test('todas las pantallas renderizan sin lanzar errores', () => {
  assert.ok(Object.keys(html).length >= 18);
  for (const [nombre, h] of Object.entries(html)) assert.ok(h.length > 40, `${nombre} renderizó vacío`);
});

test('el login ya no precarga credenciales ni menciona E2EE', () => {
  assert.doesNotMatch(html.login, /claudia\.rios/i);
  assert.doesNotMatch(html.login, /E2EE/);
  assert.match(html.login, /Iniciar sesión/);
});

test('ninguna pantalla afirma cifrado E2EE ni muestra el hash falso 8f2a991b', () => {
  for (const [nombre, h] of Object.entries(html)) {
    assert.doesNotMatch(h, /E2EE/, `${nombre} menciona E2EE`);
    assert.doesNotMatch(h, /8f2a991b/, `${nombre} muestra hash falso`);
  }
});

test('el panel muestra alertas, sello real y no el residente egresado en KPIs', () => {
  assert.match(html.dashboard, /Vigilar a Ana/);           // última entrega de turno
  assert.match(html.dashboard, new RegExp('a'.repeat(12))); // sello con hash del servidor
  assert.match(html.dashboard, /Atender/);
});

test('la ficha usa rangos personalizados y muestra dolor', () => {
  assert.match(html.ficha, /personalizado/);
  assert.match(html.nuevaNota, /Dolor \(0–10\)/);
  assert.match(html.fichaEgresado, /Egresado/);
  assert.match(html.fichaEgresado, /Reingresar/);
});

test('la administración de usuarios no expone contraseñas ni formulario de clave', () => {
  assert.doesNotMatch(html.admin, /Contraseña temporal/i);
  assert.match(html.admin, /Solicitudes de acceso/);
  assert.match(html.admin, /Aprobar acceso/);
  assert.match(html.admin, /<label[^>]*>Rol<\/label>/);       // los selects tienen etiqueta visible
});

test('recibir turno: acta pendiente con quién la recibió; el turno propio no se ofrece', () => {
  assert.match(html.entregaPorRecibir, /Leí el acta y recibo el turno/);
  assert.match(html.entregaPorRecibir, /Discusión en el comedor/);
  assert.match(html.entregaPorRecibir, /Marta/);
  assert.match(html.entrega, /No tienes actas pendientes/);    // acta antigua: no queda pendiente
  assert.match(html.entrega, /Centro Noche/);                  // selector de jornada del acta
});

test('el profesional psicosocial no ve signos vitales y tiene la nota de convivencia', () => {
  assert.doesNotMatch(html.nuevaNotaPsicosocial, /TA sistólica/);
  assert.match(html.nuevaNotaPsicosocial, /Convivencia/);
  assert.match(html.nuevaNota, /TA sistólica/);
});
