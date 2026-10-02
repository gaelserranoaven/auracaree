import { Check } from '@phosphor-icons/react';
import { useState } from 'react';
import { MOTIVOS_NF } from '../lib/clinico.js';
import { useApp, useAccion, SdisHead, LeySdis } from './ui.jsx';

export const Asistencia = ({ sede, residentes, asistencias, actividades, puedeEditar, onMarcar, onCrearActividad, onParticipacion }) => {
  const { hoy, jornada, avisar } = useApp();
  const [fAct, setFAct] = useState({ nombre: '', linea: '', profesional: '' });
  const [ocupado, ejecutar] = useAccion();
  const activos = residentes.filter((r) => r.estado === 'activo');
  const llave = (rid) => sede.id + '|' + hoy + '|' + rid;
  const actsHoy = actividades.filter((a) => a.sedeId === sede.id && a.fecha === hoy);

  const crearAct = () => ejecutar(async () => {
    await onCrearActividad(fAct);
    setFAct({ nombre: '', linea: '', profesional: '' });
    avisar('Actividad agregada');
  });
  const marcar = (rid, estado, motivo) => ejecutar(() => onMarcar(rid, estado, motivo));

  return (
    <div>
      <div className="topbar no-print" style={{ marginBottom: '16px' }}>
        <div className="titulo"><p>Sección 5 SDIS · Registro de asistencia a la unidad operativa (solo del día de hoy)</p></div>
        <div className="spacer"></div>
        <button className="btn btn-tinta" onClick={() => window.print()}>⬇ Exportar Sección 5 (PDF)</button>
      </div>

      <div className="dos-col">
        <div className="panel no-print">
          <div className="panel-head"><h3>Ingreso de residentes hoy</h3></div>
          <div className="panel-body tabla-scroll">
            <table className="op">
              <thead><tr><th>Persona mayor</th><th>Firma / Motivo</th></tr></thead>
              <tbody>
                {activos.map((r) => {
                  const a = asistencias[llave(r.id)];
                  return (
                    <tr key={r.id}>
                      <td><b>{r.nombres} {r.apellidos}</b><br /><span style={{ fontSize: '12px', color: 'var(--texto-2)' }} className="mono">{r.doc}</span></td>
                      <td>
                        <span className="seg">
                          <button disabled={!puedeEditar || ocupado} className={a?.estado === 'firma' ? 'si' : ''} onClick={() => marcar(r.id, 'firma')}>Firma</button>
                          <button disabled={!puedeEditar || ocupado} className={a?.estado === 'no_firma' ? 'nf' : ''} onClick={() => marcar(r.id, 'no_firma', a?.motivo || MOTIVOS_NF[0])}>No firma</button>
                        </span>
                        {a?.estado === 'no_firma' && (
                          <select disabled={!puedeEditar} style={{ marginLeft: '6px', padding: '4px', fontSize: '12px' }} value={a.motivo} onChange={(e) => marcar(r.id, 'no_firma', e.target.value)}>
                            {MOTIVOS_NF.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {activos.length === 0 && <div className="vacio">No hay personas mayores activas en esta sede.</div>}
          </div>
        </div>

        <div className="panel no-print">
          <div className="panel-head"><h3>Actividades comunitarias hoy</h3></div>
          <div className="panel-body">
            {puedeEditar && (
              <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '10px', marginBottom: '16px' }}>
                <div className="field" style={{ marginBottom: 0 }}><label>Nombre de actividad</label><input maxLength={120} value={fAct.nombre} onChange={(e) => setFAct((p) => ({ ...p, nombre: e.target.value }))} placeholder="Taller de estimulación" /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Línea de atención</label><input maxLength={120} value={fAct.linea} onChange={(e) => setFAct((p) => ({ ...p, linea: e.target.value }))} placeholder="Envejecimiento activo" /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Profesional a cargo</label><input maxLength={120} value={fAct.profesional} onChange={(e) => setFAct((p) => ({ ...p, profesional: e.target.value }))} placeholder="Nombre del tallerista" /></div>
                <button className="btn btn-primary" onClick={crearAct} disabled={ocupado || !fAct.nombre.trim() || !fAct.linea.trim() || !fAct.profesional.trim()}>+ Crear Actividad</button>
              </div>
            )}
            {actsHoy.length === 0 ? <div className="vacio">Aún no hay actividades hoy.</div> : actsHoy.map((a) => (
              <div key={a.id} className="tarjeta-turno">
                <b>{a.nombre}</b> <span style={{ fontSize: '12px', color: 'var(--texto-2)' }}>· {a.linea} · {a.profesional}</span>
                <div style={{ margin: '8px 0 4px', fontSize: '12px', color: 'var(--texto-2)' }}>Participantes ({Object.values(a.participacion).filter(Boolean).length}/{activos.length}). Toca para marcar:</div>
                <div>
                  {activos.map((r) => (
                    <button key={r.id} type="button" disabled={!puedeEditar} className={'chip-particip' + (a.participacion[r.id] ? ' on' : '')}
                      onClick={() => ejecutar(() => onParticipacion(a, r.id))}>{a.participacion[r.id] && <Check className="ico-txt" weight="bold" aria-hidden="true" />}{r.nombres.split(' ')[0]} {r.apellidos.split(' ')[0]}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="zona-print" className="print-only">
        <div className="sdis">
          <SdisHead titulo="SECCIÓN 5. REGISTRO DE PARTICIPACIÓN EN ACTIVIDADES" sede={sede} jornada={jornada} fecha={hoy} />
          <table className="sdis-tabla">
            <thead><tr><th>Documento</th><th>Nombres</th><th>Firma</th><th>Observaciones</th></tr></thead>
            <tbody>
              {activos.map((r) => {
                const a = asistencias[llave(r.id)];
                return (
                  <tr key={r.id}>
                    <td>{r.doc}</td><td>{r.nombres} {r.apellidos}</td>
                    <td>{a?.estado === 'firma' ? 'Firma Electrónica' : a?.estado === 'no_firma' ? 'NO FIRMA' : 'Sin registrar'}</td>
                    <td>{a?.estado === 'no_firma' ? a.motivo : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {actsHoy.length > 0 && (
            <>
              <div className="sdis-titulo">ACTIVIDADES DEL DÍA</div>
              <table className="sdis-tabla">
                <thead><tr><th>Actividad</th><th>Línea de atención</th><th>Profesional</th><th>Participantes</th></tr></thead>
                <tbody>
                  {actsHoy.map((a) => (
                    <tr key={a.id}><td>{a.nombre}</td><td>{a.linea}</td><td>{a.profesional}</td>
                      <td>{activos.filter((r) => a.participacion[r.id]).map((r) => r.nombres + ' ' + r.apellidos).join(', ') || 'Sin participantes'}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <LeySdis />
        </div>
      </div>
    </div>
  );
};
