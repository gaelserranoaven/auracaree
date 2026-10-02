import { useCallback, useEffect, useRef, useState } from 'react';
import { proximoCambioJornada } from '../lib/util.js';

/* Centro Día / Centro Noche: tema visual de la app.
   Por defecto sigue la jornada (hora de Bogotá). Si alguien lo cambia a mano, el cambio vale en este equipo
   hasta el próximo cambio de jornada (06:00 o 18:00) y luego vuelve a lo automático.
   El centro elegido es la jornada con la que se registran notas, actas y recibos de turno. */
const CLAVE = 'auracare_centro';
const ANIM_MS = 1900;
const CAMBIO_TEMA_MS = 800; // momento de la animación en que el cielo cubre la pantalla y se cambia el tema

const leerManual = () => {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE));
    if (v && (v.centro === 'dia' || v.centro === 'noche') && Date.parse(v.hasta) > Date.now()) return v.centro;
  } catch { /* sin storage */ }
  return null;
};

export function useCentro(jornada) {
  const [manual, setManual] = useState(leerManual);
  const [animacion, setAnimacion] = useState(null); // { hacia, id }
  const aplicado = useRef(null);
  const centro = manual || jornada;

  // Al cambiar la jornada (06:00 / 18:00) el cambio manual vence
  useEffect(() => { setManual(leerManual()); }, [jornada]);

  useEffect(() => {
    const html = document.documentElement;
    if (aplicado.current === null || aplicado.current === centro) { aplicado.current = centro; html.dataset.centro = centro; return undefined; }
    aplicado.current = centro;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { html.dataset.centro = centro; return undefined; }
    setAnimacion({ hacia: centro, id: Date.now() });
    const t1 = setTimeout(() => { html.classList.add('cambiando-centro'); html.dataset.centro = centro; }, CAMBIO_TEMA_MS);
    const t2 = setTimeout(() => html.classList.remove('cambiando-centro'), CAMBIO_TEMA_MS + 900);
    const t3 = setTimeout(() => setAnimacion(null), ANIM_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); html.classList.remove('cambiando-centro'); html.dataset.centro = centro; };
  }, [centro]);

  const cambiar = useCallback(() => {
    const nuevo = centro === 'dia' ? 'noche' : 'dia';
    try {
      if (nuevo === jornada) localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, JSON.stringify({ centro: nuevo, hasta: proximoCambioJornada().toISOString() }));
    } catch { /* sin storage: el cambio vale solo en esta pestaña */ }
    setManual(nuevo === jornada ? null : nuevo);
  }, [centro, jornada]);

  return { centro, manual: !!manual, cambiar, animacion };
}

export const CentroSwitch = ({ centro, manual, onCambiar }) => {
  const noche = centro === 'noche';
  const titulo = manual
    ? `Cambiado a mano en este equipo hasta el próximo cambio de jornada. Las notas y actas quedan registradas en ${noche ? 'Centro Noche' : 'Centro Día'}.`
    : 'Sigue la hora de Bogotá. Haz clic para cambiar entre Centro Día y Centro Noche: las notas y actas quedan registradas en el centro elegido.';
  return (
    <button type="button" role="switch" aria-checked={noche} aria-label="Centro Noche" title={titulo} className="centro-switch" onClick={onCambiar}>
      <span className="estrellas" aria-hidden="true"></span>
      <span className="nube" aria-hidden="true"></span>
      <span className="astro" aria-hidden="true"></span>
      <span className="etiqueta" aria-hidden="true">{noche ? 'Centro Noche' : 'Centro Día'}</span>
    </button>
  );
};

// Cielo a pantalla completa: el sol se oculta y sale la luna (o al revés). No bloquea clics.
export const CieloCambio = ({ hacia }) => (
  <div className={'cielo-cambio a-' + hacia} aria-hidden="true">
    <div className="capa desde"></div>
    <div className="capa medio"></div>
    <div className="capa hacia"></div>
    <div className="estrellas"></div>
    <div className="orbita"><div className="sol"></div><div className="luna"></div></div>
    <div className="rotulo">
      <b>{hacia === 'noche' ? 'Centro Noche' : 'Centro Día'}</b>
      <span>{hacia === 'noche' ? '18:00 - 06:00' : '06:00 - 18:00'}</span>
    </div>
  </div>
);
