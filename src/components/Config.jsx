import { useState } from 'react';
import { ORDEN_SIGNOS } from '../lib/clinico.js';
import { useApp, useAccion } from './ui.jsx';

const RangosGlobales = ({ onGuardar }) => {
  const { rangos, avisar } = useApp();
  const claves = ORDEN_SIGNOS.filter((k) => rangos[k]);
  const [d, setD] = useState(() => Object.fromEntries(claves.map((k) => [k, { vMin: rangos[k].vMin, vMax: rangos[k].vMax, cMin: rangos[k].cMin, cMax: rangos[k].cMax }])));
  const [ocupado, ejecutar] = useAccion();
  const set = (k, c, v) => setD((p) => ({ ...p, [k]: { ...p[k], [c]: v } }));
  const malo = (k) => { const r = d[k]; return [r.vMin, r.vMax, r.cMin, r.cMax].some((x) => x === '' || Number.isNaN(Number(x))) || !(Number(r.cMin) <= Number(r.vMin) && Number(r.vMin) <= Number(r.vMax) && Number(r.vMax) <= Number(r.cMax)); };
  const cambiados = claves.filter((k) => ['vMin', 'vMax', 'cMin', 'cMax'].some((c) => Number(d[k][c]) !== rangos[k][c]));

  const guardar = () => ejecutar(async () => {
    if (!window.confirm('Estos rangos definen cuándo se generan alertas para TODAS las sedes. ¿Confirmas que fueron validados por dirección médica?')) return;
    for (const k of cambiados) await onGuardar(k, { vMin: Number(d[k].vMin), vMax: Number(d[k].vMax), cMin: Number(d[k].cMin), cMax: Number(d[k].cMax) });
    avisar('Rangos clínicos actualizados ✓ (quedan en auditoría)');
  });

  return (
    <div className="panel">
      <div className="panel-head"><h3>🩺 Rangos clínicos generales (todas las sedes)</h3></div>
      <div className="panel-body">
        <div className="nota-aviso rojo" style={{ marginTop: 0, marginBottom: '12px' }}><span>⚠</span><span>Referencia de la Fundación, <b>pendiente de validación por el equipo médico</b>. Cada cambio queda en el registro de auditoría. Para casos individuales usa los rangos personalizados de la ficha.</span></div>
        <div className="grid-rangos-edit">
          <span className="h">Parámetro</span><span className="h">Vig. mín</span><span className="h">Vig. máx</span><span className="h">Crít. &lt;</span><span className="h">Crít. ≥</span>
          {claves.map((k) => (
            <div key={k} style={{ display: 'contents' }}>
              <span><b>{rangos[k].lbl}</b> <small style={{ color: 'var(--texto-2)' }}>{rangos[k].uni}</small></span>
              {['vMin', 'vMax', 'cMin', 'cMax'].map((c) => <input key={c} type="number" step="any" aria-label={`${rangos[k].lbl} ${c}`} value={d[k][c]} onChange={(e) => set(k, c, e.target.value)} style={malo(k) ? { borderColor: 'var(--alerta)' } : undefined} />)}
            </div>
          ))}
        </div>
        <div className="form-foot"><button className="btn btn-primary" disabled={ocupado || !cambiados.length || claves.some(malo)} onClick={guardar}>Guardar rangos ({cambiados.length} cambio(s))</button></div>
      </div>
    </div>
  );
};

export const Config = ({ sedes, sede, config, residentes, puedeConfig, esSuper, onToggle, onCrearSede, onActualizarSede, onGuardarRango }) => {
  const { avisar } = useApp();
  const [nueva, setNueva] = useState({ nombre: '', cupos: 40 });
  const [ocupado, ejecutar] = useAccion();
  const [edit, setEdit] = useState(null);

  const agregar = () => ejecutar(async () => {
    await onCrearSede(nueva);
    setNueva({ nombre: '', cupos: 40 });
    avisar(`Nueva unidad operativa "${nueva.nombre.trim()}" agregada ✓`);
  });
  const guardarSede = () => ejecutar(async () => { await onActualizarSede(edit.id, edit); setEdit(null); avisar('Unidad actualizada ✓'); });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      <div className="panel">
        <div className="panel-head"><h3>Parámetros Clínicos · {sede.nombre}</h3></div>
        <div className="panel-body">
          <div className="switch-row">
            <div className="info"><b>Glucometría</b><p>Habilita el campo de glucosa en sangre en las notas.</p></div>
            <button role="switch" aria-checked={!!config.glu} aria-label="Glucometría" disabled={!puedeConfig || ocupado} className={'switch' + (config.glu ? ' on' : '')} onClick={() => ejecutar(() => onToggle('glu'))}></button>
          </div>
          <div className="switch-row">
            <div className="info"><b>Escala de Dolor (0-10)</b><p>Habilita la valoración de dolor en las notas diarias.</p></div>
            <button role="switch" aria-checked={!!config.dolor} aria-label="Escala de dolor" disabled={!puedeConfig || ocupado} className={'switch' + (config.dolor ? ' on' : '')} onClick={() => ejecutar(() => onToggle('dolor'))}></button>
          </div>
        </div>
      </div>

      {esSuper && <RangosGlobales onGuardar={onGuardarRango} />}

      <div className="panel">
        <div className="panel-head"><h3>🏢 Unidades Operativas</h3></div>
        <div className="panel-body">
          <div className="grid-sedes-v34">
            {sedes.map((s) => {
              const n = residentes.filter((r) => r.sedeId === s.id && r.estado === 'activo').length;
              const pct = Math.min(100, Math.round((n / (s.cupos || 1)) * 100));
              const editando = edit && edit.id === s.id;
              return (
                <div key={s.id} className="card-sede-v34">
                  {editando ? (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <input aria-label="Nombre de la sede" maxLength={120} value={edit.nombre} onChange={(e) => setEdit((p) => ({ ...p, nombre: e.target.value }))} />
                      <input aria-label="Cupos" type="number" min="1" value={edit.cupos} onChange={(e) => setEdit((p) => ({ ...p, cupos: e.target.value }))} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="mini-btn" disabled={ocupado || !edit.nombre.trim() || !(Number(edit.cupos) > 0)} onClick={guardarSede}>Guardar</button>
                        <button className="mini-btn" onClick={() => setEdit(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4>🏢 {s.nombre}</h4>
                      <div style={{ fontSize: '12px', color: 'var(--texto-2)' }}>Cupos utilizados: <b>{n} de {s.cupos}</b> ({pct}%)</div>
                      <div className="cupo-bar-bg"><div className="cupo-bar-fill" style={{ width: `${pct}%` }}></div></div>
                      {esSuper && <button className="mini-btn" onClick={() => setEdit({ id: s.id, nombre: s.nombre, cupos: s.cupos })}>Editar</button>}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {esSuper && (
            <div style={{ marginTop: '22px', borderTop: '1px dashed var(--linea)', paddingTop: '16px' }}>
              <b style={{ fontSize: '14px' }}>+ Registrar Nueva Unidad Operativa:</b>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 130px', gap: '10px', marginTop: '10px' }}>
                <div className="field" style={{ marginBottom: 0 }}><label>Nombre de la Nueva Sede *</label>
                  <input maxLength={120} value={nueva.nombre} onChange={(e) => setNueva((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Sede Suba - Centro de Cuidado" /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Cupos *</label>
                  <input type="number" min="1" value={nueva.cupos} onChange={(e) => setNueva((p) => ({ ...p, cupos: e.target.value }))} /></div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: '12px' }} disabled={ocupado || !nueva.nombre.trim() || !(Number(nueva.cupos) > 0)} onClick={agregar}>+ Agregar Sede al Sistema</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
