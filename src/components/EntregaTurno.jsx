import { useState } from 'react';
import { fmtFecha, fmtFechaHora } from '../lib/util.js';
import { useApp, useAccion } from './ui.jsx';

const CENTRO = { dia: 'Centro Día', noche: 'Centro Noche' };
const chipJornada = (j) => <span className={'chip-turno ' + j}>{j === 'dia' ? '☀ Día' : '☾ Noche'}</span>;
const PENDIENTE_HORAS = 30; // un acta se ofrece para recibir durante este tiempo

const Recibos = ({ lista }) => (lista.length === 0
  ? <div className="recibos vacio-recibos">Nadie ha firmado el recibo todavía.</div>
  : (
    <ul className="recibos" aria-label="Recibido por">
      {lista.map((r) => (
        <li key={r.id}>
          <span className="ok-recibo" aria-hidden="true">✓</span>
          <span><b>{r.recibidoPor}</b> · {r.cargo} · {fmtFechaHora(r.createdAt)}{r.observaciones && <><br /><span className="obs-recibo">{r.observaciones}</span></>}</span>
        </li>
      ))}
    </ul>
  ));

// Acta pendiente: quien llega la lee y firma "Recibí turno"
const ActaPorRecibir = ({ acta, recibos, onRecibir }) => {
  const { avisar } = useApp();
  const [leido, setLeido] = useState(false);
  const [obs, setObs] = useState('');
  const [ocupado, ejecutar] = useAccion();
  const recibir = () => ejecutar(async () => { await onRecibir(acta.id, obs); avisar('Turno recibido y firmado ✓'); });
  return (
    <article className="acta-recibir">
      <div className="acta-meta">
        {chipJornada(acta.jornada)}
        <span><b>{acta.firmadoPor}</b>{acta.cargo && ` · ${acta.cargo}`} · entregó {fmtFechaHora(acta.createdAt)}</span>
      </div>
      <div className="acta-texto">{acta.observaciones}</div>
      <Recibos lista={recibos} />
      <label className="check-leido">
        <input type="checkbox" checked={leido} onChange={(e) => setLeido(e.target.checked)} />
        <span>Leí el acta y recibo el turno</span>
      </label>
      {leido && (
        <div className="field" style={{ marginTop: '10px' }}>
          <label htmlFor={'obs-rec-' + acta.id}>Observaciones al recibir (opcional)</label>
          <textarea id={'obs-rec-' + acta.id} rows="2" maxLength={2000} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej.: recibo con novedad en la habitación 3, falta revisar a…"></textarea>
        </div>
      )}
      <div className="form-foot" style={{ marginTop: '10px' }}>
        <button className="btn btn-primary" disabled={!leido || ocupado} onClick={recibir}>{ocupado ? 'Firmando…' : 'Firmar recibido'}</button>
      </div>
    </article>
  );
};

export const EntregaTurno = ({ sede, residentes, notas, alertas, turnos, recepciones = [], usuario, puedeFirmar, onFirmar, onRecibir }) => {
  const { hoy, jornada, avisar } = useApp();
  const [obs, setObs] = useState('');
  // Por defecto la jornada del centro actual; se puede corregir (p. ej. el turno noche que entrega pasadas las 06:00)
  const [jornadaActa, setJornadaActa] = useState(jornada);
  const [ocupado, ejecutar] = useAccion();

  const notasHoy = notas.filter((n) => n.sedeId === sede.id && n.fecha === hoy);
  const novedades = notasHoy.filter((n) => n.tipo === 'novedad_salud' || n.tipo === 'activacion_emergencia').length;
  const convivencia = notasHoy.filter((n) => n.tipo === 'convivencia').length;
  const activas = alertas.filter((a) => a.sedeId === sede.id && a.estado === 'activa');
  const activos = residentes.filter((r) => r.estado === 'activo').length;
  const actasSede = turnos.filter((t) => t.sedeId === sede.id);
  const recibosDe = (id) => recepciones.filter((r) => r.entregaId === id).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const yaRecibi = (id) => recepciones.some((r) => r.entregaId === id && r.recibidoPorId === usuario.id);
  const limite = Date.now() - PENDIENTE_HORAS * 3600e3;
  const porRecibir = actasSede.filter((t) => Date.parse(t.createdAt) > limite && t.firmadoPorId !== usuario.id && !yaRecibi(t.id)).slice(0, 4);
  const historial = actasSede.slice(0, 10);

  const firmar = () => ejecutar(async () => {
    if (!window.confirm(`Vas a firmar la entrega de turno de ${CENTRO[jornadaActa]}. El acta no se puede editar después. ¿Continuar?`)) return;
    await onFirmar(obs, jornadaActa);
    setObs('');
    avisar('Turno entregado y firmado ✓');
  });

  return (
    <div className="turnos">
      {puedeFirmar && (
        <section className="panel" aria-labelledby="t-recibir">
          <div className="panel-head">
            <h3 id="t-recibir">Recibir turno</h3>
            <span className="panel-sub">Lee lo que dejó el turno anterior y firma que lo recibiste</span>
          </div>
          <div className="panel-body">
            {porRecibir.length === 0
              ? <div className="vacio">No tienes actas pendientes por recibir en {sede.nombre}.</div>
              : porRecibir.map((t) => <ActaPorRecibir key={t.id} acta={t} recibos={recibosDe(t.id)} onRecibir={onRecibir} />)}
          </div>
        </section>
      )}

      <div className="dos-col">
        <section className="panel" aria-labelledby="t-entregar">
          <div className="panel-head"><h3 id="t-entregar">Entregar turno · {sede.nombre}</h3></div>
          <div className="panel-body">
            <div className="grid-kpi" style={{ marginBottom: '14px' }}>
              <div className="kpi"><div className="lbl">Residentes activos</div><div className="val">{activos}</div></div>
              <div className="kpi"><div className="lbl">Notas hoy</div><div className="val">{notasHoy.length}</div><div className="sub">{novedades} de salud · {convivencia} de convivencia</div></div>
              <div className="kpi"><div className="lbl">Alertas activas</div><div className={'val' + (activas.some((a) => a.sev === 'critica') ? ' alerta-c' : '')}>{activas.length}</div></div>
            </div>
            <div className="form-grid">
              <div className="field">
                <span className="lbl-campo" id="lbl-jornada-acta">Jornada que entrega</span>
                <div className="seg seg-jornada" role="radiogroup" aria-labelledby="lbl-jornada-acta">
                  {['dia', 'noche'].map((j) => (
                    <button key={j} type="button" role="radio" aria-checked={jornadaActa === j} className={jornadaActa === j ? 'on' : ''} onClick={() => setJornadaActa(j)}>
                      {j === 'dia' ? '☀ Centro Día' : '☾ Centro Noche'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field"><label htmlFor="resp-turno">Responsable</label><input id="resp-turno" value={usuario.nombre} disabled style={{ background: 'var(--superficie-3)' }} /></div>
              <div className="field full"><label htmlFor="obs-turno">Novedades para el equipo entrante</label>
                <textarea id="obs-turno" rows="5" maxLength={4000} value={obs} onChange={(e) => setObs(e.target.value)}
                  placeholder="Pendientes de salud, citas, personas en vigilancia, discusiones o conflictos entre usuarios, novedades del servicio…"></textarea>
              </div>
            </div>
            {puedeFirmar
              ? <div className="form-foot"><button className="btn btn-primary" onClick={firmar} disabled={ocupado || obs.trim().length < 5}>{ocupado ? 'Firmando…' : 'Firmar entrega de turno'}</button></div>
              : <div className="nota-aviso"><span>ℹ️</span><span>Tu rol no puede firmar entregas de turno.</span></div>}
          </div>
        </section>

        <section className="panel" aria-labelledby="t-historial">
          <div className="panel-head"><h3 id="t-historial">Entregas anteriores</h3></div>
          <div className="panel-body">
            {historial.length === 0 ? <div className="vacio">Aún no hay entregas de turno firmadas.</div> : historial.map((t) => (
              <div key={t.id} className="tarjeta-turno">
                <div className="acta-meta">
                  {chipJornada(t.jornada)}
                  <span>{fmtFecha(t.fecha)} · {fmtFechaHora(t.createdAt)} · <b>{t.firmadoPor}</b>{t.cargo && ` · ${t.cargo}`}</span>
                </div>
                <div className="acta-texto">{t.observaciones}</div>
                <Recibos lista={recibosDe(t.id)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
