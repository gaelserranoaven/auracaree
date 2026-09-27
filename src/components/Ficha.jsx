import { useEffect, useState } from 'react';
import { ORDEN_SIGNOS, TIPO_LBL, estadoSigno, rangoEfectivo } from '../lib/clinico.js';
import { fmtFecha } from '../lib/util.js';
import { useApp, useAccion, Sparkline, ChipsSignos, SelloNota } from './ui.jsx';

const peor = (...e) => (e.includes('c') ? 'c' : e.includes('v') ? 'v' : e.includes('ok') ? 'ok' : null);

const EditorRangos = ({ res, config, onGuardar }) => {
  const { rangos } = useApp();
  const claves = ORDEN_SIGNOS.filter((k) => rangos[k] && (k !== 'glu' || config.glu));
  const inicial = () => Object.fromEntries(claves.map((k) => { const r = rangoEfectivo(rangos, k, res.rangos); return [k, { vMin: r.vMin, vMax: r.vMax, cMin: r.cMin, cMax: r.cMax }]; }));
  const [d, setD] = useState(inicial);
  const [ocupado, ejecutar] = useAccion();
  useEffect(() => setD(inicial()), [res.id, JSON.stringify(res.rangos)]);
  const set = (k, campo, v) => setD((p) => ({ ...p, [k]: { ...p[k], [campo]: v } }));
  const invalido = claves.some((k) => { const r = d[k]; return [r.vMin, r.vMax, r.cMin, r.cMax].some((x) => x === '' || Number.isNaN(Number(x))) || !(Number(r.cMin) <= Number(r.vMin) && Number(r.vMin) <= Number(r.vMax) && Number(r.vMax) <= Number(r.cMax)); });

  const guardar = () => ejecutar(async () => {
    const o = {};
    claves.forEach((k) => {
      const g = rangos[k]; const r = d[k]; const p = {};
      if (Number(r.vMin) !== g.vMin) p.v_min = Number(r.vMin);
      if (Number(r.vMax) !== g.vMax) p.v_max = Number(r.vMax);
      if (Number(r.cMin) !== g.cMin) p.c_min = Number(r.cMin);
      if (Number(r.cMax) !== g.cMax) p.c_max = Number(r.cMax);
      if (Object.keys(p).length) o[k] = p;
    });
    await onGuardar(o);
  });

  return (
    <div>
      <p style={{ fontSize: '12.5px', color: 'var(--texto-2)', marginBottom: '10px' }}>
        Ajusta los umbrales solo por indicación médica (p. ej. EPOC: SpO₂ objetivo menor). Deben cumplir: crítico mín ≤ vigilancia mín ≤ vigilancia máx ≤ crítico máx. Las alertas futuras usan estos valores.
      </p>
      <div className="grid-rangos-edit">
        <span className="h">Parámetro</span><span className="h">Vig. mín</span><span className="h">Vig. máx</span><span className="h">Crít. &lt;</span><span className="h">Crít. ≥</span>
        {claves.map((k) => (
          <div key={k} style={{ display: 'contents' }}>
            <span><b>{rangos[k].lbl}</b> <small style={{ color: 'var(--texto-2)' }}>{rangos[k].uni}</small></span>
            {['vMin', 'vMax', 'cMin', 'cMax'].map((c) => (
              <input key={c} type="number" step="any" aria-label={`${rangos[k].lbl} ${c}`} value={d[k][c]} onChange={(e) => set(k, c, e.target.value)} />
            ))}
          </div>
        ))}
      </div>
      <div className="form-foot">
        <button className="btn btn-primary" disabled={ocupado || invalido} onClick={guardar}>Guardar rangos personalizados</button>
        <button className="btn btn-ghost" disabled={ocupado || !Object.keys(res.rangos || {}).length} onClick={() => ejecutar(() => onGuardar({}))}>Restablecer a los generales</button>
      </div>
    </div>
  );
};

export const Ficha = ({ res, notas, config, puedeNota, puedeEditar, puedeRangos, nuevaNotaPara, onEditar, onEgreso, onReingreso, onGuardarRangos }) => {
  const { rangos } = useApp();
  const [verRangos, setVerRangos] = useState(false);
  const [ocupado, ejecutar] = useAccion();
  const s = res.signos || {}; const h = res.hist || {}; const o = res.rangos;
  const est = (k) => estadoSigno(rangos, k, s[k], o);

  const cards = [
    { lbl: 'Tensión arterial', val: s.ta_s ? s.ta_s + '/' + (s.ta_d ?? '—') : '—', uni: 'mmHg', hist: h.ta_s, e: peor(est('ta_s'), est('ta_d')) },
    { lbl: 'Frec. cardiaca', val: s.fc ?? '—', uni: 'lpm', hist: h.fc, e: est('fc') },
    { lbl: 'Saturación O₂', val: s.spo2 ?? '—', uni: '%', hist: h.spo2, e: est('spo2') },
    { lbl: 'Frec. respiratoria', val: s.fr ?? '—', uni: 'rpm', hist: h.fr, e: est('fr') },
    { lbl: 'Temperatura', val: s.temp ?? '—', uni: '°C', hist: h.temp, e: est('temp') },
    config.glu ? { lbl: 'Glucometría', val: s.glu ?? '—', uni: 'mg/dL', hist: h.glu, e: est('glu') } : { lbl: 'Glucometría', val: 'No aplica', uni: '', na: true },
  ];
  const notasRes = notas.filter((n) => n.personaId === res.id);
  const personalizados = Object.keys(o || {}).length;

  return (
    <div>
      <div className="ficha-head">
        <div className="avatar-xl" aria-hidden="true">{res.nombres[0]}{res.apellidos[0]}</div>
        <div>
          <h2>{res.nombres} {res.apellidos} {res.estado === 'egresado' && <span className="estado-pill inactivo" style={{ verticalAlign: 'middle' }}>Egresado</span>}</h2>
          <div className="meta">🪪 {res.doc} · {res.edad ? res.edad + ' años' : 's/r'} · {res.dx}</div>
          {res.estado === 'egresado' && <div className="meta">Egreso: {res.fechaEgreso ? fmtFecha(res.fechaEgreso) : '—'} · {res.motivoEgreso}</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {puedeEditar && <button className="btn btn-ghost" onClick={onEditar}>✎ Editar datos</button>}
          {puedeEditar && res.estado === 'activo' && <button className="btn btn-ghost" onClick={onEgreso}>Registrar egreso</button>}
          {puedeEditar && res.estado === 'egresado' && <button className="btn btn-ghost" disabled={ocupado} onClick={() => ejecutar(onReingreso)}>Reingresar</button>}
          {puedeNota && res.estado === 'activo' && <button className="btn btn-primary" onClick={() => nuevaNotaPara(res.id)}>+ Nueva nota</button>}
        </div>
      </div>

      <div className="grid-signos">
        {cards.map((c) => (
          <div key={c.lbl} className={'signo-card' + (c.na || c.val === '—' ? ' na' : c.e === 'c' ? ' c' : c.e === 'v' ? ' v' : '')}>
            <span className="borde" aria-hidden="true"></span>
            <div className="lbl">{c.lbl}</div>
            <div className="num">{c.val} <small>{c.uni}</small></div>
            {c.hist && <Sparkline data={c.hist} estado={c.e} />}
          </div>
        ))}
      </div>

      {puedeRangos && (
        <div className="panel" style={{ marginBottom: '18px' }}>
          <div className="panel-head">
            <h3>Rangos de alerta de esta persona</h3>
            {personalizados > 0 && <span className="chip-turno">{personalizados} personalizado(s)</span>}
            <button className="mini-btn" style={{ marginLeft: 'auto' }} onClick={() => setVerRangos((v) => !v)}>{verRangos ? 'Ocultar' : 'Ver / editar'}</button>
          </div>
          {verRangos && <div className="panel-body"><EditorRangos res={res} config={config} onGuardar={onGuardarRangos} /></div>}
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h3>Bitácora de salud (solo lectura · no editable)</h3></div>
        <div className="panel-body">
          {notasRes.length === 0 ? <div className="vacio">Esta persona aún no tiene notas registradas.</div> :
            <div className="bitacora">
              {[...notasRes].reverse().map((n) => (
                <div key={n.id} className={'nota-item tipo-' + n.tipo}>
                  <div className="nota-meta">
                    <span className="mono">{fmtFecha(n.fecha)} · {n.hora}</span>
                    <span className={'tag ' + n.tipo}>{TIPO_LBL[n.tipo]}</span>
                    <SelloNota hash={n.hash} />
                  </div>
                  <div className="nota-txt">{n.descripcion}</div>
                  <ChipsSignos signos={n.signos} overrides={o} />
                  <div className="nota-autor" style={{ marginTop: '6px' }}>Registró: {n.autor}</div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
};
