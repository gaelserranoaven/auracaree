import { useState } from 'react';
import { fmtFecha, fmtFechaHora } from '../lib/util.js';
import { useApp, useAccion } from './ui.jsx';

export const EntregaTurno = ({ sede, residentes, notas, alertas, turnos, usuario, puedeFirmar, onFirmar }) => {
  const { hoy, jornada, avisar } = useApp();
  const [obs, setObs] = useState('');
  const [ocupado, ejecutar] = useAccion();

  const notasHoy = notas.filter((n) => n.sedeId === sede.id && n.fecha === hoy);
  const novedades = notasHoy.filter((n) => n.tipo === 'novedad_salud' || n.tipo === 'activacion_emergencia').length;
  const activas = alertas.filter((a) => a.sedeId === sede.id && a.estado === 'activa');
  const activos = residentes.filter((r) => r.estado === 'activo').length;
  const historial = turnos.filter((t) => t.sedeId === sede.id).slice(0, 8);

  const firmar = () => ejecutar(async () => {
    if (!window.confirm('Vas a firmar el cierre de turno. El acta no se puede editar después. ¿Continuar?')) return;
    await onFirmar(obs);
    setObs('');
    avisar('Turno cerrado y firmado ✓');
  });

  return (
    <div className="dos-col">
      <div className="panel">
        <div className="panel-head"><h3>Acta de Entrega de Turno · {sede.nombre}</h3></div>
        <div className="panel-body">
          <div className="grid-kpi" style={{ marginBottom: '14px' }}>
            <div className="kpi"><div className="lbl">Residentes activos</div><div className="val">{activos}</div></div>
            <div className="kpi"><div className="lbl">Notas hoy</div><div className="val">{notasHoy.length}</div><div className="sub">{novedades} novedad(es) de salud</div></div>
            <div className="kpi"><div className="lbl">Alertas activas</div><div className={'val' + (activas.some((a) => a.sev === 'critica') ? ' alerta-c' : '')}>{activas.length}</div></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Jornada que entrega</label><input value={jornada === 'dia' ? 'Día (06:00 - 18:00)' : 'Noche (18:00 - 06:00)'} disabled style={{ background: 'var(--superficie-3)' }} /></div>
            <div className="field"><label>Profesional Responsable</label><input value={usuario.nombre} disabled style={{ background: 'var(--superficie-3)' }} /></div>
            <div className="field full"><label htmlFor="obs-turno">Observaciones para el equipo entrante</label>
              <textarea id="obs-turno" rows="4" maxLength={4000} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Pendientes de salud, citas médicas, personas en vigilancia, recomendaciones…"></textarea>
            </div>
          </div>
          {puedeFirmar
            ? <div className="form-foot"><button className="btn btn-primary" onClick={firmar} disabled={ocupado || obs.trim().length < 5}>{ocupado ? 'Firmando…' : 'Firmar Cierre de Turno'}</button></div>
            : <div className="nota-aviso"><span>ℹ️</span><span>Tu rol no puede firmar cierres de turno.</span></div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Entregas de turno anteriores</h3></div>
        <div className="panel-body">
          {historial.length === 0 ? <div className="vacio">Aún no hay entregas de turno firmadas.</div> : historial.map((t) => (
            <div key={t.id} className="tarjeta-turno">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span className="chip-turno">{t.jornada === 'dia' ? '☀ Día' : '☾ Noche'}</span>
                <span style={{ fontSize: '12px', color: 'var(--texto-2)' }}>{fmtFecha(t.fecha)} · {fmtFechaHora(t.createdAt)} · {t.firmadoPor}</span>
              </div>
              <div style={{ fontSize: '13.5px', whiteSpace: 'pre-wrap' }}>{t.observaciones}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
