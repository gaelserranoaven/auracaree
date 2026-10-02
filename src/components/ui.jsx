import { Component, createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowClockwise, ArrowLeft, CheckCircle, ClipboardText, DotsThree, FileText, GearSix, Handshake, Heart, Info, LockSimple,
  MagnifyingGlass, Moon, NotePencil, Package, Prohibit, Receipt, ShieldCheck, SignOut, SquaresFour, Sun, UserCircle, UsersThree, Warning,
} from '@phosphor-icons/react';
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

/* Íconos: una sola familia (Phosphor, peso regular). Decorativos: el texto del botón da el nombre. */
const ICONOS = {
  panel: SquaresFour, residentes: Heart, nueva: NotePencil, asistencia: ClipboardText, dotacion: Package,
  entrega: Handshake, sdis: FileText, config: GearSix, admin_usuarios: UsersThree, auditoria: MagnifyingGlass,
  atras: ArrowLeft, refrescar: ArrowClockwise, perfil: UserCircle, salir: SignOut, mas: DotsThree,
};
export const Icono = ({ n }) => { const C = ICONOS[n]; return C ? <C className="ico" aria-hidden="true" focusable="false" /> : null; };

// Día / noche con íconos de sol y luna
export const IconoJornada = ({ j }) => (j === 'dia' ? <Sun className="ico-txt" aria-hidden="true" /> : <Moon className="ico-txt" aria-hidden="true" />);
export const TxtJornada = ({ j, centro }) => <span className="txt-jornada"><IconoJornada j={j} />{centro ? (j === 'dia' ? 'Centro Día' : 'Centro Noche') : (j === 'dia' ? 'Día' : 'Noche')}</span>;

// Ícono de los avisos (recuadros .nota-aviso y toast)
const AVISOS = { info: Info, alerta: Warning, error: Prohibit, ok: CheckCircle, sello: LockSimple, cuentas: ShieldCheck, registro: Receipt };
export const IconoAviso = ({ t = 'info' }) => { const C = AVISOS[t] || Info; return <C className="ico-aviso" weight={t === 'ok' || t === 'sello' ? 'fill' : 'regular'} aria-hidden="true" />; };

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
    catch (e) { avisar(e.message, 'error'); return undefined; }
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
    chips.push(chip('ta', peor, `TA ${signos.ta_s}/${signos.ta_d || '-'} mmHg`));
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
      <span><b>SERVICIO:</b> Centro de Protección Social - Persona Mayor</span>
      <span><b>UNIDAD OPERATIVA:</b> {sede.nombre}</span>
      {jornada && <span><b>JORNADA:</b> {jornada === 'dia' ? 'DÍA [X]   NOCHE [ ]' : 'DÍA [ ]   NOCHE [X]'}</span>}
      <span><b>FECHA:</b> {fmtFecha(fecha)}</span>
      {extra}
    </div>
    <div className="sdis-titulo">{titulo}</div>
  </>
);

export const LeySdis = () => (
  <div className="sdis-ley"><b>Nota:</b> Autorización para el tratamiento de datos personales: En cumplimiento de la Ley 1581 de 2012, la Secretaría Distrital de Integración Social (SDIS) es la responsable del tratamiento de los datos personales recolectados, conforme a su Política de tratamiento de datos personales. Documento generado electrónicamente por AuraCare; las notas clínicas se sellan en el servidor con hash SHA-256 encadenado y no pueden modificarse ni eliminarse desde la aplicación.</div>
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
