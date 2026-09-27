// Entrada del test de humo: renderiza cada pantalla en el servidor con datos de ejemplo.
import { renderToString } from 'react-dom/server';
import { Ctx } from '../src/components/ui.jsx';
import { RANGOS_DEFAULT } from '../src/lib/clinico.js';
import { Login } from '../src/components/Login.jsx';
import { Dashboard } from '../src/components/Dashboard.jsx';
import { Residentes, NuevoResidente, EditarResidente, EgresoResidente, Importador } from '../src/components/Residentes.jsx';
import { Ficha } from '../src/components/Ficha.jsx';
import { NuevaNota } from '../src/components/NuevaNota.jsx';
import { Asistencia } from '../src/components/Asistencia.jsx';
import { Dotacion } from '../src/components/Dotacion.jsx';
import { EntregaTurno } from '../src/components/EntregaTurno.jsx';
import { RegistroSdis } from '../src/components/RegistroSdis.jsx';
import { Config } from '../src/components/Config.jsx';
import { Auditoria } from '../src/components/Auditoria.jsx';
import { AdminUsuarios } from '../src/components/AdminUsuarios.jsx';
import { PerfilUsuario } from '../src/components/Perfil.jsx';
import { CookieBanner, ModalLegal } from '../src/components/Legal.jsx';

const hoy = '2026-09-26';
const ctx = { hoy, jornada: 'dia', rangos: RANGOS_DEFAULT, avisar: () => {} };
const sede = { id: 's1', nombre: 'Sede Uno', cupos: 40 };
const res = [
  { id: 'r1', sedeId: 's1', nombres: 'Ana María', apellidos: 'Pérez', doc: '111', edad: 82, dx: 'HTA', estado: 'activo', signos: { ta_s: 150, ta_d: 95, fc: 88, spo2: 92 }, hist: { ta_s: [130, 140, 150], spo2: [96, 94, 92] }, rangos: { spo2: { v_min: 88 } } },
  { id: 'r2', sedeId: 's1', nombres: 'Luis', apellidos: 'Rojas', doc: 'CC s/n', edad: null, dx: 'Sin registrar', estado: 'egresado', fechaEgreso: hoy, motivoEgreso: 'Traslado', signos: {}, hist: {}, rangos: {} },
];
const notas = [{ id: 'n1', sedeId: 's1', personaId: 'r1', tipo: 'evolucion', fecha: hoy, hora: '07:10', descripcion: 'Paciente estable', signos: { ta_s: 150, ta_d: 95, dolor: 8 }, autor: 'Claudia (Auxiliar)', hash: 'a'.repeat(64), createdAt: '2026-09-26T12:10:00Z' }];
const alertas = [{ id: 'a1', sedeId: 's1', personaId: 'r1', parametro: 'ta_s', valor: 150, sev: 'vigilancia', estado: 'activa', hora: '07:10' }];
const asistencias = { [`s1|${hoy}|r1`]: { id: 'x', estado: 'no_firma', motivo: 'Se niega a firmar' } };
const actividades = [{ id: 'ac1', sedeId: 's1', fecha: hoy, nombre: 'Taller', linea: 'Envejecimiento activo', profesional: 'Sofía', participacion: { r1: true } }];
const entregas = [{ id: 'e1', sedeId: 's1', personaId: 'r1', elemento: 'DESODORANTE', cantidad: 1, fecha: hoy, quien: 'Claudia' }];
const pertenencias = [{ id: 'p1', sedeId: 's1', personaId: 'r1', prendas: 'Chaqueta', ayudas: 'Bastón', lenceria: '', otros: '', obs: '', fechaRecibo: hoy, estado: 'en_custodia' }];
const elementos = [{ key: 'DESODORANTE', nombre: 'Desodorante', regla: '1 al mes', limPersona: 1, limUnidad: null }];
const turnos = [{ id: 't1', sedeId: 's1', jornada: 'noche', fecha: hoy, observaciones: 'Vigilar a Ana', firmadoPor: 'Diana', createdAt: '2026-09-26T10:00:00Z' }];
const perfiles = [
  { id: 'u1', nombre: 'Laura', email: 'l@x.co', rolId: 'superadmin', sedeId: 's1', jornadaPermitida: 'ambos', estado: 'activo', createdAt: '2026-09-01T00:00:00Z' },
  { id: 'u2', nombre: 'Nuevo', email: 'n@x.co', rolId: 'auxiliar', sedeId: null, jornadaPermitida: 'ambos', estado: 'pendiente', createdAt: '2026-09-25T00:00:00Z' },
];
const usuario = perfiles[0];
const noop = () => {};
const cfg = { glu: true, dolor: true };

const pantallas = {
  login: <Login onLogin={noop} onSolicitarCuenta={noop} abrirTerminos={noop} />,
  cookie: <CookieBanner onAceptar={noop} onRechazar={noop} abrirTerminos={noop} />,
  legal: <ModalLegal cerrar={noop} />,
  dashboard: <Dashboard sede={sede} residentes={res} notas={notas} alertas={alertas} asistencias={asistencias} turnos={turnos} onAtender={noop} puedeAtender irFicha={noop} />,
  residentes: <Residentes residentes={res} irFicha={noop} puedeCrear abrirNuevo={noop} abrirImport={noop} />,
  nuevoResidente: <NuevoResidente sede={sede} onCrear={noop} cerrar={noop} />,
  editarResidente: <EditarResidente res={res[0]} onGuardar={noop} cerrar={noop} />,
  egreso: <EgresoResidente res={res[0]} onEgresar={noop} cerrar={noop} />,
  importador: <Importador sede={sede} onImportar={noop} cerrar={noop} />,
  ficha: <Ficha res={res[0]} notas={notas} config={cfg} puedeNota puedeEditar puedeRangos nuevaNotaPara={noop} onEditar={noop} onEgreso={noop} onReingreso={noop} onGuardarRangos={noop} />,
  fichaEgresado: <Ficha res={res[1]} notas={[]} config={{ glu: false, dolor: false }} puedeNota puedeEditar puedeRangos={false} nuevaNotaPara={noop} onEditar={noop} onEgreso={noop} onReingreso={noop} onGuardarRangos={noop} />,
  nuevaNota: <NuevaNota sede={sede} residentes={res} presel="r1" config={cfg} uid="u1" onGuardar={noop} />,
  asistencia: <Asistencia sede={sede} residentes={res} asistencias={asistencias} actividades={actividades} puedeEditar onMarcar={noop} onCrearActividad={noop} onParticipacion={noop} />,
  dotacion: <Dotacion sede={sede} residentes={res} entregas={entregas} pertenencias={pertenencias} elementos={elementos} puedeEditar onEntrega={noop} onPertenencia={noop} onDevolucion={noop} />,
  entrega: <EntregaTurno sede={sede} residentes={res} notas={notas} alertas={alertas} turnos={turnos} usuario={usuario} puedeFirmar onFirmar={noop} />,
  sdis: <RegistroSdis sede={sede} residentes={res} onCargarDia={() => new Promise(() => {})} onVerificar={noop} onImprimir={noop} />,
  config: <Config sedes={[sede]} sede={sede} config={cfg} residentes={res} puedeConfig esSuper onToggle={noop} onCrearSede={noop} onActualizarSede={noop} onGuardarRango={noop} />,
  auditoria: <Auditoria nombresPorId={{}} sedes={[sede]} onCargar={() => new Promise(() => {})} />,
  admin: <AdminUsuarios perfiles={perfiles} sedes={[sede]} jornadaActual="dia" miId="u1" onActualizar={noop} />,
  perfil: <PerfilUsuario usuario={usuario} rol={{ nombre: 'SuperAdmin' }} sede={sede} onLogout={noop} onActualizarNombre={noop} onCambiarPassword={noop} />,
};

export const renderizar = () => Object.fromEntries(Object.entries(pantallas).map(([k, el]) => [k, renderToString(<Ctx.Provider value={ctx}>{el}</Ctx.Provider>)]));
