// Fechas y horas SIEMPRE en zona horaria de Bogotá (la jornada noche cruza la medianoche UTC).
export const TZ = 'America/Bogota';

const fmtISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHora = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const hoyBogota = (d = new Date()) => fmtISO.format(d);
export const horaBogota = (d = new Date()) => fmtHora.format(d);

// Día: 06:00–17:59 · Noche: 18:00–05:59 (misma regla que private.jornada_actual() en la BD)
export const jornadaDe = (d = new Date()) => {
  const h = Number(horaBogota(d).slice(0, 2));
  return h >= 6 && h < 18 ? 'dia' : 'noche';
};

export const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

export const fmtFechaHora = (ts) =>
  new Date(ts).toLocaleString('es-CO', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export const mesDe = (iso) => iso.slice(0, 7);

// Mensajes de error entendibles (los triggers de la BD ya devuelven texto en español).
export const mensajeError = (error) => {
  if (!error) return 'Error desconocido';
  const m = error.message || String(error);
  if (/row-level security|permission denied|42501/i.test(m) && !/inmutable|SuperAdmin/i.test(m)) return 'No tienes permiso para realizar esta acción.';
  if (/duplicate key|23505/i.test(m)) return 'Ya existe un registro con esos datos.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sin conexión con el servidor. Los cambios NO se guardaron.';
  if (/JWT expired|invalid.*token/i.test(m)) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  return m;
};

export const nuevoId = () =>
  (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

export const limpiar = (s, max = 200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
