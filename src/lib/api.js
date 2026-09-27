import { db } from './supabase.js';
import { mensajeError, limpiar } from './util.js';
import { rangoDesdeFila } from './clinico.js';

/* Toda operación devuelve datos o LANZA Error con mensaje legible.
   La UI solo confirma "guardado" cuando la BD respondió OK (antes era fire-and-forget). */
const ok = ({ data, error }) => {
  if (error) throw new Error(mensajeError(error));
  return data;
};

/* ============ Mapeadores fila BD -> objeto de la app ============ */
export const mSede = (s) => ({ id: s.id, nombre: s.nombre, cupos: s.cupos });
export const mPerfil = (u) => ({ id: u.id, nombre: u.nombre, email: u.email, rolId: u.rol_id, sedeId: u.sede_id, jornadaPermitida: u.jornada_permitida, estado: u.estado, createdAt: u.created_at });
export const mResidente = (r) => ({
  id: r.id, sedeId: r.sede_id, nombres: r.nombres, apellidos: r.apellidos, doc: r.doc, edad: r.edad, dx: r.dx,
  signos: r.signos || {}, hist: r.hist || {}, estado: r.estado || 'activo', fechaEgreso: r.fecha_egreso, motivoEgreso: r.motivo_egreso, rangos: r.rangos || {},
});
export const mNota = (n) => ({
  id: n.id, sedeId: n.sede_id, personaId: n.persona_id, tipo: n.tipo, jornada: n.jornada, fecha: n.fecha, hora: n.hora,
  descripcion: n.descripcion, signos: n.signos || {}, autor: n.autor, cargo: n.cargo, hash: n.hash, prevHash: n.prev_hash, seq: n.seq, createdAt: n.created_at,
});
export const mAlerta = (a) => ({ id: a.id, sedeId: a.sede_id, personaId: a.persona_id, parametro: a.parametro, valor: a.valor, sev: a.sev, estado: a.estado, hora: a.hora, notaId: a.nota_id, createdAt: a.created_at });
export const mAsistencia = (a) => ({ id: a.id, sedeId: a.sede_id, personaId: a.persona_id, fecha: a.fecha, estado: a.estado, motivo: a.motivo || '' });
export const mActividad = (a) => ({ id: a.id, sedeId: a.sede_id, fecha: a.fecha, nombre: a.nombre, linea: a.linea, profesional: a.profesional, participacion: a.participacion || {} });
export const mEntrega = (e) => ({ id: e.id, sedeId: e.sede_id, personaId: e.persona_id, elemento: e.elemento, cantidad: e.cantidad, fecha: e.fecha, quien: e.quien, obs: e.obs });
export const mPertenencia = (p) => ({ id: p.id, sedeId: p.sede_id, personaId: p.persona_id, ayudas: p.ayudas, prendas: p.prendas, lenceria: p.lenceria, otros: p.otros, obs: p.obs, fechaRecibo: p.fecha_recibo, estado: p.estado, fechaDev: p.fecha_dev });
export const mTurno = (t) => ({ id: t.id, sedeId: t.sede_id, jornada: t.jornada, fecha: t.fecha, observaciones: t.observaciones, firmadoPor: t.firmado_por_nombre, createdAt: t.created_at });
export const mElemento = (e) => ({ key: e.key, nombre: e.nombre, regla: e.regla, limPersona: e.lim_persona_mes, limUnidad: e.lim_unidad_mes });
export const mAuditoria = (a) => ({ id: a.id, userId: a.user_id, accion: a.accion, tabla: a.tabla, registroId: a.registro_id, sedeId: a.sede_id, detalle: a.detalle, createdAt: a.created_at });

const restarDias = (iso, n) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ============ Sesión ============ */
export async function iniciarSesion(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email: limpiar(email, 254).toLowerCase(), password });
  if (error) {
    if (/Invalid login credentials/i.test(error.message)) throw new Error('Correo o contraseña incorrectos.');
    if (/Email not confirmed/i.test(error.message)) throw new Error('Debes confirmar tu correo antes de ingresar (revisa tu bandeja).');
    throw new Error(mensajeError(error));
  }
  return data.user;
}

export async function registrarse({ nombre, email, password }) {
  const { data, error } = await db.auth.signUp({
    email: limpiar(email, 254).toLowerCase(), password, options: { data: { nombre: limpiar(nombre, 80) } },
  });
  if (error) throw new Error(mensajeError(error));
  if (data.session) await db.auth.signOut(); // cuenta pendiente: no debe quedar con sesión abierta
  return { requiereConfirmarCorreo: !data.session };
}

export const cerrarSesion = () => db.auth.signOut();
export const sesionActual = async () => (await db.auth.getSession()).data.session;
export const cambiarPassword = async (password) => { ok(await db.auth.updateUser({ password })); };

export async function cargarMiPerfil(userId) {
  const { data, error } = await db.from('perfiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data ? mPerfil(data) : null;
}

/* ============ Carga inicial ============ */
export async function cargarTodo(perfil, hoy) {
  const desde = restarDias(hoy, 7);
  const mes1 = hoy.slice(0, 7) + '-01';
  const esSuper = perfil.rolId === 'superadmin';
  const res = await Promise.all([
    db.from('sedes').select('*').order('nombre'),
    db.from('residentes').select('*').order('apellidos'),
    db.from('notas').select('*').gte('fecha', desde).order('seq', { ascending: true }).limit(1000),
    db.from('alertas').select('*').eq('estado', 'activa').order('created_at', { ascending: false }).limit(500),
    db.from('asistencias').select('*').eq('fecha', hoy),
    db.from('actividades').select('*').eq('fecha', hoy),
    db.from('entregas').select('*').gte('fecha', mes1).limit(2000),
    db.from('pertenencias').select('*').order('fecha_recibo', { ascending: false }).limit(1000),
    db.from('config_sedes').select('*'),
    db.from('rangos_clinicos').select('*'),
    db.from('elementos_dotacion').select('*'),
    db.from('entregas_turno').select('*').order('created_at', { ascending: false }).limit(30),
    esSuper ? db.from('perfiles').select('*').order('created_at') : Promise.resolve({ data: [] }),
  ]);
  const [sedes, resid, notas, alertas, asist, acts, entregas, pert, cfg, rangos, elems, turnos, perfiles] = res.map(ok);

  const asistencias = {};
  asist.forEach((a) => { asistencias[a.sede_id + '|' + a.fecha + '|' + a.persona_id] = mAsistencia(a); });
  const config = {};
  cfg.forEach((c) => { config[c.sede_id] = { glu: c.glu, dolor: c.dolor }; });
  const rangosMap = {};
  rangos.forEach((r) => { rangosMap[r.parametro] = rangoDesdeFila(r); });

  return {
    sedes: sedes.map(mSede),
    residentes: resid.map(mResidente),
    notas: notas.map(mNota),
    alertas: alertas.map(mAlerta),
    asistencias,
    actividades: acts.map(mActividad),
    entregas: entregas.map(mEntrega),
    pertenencias: pert.map(mPertenencia),
    config,
    rangos: Object.keys(rangosMap).length ? rangosMap : null,
    elementos: elems.map(mElemento),
    turnos: turnos.map(mTurno),
    perfiles: perfiles.map(mPerfil),
  };
}

export async function cargarNotasPersona(personaId) {
  return ok(await db.from('notas').select('*').eq('persona_id', personaId).order('seq', { ascending: true }).limit(500)).map(mNota);
}
export async function cargarNotasDia(sedeId, fecha) {
  return ok(await db.from('notas').select('*').eq('sede_id', sedeId).eq('fecha', fecha).order('seq', { ascending: true }).limit(1000)).map(mNota);
}
export async function cargarAsistenciaDia(sedeId, fecha) {
  return ok(await db.from('asistencias').select('*').eq('sede_id', sedeId).eq('fecha', fecha)).map(mAsistencia);
}
export async function cargarAuditoria(limite = 200) {
  return ok(await db.from('auditoria').select('*').order('created_at', { ascending: false }).limit(limite)).map(mAuditoria);
}
export async function verificarCadena(sedeId) {
  const r = ok(await db.rpc('verificar_cadena_notas', { p_sede: sedeId }));
  return r && r[0] ? r[0] : { total: 0, validas: 0, primera_rota: null };
}

/* ============ Escrituras ============ */
export async function crearResidente(sedeId, f) {
  const fila = {
    sede_id: sedeId, nombres: limpiar(f.nombres, 80), apellidos: limpiar(f.apellidos, 80),
    doc: limpiar(f.numDoc || f.doc, 30) || 'CC s/n', edad: f.edad ? Number(f.edad) : null, dx: limpiar(f.dx, 300) || 'Sin registrar',
  };
  return mResidente(ok(await db.from('residentes').insert(fila).select().single()));
}

export async function importarResidentes(sedeId, lista) {
  const creados = []; const omitidos = [];
  for (const v of lista) {
    try { creados.push(await crearResidente(sedeId, v)); }
    catch (e) { omitidos.push(`${v.nombres} ${v.apellidos}: ${e.message}`); }
  }
  return { creados, omitidos };
}

export async function actualizarResidente(id, parche) {
  const fila = {};
  if ('nombres' in parche) fila.nombres = limpiar(parche.nombres, 80);
  if ('apellidos' in parche) fila.apellidos = limpiar(parche.apellidos, 80);
  if ('doc' in parche) fila.doc = limpiar(parche.doc, 30) || 'CC s/n';
  if ('edad' in parche) fila.edad = parche.edad ? Number(parche.edad) : null;
  if ('dx' in parche) fila.dx = limpiar(parche.dx, 300);
  if ('estado' in parche) fila.estado = parche.estado;
  if ('fechaEgreso' in parche) fila.fecha_egreso = parche.fechaEgreso;
  if ('motivoEgreso' in parche) fila.motivo_egreso = limpiar(parche.motivoEgreso, 300);
  if ('rangos' in parche) fila.rangos = parche.rangos;
  return mResidente(ok(await db.from('residentes').update(fila).eq('id', id).select().single()));
}

export async function guardarNota(sedeId, { personaId, tipo, descripcion, signos }) {
  const nota = mNota(ok(await db.from('notas').insert({
    sede_id: sedeId, persona_id: personaId || null, tipo, descripcion: String(descripcion).trim(), signos,
  }).select().single()));
  // El servidor actualizó signos/histórico del residente y generó alertas (triggers): traer el estado real
  let residente = null; let alertas = [];
  if (personaId) {
    residente = mResidente(ok(await db.from('residentes').select('*').eq('id', personaId).single()));
    alertas = ok(await db.from('alertas').select('*').eq('nota_id', nota.id)).map(mAlerta);
  }
  return { nota, residente, alertas };
}

export async function atenderAlerta(id) {
  return mAlerta(ok(await db.from('alertas').update({ estado: 'atendida' }).eq('id', id).select().single()));
}

export async function guardarAsistencia({ sedeId, personaId, fecha, estado, motivo, existe }) {
  const id = `${sedeId}|${fecha}|${personaId}`;
  if (existe) {
    return mAsistencia(ok(await db.from('asistencias').update({ estado, motivo: motivo || '' }).eq('id', id).select().single()));
  }
  return mAsistencia(ok(await db.from('asistencias').insert({ id, sede_id: sedeId, persona_id: personaId, fecha, estado, motivo: motivo || '' }).select().single()));
}

export async function crearActividad(sedeId, { nombre, linea, profesional }) {
  return mActividad(ok(await db.from('actividades').insert({
    sede_id: sedeId, nombre: limpiar(nombre, 120), linea: limpiar(linea, 120), profesional: limpiar(profesional, 120), participacion: {},
  }).select().single()));
}
export async function guardarParticipacion(id, participacion) {
  return mActividad(ok(await db.from('actividades').update({ participacion }).eq('id', id).select().single()));
}

export async function registrarEntrega(sedeId, { personaId, elemento, cantidad, obs }) {
  return mEntrega(ok(await db.from('entregas').insert({
    sede_id: sedeId, persona_id: personaId, elemento, cantidad: Number(cantidad), obs: limpiar(obs, 300) || null,
  }).select().single()));
}

export async function registrarPertenencia(sedeId, { personaId, ayudas, prendas, lenceria, otros, obs }) {
  return mPertenencia(ok(await db.from('pertenencias').insert({
    sede_id: sedeId, persona_id: personaId, ayudas: limpiar(ayudas, 300), prendas: limpiar(prendas, 300),
    lenceria: limpiar(lenceria, 300), otros: limpiar(otros, 300), obs: limpiar(obs, 300),
  }).select().single()));
}
export async function devolverPertenencia(id) {
  return mPertenencia(ok(await db.from('pertenencias').update({ estado: 'devuelta' }).eq('id', id).select().single()));
}

export async function firmarEntregaTurno(sedeId, observaciones) {
  return mTurno(ok(await db.from('entregas_turno').insert({ sede_id: sedeId, observaciones: String(observaciones).trim() }).select().single()));
}

export async function guardarConfig(sedeId, parche, existe) {
  if (existe) return ok(await db.from('config_sedes').update(parche).eq('sede_id', sedeId).select().single());
  return ok(await db.from('config_sedes').insert({ sede_id: sedeId, ...parche }).select().single());
}

export async function crearSede({ nombre, cupos }) {
  const id = 'sede_' + Math.random().toString(36).slice(2, 8);
  const sede = mSede(ok(await db.from('sedes').insert({ id, nombre: limpiar(nombre, 120), cupos: Number(cupos) || 30 }).select().single()));
  await db.from('config_sedes').insert({ sede_id: id, glu: true, dolor: true });
  return sede;
}
export async function actualizarSede(id, { nombre, cupos }) {
  return mSede(ok(await db.from('sedes').update({ nombre: limpiar(nombre, 120), cupos: Number(cupos) }).eq('id', id).select().single()));
}

export async function actualizarRango(parametro, r) {
  const fila = { v_min: r.vMin, v_max: r.vMax, c_min: r.cMin, c_max: r.cMax };
  ok(await db.from('rangos_clinicos').update(fila).eq('parametro', parametro).select().single());
}

/* ---- Perfiles (administración) ---- */
export async function actualizarPerfil(id, parche) {
  const fila = {};
  if ('nombre' in parche) fila.nombre = limpiar(parche.nombre, 80);
  if ('rolId' in parche) fila.rol_id = parche.rolId;
  if ('sedeId' in parche) fila.sede_id = parche.sedeId || null;
  if ('jornadaPermitida' in parche) fila.jornada_permitida = parche.jornadaPermitida;
  if ('estado' in parche) fila.estado = parche.estado;
  return mPerfil(ok(await db.from('perfiles').update(fila).eq('id', id).select().single()));
}

/* ---- Auditoría de lectura (best-effort: nunca bloquea la UI) ---- */
export function auditarLectura(accion, tabla, registroId, sedeId) {
  db.from('auditoria').insert({ accion, tabla, registro_id: registroId || null, sede_id: sedeId || null, detalle: {} })
    .then(() => {}, () => {});
}

/* ---- Realtime (respeta RLS: solo llegan filas visibles para el usuario) ---- */
export function suscribir(tablas, onCambio) {
  let canal = db.channel('auracare-' + Math.random().toString(36).slice(2, 8));
  tablas.forEach((tabla) => {
    canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, (p) => onCambio(tabla, p));
  });
  canal.subscribe();
  return () => { db.removeChannel(canal); };
}
