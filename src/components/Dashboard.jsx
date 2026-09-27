import { TIPO_LBL, etiquetasRango } from '../lib/clinico.js';
import { fmtFechaHora } from '../lib/util.js';
import { useApp, useAccion, ChipsSignos, SelloNota } from './ui.jsx';

export const Dashboard = ({ sede, residentes, notas, alertas, asistencias, turnos, onAtender, puedeAtender, irFicha }) => {
  const { hoy, jornada, rangos } = useApp();
  const [ocupado, ejecutar] = useAccion();

  const activos = residentes.filter((r) => r.estado === 'activo');
  const notasHoy = notas.filter((n) => n.fecha === hoy && n.sedeId === sede.id);
  const activas = alertas.filter((a) => a.estado === 'activa' && a.sedeId === sede.id);
  const criticas = activas.filter((a) => a.sev === 'critica').length;
  const asistieron = activos.filter((r) => asistencias[sede.id + '|' + hoy + '|' + r.id]?.estado).length;
  const nombreDe = (id) => { const r = residentes.find((x) => x.id === id); return r ? r.nombres + ' ' + r.apellidos : 'Jornada (general)'; };
  const ultimoTurno = turnos.find((t) => t.sedeId === sede.id);

  return (
    <div>
      <div className="grid-kpi">
        <div className="kpi"><div className="lbl">Personas mayores activas</div>
          <div className="val">{activos.length}</div><div className="sub">de {sede.cupos} cupos</div></div>
        <div className="kpi"><div className="lbl">Asistencia de hoy</div>
          <div className="val">{asistieron}<span style={{ fontSize: '16px', color: 'var(--texto-2)' }}>/{activos.length}</span></div>
          <div className="sub">registradas en Sección 5</div></div>
        <div className="kpi"><div className="lbl">Notas registradas hoy</div>
          <div className="val">{notasHoy.length}</div><div className="sub">jornada {jornada === 'dia' ? 'día' : 'noche'} en curso</div></div>
        <div className="kpi"><div className="lbl">Alertas activas</div>
          <div className={'val' + (criticas ? ' alerta-c' : '')}>{activas.length}</div>
          <div className="sub">{criticas ? criticas + ' crítica(s) sin atender' : 'ninguna crítica'}</div></div>
      </div>

      {ultimoTurno && (
        <div className="panel" style={{ marginBottom: '18px' }}>
          <div className="panel-head">
            <h3>Última entrega de turno</h3>
            <span className="chip-turno">{ultimoTurno.jornada === 'dia' ? '☀ Día' : '☾ Noche'}</span>
            <span style={{ fontSize: '12px', color: 'var(--texto-2)' }}>{fmtFechaHora(ultimoTurno.createdAt)} · {ultimoTurno.firmadoPor}</span>
          </div>
          <div className="panel-body" style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{ultimoTurno.observaciones}</div>
        </div>
      )}

      <div className="dos-col">
        <div className="panel">
          <div className="panel-head"><h3>Últimas notas de la jornada</h3></div>
          <div className="panel-body">
            {notasHoy.length === 0 ? <div className="vacio">Aún no hay notas hoy en esta sede.</div> :
              <div className="bitacora">
                {[...notasHoy].reverse().map((n) => {
                  const res = residentes.find((r) => r.id === n.personaId);
                  return (
                    <div key={n.id} className={'nota-item tipo-' + n.tipo}>
                      <div className="nota-meta">
                        <span className="mono">{n.hora}</span>
                        <span className={'tag ' + n.tipo}>{TIPO_LBL[n.tipo]}</span>
                        <b style={{ color: 'var(--texto)' }}>{nombreDe(n.personaId)}</b>
                        <SelloNota hash={n.hash} />
                      </div>
                      <div className="nota-txt">{n.descripcion}</div>
                      <ChipsSignos signos={n.signos} overrides={res?.rangos} />
                    </div>
                  );
                })}
              </div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Alertas por signos vitales</h3></div>
          <div className="panel-body">
            {activas.length === 0 ? <div className="vacio">Sin alertas activas. Todos los signos dentro de rango.</div> :
              activas.map((a) => {
                const r = rangos[a.parametro];
                return (
                  <div key={a.id} className="alerta-row">
                    <span className={'dot ' + (a.sev === 'critica' ? 'critica' : 'vigilancia')} />
                    <div className="que">
                      <b style={{ cursor: 'pointer' }} onClick={() => a.personaId && irFicha(a.personaId)}>{nombreDe(a.personaId)}</b>
                      <span>{r ? r.lbl : a.parametro} fuera de rango · {a.hora}{r ? ' · normal ' + etiquetasRango(r).normal : ''}</span>
                    </div>
                    <span className={'val ' + (a.sev === 'critica' ? 'c' : 'v')}>{a.valor} {r ? r.uni : ''}</span>
                    {puedeAtender && <button className="mini-btn" disabled={ocupado} onClick={() => ejecutar(() => onAtender(a.id))}>Atender</button>}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
