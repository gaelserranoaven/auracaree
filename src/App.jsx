import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './lib/api.js';
import { ROLES, RANGOS_DEFAULT, puede } from './lib/clinico.js';
import { fmtFecha, hoyBogota, jornadaDe } from './lib/util.js';
import { Ctx, Logo, VERSION, ErrorBoundary } from './components/ui.jsx';
import { CookieBanner, ModalLegal } from './components/Legal.jsx';
import { Login } from './components/Login.jsx';
import { AdminUsuarios } from './components/AdminUsuarios.jsx';
import { PerfilUsuario } from './components/Perfil.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { Residentes, Importador, NuevoResidente, EditarResidente, EgresoResidente } from './components/Residentes.jsx';
import { Ficha } from './components/Ficha.jsx';
import { NuevaNota } from './components/NuevaNota.jsx';
import { Asistencia } from './components/Asistencia.jsx';
import { Dotacion } from './components/Dotacion.jsx';
import { EntregaTurno } from './components/EntregaTurno.jsx';
import { RegistroSdis } from './components/RegistroSdis.jsx';
import { Config } from './components/Config.jsx';
import { Auditoria } from './components/Auditoria.jsx';

const INACTIVIDAD_MS = 20 * 60 * 1000;
const TITULOS = {
  panel: 'Panel General', residentes: 'Personas Mayores', ficha: 'Ficha Clínica', nueva: 'Nueva Nota Médica', asistencia: 'Asistencia & Actividades',
  dotacion: 'Dotación de Elementos', entrega: 'Entrega de Turno', sdis: 'Registro SDIS FOR-PSS-729', config: 'Configuración',
  admin_usuarios: 'Gestión de Usuarios', auditoria: 'Auditoría', perfil: 'Mi Perfil',
};

const upsert = (lista, item) => { const i = lista.findIndex((x) => x.id === item.id); if (i < 0) return [...lista, item]; const c = [...lista]; c[i] = item; return c; };
const porFecha = (a, b) => (a.createdAt || '').localeCompare(b.createdAt || '');

class ErrorCuenta extends Error {}

export const App = () => {
  const [pantalla, setPantalla] = useState('cargando'); // cargando | login | app | error
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

  const [fichaId, setFichaId] = useState(null);
  const [preselNota, setPreselNota] = useState('');
  const [modal, setModal] = useState(null);
  const [showCookie, setShowCookie] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const hoy = hoyBogota(ahora);
  const jornada = jornadaDe(ahora);
  const rangos = rangosBD || RANGOS_DEFAULT;
  const rol = perfil ? ROLES.find((r) => r.id === perfil.rolId) || ROLES[0] : null;

  const avisar = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  const ctx = useMemo(() => ({ hoy, jornada, rangos, avisar }), [hoy, jornada, rangos, avisar]);

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
    setConfig(d.config); setRangosBD(d.rangos); setElementos(d.elementos); setTurnos(d.turnos);
    setSedeId((actual) => (d.sedes.some((s) => s.id === actual) ? actual : (d.sedes.find((s) => s.id === p.sedeId) || d.sedes[0] || {}).id || ''));
  }, []);

  const iniciarApp = useCallback(async (userId) => {
    const p = await api.cargarMiPerfil(userId);
    if (!p) { await api.cerrarSesion(); throw new ErrorCuenta('Tu cuenta no tiene perfil. Solicita acceso de nuevo.'); }
    if (p.estado === 'pendiente') { await api.cerrarSesion(); throw new ErrorCuenta('Tu cuenta está pendiente de aprobación por un Administrador.'); }
    if (p.estado === 'suspendido') { await api.cerrarSesion(); throw new ErrorCuenta('Tu cuenta está suspendida. Contacta a un Administrador.'); }
    const d = await api.cargarTodo(p, hoyBogota());
    setPerfil(p); aplicarDatos(d, p);
    setNavStack(['panel']); setView('panel'); setPantalla('app');
  }, [aplicarDatos]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.sesionActual();
        if (s) await iniciarApp(s.user.id); else setPantalla('login');
      } catch (e) {
        if (e instanceof ErrorCuenta) { setPantalla('login'); avisar('ℹ️ ' + e.message); }
        else { setErrorCarga(e.message); setPantalla('error'); }
      }
    })();
  }, [iniciarApp, avisar]);

  const refrescar = useCallback(async () => {
    if (!perfil) return;
    try { aplicarDatos(await api.cargarTodo(perfil, hoyBogota()), perfil); } catch (e) { avisar('⛔ ' + e.message); }
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
    avisar(requiereConfirmarCorreo ? 'Solicitud enviada ✓ Confirma tu correo y espera la aprobación.' : 'Solicitud enviada ✓ Pendiente de aprobación.');
    return true;
  };
  const logout = useCallback(async (mensaje) => {
    try { await api.cerrarSesion(); } catch { /* ya cerrada */ }
    try { Object.keys(sessionStorage).filter((k) => k.startsWith('auracare_')).forEach((k) => sessionStorage.removeItem(k)); } catch { /* sin storage */ }
    setPerfil(null); setPerfiles([]); setResidentes([]); setNotas([]); setAlertas([]); setAsistencias({}); setActividades([]);
    setEntregas([]); setPertenencias([]); setTurnos([]); setFichaId(null); setModal(null);
    setNavStack(['panel']); setView('panel'); setPantalla('login');
    avisar(mensaje || 'Sesión cerrada con seguridad ✓');
  }, [avisar]);

  // Cierre automático por inactividad (equipos compartidos con datos sensibles)
  useEffect(() => {
    if (pantalla !== 'app') return undefined;
    let t;
    const reiniciar = () => { clearTimeout(t); t = setTimeout(() => logout('Sesión cerrada por inactividad.'), INACTIVIDAD_MS); };
    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar();
    return () => { clearTimeout(t); eventos.forEach((e) => window.removeEventListener(e, reiniciar)); };
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
        case 'residentes': setResidentes((l) => upsert(l, api.mResidente(r))); break;
        case 'actividades': setActividades((l) => upsert(l, api.mActividad(r))); break;
        default: break;
      }
    };
    return api.suscribir(['notas', 'alertas', 'asistencias', 'entregas', 'pertenencias', 'entregas_turno', 'residentes', 'actividades'], alCambio);
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
    api.cargarNotasPersona(id).then((lista) => setNotas((prev) => lista.reduce((acc, n) => upsert(acc, n), prev).sort(porFecha)), (e) => avisar('⛔ ' + e.message));
  };

  const guardarNota = async (datos) => {
    const { nota, residente, alertas: nuevas } = await api.guardarNota(sedeId, datos);
    setNotas((p) => upsert(p, nota).sort(porFecha));
    if (residente) setResidentes((p) => upsert(p, residente));
    if (nuevas.length) setAlertas((p) => nuevas.reduce((acc, a) => upsert(acc, a), p));
    avisar(nuevas.some((a) => a.sev === 'critica') ? '⚠ ALERTA CRÍTICA generada para el equipo' : '🔒 Nota guardada y sellada ✓');
    if (datos.personaId) { setFichaId(datos.personaId); navegarA('ficha'); } else navegarA('panel');
    return true;
  };

  const acciones = {
    atenderAlerta: async (id) => { await api.atenderAlerta(id); setAlertas((p) => p.filter((a) => a.id !== id)); avisar('Alerta marcada como atendida ✓'); },
    crearResidente: async (f) => { const r = await api.crearResidente(sedeId, f); setResidentes((p) => upsert(p, r)); setModal(null); avisar('Residente registrado ✓'); },
    importar: async (lista) => {
      const { creados, omitidos } = await api.importarResidentes(sedeId, lista);
      setResidentes((p) => creados.reduce((acc, r) => upsert(acc, r), p)); setModal(null);
      avisar(`${creados.length} residente(s) importados ✓` + (omitidos.length ? ` · ${omitidos.length} omitido(s): ${omitidos[0]}` : ''));
    },
    editarResidente: async (id, parche, msg) => { const r = await api.actualizarResidente(id, parche); setResidentes((p) => upsert(p, r)); setModal(null); avisar(msg || 'Datos actualizados ✓'); },
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
    devolucion: async (id) => { const x = await api.devolverPertenencia(id); setPertenencias((p) => upsert(p, x)); avisar('Devolución registrada ✓'); },
    firmarTurno: async (obs) => { const t = await api.firmarEntregaTurno(sedeId, obs); setTurnos((p) => [t, ...p.filter((x) => x.id !== t.id)]); },
    toggleConfig: async (k) => {
      const actual = config[sedeId] || { glu: true, dolor: true };
      const nuevo = { ...actual, [k]: !actual[k] };
      await api.guardarConfig(sedeId, { [k]: nuevo[k] }, !!config[sedeId]);
      setConfig((c) => ({ ...c, [sedeId]: nuevo })); avisar('Configuración guardada ✓');
    },
    crearSede: async (f) => { const s = await api.crearSede(f); setSedes((p) => [...p, s].sort((a, b) => a.nombre.localeCompare(b.nombre))); setConfig((c) => ({ ...c, [s.id]: { glu: true, dolor: true } })); },
    actualizarSede: async (id, f) => { const s = await api.actualizarSede(id, f); setSedes((p) => p.map((x) => (x.id === id ? s : x))); },
    guardarRango: async (parametro, r) => { await api.actualizarRango(parametro, r); setRangosBD((prev) => ({ ...(prev || RANGOS_DEFAULT), [parametro]: { ...(prev || RANGOS_DEFAULT)[parametro], ...r } })); },
    actualizarPerfil: async (id, parche) => { const p = await api.actualizarPerfil(id, parche); setPerfiles((l) => l.map((x) => (x.id === id ? p : x))); },
    actualizarNombre: async (nombre) => { const p = await api.actualizarPerfil(perfil.id, { nombre }); setPerfil(p); setPerfiles((l) => l.map((x) => (x.id === p.id ? p : x))); },
  };

  /* ---------- Render ---------- */
  const contenido = (() => {
    if (pantalla === 'cargando') {
      return (
        <div className="pantalla-error"><Logo /><p>Conectando con la base de datos…</p></div>
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

    const sede = sedes.find((s) => s.id === sedeId) || sedes[0];
    if (!sede) {
      return (
        <div className="pantalla-error"><Logo /><h2>Sin sede asignada</h2>
          <p>Tu cuenta no tiene una unidad operativa asignada. Pide a un Administrador que la configure.</p>
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

    const navItem = (id, etiqueta, activo, onClick) => puedeVer(id) && <button className={activo ? 'active' : ''} onClick={onClick}>{etiqueta}</button>;

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
              <select className="sede-select-v34" aria-label="Sede" value={sede.id} disabled={sedes.length < 2} onChange={(e) => { setSedeId(e.target.value); navegarA('panel'); }}>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <span className="sede-select-arrow">▼</span>
            </div>
          </div>

          <nav className="nav" aria-label="Navegación principal">
            {navItem('panel', '◳ Panel General', vista === 'panel', () => navegarA('panel'))}
            {navItem('residentes', '♥ Residentes', vista === 'residentes' || vista === 'ficha', () => navegarA('residentes'))}
            {navItem('nueva', '＋ Nueva Nota', vista === 'nueva', () => { setPreselNota(''); navegarA('nueva'); })}
            {navItem('asistencia', '☑ Asistencia & Actividades', vista === 'asistencia', () => navegarA('asistencia'))}
            {navItem('dotacion', '⛨ Dotación de Elementos', vista === 'dotacion', () => navegarA('dotacion'))}
            {navItem('entrega', '🤝 Entrega de Turno', vista === 'entrega', () => navegarA('entrega'))}
            {navItem('sdis', '▤ Registro SDIS', vista === 'sdis', () => navegarA('sdis'))}
            {navItem('config', '⚙ Configuración', vista === 'config', () => navegarA('config'))}
            {navItem('admin_usuarios', '👥 Gestión de Usuarios', vista === 'admin_usuarios', () => navegarA('admin_usuarios'))}
            {navItem('auditoria', '🧾 Auditoría', vista === 'auditoria', () => navegarA('auditoria'))}
          </nav>
          <div className="sidebar-foot">
            Fundación Construyendo Futuro ONG<br />NIT 900310195-2 · Ley 1581 / SDIS<br />
            <b>AuraCare {VERSION}</b>
          </div>
        </aside>

        <main className="main">
          {!online && <div className="aviso-global offline no-print" role="alert">Sin conexión a internet: los cambios NO se guardarán hasta que vuelva la conexión.</div>}
          {fueraJornada && <div className="aviso-global jornada no-print">Estás fuera de tu jornada autorizada ({perfil.jornadaPermitida === 'dia' ? 'Día' : 'Noche'}). Tus registros quedan marcados con la jornada real ({jornada === 'dia' ? 'Día' : 'Noche'}).</div>}

          <div className="topbar no-print">
            <div className="nav-global">{vista !== 'panel' && <button className="btn-nav-top" onClick={goBack} title="Volver a la pantalla anterior">⬅ Atrás</button>}</div>
            <div className="titulo">
              <h2>{TITULOS[vista] || 'Mi Perfil'}</h2>
              <p>{sede.nombre} · {fmtFecha(hoy)}</p>
            </div>
            <div className="spacer"></div>
            <div className="jornada-pill" role="group" aria-label="Jornada actual (según la hora de Bogotá)" title="La jornada se determina automáticamente por la hora">
              <button className={jornada === 'dia' ? 'on' : ''} tabIndex={-1} style={{ cursor: 'default' }}>☀ Día</button>
              <button className={jornada === 'noche' ? 'on' : ''} tabIndex={-1} style={{ cursor: 'default' }}>☾ Noche</button>
            </div>
            <div className="nav-global">
              <button className="btn-nav-top" onClick={refrescar} title="Actualizar datos">↻</button>
              <button className="btn-nav-top" onClick={() => navegarA('perfil')}>👤 Mi Perfil</button>
              <button className="btn-nav-top" style={{ color: 'var(--alerta)', borderColor: '#F2C4B6' }} onClick={() => logout()}>🚪 Salir</button>
            </div>
          </div>

          {vista === 'panel' && <Dashboard sede={sede} residentes={resSede} notas={notas} alertas={alertas} asistencias={asistencias} turnos={turnos}
            onAtender={acciones.atenderAlerta} puedeAtender={puede(rolId, 'atenderAlerta')} irFicha={irFicha} />}

          {vista === 'residentes' && <Residentes residentes={resSede} irFicha={irFicha} puedeCrear={puede(rolId, 'crearResidente')}
            abrirNuevo={() => setModal('nuevo')} abrirImport={() => setModal('import')} />}

          {vista === 'ficha' && fichaRes && <Ficha key={fichaRes.id} res={fichaRes} notas={notas} config={config[fichaRes.sedeId] || { glu: true, dolor: true }}
            puedeNota={puede(rolId, 'nota')} puedeEditar={puede(rolId, 'editarResidente')} puedeRangos={puede(rolId, 'rangosResidente')}
            nuevaNotaPara={(id) => { setPreselNota(id); navegarA('nueva'); }} onEditar={() => setModal('editar')} onEgreso={() => setModal('egreso')}
            onReingreso={() => acciones.editarResidente(fichaRes.id, { estado: 'activo', fechaEgreso: null, motivoEgreso: null }, 'Persona reingresada ✓')}
            onGuardarRangos={(o) => acciones.editarResidente(fichaRes.id, { rangos: o }, 'Rangos actualizados ✓')} />}

          {vista === 'nueva' && <NuevaNota key={preselNota || 'nueva'} sede={sede} residentes={resSede.filter((r) => r.estado === 'activo')} presel={preselNota} config={cfg} uid={perfil.id} onGuardar={guardarNota} />}

          {vista === 'asistencia' && <Asistencia sede={sede} residentes={resSede} asistencias={asistencias} actividades={actividades} puedeEditar={puede(rolId, 'asistencia')}
            onMarcar={acciones.marcarAsistencia} onCrearActividad={acciones.crearActividad} onParticipacion={acciones.participacion} />}

          {vista === 'dotacion' && <Dotacion sede={sede} residentes={resSede} entregas={entregas} pertenencias={pertenencias} elementos={elementos} puedeEditar={puede(rolId, 'dotacion')}
            onEntrega={acciones.entrega} onPertenencia={acciones.pertenencia} onDevolucion={acciones.devolucion} />}

          {vista === 'entrega' && <EntregaTurno sede={sede} residentes={resSede} notas={notas} alertas={alertas} turnos={turnos} usuario={perfil}
            puedeFirmar={puede(rolId, 'turno')} onFirmar={acciones.firmarTurno} />}

          {vista === 'sdis' && <RegistroSdis sede={sede} residentes={resSede} onCargarDia={api.cargarNotasDia} onVerificar={api.verificarCadena}
            onImprimir={(sid, fecha) => api.auditarLectura('imprimir_sdis', 'notas', fecha, sid)} />}

          {vista === 'config' && <Config sedes={sedes} sede={sede} config={cfg} residentes={residentes} puedeConfig={puede(rolId, 'config')} esSuper={puede(rolId, 'rangosGlobales')}
            onToggle={acciones.toggleConfig} onCrearSede={acciones.crearSede} onActualizarSede={acciones.actualizarSede} onGuardarRango={acciones.guardarRango} />}

          {vista === 'admin_usuarios' && rolId === 'superadmin' && <AdminUsuarios perfiles={perfiles} sedes={sedes} jornadaActual={jornada} miId={perfil.id} onActualizar={acciones.actualizarPerfil} />}

          {vista === 'auditoria' && <Auditoria nombresPorId={nombresPorId} sedes={sedes} onCargar={api.cargarAuditoria} />}

          {vista === 'perfil' && <PerfilUsuario usuario={perfil} rol={rol} sede={sedes.find((s) => s.id === perfil.sedeId)} onLogout={() => logout()}
            onActualizarNombre={acciones.actualizarNombre} onCambiarPassword={api.cambiarPassword} />}
        </main>

        {modal === 'nuevo' && <NuevoResidente sede={sede} onCrear={acciones.crearResidente} cerrar={() => setModal(null)} />}
        {modal === 'import' && <Importador sede={sede} onImportar={acciones.importar} cerrar={() => setModal(null)} />}
        {modal === 'editar' && fichaRes && <EditarResidente res={fichaRes} onGuardar={(f) => acciones.editarResidente(fichaRes.id, { nombres: f.nombres, apellidos: f.apellidos, doc: f.doc, edad: f.edad, dx: f.dx })} cerrar={() => setModal(null)} />}
        {modal === 'egreso' && fichaRes && <EgresoResidente res={fichaRes} onEgresar={(motivo) => acciones.editarResidente(fichaRes.id, { estado: 'egresado', fechaEgreso: hoy, motivoEgreso: motivo }, 'Egreso registrado ✓')} cerrar={() => setModal(null)} />}
      </div>
    );
  })();

  return (
    <ErrorBoundary>
      <Ctx.Provider value={ctx}>
        {contenido}
        {showLegal && <ModalLegal cerrar={() => setShowLegal(false)} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </Ctx.Provider>
    </ErrorBoundary>
  );
};
