/* Roles, permisos y reglas clínicas. Los permisos AQUÍ solo controlan qué se muestra:
   la autorización real la imponen las políticas RLS de Supabase (supabase/migrations/04). */

export const ROLES = [
  { id: 'auxiliar', nombre: 'Auxiliar de Enfermería', modulos: ['panel', 'residentes', 'nueva', 'asistencia', 'dotacion', 'entrega', 'sdis'], desc: 'Toma de signos vitales, asistencia, notas diarias, dotación y consulta de perfiles' },
  { id: 'superadmin', nombre: 'Administrador General / SuperAdmin', modulos: ['panel', 'residentes', 'nueva', 'asistencia', 'dotacion', 'entrega', 'sdis', 'config', 'admin_usuarios', 'auditoria'], desc: 'Acceso total a las sedes y gestión de usuarios' },
  { id: 'admin_sede', nombre: 'Administrador de Sede', modulos: ['panel', 'residentes', 'asistencia', 'dotacion', 'entrega', 'sdis', 'config'], desc: 'Gestión operativa de su unidad' },
  { id: 'admin_turno', nombre: 'Administrador de Turno', modulos: ['panel', 'residentes', 'asistencia', 'dotacion', 'entrega', 'sdis'], desc: 'Supervisión operativa durante su turno' },
  { id: 'auditor', nombre: 'Auditor de Inventario / Interventoría SDIS', modulos: ['panel', 'dotacion', 'sdis', 'auditoria'], desc: 'Supervisión de dotación, entregas y cumplimiento legal (solo lectura)' },
  { id: 'medico', nombre: 'Médico / Jefe de Enfermería', modulos: ['panel', 'residentes', 'nueva', 'entrega', 'sdis'], desc: 'Valoración clínica, evoluciones y entrega médica' },
  { id: 'profesional', nombre: 'Profesional Psicosocial', modulos: ['panel', 'residentes', 'nueva', 'asistencia', 'entrega', 'sdis'], desc: 'Sucesos con los usuarios, convivencia, actividades y entrega de turno psicosocial' },
];

// Espejo de las políticas RLS (quién puede ESCRIBIR qué)
export const PERMISOS = {
  crearResidente: ['superadmin', 'admin_sede', 'admin_turno'],
  editarResidente: ['superadmin', 'admin_sede', 'admin_turno', 'medico'],
  rangosResidente: ['superadmin', 'admin_sede', 'medico'],
  nota: ['auxiliar', 'medico', 'profesional', 'superadmin'],
  atenderAlerta: ['auxiliar', 'medico', 'admin_sede', 'admin_turno', 'superadmin'],
  asistencia: ['auxiliar', 'profesional', 'admin_sede', 'admin_turno', 'superadmin'],
  dotacion: ['auxiliar', 'admin_sede', 'admin_turno', 'superadmin'],
  turno: ['auxiliar', 'profesional', 'admin_sede', 'admin_turno', 'medico', 'superadmin'],
  config: ['superadmin', 'admin_sede'],
  rangosGlobales: ['superadmin'],
  crearSede: ['superadmin'],
};
export const puede = (rolId, accion) => (PERMISOS[accion] || []).includes(rolId);

export const TIPOS_NOTA = [
  ['evolucion', 'Evolución / toma de signos'], ['novedad_salud', 'Novedad de salud'],
  ['ingreso', 'Observación al ingreso'], ['administracion_medicamento', 'Administración de medicamento'],
  ['activacion_emergencia', 'Activación de emergencia (Línea 123 / EPS)'],
  ['actividad_salud', 'Actividad de salud / articulación'], ['general_jornada', 'Novedad general de la jornada'],
  ['convivencia', 'Convivencia (discusiones, conflictos entre usuarios)'],
];
// El rol Profesional (psicosocial) no registra signos vitales: solo estos tipos
export const TIPOS_PSICOSOCIAL = ['convivencia', 'general_jornada', 'actividad_salud', 'novedad_salud'];
export const esPsicosocial = (rolId) => rolId === 'profesional';
export const TIPO_LBL = Object.fromEntries(TIPOS_NOTA);

export const MOTIVOS_NF = ['No sabe firmar', 'Se niega a firmar', 'Condición de salud', 'Otro'];

/* Rangos por defecto (se sobreescriben con la tabla rangos_clinicos de la BD, que es la fuente de verdad).
   Referencia clínica de la Fundación: DEBE ser validada por el equipo médico. */
export const RANGOS_DEFAULT = {
  ta_s: { lbl: 'TA sistólica', uni: 'mmHg', vMin: 100, vMax: 139, cMin: 90, cMax: 160 },
  ta_d: { lbl: 'TA diastólica', uni: 'mmHg', vMin: 60, vMax: 89, cMin: 50, cMax: 100 },
  fc: { lbl: 'Frec. cardiaca', uni: 'lpm', vMin: 60, vMax: 100, cMin: 50, cMax: 120 },
  fr: { lbl: 'Frec. respiratoria', uni: 'rpm', vMin: 12, vMax: 20, cMin: 10, cMax: 25 },
  temp: { lbl: 'Temperatura', uni: '°C', vMin: 36.0, vMax: 37.5, cMin: 35.0, cMax: 38.5 },
  spo2: { lbl: 'Saturación O₂', uni: '%', vMin: 94, vMax: 100, cMin: 90, cMax: 101 },
  glu: { lbl: 'Glucometría', uni: 'mg/dL', vMin: 70, vMax: 140, cMin: 60, cMax: 200 },
};
export const ORDEN_SIGNOS = ['ta_s', 'ta_d', 'fc', 'fr', 'temp', 'spo2', 'glu'];

// Valores físicamente plausibles (espejo de private.validar_signos)
export const LIMITES_SIGNOS = {
  ta_s: [40, 300], ta_d: [20, 200], fc: [20, 250], fr: [4, 80],
  temp: [30, 43], spo2: [40, 100], glu: [10, 800], dolor: [0, 10],
};

export const rangoDesdeFila = (f) => ({
  lbl: f.lbl, uni: f.uni, vMin: Number(f.v_min), vMax: Number(f.v_max), cMin: Number(f.c_min), cMax: Number(f.c_max),
});

// Rango efectivo = global + overrides por residente ({spo2:{v_min,v_max,c_min,c_max}})
export function rangoEfectivo(rangos, key, overrides) {
  const base = rangos[key];
  if (!base) return null;
  const o = (overrides && overrides[key]) || {};
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
  return {
    ...base,
    vMin: num(o.v_min, base.vMin), vMax: num(o.v_max, base.vMax),
    cMin: num(o.c_min, base.cMin), cMax: num(o.c_max, base.cMax),
  };
}

// 'ok' | 'v' (vigilancia) | 'c' (crítico) | null (sin dato). Misma lógica que private.estado_signo.
export function estadoSigno(rangos, key, valor, overrides) {
  if (valor === '' || valor === null || valor === undefined || Number.isNaN(Number(valor))) return null;
  const r = rangoEfectivo(rangos, key, overrides);
  if (!r) return null;
  const n = Number(valor);
  if (n < r.cMin || n >= r.cMax) return 'c';
  if (n < r.vMin || n > r.vMax) return 'v';
  return 'ok';
}

const f = (n) => String(n);
export const etiquetasRango = (r) => ({
  normal: `${f(r.vMin)}-${f(r.vMax)}`,
  vig: `${f(r.cMin)} a <${f(r.vMin)} o >${f(r.vMax)} a <${f(r.cMax)}`,
  crit: `<${f(r.cMin)} o ≥${f(r.cMax)}`,
});

// Valida un signo antes de enviarlo. Devuelve texto de error o null.
export function errorSigno(key, valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(valor);
  const lim = LIMITES_SIGNOS[key];
  if (Number.isNaN(n)) return 'Debe ser numérico';
  if (lim && (n < lim[0] || n > lim[1])) return `Valor no plausible (${lim[0]}-${lim[1]})`;
  return null;
}

// Regla de dotación: devuelve texto de error o null (espejo del trigger entregas_antes_insert)
export function errorDotacion({ elemento, cantidad, personaId, sedeId, entregas, hoy }) {
  if (!elemento) return null;
  const mes = hoy.slice(0, 7);
  const q = Number(cantidad);
  if (!Number.isInteger(q) || q < 1 || q > 100) return 'La cantidad debe ser un entero entre 1 y 100';
  const delMes = (e) => e.fecha.slice(0, 7) === mes && e.elemento === elemento.key;
  if (elemento.limPersona != null && personaId) {
    const usado = entregas.filter((e) => delMes(e) && e.personaId === personaId).reduce((s, e) => s + e.cantidad, 0);
    if (usado + q > elemento.limPersona) return `Límite mensual por persona superado para "${elemento.nombre}" (máx. ${elemento.limPersona})`;
  }
  if (elemento.limUnidad != null) {
    const usado = entregas.filter((e) => delMes(e) && e.sedeId === sedeId).reduce((s, e) => s + e.cantidad, 0);
    if (usado + q > elemento.limUnidad) return `Límite mensual por unidad superado para "${elemento.nombre}" (máx. ${elemento.limUnidad})`;
  }
  return null;
}
