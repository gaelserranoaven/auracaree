import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './lib/api.js';
import { ROLES, RANGOS_DEFAULT, puede, esPsicosocial } from './lib/clinico.js';
import { fmtFecha, hoyBogota, jornadaDe } from './lib/util.js';
import { Ctx, Logo, VERSION, ErrorBoundary, Icono, IconoAviso, Modal } from './components/ui.jsx';
import { CookieBanner, ModalLegal } from './components/Legal.jsx';
import { Login } from './components/Login.jsx';
import { AdminUsuarios } from './components/AdminUsuarios.jsx';
import { PerfilUsuario } from './components/Perfil.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { Residentes, Importador, NuevoResidente, EditarResidente, EgresoResidente } from './components/Residentes.jsx';
import { Ficha } from './components/Ficha.jsx';
import { NuevaNota, hayBorrador, borrarBorrador } from './components/NuevaNota.jsx';
import { Asistencia } from './components/Asistencia.jsx';
import { Dotacion } from './components/Dotacion.jsx';
import { EntregaTurno } from './components/EntregaTurno.jsx';
import { RegistroSdis } from './components/RegistroSdis.jsx';
import { Config } from './components/Config.jsx';
import { Auditoria } from './components/Auditoria.jsx';
import { useCentro, CentroSwitch, CieloCambio } from './components/Centro.jsx';
import { CambioClave } from './components/CambioClave.jsx';

const INACTIVIDAD_MS = 20 * 60 * 1000;
const AVISO_INACTIVIDAD_MS = 60 * 1000; // aviso antes de cerrar la sesión

/* Cuenta regresiva antes del cierre por inactividad. Esc o el botón mantienen la sesión. */
const AvisoInactividad = ({ limite, onSeguir }) => {
  const [seg, setSeg] = useState(() => Math.max(0, Math.ceil((limite - Date.now()) / 1000)));
  useEffect(() => { const t = setInterval(() => setSeg(Math.max(0, Math.ceil((limite - Date.now()) / 1000))), 1000); return () => clearInterval(t); }, [limite]);
  return (
    <Modal titulo="¿Sigues ahí?" sub={`Tu sesión se cerrará en ${seg} s por inactividad.`} cerrar={onSeguir}>
      <div className="modal-foot"><button className="btn btn-primary" onClick={onSeguir}>Seguir en la sesión</button></div>
    </Modal>
  );
};
const TITULOS = {
  panel: 'Panel general', residentes: 'Personas mayores', ficha: 'Ficha clínica', nueva: 'Nueva nota', asistencia: 'Asistencia y actividades',
  dotacion: 'Dotación de elementos', entrega: 'Entrega de turno', sdis: 'Registro SDIS FOR-PSS-729', config: 'Configuración',
  admin_usuarios: 'Gestión de usuarios', auditoria: 'Auditoría', perfil: 'Mi perfil',
};

const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const upsert = (lista, item) => { const i = lista.findIndex((x) => x.id === item.id); if (i < 0) return [...lista, item]; const c = [...lista]; c[i] = item; return c; };
const porFecha = (a, b) => (a.createdAt || '').localeCompare(b.createdAt || '');

class ErrorCuenta extends Error {}

export const App = () => {
  const [pantalla, setPantalla] = useState('cargando'); // cargando | login | cambiar_clave | app | error
  const [errorCarga, setErrorCarga] = useState('');
  const [view, setView] = useState('panel');
  const [navStack, setNavStack] = useState(['panel']);
  const [ahora, setAhora] = useState(() => new Date());
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  const [perfil, setPerfil] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [sedeId, setSedeId] = useState('');
  const [perfiles, setPerfiles] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [notas, setNotas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [actividades, setActividades] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [pertenencias, setPertenencias] = useState([]);
  const [config, setConfig] = useState({});
  const [rangosBD, setRangosBD] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [recepciones, setRecepciones] = useState([]);

  const [fichaId, setFichaId] = useState(null);
  const [preselNota, setPreselNota] = useState('');
  const [modal, setModal] = useState(null);
  const [masAbierto, setMasAbierto] = useState(false);
  const [avisoInact, setAvisoInact] = useState(0); // marca de tiempo del cierre; 0 si no hay aviso
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const avisoRef = useRef(0);
  const reiniciarInactividad = useRef(() => {});
  const [showCookie, setShowCookie] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const hoy = hoyBogota(ahora);
  const rangos = rangosBD || RANGOS_DEFAULT;
  // La jornada de trabajo es la del centro elegido (Centro Día / Centro Noche); por defecto sigue la hora de Bogotá.
  // Es la que se envía al servidor al guardar notas, actas y recibos de turno.
  const { centro, manual: centroManual, cambiar: cambiarCentro, animacion: animCentro } = useCentro(jornadaDe(ahora));
  const jornada = centro;
  const rol = perfil ? ROLES.find((r) => r.id === perfil.rolId) || ROLES[0] : null;

  // tipo: 'ok' (por defecto) | 'error' | 'alerta' | 'info' | 'sello': define el ícono del aviso
  // 'error' y 'alerta' se quedan hasta que alguien los cierre; el resto se oculta solo
  const avisar = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo });
    clearTimeout(toastTimer.current);
    if (tipo !== 'error' && tipo !== 'alerta') toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  // Confirmación propia (reemplaza window.confirm): confirmar({ titulo, sub, si, peligro }) -> Promise<boolean>
  const [dialogoConf, setDialogoConf] = useState(null);
  const resolverConf = useRef(null);
  const cerrarConf = useCallback((v) => { if (resolverConf.current) resolverConf.current(v); resolverConf.current = null; setDialogoConf(null); }, []);
  const confirmar = useCallback((o) => new Promise((res) => { if (resolverConf.current) resolverConf.current(false); resolverConf.current = res; setDialogoConf(o); }), []);
  const ctx = useMemo(() => ({ hoy, jornada, rangos, avisar, confirmar }), [hoy, jornada, rangos, avisar, confirmar]);

  /* ---------- Reloj, conexión ---------- */
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { try { if (!localStorage.getItem('auracare_cookie_consent')) setShowCookie(true); } catch { /* sin storage */ } }, []);

  /* ---------- Carga de datos ---------- */
  const aplicarDatos = useCallback((d, p) => {
    setSedes(d.sedes); setPerfiles(d.perfiles); setResidentes(d.residentes); setNotas(d.notas); setAlertas(d.alertas);
    setAsistencias(d.asistencias); setActividades(d.actividades); setEntregas(d.entregas); setPertenencias(d.pertenencias);
    setConfig(d.config); setRangosBD(d.rangos); setElementos(d.elementos); setTurnos(d.turnos); setRecepciones(d.recepciones);
    // Solo se opera en sedes activas; las suspendidas se ven (SuperAdmin) en Configuración
    const activas = d.sedes.filter((s) => s.activa);
    setSedeId((actual) => (activas.some((s) => s.id === actual) ? actual : (activas.find((s) => s.id === p.sedeId) || activas[0] || {}).id || ''));
  }, []);

  const iniciarApp = useCallback(async (userId) => {
    const p = await api.cargarMiPerfil(userId);
    if (!p) { await api.cerrarSesion(); throw new ErrorCuenta('Tu cuenta no tiene perfil. Solicita acceso de nuevo.'); }
    if (p.estado === 'pendiente') { await api.cerrarSesion(); throw new ErrorCuenta('Tu cuenta está pendiente de aprobación por un Administrador.'); }
    if (p.estado === 'suspendido') { await api.cerrarSesion(); throw new ErrorCuenta('Tu cuenta está suspendida. Contacta a un Administrador.'); }
    const d = await api.cargarTodo(p, hoyBogota());
    setPerfil(p); aplicarDatos(d, p);
    setNavStack(['panel']); setView('panel'); setPantalla(p.debeCambiarClave ? 'cambiar_clave' : 'app');
  }, [aplicarDatos]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.sesionActual();
        if (s) await iniciarApp(s.user.id); else setPantalla('login');
      } catch (e) {
        if (e instanceof ErrorCuenta) { setPantalla('login'); avisar(e.message, 'info'); }
        else { setErrorCarga(e.message); setPantalla('error'); }
      }
    })();
  }, [iniciarApp, avisar]);

  const refrescar = useCallback(async () => {
    if (!perfil) return;
    try { aplicarDatos(await api.cargarTodo(perfil, hoyBogota()), perfil); } catch (e) { avisar(e.message, 'error'); }
  }, [perfil, aplicarDatos, avisar]);

  // Cambio de día (Bogotá) con la pestaña abierta: recargar datos "de hoy"
  const hoyAnterior = useRef(hoy);
  useEffect(() => {
    if (hoyAnterior.current !== hoy) { hoyAnterior.current = hoy; if (pantalla === 'app') refrescar(); }
  }, [hoy, pantalla, refrescar]);

  /* ---------- Sesión ---------- */
  const login = async (email, password) => {
    const user = await api.iniciarSesion(email, password);
    try { await iniciarApp(user.id); }
    catch (e) { if (e instanceof ErrorCuenta) throw e; await api.cerrarSesion(); throw e; }
  };
  const solicitarCuenta = async (datos) => {
    const { requiereConfirmarCorreo } = await api.registrarse(datos);
    avisar(requiereConfirmarCorreo ? 'Solicitud enviada. Confirma tu correo y espera la aprobación.' : 'Solicitud enviada. Pendiente de aprobación.');
    return true;
  };
  // conservarBorrador: solo en el cierre por inactividad, para no perder una nota clínica a medias (vuelve al mismo usuario al entrar)
  const logout = useCallback(async (mensaje, conservarBorrador = false) => {
    try { await api.cerrarSesion(); } catch { /* ya cerrada */ }
    try { Object.keys(sessionStorage).filter((k) => k.startsWith('auracare_') && !(conservarBorrador && k.startsWith('auracare_borrador_'))).forEach((k) => sessionStorage.removeItem(k)); } catch { /* sin storage */ }
    setPerfil(null); setPerfiles([]); setResidentes([]); setNotas([]); setAlertas([]); setAsistencias({}); setActividades([]);
    setEntregas([]); setPertenencias([]); setTurnos([]); setRecepciones([]); setFichaId(null); setModal(null);
    setConfirmarSalida(false); cerrarConf(false);
    setNavStack(['panel']); setView('panel'); setPantalla('login');
    avisar(mensaje || 'Sesión cerrada con seguridad');
  }, [avisar, cerrarConf]);

  // Cierre automático por inactividad (equipos compartidos con datos sensibles)
  useEffect(() => {
    if (pantalla !== 'app') return undefined;
    let tAviso; let tSalir;
    const reiniciar = () => {
      if (avisoRef.current) return; // con el aviso abierto solo "Seguir en la sesión" cuenta
      clearTimeout(tAviso); clearTimeout(tSalir);
      tAviso = setTimeout(() => { avisoRef.current = Date.now() + AVISO_INACTIVIDAD_MS; setAvisoInact(avisoRef.current); }, INACTIVIDAD_MS - AVISO_INACTIVIDAD_MS);
      tSalir = setTimeout(() => { avisoRef.current = 0; setAvisoInact(0); logout('Sesión cerrada por inactividad.', true); }, INACTIVIDAD_MS);
    };
    reiniciarInactividad.current = () => { avisoRef.current = 0; setAvisoInact(0); reiniciar(); };
    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar();
    return () => { clearTimeout(tAviso); clearTimeout(tSalir); avisoRef.current = 0; eventos.forEach((e) => window.removeEventListener(e, reiniciar)); };
  }, [pantalla, logout]);

  /* ---------- Tiempo real ---------- */
  useEffect(() => {
    if (pantalla !== 'app') return undefined;
    const alCambio = (tabla, p) => {
      if (p.eventType === 'DELETE' || !p.new) return;
      const r = p.new;
      switch (tabla) {
        case 'notas': setNotas((l) => upsert(l, api.mNota(r)).sort(porFecha)); break;
        case 'alertas': { const a = api.mAlerta(r); setAlertas((l) => (a.estado === 'activa' ? upsert(l, a) : l.filter((x) => x.id !== a.id))); break; }
        case 'asistencias': { const a = api.mAsistencia(r); setAsistencias((m) => ({ ...m, [a.id]: a })); break; }
        case 'entregas': setEntregas((l) => upsert(l, api.mEntrega(r))); break;
        case 'pertenencias': setPertenencias((l) => upsert(l, api.mPertenencia(r))); break;
        case 'entregas_turno': setTurnos((l) => upsert(l, api.mTurno(r)).sort(porFecha).reverse()); break;
        case 'recepciones_turno': setRecepciones((l) => upsert(l, api.mRecepcion(r)).sort(porFecha).reverse()); break;
        case 'residentes': setResidentes((l) => upsert(l, api.mResidente(r))); break;
        case 'actividades': setActividades((l) => upsert(l, api.mActividad(r))); break;
        default: break;
      }
    };
    return api.suscribir(['notas', 'alertas', 'asistencias', 'entregas', 'pertenencias', 'entregas_turno', 'recepciones_turno', 'residentes', 'actividades'], alCambio);
  }, [pantalla]);

  /* ---------- Navegación ---------- */
  const navegarA = (v) => { if (view !== v) { setNavStack((p) => [...p, v]); setView(v); } };
  const goBack = () => {
    if (navStack.length > 1) { const n = [...navStack]; n.pop(); setNavStack(n); setView(n[n.length - 1]); } else setView('panel');
  };

  /* ---------- Acciones (todas esperan confirmación del servidor) ---------- */
  const irFicha = (id) => {
    setFichaId(id); navegarA('ficha');
    api.auditarLectura('ver_ficha', 'residentes', id, sedeId);
    api.cargarNotasPersona(id).then((lista) => setNotas((prev) => lista.reduce((acc, n) => upsert(acc, n), prev).sort(porFecha)), (e) => avisar(e.message, 'error'));
  };

  const guardarNota = async (datos) => {
    const { nota, residente, alertas: nuevas } = await api.guardarNota(sedeId, { ...datos, jornada });
    setNotas((p) => upsert(p, nota).sort(porFecha));
    if (residente) setResidentes((p) => upsert(p, residente));
    if (nuevas.length) setAlertas((p) => nuevas.reduce((acc, a) => upsert(acc, a), p));
    avisar(nuevas.some((a) => a.sev === 'critica') ? 'ALERTA CRÍTICA generada para el equipo' : 'Nota guardada y sellada', nuevas.some((a) => a.sev === 'critica') ? 'alerta' : 'sello');
    if (datos.personaId) { setFichaId(datos.personaId); navegarA('ficha'); } else navegarA('panel');
    return true;
  };

  const acciones = {
    atenderAlerta: async (id) => { await api.atenderAlerta(id); setAlertas((p) => p.filter((a) => a.id !== id)); avisar('Alerta marcada como atendida'); },
    crearResidente: async (f) => { const r = await api.crearResidente(sedeId, f); setResidentes((p) => upsert(p, r)); setModal(null); avisar('Residente registrado'); },
    importar: async (lista) => {
      const { creados, omitidos } = await api.importarResidentes(sedeId, lista);
      setResidentes((p) => creados.reduce((acc, r) => upsert(acc, r), p)); setModal(null);
      avisar(`${creados.length} residente(s) importados` + (omitidos.length ? `. ${omitidos.length} omitido(s): ${omitidos[0]}` : ''));
    },
    editarResidente: async (id, parche, msg) => { const r = await api.actualizarResidente(id, parche); setResidentes((p) => upsert(p, r)); setModal(null); avisar(msg || 'Datos actualizados'); },
    marcarAsistencia: async (personaId, estado, motivo) => {
      const key = `${sedeId}|${hoy}|${personaId}`; const previa = asistencias[key];
      setAsistencias((m) => ({ ...m, [key]: { id: key, sedeId, personaId, fecha: hoy, estado, motivo: motivo || '' } }));
      try {
        const a = await api.guardarAsistencia({ sedeId, personaId, fecha: hoy, estado, motivo, existe: !!previa });
        setAsistencias((m) => ({ ...m, [key]: a }));
      } catch (e) {
        setAsistencias((m) => { const n = { ...m }; if (previa) n[key] = previa; else delete n[key]; return n; });
        throw e;
      }
    },
    crearActividad: async (f) => { const a = await api.crearActividad(sedeId, f); setActividades((p) => upsert(p, a)); },
    participacion: async (act, personaId) => {
      const nueva = { ...act.participacion, [personaId]: !act.participacion[personaId] };
      const a = await api.guardarParticipacion(act.id, nueva);
      setActividades((p) => upsert(p, a));
    },
    entrega: async (f) => { const e = await api.registrarEntrega(sedeId, f); setEntregas((p) => upsert(p, e)); },
    pertenencia: async (f) => { const x = await api.registrarPertenencia(sedeId, f); setPertenencias((p) => upsert(p, x)); },
    devolucion: async (id) => { const x = await api.devolverPertenencia(id); setPertenencias((p) => upsert(p, x)); avisar('Devolución registrada'); },
    firmarTurno: async (obs, j) => { const t = await api.firmarEntregaTurno(sedeId, obs, j || jornada); setTurnos((p) => [t, ...p.filter((x) => x.id !== t.id)]); },
    recibirTurno: async (entregaId, obs) => { const r = await api.recibirTurno(sedeId, entregaId, obs, jornada); setRecepciones((p) => [r, ...p.filter((x) => x.id !== r.id)]); },
    toggleConfig: async (k) => {
      const actual = config[sedeId] || { glu: true, dolor: true };
      const nuevo = { ...actual, [k]: !actual[k] };
      await api.guardarConfig(sedeId, { [k]: nuevo[k] }, !!config[sedeId]);
      setConfig((c) => ({ ...c, [sedeId]: nuevo })); avisar('Configuración guardada');
    },
    crearSede: async (f) => { const s = await api.crearSede(f); setSedes((p) => [...p, s].sort((a, b) => a.nombre.localeCompare(b.nombre))); setConfig((c) => ({ ...c, [s.id]: { glu: true, dolor: true } })); },
    actualizarSede: async (id, f) => { const s = await api.actualizarSede(id, f); setSedes((p) => p.map((x) => (x.id === id ? s : x))); },
    guardarRango: async (parametro, r) => { await api.actualizarRango(parametro, r); setRangosBD((prev) => ({ ...(prev || RANGOS_DEFAULT), [parametro]: { ...(prev || RANGOS_DEFAULT)[parametro], ...r } })); },
    actualizarPerfil: async (id, parche) => { const p = await api.actualizarPerfil(id, parche); setPerfiles((l) => l.map((x) => (x.id === id ? p : x))); },
    crearUsuario: async (datos) => { const r = await api.crearUsuario(datos); setPerfiles((l) => [...l.filter((x) => x.id !== r.perfil.id), r.perfil]); return r; },
    suspenderSede: async (id, motivo) => { const x = await api.suspenderSede(id, motivo); setSedes((p) => p.map((s) => (s.id === id ? x : s))); },
    reactivarSede: async (id) => { const x = await api.reactivarSede(id); setSedes((p) => p.map((s) => (s.id === id ? x : s))); },
    actualizarNombre: async (nombre) => { const p = await api.actualizarPerfil(perfil.id, { nombre }); setPerfil(p); setPerfiles((l) => l.map((x) => (x.id === p.id ? p : x))); },
  };

  /* ---------- Render ---------- */
  const contenido = (() => {
    if (pantalla === 'cargando') {
      return (
        <div className="pantalla-error" role="status"><Logo /><p>Cargando AuraCare…</p></div>
      );
    }
    if (pantalla === 'error') {
      return (
        <div className="pantalla-error">
          <Logo />
          <h2>No se pudo cargar AuraCare</h2>
          <p>{errorCarga || 'Error de conexión.'} Verifica tu internet e inténtalo de nuevo. Si el problema continúa, avisa al administrador.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      );
    }
    if (pantalla === 'cambiar_clave' && perfil) {
      return <CambioClave nombre={perfil.nombre} onSalir={() => logout()} onCambiar={async (clave) => {
        await api.cambiarPassword(clave);
        const p = await api.actualizarPerfil(perfil.id, { debeCambiarClave: false });
        setPerfil(p); setPantalla('app'); avisar('Contraseña creada. Bienvenido a AuraCare');
      }} />;
    }
    if (pantalla === 'login') {
      return (
        <>
          <Login onLogin={login} onSolicitarCuenta={solicitarCuenta} abrirTerminos={() => setShowLegal(true)} />
          {showCookie && <CookieBanner abrirTerminos={() => setShowLegal(true)}
            onAceptar={() => { try { localStorage.setItem('auracare_cookie_consent', 'all'); } catch { /* */ } setShowCookie(false); }}
            onRechazar={() => { try { localStorage.setItem('auracare_cookie_consent', 'necessary'); } catch { /* */ } setShowCookie(false); }} />}
        </>
      );
    }

    const sedesActivas = sedes.filter((s) => s.activa);
    // El SuperAdmin entra aunque todas las sedes estén suspendidas, para poder reactivarlas
    const sede = sedesActivas.find((s) => s.id === sedeId) || sedesActivas[0] || (perfil.rolId === 'superadmin' ? sedes[0] : undefined);
    if (!sede) {
      return (
        <div className="pantalla-error"><Logo /><h2>Sin sede asignada</h2>
          <p>Tu cuenta no tiene una unidad operativa activa (puede estar suspendida). Pide a un Administrador que lo revise.</p>
          <button className="btn btn-primary" onClick={() => logout()}>Cerrar sesión</button></div>
      );
    }
    const cfg = config[sede.id] || { glu: true, dolor: true };
    const resSede = residentes.filter((r) => r.sedeId === sede.id);
    const fichaRes = residentes.find((r) => r.id === fichaId);
    const puedeVer = (m) => rol.modulos.includes(m);
    const vista = puedeVer(view) || view === 'ficha' || view === 'perfil' ? view : 'panel';
    const nombresPorId = Object.fromEntries([...perfiles, perfil].map((p) => [p.id, p.nombre]));
    const fueraJornada = perfil.jornadaPermitida !== 'ambos' && perfil.jornadaPermitida !== jornada;
    const rolId = perfil.rolId;

    // Una sola lista de destinos: menú lateral en escritorio, barra inferior + hoja "Más" en celular
    const destinos = [
      ['panel', 'Panel general', 'Panel'], ['residentes', 'Personas mayores', 'Personas'], ['nueva', 'Nueva nota', 'Nota'],
      ['asistencia', 'Asistencia', 'Asistencia'], ['dotacion', 'Dotación', 'Dotación'], ['entrega', 'Entrega de turno', 'Turno'],
      ['sdis', 'Registro SDIS', 'SDIS'], ['config', 'Configuración', 'Ajustes'], ['admin_usuarios', 'Usuarios', 'Usuarios'], ['auditoria', 'Auditoría', 'Auditoría'],
    ].filter(([id]) => puedeVer(id));
    const esActivo = (id) => vista === id || (id === 'residentes' && vista === 'ficha');
    // Con una nota a medias, salir pide confirmación (se descartaría el borrador)
    const pedirSalida = () => { if (hayBorrador(perfil.id)) setConfirmarSalida(true); else logout(); };
    const ir = (id) => { setMasAbierto(false); if (id === 'nueva') setPreselNota(''); navegarA(id); };
    const enBarra = destinos.slice(0, 4);
    const enMas = destinos.slice(4);
    const masActivo = enMas.some(([id]) => esActivo(id)) || vista === 'perfil';

    return (
      <div className="shell">
        <aside className="sidebar no-print">
          <Logo dark />
          <div className="sede-box-v34">
            <div className="sede-header-v34">
              <span className="sede-tag-v34"><span className="sede-live-dot"></span>Sede Operativa</span>
              <span className="sede-cupos-v34">{resSede.filter((r) => r.estado === 'activo').length}/{sede.cupos} cupos</span>
            </div>
            <div className="sede-select-wrapper">
              <select className="sede-select-v34" aria-label="Sede" value={sede.id} disabled={sedesActivas.length < 2} onChange={(e) => { setSedeId(e.target.value); navegarA('panel'); }}>
                {sedesActivas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <span className="sede-select-arrow">▼</span>
            </div>
          </div>

          <nav className="nav" aria-label="Navegación principal">
            {destinos.map(([id, etiqueta]) => (
              <button key={id} className={esActivo(id) ? 'active' : ''} aria-current={esActivo(id) ? 'page' : undefined} onClick={() => ir(id)}><Icono n={id} />{etiqueta}</button>
            ))}
          </nav>
          <div className="sidebar-foot">
            Fundación Construyendo Futuro ONG<br />NIT 900310195-2 · Ley 1581 / SDIS<br />
            <b>AuraCare {VERSION}</b>
          </div>
        </aside>

        <main className="main">
          {!online && <div className="aviso-global offline no-print" role="alert">Sin conexión a internet: los cambios NO se guardarán hasta que vuelva la conexión.</div>}
          {!sede.activa && <div className="aviso-global offline no-print" role="alert">La sede {sede.nombre} está suspendida. Reactívala en Configuración para volver a operar.</div>}
          {fueraJornada && <div className="aviso-global jornada no-print">Estás fuera de tu jornada autorizada ({perfil.jornadaPermitida === 'dia' ? 'Día' : 'Noche'}). Tus registros quedan en {jornada === 'dia' ? 'Centro Día' : 'Centro Noche'}.</div>}

          <div className="topbar no-print">
            <div className="nav-global">{vista !== 'panel' && <button className="btn-nav-top" onClick={goBack} aria-label="Atrás"><Icono n="atras" /><span className="txt">Atrás</span></button>}</div>
            <div className="titulo">
              <h2>{TITULOS[vista] || 'Mi Perfil'}</h2>
              <p>{sede.nombre} · {fmtFecha(hoy)}</p>
            </div>
            <div className="spacer"></div>
            <CentroSwitch centro={centro} manual={centroManual} onCambiar={cambiarCentro} />
            <div className="nav-global">
              <button className="btn-nav-top" onClick={refrescar} aria-label="Actualizar datos" title="Actualizar datos"><Icono n="refrescar" /></button>
              <button className="btn-nav-top solo-escritorio" onClick={() => navegarA('perfil')} aria-label={`Mi perfil: ${perfil.nombre}`}>
                <span className="yo-avatar" aria-hidden="true">{iniciales(perfil.nombre)}</span>
                <span className="txt yo-txt"><b>{perfil.nombre}</b><small>{rol.nombre.split(' / ')[0]}</small></span>
              </button>
              <button className="btn-nav-top solo-escritorio" onClick={pedirSalida} aria-label="Cerrar sesión"><Icono n="salir" /><span className="txt">Cerrar sesión</span></button>
            </div>
          </div>

          {vista === 'panel' && <Dashboard sede={sede} residentes={resSede} notas={notas} alertas={alertas} asistencias={asistencias} turnos={turnos}
            onAtender={acciones.atenderAlerta} puedeAtender={puede(rolId, 'atenderAlerta')} irFicha={irFicha} />}

          {vista === 'residentes' && <Residentes residentes={resSede} alertas={alertas.filter((a) => a.sedeId === sede.id)} irFicha={irFicha} puedeCrear={puede(rolId, 'crearResidente')}
            abrirNuevo={() => setModal('nuevo')} abrirImport={() => setModal('import')} />}

          {vista === 'ficha' && fichaRes && <Ficha key={fichaRes.id} res={fichaRes} notas={notas} config={config[fichaRes.sedeId] || { glu: true, dolor: true }}
            puedeNota={puede(rolId, 'nota')} puedeEditar={puede(rolId, 'editarResidente')} puedeRangos={puede(rolId, 'rangosResidente')}
            nuevaNotaPara={(id) => { setPreselNota(id); navegarA('nueva'); }} onEditar={() => setModal('editar')} onEgreso={() => setModal('egreso')}
            onReingreso={() => acciones.editarResidente(fichaRes.id, { estado: 'activo', fechaEgreso: null, motivoEgreso: null }, 'Persona reingresada')}
            onGuardarRangos={(o) => acciones.editarResidente(fichaRes.id, { rangos: o }, 'Rangos actualizados')} />}

          {vista === 'nueva' && <NuevaNota key={preselNota || 'nueva'} sede={sede} residentes={resSede.filter((r) => r.estado === 'activo')} presel={preselNota} config={cfg} uid={perfil.id} psicosocial={esPsicosocial(rolId)} onGuardar={guardarNota} />}

          {vista === 'asistencia' && <Asistencia sede={sede} residentes={resSede} asistencias={asistencias} actividades={actividades} puedeEditar={puede(rolId, 'asistencia')}
            onMarcar={acciones.marcarAsistencia} onCrearActividad={acciones.crearActividad} onParticipacion={acciones.participacion} />}

          {vista === 'dotacion' && <Dotacion sede={sede} residentes={resSede} entregas={entregas} pertenencias={pertenencias} elementos={elementos} puedeEditar={puede(rolId, 'dotacion')}
            onEntrega={acciones.entrega} onPertenencia={acciones.pertenencia} onDevolucion={acciones.devolucion} />}

          {vista === 'entrega' && <EntregaTurno sede={sede} residentes={resSede} notas={notas} alertas={alertas} turnos={turnos} recepciones={recepciones} usuario={perfil}
            puedeFirmar={puede(rolId, 'turno')} onFirmar={acciones.firmarTurno} onRecibir={acciones.recibirTurno} />}

          {vista === 'sdis' && <RegistroSdis sede={sede} residentes={resSede} onCargarDia={api.cargarNotasDia} onVerificar={api.verificarCadena}
            onImprimir={(sid, fecha) => api.auditarLectura('imprimir_sdis', 'notas', fecha, sid)} />}

          {vista === 'config' && <Config sedes={sedes} sede={sede} config={cfg} residentes={residentes} puedeConfig={puede(rolId, 'config')} esSuper={puede(rolId, 'rangosGlobales')}
            onToggle={acciones.toggleConfig} onCrearSede={acciones.crearSede} onActualizarSede={acciones.actualizarSede} onGuardarRango={acciones.guardarRango}
            onSuspenderSede={acciones.suspenderSede} onReactivarSede={acciones.reactivarSede} />}

          {vista === 'admin_usuarios' && rolId === 'superadmin' && <AdminUsuarios perfiles={perfiles} sedes={sedes} jornadaActual={jornada} miId={perfil.id} onActualizar={acciones.actualizarPerfil} onCrear={acciones.crearUsuario} />}

          {vista === 'auditoria' && <Auditoria nombresPorId={nombresPorId} sedes={sedes} onCargar={api.cargarAuditoria} />}

          {vista === 'perfil' && <PerfilUsuario usuario={perfil} rol={rol} sede={sedes.find((s) => s.id === perfil.sedeId)} onLogout={pedirSalida}
            onActualizarNombre={acciones.actualizarNombre} onCambiarPassword={api.cambiarPassword} />}
        </main>

        <nav className="tabbar no-print" aria-label="Navegación principal (celular)">
          {enBarra.map(([id, , corta]) => (
            <button key={id} aria-current={esActivo(id) ? 'page' : undefined} onClick={() => ir(id)}><Icono n={id} activo={esActivo(id)} />{corta}</button>
          ))}
          <button aria-current={masActivo ? 'page' : undefined} aria-haspopup="dialog" aria-expanded={masAbierto} onClick={() => setMasAbierto(true)}><Icono n="mas" activo={masActivo} />Más</button>
        </nav>
        {masAbierto && (
          <div className="hoja-mas no-print" onClick={(e) => { if (e.target === e.currentTarget) setMasAbierto(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setMasAbierto(false); }}>
            <div className="hoja" role="dialog" aria-modal="true" aria-label="Más opciones">
              <div className="asa" aria-hidden="true"></div>
              <div className="yo-hoja">
                <span className="yo-avatar" aria-hidden="true">{iniciales(perfil.nombre)}</span>
                <div className="yo-txt"><b>{perfil.nombre}</b><small>{rol.nombre}</small></div>
              </div>
              {enMas.map(([id, etiqueta]) => (
                <button key={id} autoFocus={id === enMas[0][0]} aria-current={esActivo(id) ? 'page' : undefined} onClick={() => ir(id)}><Icono n={id} />{etiqueta}</button>
              ))}
              <button autoFocus={!enMas.length} aria-current={vista === 'perfil' ? 'page' : undefined} onClick={() => { setMasAbierto(false); navegarA('perfil'); }}><Icono n="perfil" />Mi perfil</button>
              <button onClick={() => { setMasAbierto(false); pedirSalida(); }}><Icono n="salir" />Cerrar sesión</button>
            </div>
          </div>
        )}

        {confirmarSalida && (
          <Modal titulo="¿Salir con una nota sin guardar?" sub="Tienes una nota en borrador. Si sales ahora, se descarta." cerrar={() => setConfirmarSalida(false)}>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
              <button className="btn btn-peligro" onClick={() => { borrarBorrador(perfil.id); logout(); }}>Descartar y salir</button>
            </div>
          </Modal>
        )}
        {modal === 'nuevo' && <NuevoResidente sede={sede} onCrear={acciones.crearResidente} cerrar={() => setModal(null)} />}
        {modal === 'import' && <Importador sede={sede} onImportar={acciones.importar} cerrar={() => setModal(null)} />}
        {modal === 'editar' && fichaRes && <EditarResidente res={fichaRes} onGuardar={(f) => acciones.editarResidente(fichaRes.id, { nombres: f.nombres, apellidos: f.apellidos, doc: f.doc, edad: f.edad, dx: f.dx })} cerrar={() => setModal(null)} />}
        {modal === 'egreso' && fichaRes && <EgresoResidente res={fichaRes} onEgresar={(motivo) => acciones.editarResidente(fichaRes.id, { estado: 'egresado', fechaEgreso: hoy, motivoEgreso: motivo }, 'Egreso registrado')} cerrar={() => setModal(null)} />}
      </div>
    );
  })();

  return (
    <ErrorBoundary>
      <Ctx.Provider value={ctx}>
        {contenido}
        {avisoInact > 0 && pantalla === 'app' && <AvisoInactividad limite={avisoInact} onSeguir={() => reiniciarInactividad.current()} />}
        {showLegal && <ModalLegal cerrar={() => setShowLegal(false)} />}
        {dialogoConf && (
          <Modal titulo={dialogoConf.titulo} sub={dialogoConf.sub} cerrar={() => cerrarConf(false)}>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => cerrarConf(false)}>Cancelar</button>
              <button className={'btn ' + (dialogoConf.peligro ? 'btn-peligro' : 'btn-primary')} onClick={() => cerrarConf(true)}>{dialogoConf.si}</button>
            </div>
          </Modal>
        )}
        {toast && (
          <div className={'toast ' + toast.tipo} role={toast.tipo === 'error' || toast.tipo === 'alerta' ? 'alert' : 'status'}>
            <IconoAviso t={toast.tipo} /><span>{toast.msg}</span>
            {(toast.tipo === 'error' || toast.tipo === 'alerta') && <button className="toast-cerrar" aria-label="Cerrar aviso" onClick={() => setToast(null)}><Icono n="cerrar" /></button>}
          </div>
        )}
        {animCentro && <CieloCambio key={animCentro.id} hacia={animCentro.hacia} />}
      </Ctx.Provider>
    </ErrorBoundary>
  );
};
