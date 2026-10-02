import { useState } from 'react';
import { errorDotacion } from '../lib/clinico.js';
import { fmtFecha } from '../lib/util.js';
import { useApp, useAccion, IconoAviso } from './ui.jsx';

export const Dotacion = ({ sede, residentes, entregas, pertenencias, elementos, puedeEditar, onEntrega, onPertenencia, onDevolucion }) => {
  const { hoy, avisar } = useApp();
  const [tab, setTab] = useState('aseo');
  const [fE, setFE] = useState({ personaId: '', elemento: elementos[0]?.key || '', cantidad: 1, obs: '' });
  const [fP, setFP] = useState({ personaId: '', ayudas: '', prendas: '', lenceria: '', otros: '', obs: '' });
  const [ocupado, ejecutar] = useAccion();

  const activos = residentes.filter((r) => r.estado === 'activo');
  const entregasMes = entregas.filter((e) => e.sedeId === sede.id && e.fecha.slice(0, 7) === hoy.slice(0, 7));
  const nombreDe = (id) => { const r = residentes.find((x) => x.id === id); return r ? r.nombres + ' ' + r.apellidos : 'Sin persona'; };
  const elLbl = Object.fromEntries(elementos.map((e) => [e.key, e.nombre]));
  const elegido = elementos.find((e) => e.key === fE.elemento);
  const errRegla = fE.personaId ? errorDotacion({ elemento: elegido, cantidad: fE.cantidad, personaId: fE.personaId, sedeId: sede.id, entregas, hoy }) : null;
  const pertsSede = pertenencias.filter((p) => p.sedeId === sede.id);

  const registrarEntrega = () => ejecutar(async () => {
    await onEntrega(fE);
    setFE((p) => ({ ...p, personaId: '', cantidad: 1, obs: '' }));
    avisar('Entrega registrada');
  });
  const registrarPert = () => ejecutar(async () => {
    await onPertenencia(fP);
    setFP({ personaId: '', ayudas: '', prendas: '', lenceria: '', otros: '', obs: '' });
    avisar('Pertenencias registradas en custodia');
  });
  const opcionesPersona = activos.map((r) => <option key={r.id} value={r.id}>{r.nombres} {r.apellidos} ({r.doc})</option>);

  return (
    <div>
      <div className="tabs no-print">
        <button className={tab === 'aseo' ? 'on' : ''} onClick={() => setTab('aseo')}>Aseo y prendas · Sección 1</button>
        <button className={tab === 'pert' ? 'on' : ''} onClick={() => setTab('pert')}>Pertenencias ingreso · Sección 4</button>
      </div>

      {tab === 'aseo' && (
        <div className="dos-col">
          {puedeEditar && (
            <div className="panel no-print">
              <div className="panel-head"><h3>Registrar Entrega de Dotación</h3></div>
              <div className="panel-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div className="field" style={{ marginBottom: 0 }}><label>Persona mayor</label>
                    <select value={fE.personaId} onChange={(e) => setFE((p) => ({ ...p, personaId: e.target.value }))}><option value="">Seleccionar…</option>{opcionesPersona}</select></div>
                  <div className="field" style={{ marginBottom: 0 }}><label>Elemento</label>
                    <select value={fE.elemento} onChange={(e) => setFE((p) => ({ ...p, elemento: e.target.value }))}>
                      {elementos.map((el) => <option key={el.key} value={el.key}>{el.nombre}</option>)}</select>
                    {elegido && <div style={{ fontSize: '12px', color: 'var(--texto-2)', marginTop: '4px' }}>Regla: {elegido.regla}</div>}</div>
                  <div className="field" style={{ marginBottom: 0 }}><label>Cantidad</label>
                    <input type="number" min="1" max="100" value={fE.cantidad} onChange={(e) => setFE((p) => ({ ...p, cantidad: e.target.value }))} /></div>
                  {errRegla && <div className="nota-aviso rojo" style={{ marginTop: 0 }}><IconoAviso t="error" /><span>{errRegla}</span></div>}
                  <button className="btn btn-primary" disabled={ocupado || !fE.personaId || !!errRegla} onClick={registrarEntrega}>Registrar Entrega</button>
                </div>
              </div>
            </div>
          )}

          <div className="panel no-print">
            <div className="panel-head"><h3>Consolidado Entregas del Mes</h3></div>
            <div className="panel-body tabla-scroll">
              {entregasMes.length === 0 ? <div className="vacio">Sin entregas este mes.</div> :
                <table className="op">
                  <thead><tr><th>Fecha</th><th>Persona</th><th>Elemento</th><th>Cant</th><th>Entregó</th></tr></thead>
                  <tbody>{[...entregasMes].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((e) => <tr key={e.id}><td>{e.fecha}</td><td>{nombreDe(e.personaId)}</td><td>{elLbl[e.elemento] || e.elemento}</td><td>{e.cantidad}</td><td>{e.quien}</td></tr>)}</tbody>
                </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'pert' && (
        <div className="dos-col">
          {puedeEditar && (
            <div className="panel">
              <div className="panel-head"><h3>Registrar pertenencias al ingreso</h3></div>
              <div className="panel-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div className="field" style={{ marginBottom: 0 }}><label>Persona mayor</label>
                    <select value={fP.personaId} onChange={(e) => setFP((p) => ({ ...p, personaId: e.target.value }))}><option value="">Seleccionar…</option>{opcionesPersona}</select></div>
                  {[['ayudas', 'Ayudas técnicas', 'Bastón, caminador…'], ['prendas', 'Prendas de vestir', 'Prendas de vestir'], ['lenceria', 'Lencería', 'Sábanas, cobijas, toallas…'], ['otros', 'Otros elementos', 'Objetos de valor o uso personal'], ['obs', 'Observaciones', 'Estado, marcas, cantidades…']].map(([k, lbl, ph]) => (
                    <div key={k} className="field" style={{ marginBottom: 0 }}><label>{lbl}</label>
                      <input maxLength={300} value={fP[k]} onChange={(e) => setFP((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph} /></div>
                  ))}
                  <button className="btn btn-primary" disabled={ocupado || !fP.personaId || !(fP.ayudas || fP.prendas || fP.lenceria || fP.otros)} onClick={registrarPert}>Registrar en Custodia</button>
                </div>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-head"><h3>Custodia y Devoluciones</h3></div>
            <div className="panel-body">
              {pertsSede.length === 0 ? <div className="vacio">Sin pertenencias registradas.</div> :
                pertsSede.map((p) => (
                  <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px dashed var(--linea)' }}>
                    <b>{nombreDe(p.personaId)}</b> <span className={'estado-pill ' + (p.estado === 'devuelta' ? 'inactivo' : 'ok')}>{p.estado === 'devuelta' ? 'Devuelta' : 'En custodia'}</span>
                    <div style={{ fontSize: '12px', color: 'var(--texto-2)', marginTop: '4px' }}>
                      Recibido {fmtFecha(p.fechaRecibo)}{p.fechaDev ? ' · Devuelto ' + fmtFecha(p.fechaDev) : ''}<br />
                      Prendas: {p.prendas || '-'} · Ayudas: {p.ayudas || '-'} · Lencería: {p.lenceria || '-'} · Otros: {p.otros || '-'}{p.obs ? ' · Obs: ' + p.obs : ''}
                    </div>
                    {puedeEditar && p.estado !== 'devuelta' && (
                      <button className="mini-btn" style={{ marginTop: '6px' }} disabled={ocupado}
                        onClick={() => { if (window.confirm('¿Registrar la devolución de estas pertenencias? Esta acción no se puede deshacer.')) ejecutar(() => onDevolucion(p.id)); }}>Registrar devolución</button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
