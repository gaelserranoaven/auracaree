import { useId, useState } from 'react';
import { ROLES } from '../lib/clinico.js';
import { fmtFechaHora } from '../lib/util.js';
import { useApp, useAccion } from './ui.jsx';

const JORNADAS = [['ambos', '☀/☾ Día y Noche'], ['dia', '☀ Solo Día'], ['noche', '☾ Solo Noche']];
const JORNADA_LBL = Object.fromEntries(JORNADAS);
const nombreRol = (id) => (ROLES.find((r) => r.id === id) || {}).nombre || id;
const iniciales = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// Campos de rol / sede / jornada con etiqueta visible (antes eran selects sueltos sin etiqueta)
const CamposAcceso = ({ v, set, sedes, bloquearRol }) => {
  const id = useId();
  return (
    <div className="u-campos">
      <div className="field">
        <label htmlFor={id + 'r'}>Rol</label>
        <select id={id + 'r'} value={v.rolId} disabled={bloquearRol} onChange={(e) => set({ ...v, rolId: e.target.value })}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={id + 's'}>Sede</label>
        <select id={id + 's'} value={v.sedeId || ''} onChange={(e) => set({ ...v, sedeId: e.target.value })}>
          <option value="">— Sin sede —</option>
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={id + 'j'}>Jornada autorizada</label>
        <select id={id + 'j'} value={v.jornadaPermitida} onChange={(e) => set({ ...v, jornadaPermitida: e.target.value })}>
          {JORNADAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
    </div>
  );
};

const Avatar = ({ u }) => <span className={'u-avatar rol-' + u.rolId} aria-hidden="true">{iniciales(u.nombre)}</span>;

const Solicitud = ({ u, sedes, onActualizar }) => {
  const [v, setV] = useState({ rolId: 'auxiliar', sedeId: sedes[0]?.id || '', jornadaPermitida: 'ambos' });
  const [ocupado, ejecutar] = useAccion();
  const { avisar } = useApp();
  const aprobar = () => ejecutar(async () => {
    if (!v.sedeId && v.rolId !== 'superadmin') { avisar('Asigna una sede antes de aprobar.'); return; }
    await onActualizar(u.id, { ...v, sedeId: v.sedeId || null, estado: 'activo' });
    avisar(`Cuenta de ${u.nombre} aprobada ✓`);
  });
  const rechazar = () => ejecutar(async () => {
    if (!window.confirm(`¿Rechazar la solicitud de ${u.nombre}? La cuenta quedará suspendida.`)) return;
    await onActualizar(u.id, { estado: 'suspendido' });
    avisar('Solicitud rechazada');
  });
  return (
    <article className="u-solicitud">
      <div className="u-id">
        <Avatar u={{ ...u, rolId: 'pendiente' }} />
        <div className="u-nombre"><b>{u.nombre}</b><span>{u.email}</span><span className="u-cuando">Solicitó {fmtFechaHora(u.createdAt)}</span></div>
      </div>
      <CamposAcceso v={v} set={setV} sedes={sedes} />
      <div className="u-acciones">
        <button className="btn btn-ghost" disabled={ocupado} onClick={rechazar}>Rechazar</button>
        <button className="btn btn-primary" disabled={ocupado} onClick={aprobar}>Aprobar acceso</button>
      </div>
    </article>
  );
};

const TarjetaUsuario = ({ u, yo, sedes, jornadaActual, onActualizar }) => {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(u);
  const [ocupado, ejecutar] = useAccion();
  const { avisar } = useApp();
  const sede = sedes.find((s) => s.id === u.sedeId);

  const estado = u.estado === 'suspendido' ? { lbl: 'Suspendido', cls: 'c' }
    : (u.jornadaPermitida === 'ambos' || u.jornadaPermitida === jornadaActual) ? { lbl: 'En turno', cls: 'ok' }
      : { lbl: 'Fuera de su jornada', cls: 'inactivo' };

  const guardar = () => ejecutar(async () => {
    const parche = {};
    ['rolId', 'sedeId', 'jornadaPermitida'].forEach((k) => { if ((v[k] || null) !== (u[k] || null)) parche[k] = v[k] || null; });
    if (!Object.keys(parche).length) { setEditando(false); return; }
    await onActualizar(u.id, parche);
    setEditando(false);
    avisar('Cambios guardados ✓');
  });
  const alternarEstado = () => ejecutar(async () => {
    const suspender = u.estado !== 'suspendido';
    if (suspender && !window.confirm(`¿Suspender el acceso de ${u.nombre}?`)) return;
    await onActualizar(u.id, { estado: suspender ? 'suspendido' : 'activo' });
    avisar(suspender ? 'Cuenta suspendida' : 'Cuenta reactivada ✓');
  });

  return (
    <article className={'u-card' + (u.estado === 'suspendido' ? ' suspendido' : '')}>
      <div className="u-id">
        <Avatar u={u} />
        <div className="u-nombre"><b>{u.nombre}{yo && <span className="u-yo">Tú</span>}</b><span>{u.email}</span></div>
        <span className={'estado-pill ' + estado.cls}>{estado.lbl}</span>
      </div>
      {editando ? (
        <>
          <CamposAcceso v={v} set={setV} sedes={sedes} bloquearRol={yo} />
          {yo && <p className="u-nota">No puedes cambiar tu propio rol.</p>}
          <div className="u-acciones">
            <button className="btn btn-ghost" disabled={ocupado} onClick={() => { setV(u); setEditando(false); }}>Cancelar</button>
            <button className="btn btn-primary" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </>
      ) : (
        <>
          <span className={'u-rol rol-' + u.rolId}>{nombreRol(u.rolId)}</span>
          <dl className="u-datos">
            <div><dt>Sede</dt><dd>{sede ? sede.nombre : 'Sin sede'}</dd></div>
            <div><dt>Jornada</dt><dd>{JORNADA_LBL[u.jornadaPermitida] || u.jornadaPermitida}</dd></div>
          </dl>
          <div className="u-acciones">
            {!yo && <button className="btn btn-ghost" disabled={ocupado} onClick={alternarEstado}>{u.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}</button>}
            <button className="btn btn-tinta" disabled={ocupado} onClick={() => { setV(u); setEditando(true); }}>Editar acceso</button>
          </div>
        </>
      )}
    </article>
  );
};

export const AdminUsuarios = ({ perfiles, sedes, jornadaActual, miId, onActualizar }) => {
  const [q, setQ] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');

  const pendientes = perfiles.filter((u) => u.estado === 'pendiente');
  const cuentas = perfiles.filter((u) => u.estado !== 'pendiente');
  const activos = cuentas.filter((u) => u.estado === 'activo').length;
  const suspendidos = cuentas.length - activos;
  const rolesUsados = ROLES.filter((r) => cuentas.some((u) => u.rolId === r.id));
  const texto = q.trim().toLowerCase();
  const visibles = cuentas
    .filter((u) => filtroRol === 'todos' || u.rolId === filtroRol)
    .filter((u) => !texto || (u.nombre + ' ' + u.email).toLowerCase().includes(texto))
    .sort((a, b) => (a.estado === b.estado ? a.nombre.localeCompare(b.nombre) : a.estado === 'activo' ? -1 : 1));

  return (
    <div className="usuarios">
      <div className="grid-kpi">
        <div className="kpi"><div className="lbl">Cuentas activas</div><div className="val">{activos}</div></div>
        <div className="kpi"><div className="lbl">Solicitudes pendientes</div><div className={'val' + (pendientes.length ? ' alerta-c' : '')}>{pendientes.length}</div></div>
        <div className="kpi"><div className="lbl">Suspendidas</div><div className="val">{suspendidos}</div></div>
      </div>

      <section className="panel" aria-labelledby="u-pend">
        <div className="panel-head">
          <h3 id="u-pend">Solicitudes de acceso</h3>
          <span className="panel-sub">La persona crea su cuenta en "Solicitar acceso"; aquí verificas su identidad y le asignas rol, sede y jornada.</span>
        </div>
        <div className="panel-body">
          {pendientes.length === 0
            ? <div className="vacio">No hay solicitudes pendientes.</div>
            : <div className="u-grid">{pendientes.map((u) => <Solicitud key={u.id} u={u} sedes={sedes} onActualizar={onActualizar} />)}</div>}
        </div>
      </section>

      <section className="panel" aria-labelledby="u-dir">
        <div className="panel-head">
          <h3 id="u-dir">Equipo</h3>
          <span className="panel-sub">Turno actual: {jornadaActual === 'dia' ? '☀ Centro Día' : '☾ Centro Noche'}</span>
        </div>
        <div className="panel-body">
          <div className="u-filtros">
            <input type="search" className="u-buscar" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="u-chips" role="group" aria-label="Filtrar por rol">
              <button type="button" aria-pressed={filtroRol === 'todos'} onClick={() => setFiltroRol('todos')}>Todos · {cuentas.length}</button>
              {rolesUsados.map((r) => (
                <button key={r.id} type="button" aria-pressed={filtroRol === r.id} onClick={() => setFiltroRol(r.id)}>
                  {r.nombre.split(' / ')[0]} · {cuentas.filter((u) => u.rolId === r.id).length}
                </button>
              ))}
            </div>
          </div>
          {visibles.length === 0
            ? <div className="vacio">Ninguna cuenta coincide con la búsqueda.</div>
            : <div className="u-grid">{visibles.map((u) => <TarjetaUsuario key={u.id} u={u} yo={u.id === miId} sedes={sedes} jornadaActual={jornadaActual} onActualizar={onActualizar} />)}</div>}
          <div className="nota-aviso"><span aria-hidden="true">🔐</span><span>Nadie comparte contraseñas: cada cuenta es personal y los administradores nunca las ven. Todo cambio de esta pantalla queda en la auditoría.</span></div>
        </div>
      </section>
    </div>
  );
};
