import { useEffect, useState } from 'react';
import { fmtFechaHora } from '../lib/util.js';

const ACCIONES = { insert: 'Creó', update: 'Modificó', ver_ficha: 'Consultó ficha', imprimir_sdis: 'Exportó Sección 6' };
const TABLAS = { perfiles: 'usuario', residentes: 'residente', sedes: 'sede', config_sedes: 'configuración', rangos_clinicos: 'rango clínico', elementos_dotacion: 'regla de dotación' };

export const Auditoria = ({ nombresPorId, sedes, onCargar }) => {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { onCargar().then(setFilas, (e) => setError(e.message)); }, []);
  const sedeNombre = (id) => (sedes.find((s) => s.id === id) || {}).nombre || id || '—';

  return (
    <div className="panel">
      <div className="panel-head"><h3>Registro de auditoría (últimos 200 eventos)</h3></div>
      <div className="panel-body tabla-scroll">
        <div className="nota-aviso" style={{ marginTop: 0, marginBottom: '12px' }}><span>🧾</span><span>Registro inalterable de accesos a fichas clínicas, cambios de permisos, altas de personas mayores y cambios de configuración. No incluye contenido clínico.</span></div>
        {error && <div className="vacio">{error}</div>}
        {!filas && !error && <div className="vacio">Cargando…</div>}
        {filas && (
          <table className="op">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Sede</th><th>Detalle</th></tr></thead>
            <tbody>
              {filas.map((a) => (
                <tr key={a.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(a.createdAt)}</td>
                  <td>{a.userId ? (nombresPorId[a.userId] || 'Usuario ' + a.userId.slice(0, 8)) : 'Sistema'}</td>
                  <td>{ACCIONES[a.accion] || a.accion}{a.tabla && TABLAS[a.tabla] ? ' ' + TABLAS[a.tabla] : ''}</td>
                  <td>{sedeNombre(a.sedeId)}</td>
                  <td style={{ fontSize: '12px', color: 'var(--texto-2)', maxWidth: '320px', wordBreak: 'break-word' }}>{a.detalle && Object.keys(a.detalle).length ? JSON.stringify(a.detalle) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filas && filas.length === 0 && <div className="vacio">Sin eventos registrados.</div>}
      </div>
    </div>
  );
};
