import { useEffect, useState } from 'react';
import { useApp, useAccion, SdisHead, LeySdis } from './ui.jsx';

export const RegistroSdis = ({ sede, residentes, onCargarDia, onVerificar, onImprimir }) => {
  const { hoy, jornada } = useApp();
  const [fecha, setFecha] = useState(hoy);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cadena, setCadena] = useState(null);
  const [ocupado, ejecutar] = useAccion();

  useEffect(() => {
    let vivo = true;
    setCargando(true); setCadena(null);
    onCargarDia(sede.id, fecha).then((n) => { if (vivo) { setFilas(n); setCargando(false); } }, () => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [sede.id, fecha]);

  const nombreDe = (id) => { const r = residentes.find((x) => x.id === id); return r ? r.nombres + ' ' + r.apellidos + ': ' : ''; };
  const verificar = () => ejecutar(async () => setCadena(await onVerificar(sede.id)));
  const imprimir = () => { onImprimir(sede.id, fecha); window.print(); };

  return (
    <div>
      <div className="topbar no-print" style={{ marginBottom: '16px' }}>
        <div className="titulo"><p>Sección 6 SDIS · Registro Diario Novedades Salud (FOR-PSS-729)</p></div>
        <div className="spacer"></div>
        <div className="field" style={{ marginBottom: 0 }}>
          <input type="date" aria-label="Fecha del registro" max={hoy} value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
        <button className="btn btn-ghost" disabled={ocupado} onClick={verificar}>🔍 Verificar integridad</button>
        <button className="btn btn-tinta" onClick={imprimir}>⬇ Exportar PDF para Interventoría</button>
      </div>

      {cadena && (
        <div className={'resultado-cadena no-print ' + (cadena.total === cadena.validas ? 'ok' : 'mal')}>
          {cadena.total === cadena.validas
            ? <>✓ Cadena íntegra: {cadena.validas} de {cadena.total} notas de {sede.nombre} verificadas (sellos SHA-256 encadenados recalculados por el servidor).</>
            : <>⚠ Se detectaron alteraciones: {cadena.validas} de {cadena.total} notas válidas. Primera nota afectada: <span className="mono">{cadena.primera_rota}</span>. Reportar al administrador.</>}
        </div>
      )}

      <div id="zona-print" style={{ marginTop: '14px' }}>
        <div className="sdis">
          <SdisHead titulo="SECCIÓN 6. REGISTRO DIARIO NOVEDADES SALUD" sede={sede} jornada={fecha === hoy ? jornada : null} fecha={fecha} />
          <table className="sdis-tabla">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Descripción Novedades de Salud</th><th>Firma / Autor</th></tr></thead>
            <tbody>
              {cargando && <tr><td colSpan="4">Cargando…</td></tr>}
              {!cargando && filas.length === 0 && <tr><td colSpan="4">Sin novedades registradas para esta fecha.</td></tr>}
              {filas.map((n) => (
                <tr key={n.id}>
                  <td className="mono">{n.fecha}</td>
                  <td className="mono">{n.hora}</td>
                  <td>{nombreDe(n.personaId)}{n.descripcion}</td>
                  <td>{n.autor}{n.hash && <><br /><small style={{ color: '#666' }}>Sello SHA-256: {n.hash.slice(0, 16)}</small></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <LeySdis />
        </div>
      </div>
    </div>
  );
};
