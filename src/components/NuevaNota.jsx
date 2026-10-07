import { Check } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { ORDEN_SIGNOS, TIPOS_NOTA, TIPOS_PSICOSOCIAL, errorSigno, estadoSigno, etiquetasRango, rangoEfectivo } from '../lib/clinico.js';
import { useApp, useAccion, IconoAviso } from './ui.jsx';

const claveBorrador = (uid) => `auracare_borrador_nota_${uid}`;
const SV0 = { ta_s: '', ta_d: '', fc: '', fr: '', temp: '', spo2: '', glu: '', dolor: '' };

/* El borrador vive en sessionStorage (se borra al cerrar la pestaña/sesión): evita perder una nota por un corte de red
   sin dejar datos clínicos persistentes en un equipo compartido. */
const leerBorrador = (uid) => { try { return JSON.parse(sessionStorage.getItem(claveBorrador(uid)) || 'null'); } catch { return null; } };
/* Hay borrador con contenido (el efecto de abajo guarda también el vacío al abrir la pantalla) */
export const hayBorrador = (uid) => { const b = leerBorrador(uid); return !!b && !!(b.personaId || (b.desc || '').trim() || Object.values(b.sv || {}).some((v) => v !== '' && v != null)); };
export const borrarBorrador = (uid) => { try { sessionStorage.removeItem(claveBorrador(uid)); } catch { /* sin storage */ } };

export const NuevaNota = ({ sede, residentes, presel, config, uid, psicosocial = false, onGuardar }) => {
  const { rangos, jornada } = useApp();
  const b = leerBorrador(uid);
  const [personaId, setPersonaId] = useState(presel || b?.personaId || '');
  const [filtro, setFiltro] = useState('');
  const tipos = psicosocial ? TIPOS_NOTA.filter(([v]) => TIPOS_PSICOSOCIAL.includes(v)) : TIPOS_NOTA;
  const [tipo, setTipo] = useState(tipos.some(([v]) => v === b?.tipo) ? b.tipo : tipos[0][0]);
  const [desc, setDesc] = useState(b?.desc || '');
  const [sv, setSv] = useState(b?.sv || SV0);
  const [ocupado, ejecutar] = useAccion();
  const set = (k, v) => setSv((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try { sessionStorage.setItem(claveBorrador(uid), JSON.stringify({ personaId, tipo, desc, sv })); } catch { /* sin storage */ }
  }, [uid, personaId, tipo, desc, sv]);

  const filtrados = residentes.filter((r) => (r.nombres + ' ' + r.apellidos + ' ' + r.doc).toLowerCase().includes(filtro.toLowerCase()));
  const persona = residentes.find((r) => r.id === personaId);
  const overrides = persona?.rangos;

  const campos = psicosocial ? [] : [['ta_s', 'TA sistólica (mmHg)'], ['ta_d', 'TA diastólica (mmHg)'], ['fc', 'Frec. cardiaca (lpm)'], ['fr', 'Frec. respiratoria (rpm)'], ['temp', 'Temperatura (°C)'], ['spo2', 'Saturación O₂ (%)']];
  if (!psicosocial && config.glu) campos.push(['glu', 'Glucometría (mg/dL)']);
  if (!psicosocial && config.dolor) campos.push(['dolor', 'Dolor (0-10)']);

  const errores = Object.fromEntries(campos.map(([k]) => [k, errorSigno(k, sv[k])]));
  const hayError = Object.values(errores).some(Boolean);
  const sinPersonaConSignos = !personaId && campos.some(([k]) => sv[k] !== '');

  const guardar = () => ejecutar(async () => {
    if (desc.trim().length < 10 || hayError) return;
    const signos = {};
    campos.forEach(([k]) => { if (sv[k] !== '') signos[k] = Number(sv[k]); });
    const critico = Object.keys(signos).some((k) => k !== 'dolor' && estadoSigno(rangos, k, signos[k], overrides) === 'c');
    if (critico && !window.confirm('Hay signos en rango CRÍTICO: se generará una alerta para el equipo. Recuerda activar el protocolo de emergencia si aplica.\n\n¿Guardar la nota?')) return;
    const ok = await onGuardar({ personaId: personaId || null, tipo, descripcion: desc.trim(), signos });
    if (ok) { borrarBorrador(uid); setDesc(''); setSv(SV0); }
  });

  return (
    <div className="panel" style={{ maxWidth: '880px' }}>
      <div className="panel-head"><h3>Nueva nota · {sede.nombre} · Jornada {jornada === 'dia' ? 'día' : 'noche'}</h3></div>
      <div className="panel-body">
        {b && (b.desc || Object.values(b.sv || {}).some(Boolean)) && (
          <div className="nota-aviso" style={{ marginBottom: '12px' }} role="status"><span>Se recuperó tu borrador sin guardar. Revísalo antes de guardar.</span></div>
        )}

        <div className="picker-persona-v34">
          <label htmlFor="filtro-persona" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--texto)', display: 'block', marginBottom: '6px' }}>
            Persona mayor
          </label>
          <input id="filtro-persona" placeholder="Buscar por nombre o cédula" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <div className="picker-res-list" role="group" aria-label="Elegir persona mayor">
            <button type="button" aria-pressed={personaId === ''} className={'picker-res-item ' + (personaId === '' ? 'selected' : '')} onClick={() => setPersonaId('')}>
              <span>Novedad general de la jornada (sin persona específica)</span>
              <span className="sel">{personaId === '' && <><Check className="ico-txt" weight="bold" aria-hidden="true" />Seleccionada</>}</span>
            </button>
            {filtrados.map((r) => (
              <button type="button" key={r.id} aria-pressed={personaId === r.id} className={'picker-res-item ' + (personaId === r.id ? 'selected' : '')} onClick={() => setPersonaId(r.id)}>
                <span><b>{r.nombres} {r.apellidos}</b> · <span className="mono">{r.doc}</span></span>
                <span className="sel">{personaId === r.id ? <><Check className="ico-txt" weight="bold" aria-hidden="true" />Seleccionada</> : 'Elegir'}</span>
              </button>
            ))}
          </div>
          {persona && <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--vital-t)', fontWeight: 600 }}>Seleccionada: {persona.nombres} {persona.apellidos} ({persona.doc})</div>}
        </div>

        <div className="form-grid">
          <div className="field full">
            <label htmlFor="tipo-nota">Tipo de nota</label>
            <select id="tipo-nota" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {tipos.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {campos.map(([k, lbl]) => {
            const e = k === 'dolor' ? null : estadoSigno(rangos, k, sv[k], overrides);
            return (
              <div key={k} className="field campo-signo">
                <label htmlFor={'sv-' + k}>{lbl}</label>
                <input id={'sv-' + k} type="number" step="any" inputMode="decimal" value={sv[k]} onChange={(ev) => set(k, ev.target.value)} placeholder="-" />
                {e && !errores[k] && <span className={'estado ' + e}>{e === 'ok' ? 'EN RANGO' : e === 'v' ? 'VIGILANCIA' : 'CRÍTICO'}</span>}
                {errores[k] && <div style={{ color: 'var(--alerta-t)', fontSize: '12.5px', marginTop: '3px' }}>{errores[k]}</div>}
              </div>
            );
          })}

          <div className="field full">
            <label htmlFor="desc-nota">Descripción de la novedad (mínimo 10 caracteres)</label>
            <textarea id="desc-nota" rows="4" maxLength={4000} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={psicosocial ? 'Qué pasó, con quién, cómo se manejó y qué queda pendiente para el siguiente turno…' : 'Escriba la valoración clínica o conducta observada…'}></textarea>
          </div>
        </div>

        {sinPersonaConSignos && <div className="nota-aviso rojo"><IconoAviso t="alerta" /><span>Ingresaste signos vitales sin seleccionar una persona mayor: no generarán alertas ni se asociarán a ninguna ficha.</span></div>}

        {!psicosocial && <div className="banner-rangos-v31">
          <b>Rangos de seguridad clínica (referencia de la Fundación, pendiente de validación por el equipo médico){persona && Object.keys(overrides || {}).length ? ' · con ajustes personalizados' : ''}:</b>
          <div className="grid-rangos-items">
            {ORDEN_SIGNOS.filter((k) => rangos[k] && (k !== 'glu' || config.glu)).map((k) => {
              const r = rangoEfectivo(rangos, k, overrides); const t = etiquetasRango(r);
              return (
                <div key={k} className="rango-item-tag">
                  <b>{r.lbl}:</b><br />
                  <span style={{ color: 'var(--vital-t)' }}>Normal: {t.normal} {r.uni}</span><br />
                  <span style={{ color: 'var(--vigilancia-t)' }}>Vig: {t.vig}</span> · <span style={{ color: 'var(--alerta-t)' }}>Crit: {t.crit}</span>
                </div>
              );
            })}
          </div>
        </div>}

        <div className="nota-aviso cifrado">
          <IconoAviso t="sello" />
          <span>Al guardar, el servidor asigna fecha, hora y autor y sella la nota. <b>No podrá editarse ni eliminarse</b>: una corrección se registra como una nota nueva.</span>
        </div>

        <div className="form-foot">
          <button className="btn btn-primary" disabled={ocupado || desc.trim().length < 10 || hayError} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar y sellar nota'}</button>
        </div>
      </div>
    </div>
  );
};
