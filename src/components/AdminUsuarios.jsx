import { useState } from 'react';
import { ROLES } from '../lib/clinico.js';
import { fmtFechaHora } from '../lib/util.js';
import { useApp, useAccion } from './ui.jsx';

const SelectRol = ({ value, onChange, disabled }) => (
  <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ fontSize: '12.5px', padding: '4px 8px' }}>
    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
  </select>
);
const SelectSede = ({ value, onChange, sedes, disabled }) => (
  <select value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ fontSize: '12.5px', padding: '4px 8px' }}>
    <option value="">— Sin sede —</option>
    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
  </select>
);
const SelectJornada = ({ value, onChange, disabled }) => (
  <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ fontSize: '12.5px', padding: '4px 8px' }}>
    <option value="ambos">☀/☾ Día y Noche</option>
    <option value="dia">☀ Solo Día</option>
    <option value="noche">☾ Solo Noche</option>
  </select>
);

const Pendiente = ({ u, sedes, onActualizar }) => {
  const [rolId, setRolId] = useState('auxiliar');
  const [sedeId, setSedeId] = useState(sedes[0]?.id || '');
  const [jornada, setJornada] = useState('ambos');
  const [ocupado, ejecutar] = useAccion();
  const { avisar } = useApp();
  const aprobar = () => ejecutar(async () => {
    if (!sedeId && rolId !== 'superadmin') { avisar('Asigna una sede antes de aprobar.'); return; }
    await onActualizar(u.id, { rolId, sedeId: sedeId || null, jornadaPermitida: jornada, estado: 'activo' });
    avisar('Cuenta aprobada ✓');
  });
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px dashed var(--linea)' }}>
      <b>{u.nombre}</b><br /><span style={{ fontSize: '12px', color: 'var(--texto-2)' }}>{u.email} · solicitó {fmtFechaHora(u.createdAt)}</span>
      <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
        <SelectRol value={rolId} onChange={setRolId} />
        <SelectSede value={sedeId} onChange={setSedeId} sedes={sedes} />
        <SelectJornada value={jornada} onChange={setJornada} />
        <button className="mini-btn" disabled={ocupado} style={{ background: 'var(--vital)', color: '#fff' }} onClick={aprobar}>Aprobar y Activar Cuenta ✓</button>
      </div>
    </div>
  );
};

export const AdminUsuarios = ({ perfiles, sedes, jornadaActual, miId, onActualizar }) => {
  const { avisar } = useApp();
  const [, ejecutar] = useAccion();

  const cambiar = (id, parche, msg) => ejecutar(async () => { await onActualizar(id, parche); avisar(msg + ' ✓'); });

  const estadoDinamico = (u) => {
    if (u.estado === 'suspendido') return { label: '⛔ Suspendido', cls: 'c' };
    if (u.jornadaPermitida === 'ambos' || u.jornadaPermitida === jornadaActual) return { label: '● Activo (en turno)', cls: 'ok' };
    return { label: '○ Fuera de su jornada', cls: 'inactivo' };
  };

  const pendientes = perfiles.filter((u) => u.estado === 'pendiente');
  const otros = perfiles.filter((u) => u.estado !== 'pendiente');

  return (
    <div>
      <div className="dos-col" style={{ marginBottom: '24px' }}>
        <div className="panel">
          <div className="panel-head"><h3>Cómo dar acceso a una persona</h3></div>
          <div className="panel-body">
            <ol style={{ paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.7 }}>
              <li>La persona entra a AuraCare → <b>Solicitar Acceso</b> y crea su propia contraseña.</li>
              <li>Aparece aquí en <b>Solicitudes Pendientes</b>.</li>
              <li>Verifica su identidad, asigna <b>rol, sede y jornada</b> y aprueba.</li>
            </ol>
            <div className="nota-aviso"><span>🔐</span><span>Nadie comparte contraseñas: cada cuenta es personal y los administradores nunca las ven. Toda acción de esta pantalla queda en el registro de auditoría.</span></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Solicitudes Pendientes de Aprobación ({pendientes.length})</h3></div>
          <div className="panel-body">
            {pendientes.length === 0 ? <div className="vacio">No hay solicitudes pendientes.</div>
              : pendientes.map((u) => <Pendiente key={u.id} u={u} sedes={sedes} onActualizar={onActualizar} />)}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Directorio de Usuarios · Turno actual: {jornadaActual === 'dia' ? '☀ Día' : '☾ Noche'}</h3>
        </div>
        <div className="panel-body tabla-scroll">
          <table className="op">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Sede</th><th>Jornada autorizada</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {otros.map((u) => {
                const st = estadoDinamico(u);
                const yo = u.id === miId;
                return (
                  <tr key={u.id}>
                    <td><b>{u.nombre}</b><br /><span style={{ fontSize: '12px', color: 'var(--texto-2)' }}>{u.email}</span></td>
                    <td><SelectRol value={u.rolId} disabled={yo} onChange={(v) => cambiar(u.id, { rolId: v }, 'Rol actualizado')} /></td>
                    <td><SelectSede value={u.sedeId} sedes={sedes} onChange={(v) => cambiar(u.id, { sedeId: v || null }, 'Sede actualizada')} /></td>
                    <td><SelectJornada value={u.jornadaPermitida} onChange={(v) => cambiar(u.id, { jornadaPermitida: v }, 'Jornada actualizada')} /></td>
                    <td><span className={'estado-pill ' + st.cls}>{st.label}</span></td>
                    <td>
                      {!yo && (u.estado === 'suspendido'
                        ? <button className="mini-btn" onClick={() => cambiar(u.id, { estado: 'activo' }, 'Cuenta reactivada')}>Reactivar</button>
                        : <button className="mini-btn" onClick={() => { if (window.confirm(`¿Suspender el acceso de ${u.nombre}?`)) cambiar(u.id, { estado: 'suspendido' }, 'Cuenta suspendida'); }}>Suspender</button>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
