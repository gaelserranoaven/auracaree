import test from 'node:test';
import assert from 'node:assert/strict';
import { RANGOS_DEFAULT, estadoSigno, errorSigno, errorDotacion, etiquetasRango, rangoEfectivo, puede, ROLES } from '../src/lib/clinico.js';
import { hoyBogota, jornadaDe, mensajeError, proximoCambioJornada } from '../src/lib/util.js';
import { parseCSV, matrizAResidentes } from '../src/lib/importar.js';

const R = RANGOS_DEFAULT;

test('estadoSigno: umbrales de vigilancia y crítico (espejo de private.estado_signo)', () => {
  assert.equal(estadoSigno(R, 'fc', 80), 'ok');
  assert.equal(estadoSigno(R, 'fc', 101), 'v');
  assert.equal(estadoSigno(R, 'fc', 119), 'v');
  assert.equal(estadoSigno(R, 'fc', 120), 'c');   // cMax es exclusivo hacia arriba: ≥120 crítico
  assert.equal(estadoSigno(R, 'fc', 55), 'v');
  assert.equal(estadoSigno(R, 'fc', 49), 'c');
  assert.equal(estadoSigno(R, 'spo2', 94), 'ok');
  assert.equal(estadoSigno(R, 'spo2', 92), 'v');
  assert.equal(estadoSigno(R, 'spo2', 89), 'c');
  assert.equal(estadoSigno(R, 'temp', 38.5), 'c');
  assert.equal(estadoSigno(R, 'temp', 37.6), 'v');
  assert.equal(estadoSigno(R, 'ta_s', 160), 'c');
  assert.equal(estadoSigno(R, 'ta_s', 145), 'v');
});

test('estadoSigno: vacío o no numérico no genera estado', () => {
  assert.equal(estadoSigno(R, 'fc', ''), null);
  assert.equal(estadoSigno(R, 'fc', null), null);
  assert.equal(estadoSigno(R, 'fc', 'abc'), null);
  assert.equal(estadoSigno(R, 'inexistente', 50), null);
});

test('rangos personalizados por residente sobreescriben los generales', () => {
  const epoc = { spo2: { v_min: 88, c_min: 85 } };
  assert.equal(estadoSigno(R, 'spo2', 90, epoc), 'ok');     // con rango EPOC (vig. desde 88) el 90% es normal
  assert.equal(estadoSigno(R, 'spo2', 86, epoc), 'v');
  assert.equal(estadoSigno(R, 'spo2', 84, epoc), 'c');
  assert.equal(estadoSigno(R, 'spo2', 90, undefined), 'v'); // sin override: 90–93 es vigilancia
  assert.equal(rangoEfectivo(R, 'fc', epoc).vMax, 100);     // parámetros no tocados quedan igual
});

test('etiquetasRango deriva los textos de los números', () => {
  const t = etiquetasRango(R.fc);
  assert.equal(t.normal, '60–100');
  assert.equal(t.crit, '<50 o ≥120');
});

test('errorSigno rechaza valores implausibles', () => {
  assert.equal(errorSigno('temp', 400), 'Valor no plausible (30–43)');
  assert.equal(errorSigno('temp', 37), null);
  assert.equal(errorSigno('spo2', 101), 'Valor no plausible (40–100)');
  assert.equal(errorSigno('dolor', 11) !== null, true);
  assert.equal(errorSigno('fc', ''), null);
  assert.equal(errorSigno('fc', 'x'), 'Debe ser numérico');
});

test('errorDotacion aplica límites por persona y por unidad en el mes', () => {
  const desod = { key: 'DESODORANTE', nombre: 'Desodorante', limPersona: 1, limUnidad: null };
  const ropa = { key: 'ROPA_INTERIOR', nombre: 'Ropa interior', limPersona: null, limUnidad: 10 };
  const hoy = '2026-09-26';
  const entregas = [
    { elemento: 'DESODORANTE', personaId: 'p1', sedeId: 's1', cantidad: 1, fecha: '2026-09-03' },
    { elemento: 'ROPA_INTERIOR', personaId: 'p2', sedeId: 's1', cantidad: 9, fecha: '2026-09-10' },
    { elemento: 'DESODORANTE', personaId: 'p3', sedeId: 's1', cantidad: 1, fecha: '2026-08-30' },
  ];
  assert.match(errorDotacion({ elemento: desod, cantidad: 1, personaId: 'p1', sedeId: 's1', entregas, hoy }), /por persona/);
  assert.equal(errorDotacion({ elemento: desod, cantidad: 1, personaId: 'p3', sedeId: 's1', entregas, hoy }), null); // entrega del mes anterior no cuenta
  assert.equal(errorDotacion({ elemento: ropa, cantidad: 1, personaId: 'p9', sedeId: 's1', entregas, hoy }), null);
  assert.match(errorDotacion({ elemento: ropa, cantidad: 2, personaId: 'p9', sedeId: 's1', entregas, hoy }), /por unidad/);
  assert.equal(errorDotacion({ elemento: ropa, cantidad: 2, personaId: 'p9', sedeId: 's2', entregas, hoy }), null);   // otra sede
  assert.match(errorDotacion({ elemento: ropa, cantidad: 0, personaId: 'p9', sedeId: 's1', entregas, hoy }), /entero/);
});

test('fecha y jornada se calculan en hora de Bogotá (UTC-5), no en UTC', () => {
  // 20:00 en Bogotá del 26-sep = 01:00 UTC del 27-sep: el día debe seguir siendo 26 y la jornada noche
  const tarde = new Date('2026-09-27T01:00:00Z');
  assert.equal(hoyBogota(tarde), '2026-09-26');
  assert.equal(jornadaDe(tarde), 'noche');
  assert.equal(jornadaDe(new Date('2026-09-26T11:00:00Z')), 'dia');    // 06:00 Bogotá
  assert.equal(jornadaDe(new Date('2026-09-26T10:59:00Z')), 'noche');  // 05:59
  assert.equal(jornadaDe(new Date('2026-09-26T22:59:00Z')), 'dia');    // 17:59
  assert.equal(jornadaDe(new Date('2026-09-26T23:00:00Z')), 'noche');  // 18:00
});

test('permisos por rol reflejan las políticas RLS', () => {
  assert.equal(puede('auditor', 'nota'), false);
  assert.equal(puede('auxiliar', 'crearResidente'), false);
  assert.equal(puede('admin_sede', 'crearResidente'), true);
  assert.equal(puede('medico', 'nota'), true);
  assert.equal(puede('admin_sede', 'nota'), false);
  assert.equal(puede('superadmin', 'rangosGlobales'), true);
  assert.equal(puede('admin_sede', 'rangosGlobales'), false);
  // ningún rol distinto de superadmin ve la administración de usuarios
  assert.deepEqual(ROLES.filter((r) => r.modulos.includes('admin_usuarios')).map((r) => r.id), ['superadmin']);
});

test('mensajeError traduce errores técnicos', () => {
  assert.match(mensajeError({ message: 'new row violates row-level security policy for table "notas"' }), /permiso/);
  assert.match(mensajeError({ message: 'Failed to fetch' }), /Sin conexión/);
  assert.equal(mensajeError({ message: 'Registro inmutable: no se permite UPDATE en notas' }), 'Registro inmutable: no se permite UPDATE en notas');
});

test('parseCSV maneja comillas, separador ; y saltos de línea', () => {
  const m = parseCSV('nombres;apellidos;documento\r\n"Ana María";"Pérez; Gómez";123\r\nLuis;Rojas;456\r\n');
  assert.deepEqual(m, [['nombres', 'apellidos', 'documento'], ['Ana María', 'Pérez; Gómez', '123'], ['Luis', 'Rojas', '456']]);
});

test('matrizAResidentes valida columnas, duplicados y edades', () => {
  const ok = matrizAResidentes([
    ['Nombres', 'Apellidos', 'Cédula', 'Edad', 'Diagnóstico'],
    ['Ana', 'Pérez', '111', '82', 'HTA'],
    ['Luis', 'Rojas', '111', '75', ''],      // documento repetido en el archivo
    ['', 'Sin nombre', '333', '', ''],       // falta nombre
    ['Rosa', 'Díaz', '', '300', ''],         // edad no plausible -> null, doc s/n
  ]);
  assert.equal(ok.validas.length, 2);
  assert.equal(ok.errores.length, 2);
  assert.equal(ok.validas[1].doc, 'CC s/n');
  assert.equal(ok.validas[1].edad, null);
  assert.match(matrizAResidentes([['a', 'b']]).errores[0], /nombres/);
});

test('proximoCambioJornada: el cambio manual de centro vence a las 06:00 o 18:00 de Bogotá', () => {
  const iso = (s) => proximoCambioJornada(new Date(s)).toISOString();
  assert.equal(iso('2026-09-26T15:00:00Z'), '2026-09-26T23:00:00.000Z'); // 10:00 → 18:00
  assert.equal(iso('2026-09-26T23:30:00Z'), '2026-09-27T11:00:00.000Z'); // 18:30 → 06:00 del día siguiente
  assert.equal(iso('2026-09-27T08:00:00Z'), '2026-09-27T11:00:00.000Z'); // 03:00 → 06:00 del mismo día
  assert.equal(iso('2026-09-26T11:00:00Z'), '2026-09-26T23:00:00.000Z'); // justo 06:00 → 18:00
});

test('rol Profesional: escribe notas, asistencia y turno; no dotación, alertas ni configuración', () => {
  assert.ok(ROLES.some((r) => r.id === 'profesional'));
  for (const a of ['nota', 'asistencia', 'turno']) assert.equal(puede('profesional', a), true, a);
  for (const a of ['dotacion', 'atenderAlerta', 'config', 'crearResidente', 'rangosResidente']) assert.equal(puede('profesional', a), false, a);
});
