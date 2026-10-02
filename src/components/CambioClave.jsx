import { useState } from 'react';
import { Logo, useAccion, IconoAviso } from './ui.jsx';
import { errorPassword } from './Login.jsx';

/* Primer ingreso con clave temporal (cuenta creada por el SuperAdmin): no se entra a la app sin cambiarla. */
export const CambioClave = ({ nombre, onCambiar, onSalir }) => {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [ocupado, ejecutar] = useAccion();
  const errP = p1 ? errorPassword(p1) : null;
  const noCoinciden = p2 && p1 !== p2;

  const guardar = (e) => {
    e.preventDefault();
    ejecutar(async () => {
      setErr('');
      if (errorPassword(p1) || p1 !== p2) return;
      try { await onCambiar(p1); } catch (ex) { setErr(ex.message); }
    });
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={guardar} noValidate>
        <Logo />
        <h1>Crea tu contraseña</h1>
        <p className="sub">Hola, {nombre}. Ingresaste con una clave temporal: crea una contraseña personal para continuar. Nadie más la conocerá.</p>
        <div className="field">
          <label htmlFor="cc-p1">Nueva contraseña</label>
          <input id="cc-p1" type="password" autoComplete="new-password" required value={p1} onChange={(e) => setP1(e.target.value)} aria-describedby="cc-ayuda" />
          <div id="cc-ayuda" style={{ fontSize: '12.5px', marginTop: '4px', color: errP ? 'var(--alerta-t)' : 'var(--texto-2)' }}>{errP || 'Mínimo 10 caracteres, con letras y números.'}</div>
        </div>
        <div className="field">
          <label htmlFor="cc-p2">Repite la contraseña</label>
          <input id="cc-p2" type="password" autoComplete="new-password" required value={p2} onChange={(e) => setP2(e.target.value)} />
          {noCoinciden && <div style={{ fontSize: '12.5px', marginTop: '4px', color: 'var(--alerta-t)' }}>Las contraseñas no coinciden.</div>}
        </div>
        {err && <div className="nota-aviso rojo" role="alert"><IconoAviso t="error" /><span>{err}</span></div>}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={ocupado || !!errP || !p1 || p1 !== p2}>{ocupado ? 'Guardando…' : 'Guardar y entrar'}</button>
        <button type="button" className="btn-enlace" style={{ display: 'block', margin: '14px auto 0' }} onClick={onSalir}>Cerrar sesión</button>
      </form>
    </div>
  );
};
