import { Component, createContext, useContext, useEffect, useId, useRef, useState } from 'react';
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
    <span className="brand-name">Aura<em>Care</em></span>
  </div>
);

/* Íconos de trazo (mismo lenguaje que la página de presentación). Decorativos: el texto del botón da el nombre. */
const TRAZOS = {
  panel: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  residentes: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  nueva: 'M7 3h7l5 5v13H7zM14 3v5h5M13 11v6M10 14h6',
  asistencia: 'M5 4h14v16H5zM9 12l2 2 4-4',
  dotacion: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  entrega: 'M4 17l4-4 3 3 5-5M14 11h2v2M4 21h16',
  sdis: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  config: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  admin_usuarios: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 010 6M21 20c0-2.5-1.5-4.2-3.5-4.8',
  auditoria: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  atras: 'M15 5l-7 7 7 7',
  refrescar: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  salir: 'M15 4h4v16h-4M10 16l-4-4 4-4M6 12h10',
  mas: 'M4 12a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M10.5 12a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M17 12a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0',
};
export const Icono = ({ n }) => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={TRAZOS[n]} /></svg>;

/* Diálogo modal accesible: foco dentro al abrir, Tab no se escapa, Esc cierra y el foco vuelve al botón que lo abrió */
const ENFOCABLES = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export const Modal = ({ titulo, sub, cerrar, children }) => {
  const caja = useRef(null);
  const idTitulo = useId();
  useEffect(() => {
    const previo = document.activeElement;
    const nodo = caja.current;
    (nodo.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') || nodo).focus();
    const alTeclado = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(); return; }
      if (e.key !== 'Tab') return;
      const lista = [...nodo.querySelectorAll(ENFOCABLES)];
      if (!lista.length) return;
      const primero = lista[0], ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    nodo.addEventListener('keydown', alTeclado);
    return () => { nodo.removeEventListener('keydown', alTeclado); if (previo && previo.focus) previo.focus(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="modal" ref={caja} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}>
        <h3 id={idTitulo}>{titulo}</h3>
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
};

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
  // El estado no se comunica solo con color: ▲ crítico, ● vigilancia (+ texto para lectores de pantalla)
  const chip = (key, e, texto) => (
    <span key={key} className={'chip-signo ' + (e === 'c' || e === 'v' ? e : '')} title={e === 'c' ? 'Crítico' : e === 'v' ? 'Vigilancia' : undefined}>
      {e === 'c' && <span aria-hidden="true">▲ </span>}{e === 'v' && <span aria-hidden="true">● </span>}
      {texto}{e === 'c' && <span className="solo-lector"> (crítico)</span>}{e === 'v' && <span className="solo-lector"> (vigilancia)</span>}
    </span>
  );
  if (signos.ta_s) {
    const e = [est('ta_s', signos.ta_s), est('ta_d', signos.ta_d)];
    const peor = e.includes('c') ? 'c' : e.includes('v') ? 'v' : 'ok';
    chips.push(chip('ta', peor, `TA ${signos.ta_s}/${signos.ta_d || '—'} mmHg`));
  }
  const txt = { fc: (v) => `FC ${v} lpm`, fr: (v) => `FR ${v} rpm`, temp: (v) => `T° ${v}°C`, spo2: (v) => `SpO₂ ${v}%`, glu: (v) => `Glu ${v} mg/dL` };
  ['fc', 'fr', 'temp', 'spo2', 'glu'].forEach((k) => {
    if (signos[k] !== undefined && signos[k] !== null && signos[k] !== '') chips.push(chip(k, est(k, signos[k]), txt[k](signos[k])));
  });
  if (signos.dolor !== undefined && signos.dolor !== null && signos.dolor !== '') {
    const d = Number(signos.dolor);
    chips.push(chip('dolor', d >= 7 ? 'c' : d >= 4 ? 'v' : 'ok', `Dolor ${d}/10`));
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
