import { Component, createContext, useContext, useState } from 'react';
import { estadoSigno } from '../lib/clinico.js';
import { fmtFecha } from '../lib/util.js';

/* Contexto global: fecha/jornada de Bogotá, rangos y elementos de la BD, rol y toast */
export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export const VERSION = 'v4.0';

export const Logo = ({ dark }) => (
  <div className="brand">
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="9" fill={dark ? '#FFFFFF14' : '#0E3A5D'} stroke={dark ? '#ffffff44' : 'none'} />
      <polyline points="5,18 11,18 13.5,11 17,24 20.5,14 22.5,18 29,18" fill="none" stroke="#0FA47A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="brand-name">Aura<em>Care</em> <small style={{ fontSize: '10px', background: 'var(--cifrado)', color: '#fff', padding: '2px 6px', borderRadius: '6px', verticalAlign: 'middle' }}>{VERSION}</small></span>
  </div>
);

/* Ejecuta una acción async una sola vez a la vez y muestra el error si falla */
export function useAccion() {
  const { avisar } = useApp();
  const [ocupado, setOcupado] = useState(false);
  const ejecutar = async (fn) => {
    if (ocupado) return undefined;
    setOcupado(true);
    try { return await fn(); }
    catch (e) { avisar('⛔ ' + e.message); return undefined; }
    finally { setOcupado(false); }
  };
  return [ocupado, ejecutar];
}

export const Sparkline = ({ data, estado }) => {
  if (!Array.isArray(data) || data.length < 2) return null;
  const w = 120, h = 26, min = Math.min(...data), max = Math.max(...data);
  const norm = (v) => (max === min ? h / 2 : h - 3 - ((v - min) / (max - min)) * (h - 6));
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${norm(v).toFixed(1)}`).join(' ');
  const color = estado === 'c' ? 'var(--alerta)' : estado === 'v' ? 'var(--vigilancia)' : 'var(--vital)';
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
};

export const ChipsSignos = ({ signos, overrides }) => {
  const { rangos } = useApp();
  if (!signos) return null;
  const est = (k, v) => estadoSigno(rangos, k, v, overrides);
  const chips = [];
  if (signos.ta_s) {
    const e = [est('ta_s', signos.ta_s), est('ta_d', signos.ta_d)];
    const peor = e.includes('c') ? 'c' : e.includes('v') ? 'v' : 'ok';
    chips.push(<span key="ta" className={'chip-signo ' + (peor !== 'ok' ? peor : '')}>TA {signos.ta_s}/{signos.ta_d || '—'} mmHg</span>);
  }
  const txt = { fc: (v) => `FC ${v} lpm`, fr: (v) => `FR ${v} rpm`, temp: (v) => `T° ${v}°C`, spo2: (v) => `SpO₂ ${v}%`, glu: (v) => `Glu ${v} mg/dL` };
  ['fc', 'fr', 'temp', 'spo2', 'glu'].forEach((k) => {
    if (signos[k] !== undefined && signos[k] !== null && signos[k] !== '') {
      const e = est(k, signos[k]);
      chips.push(<span key={k} className={'chip-signo ' + (e && e !== 'ok' ? e : '')}>{txt[k](signos[k])}</span>);
    }
  });
  if (signos.dolor !== undefined && signos.dolor !== null && signos.dolor !== '') {
    const d = Number(signos.dolor);
    chips.push(<span key="dolor" className={'chip-signo ' + (d >= 7 ? 'c' : d >= 4 ? 'v' : '')}>Dolor {d}/10</span>);
  }
  return chips.length ? <div className="nota-signos">{chips}</div> : null;
};

/* Sello de integridad: solo se muestra si la nota realmente tiene hash del servidor */
export const SelloNota = ({ hash }) => (hash ? <span className="badge-hash" title="Hash SHA-256 encadenado calculado por el servidor">#{hash.slice(0, 12)}</span> : null);

export const SdisHead = ({ titulo, sede, jornada, fecha, extra }) => (
  <>
    <div className="sdis-head">
      <div className="t">
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="6" fill="#0E3A5D" /><polyline points="5,18 11,18 13.5,11 17,24 20.5,14 22.5,18 29,18" fill="none" stroke="#0FA47A" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <div className="txt">PROCESO PRESTACIÓN DE SERVICIOS SOCIALES<br />FORMATO ENTREGA ELEMENTOS Y REGISTRO DE ACTIVIDADES Y NOVEDADES</div>
      </div>
      <div className="codigo">
        <div><b>Código:</b> FOR-PSS-729</div><div><b>Versión:</b> 1</div>
        <div><b>Fecha:</b> Memo I2023036946 - 20/03/2023</div><div><b>Página:</b> 1 de 1</div>
      </div>
    </div>
    <div className="sdis-sub">Clasificación: Información Pública Reservada</div>
    <div className="sdis-campos">
      <span><b>SERVICIO:</b> Centro de Protección Social — Persona Mayor</span>
      <span><b>UNIDAD OPERATIVA:</b> {sede.nombre}</span>
      {jornada && <span><b>JORNADA:</b> {jornada === 'dia' ? 'DÍA ☒ · NOCHE ☐' : 'DÍA ☐ · NOCHE ☒'}</span>}
      <span><b>FECHA:</b> {fmtFecha(fecha)}</span>
      {extra}
    </div>
    <div className="sdis-titulo">{titulo}</div>
  </>
);

export const LeySdis = () => (
  <div className="sdis-ley"><b>Nota:</b> Autorización para el tratamiento de datos personales: En cumplimiento de la Ley 1581 de 2012, la Secretaría Distrital de Integración Social – SDIS es la responsable del tratamiento de los datos personales recolectados, conforme a su Política de tratamiento de datos personales. Documento generado electrónicamente por AuraCare; las notas clínicas se sellan en el servidor con hash SHA-256 encadenado y no pueden modificarse ni eliminarse desde la aplicación.</div>
);

export class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pantalla-error">
        <Logo />
        <h2>Ocurrió un error inesperado</h2>
        <p>Tus datos guardados están a salvo. Recarga la página; si el problema continúa, avisa al administrador.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Recargar</button>
      </div>
    );
  }
}
