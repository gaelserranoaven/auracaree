import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INACTIVIDAD_MS, inactividadVencida, leerActividad, marcarActividad, borrarActividad } from '../src/lib/sesion.js';

const MIN = 60 * 1000;
const AHORA = Date.parse('2026-11-25T15:00:00Z');

test('inactividadVencida: dentro del límite la sesión sigue; pasado el límite se cierra', () => {
  assert.equal(INACTIVIDAD_MS, 20 * MIN);
  assert.equal(inactividadVencida(AHORA - 1 * MIN, AHORA), false);
  assert.equal(inactividadVencida(AHORA - 20 * MIN, AHORA), false);   // justo en el límite todavía vale
  assert.equal(inactividadVencida(AHORA - 20 * MIN - 1, AHORA), true);
  assert.equal(inactividadVencida(AHORA - 8 * 60 * MIN, AHORA), true); // navegador cerrado al final del turno anterior
});

test('inactividadVencida: sin marca, con marca ilegible o del futuro se pide ingresar de nuevo', () => {
  for (const sinMarca of [NaN, 0, -1, undefined, null, Number('no es un número')]) assert.equal(inactividadVencida(sinMarca, AHORA), true, String(sinMarca));
  assert.equal(inactividadVencida(AHORA + 30 * 1000, AHORA), false);   // desfase pequeño de reloj: se tolera
  assert.equal(inactividadVencida(AHORA + 5 * MIN, AHORA), true);      // marca adelantada (reloj cambiado o manipulada)
});

// Reemplaza localStorage durante una prueba y lo restaura al final (algunas versiones de Node ya traen uno propio)
const conAlmacenamiento = (t, falso) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: falso, configurable: true, writable: true });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage; });
};

test('si el almacenamiento del navegador está bloqueado, las funciones no lanzan y la sesión se trata como vencida', (t) => {
  const bloqueado = () => { throw new Error('almacenamiento bloqueado'); };
  conAlmacenamiento(t, { getItem: bloqueado, setItem: bloqueado, removeItem: bloqueado });
  assert.doesNotThrow(() => { marcarActividad(AHORA); borrarActividad(); });
  assert.equal(inactividadVencida(leerActividad(), AHORA), true);
});

test('con almacenamiento, la marca se guarda, se lee y se borra', (t) => {
  const mem = new Map();
  conAlmacenamiento(t, { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) });
  marcarActividad(AHORA);
  assert.equal(leerActividad(), AHORA);
  assert.equal(inactividadVencida(leerActividad(), AHORA + 5 * MIN), false);
  borrarActividad();
  assert.equal(inactividadVencida(leerActividad(), AHORA), true);      // Number(null) es 0: sin marca
});

test('App.jsx revisa la inactividad al abrir, antes de cargar datos, y guarda la marca al ingresar', () => {
  const app = readFileSync('src/App.jsx', 'utf8');
  const arranque = app.slice(app.indexOf('const s = await api.sesionActual();'));
  assert.ok(arranque.indexOf('inactividadVencida(leerActividad())') > 0, 'falta la revisión al abrir');
  assert.ok(arranque.indexOf('inactividadVencida(leerActividad())') < arranque.indexOf('iniciarApp(s.user.id)'), 'la revisión debe ir antes de iniciarApp');
  assert.match(app, /api\.iniciarSesion\(email, password\);\s*marcarActividad\(\);/);
  assert.match(app, /api\.cerrarSesion\(\); \} catch \{[^}]*\}\s*borrarActividad\(\);/);
});
