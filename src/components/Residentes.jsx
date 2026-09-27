import { useRef, useState } from 'react';
import { matrizAResidentes, parseCSV } from '../lib/importar.js';
import { useAccion } from './ui.jsx';

export const Importador = ({ sede, onImportar, cerrar }) => {
  const [resultado, setResultado] = useState(null);
  const [ocupado, ejecutar] = useAccion();
  const fileRef = useRef(null);

  const procesar = async (file) => {
    if (file.size > 2 * 1024 * 1024) { setResultado({ validas: [], errores: ['El archivo supera 2 MB.'], archivo: file.name }); return; }
    try {
      let matriz;
      if (/\.csv$/i.test(file.name)) matriz = parseCSV(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/universal');
        matriz = (await readSheet(file)).map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c)));
      } else { setResultado({ validas: [], errores: ['Formato no soportado. Usa .xlsx o .csv (en Excel: Guardar como → CSV).'], archivo: file.name }); return; }
      setResultado({ ...matrizAResidentes(matriz), archivo: file.name });
    } catch (e) {
      setResultado({ validas: [], errores: ['No se pudo leer el archivo.'], archivo: file.name });
    }
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="modal">
        <h3>Importar residentes desde Excel / CSV</h3>
        <p className="sub">Carga masiva a {sede.nombre}. Columnas: nombres, apellidos, documento, edad, diagnóstico. Los documentos repetidos se omiten.</p>
        {!resultado ? (
          <div className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) procesar(e.dataTransfer.files[0]); }}>
            Arrastra aquí tu archivo .xlsx o .csv<br />
            <button className="btn btn-ghost" style={{ marginTop: '12px' }} onClick={() => fileRef.current.click()}>Elegir archivo…</button>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" hidden onChange={(e) => { if (e.target.files[0]) procesar(e.target.files[0]); }} />
          </div>
        ) : (
          <div>
            <p><b>{resultado.archivo}</b> · <span style={{ color: 'var(--vital)' }}>{resultado.validas.length} filas válidas</span></p>
            {resultado.errores.length > 0 && <div style={{ maxHeight: '100px', overflow: 'auto' }}>{resultado.errores.map((e, i) => <div key={i} className="err-fila">{e}</div>)}</div>}
            {resultado.validas.length > 0 && (
              <div className="prev-tabla">
                <table className="op">
                  <thead><tr><th>Nombres</th><th>Apellidos</th><th>Doc</th><th>Edad</th></tr></thead>
                  <tbody>{resultado.validas.map((v, i) => <tr key={i}><td>{v.nombres}</td><td>{v.apellidos}</td><td>{v.doc}</td><td>{v.edad || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setResultado(null)}>← Volver</button>
              <button className="btn btn-primary" disabled={ocupado || !resultado.validas.length} onClick={() => ejecutar(() => onImportar(resultado.validas))}>{ocupado ? 'Importando…' : `Importar ${resultado.validas.length} residente(s)`}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Alta / edición ---------- */
const FormResidente = ({ inicial, onGuardar, cerrar, titulo, sub, etiquetaBoton }) => {
  const [f, setF] = useState(inicial);
  const [ocupado, ejecutar] = useAccion();
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const edadMala = f.edad !== '' && f.edad !== null && !(Number(f.edad) > 0 && Number(f.edad) < 125);
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="modal">
        <h3>{titulo}</h3>
        <p className="sub">{sub}</p>
        <div className="form-grid">
          <div className="field"><label>Nombres *</label><input maxLength={80} value={f.nombres} onChange={(e) => set('nombres', e.target.value)} /></div>
          <div className="field"><label>Apellidos *</label><input maxLength={80} value={f.apellidos} onChange={(e) => set('apellidos', e.target.value)} /></div>
          <div className="field"><label>Cédula / Documento</label><input maxLength={30} value={f.doc} onChange={(e) => set('doc', e.target.value)} placeholder="Número de cédula o ID" /></div>
          <div className="field"><label>Edad</label><input type="number" min="1" max="124" value={f.edad ?? ''} onChange={(e) => set('edad', e.target.value)} />
            {edadMala && <div style={{ color: 'var(--alerta)', fontSize: '12px' }}>Edad no válida</div>}</div>
          <div className="field full"><label>Diagnósticos base</label><input maxLength={300} value={f.dx} onChange={(e) => set('dx', e.target.value)} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
          <button className="btn btn-primary" disabled={ocupado || edadMala || !f.nombres.trim() || !f.apellidos.trim()} onClick={() => ejecutar(() => onGuardar(f))}>{ocupado ? 'Guardando…' : etiquetaBoton}</button>
        </div>
      </div>
    </div>
  );
};

export const NuevoResidente = ({ sede, onCrear, cerrar }) => (
  <FormResidente inicial={{ nombres: '', apellidos: '', doc: '', edad: '', dx: '' }} onGuardar={onCrear} cerrar={cerrar}
    titulo="Registrar Persona Mayor" sub={`Ingreso a ${sede.nombre}.`} etiquetaBoton="Registrar Persona Mayor" />
);

export const EditarResidente = ({ res, onGuardar, cerrar }) => (
  <FormResidente inicial={{ nombres: res.nombres, apellidos: res.apellidos, doc: res.doc === 'CC s/n' ? '' : res.doc, edad: res.edad ?? '', dx: res.dx || '' }}
    onGuardar={onGuardar} cerrar={cerrar} titulo="Editar datos de la persona mayor" sub="Los cambios quedan en el registro de auditoría." etiquetaBoton="Guardar cambios" />
);

export const EgresoResidente = ({ res, onEgresar, cerrar }) => {
  const [motivo, setMotivo] = useState('');
  const [ocupado, ejecutar] = useAccion();
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="modal">
        <h3>Registrar egreso</h3>
        <p className="sub">{res.nombres} {res.apellidos} dejará de aparecer en la lista activa. Su historial clínico se conserva.</p>
        <div className="field"><label>Motivo del egreso *</label>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Seleccionar…</option>
            {['Traslado a otra institución', 'Retorno con familia', 'Hospitalización prolongada', 'Fallecimiento', 'Otro'].map((m) => <option key={m}>{m}</option>)}
          </select></div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
          <button className="btn btn-peligro" disabled={ocupado || !motivo} onClick={() => ejecutar(() => onEgresar(motivo))}>Confirmar egreso</button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Lista ---------- */
export const Residentes = ({ residentes, irFicha, puedeCrear, abrirNuevo, abrirImport }) => {
  const [q, setQ] = useState('');
  const [verEgresados, setVerEgresados] = useState(false);
  const base = residentes.filter((r) => (verEgresados ? r.estado === 'egresado' : r.estado === 'activo'));
  const filtrados = base.filter((r) => (r.nombres + ' ' + r.apellidos + ' ' + r.doc).toLowerCase().includes(q.toLowerCase()));
  const nEgresados = residentes.filter((r) => r.estado === 'egresado').length;

  return (
    <div>
      <div className="buscador">
        <input aria-label="Buscar persona mayor" placeholder="🔍 Escribe la CÉDULA o nombre de la persona mayor para filtrar…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ fontSize: '14.5px', borderColor: q ? 'var(--vital)' : 'var(--linea)' }} />
        {puedeCrear && <button className="btn btn-ghost" onClick={abrirImport}>⬆ Importar Excel/CSV</button>}
        {puedeCrear && <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo residente</button>}
      </div>
      <div className="tabs">
        <button className={!verEgresados ? 'on' : ''} onClick={() => setVerEgresados(false)}>Activos ({residentes.length - nEgresados})</button>
        <button className={verEgresados ? 'on' : ''} onClick={() => setVerEgresados(true)}>Egresados ({nEgresados})</button>
      </div>
      {q && <div style={{ fontSize: '13px', color: 'var(--texto-2)', marginBottom: '14px' }}>Filtrando por: <b>"{q}"</b> ({filtrados.length} resultado(s))</div>}
      <div className="grid-res">
        {filtrados.map((r) => (
          <button key={r.id} className="res-card" onClick={() => irFicha(r.id)}>
            <div className="top">
              <div className="avatar" aria-hidden="true">{r.nombres[0]}{r.apellidos[0]}</div>
              <div>
                <div className="nom">{r.nombres} {r.apellidos}</div>
                <div className="doc">🪪 {r.doc} · {r.edad ? r.edad + ' años' : 's/r'}</div>
              </div>
            </div>
            <div className="dx">{r.dx}</div>
            <div className="pie">
              <span className={'estado-pill ' + (r.estado === 'activo' ? 'ok' : 'inactivo')}>{r.estado === 'activo' ? 'Activo' : 'Egresado'}</span>
              <span style={{ marginLeft: 'auto' }}>Ver ficha →</span>
            </div>
          </button>
        ))}
        {filtrados.length === 0 && (
          <div className="vacio" style={{ gridColumn: '1/-1', background: '#fff', borderRadius: '14px', border: '1px solid var(--linea)' }}>
            {q ? <>No se encontró ninguna persona mayor con la cédula o nombre <b>"{q}"</b>.</> : 'No hay personas mayores en esta lista.'}
          </div>
        )}
      </div>
    </div>
  );
};
