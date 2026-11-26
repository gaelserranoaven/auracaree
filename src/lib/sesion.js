/* Límite de inactividad que también vale con la pestaña cerrada.

   Supabase deja el token de sesión en localStorage y, por defecto, no lo vence. Los temporizadores de App.jsx
   solo cuentan mientras la página está abierta: si alguien cerraba el navegador sin "Cerrar sesión", la siguiente
   persona que abriera AuraCare en ese equipo entraba con su nombre. Por eso la hora de la última actividad se
   guarda aquí y se revisa al abrir: si pasó el límite, la sesión se cierra antes de cargar nada.

   La marca es solo una hora (milisegundos). No es un dato de salud ni identifica a nadie. */

export const INACTIVIDAD_MS = 20 * 60 * 1000;
const CLAVE = 'auracare_ultima_actividad';
const TOLERANCIA_RELOJ_MS = 60 * 1000;

// Sin marca, con marca ilegible o con una marca "del futuro" (reloj cambiado) se trata como vencida: ante la duda, se pide ingresar.
export const inactividadVencida = (ultima, ahora = Date.now(), limite = INACTIVIDAD_MS) =>
  !Number.isFinite(ultima) || ultima <= 0 || ahora - ultima > limite || ultima - ahora > TOLERANCIA_RELOJ_MS;

export const leerActividad = () => {
  try { return Number(localStorage.getItem(CLAVE)); } catch { return NaN; }
};

export const marcarActividad = (ahora = Date.now()) => {
  try { localStorage.setItem(CLAVE, String(ahora)); } catch { /* sin almacenamiento: tampoco hay sesión guardada */ }
};

export const borrarActividad = () => {
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
};
