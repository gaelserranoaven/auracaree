import { useState } from 'react';
import { Logo, useAccion } from './ui.jsx';

// Mínimo 10 caracteres con letras y números
export const errorPassword = (p) => {
  if (p.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Debe combinar letras y números.';
  return null;
};

export const Login = ({ onLogin, onSolicitarCuenta, abrirTerminos }) => {
  // La página de presentación enlaza a src/index.html#solicitar para abrir directo la solicitud de acceso
  const [tab, setTab] = useState(() => (typeof window !== 'undefined' && window.location.hash === '#solicitar' ? 'solicitud' : 'login'));
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [nombreReg, setNombreReg] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [passReg, setPassReg] = useState('');
  const [ocupado, ejecutar] = useAccion();

  const submitLogin = (e) => { e.preventDefault(); ejecutar(() => onLogin(email, pass)); };
  const submitSolicitud = (e) => {
    e.preventDefault();
    if (!emailReg.trim() || !nombreReg.trim() || errorPassword(passReg)) return;
    ejecutar(async () => {
      const ok = await onSolicitarCuenta({ nombre: nombreReg.trim(), email: emailReg.trim(), password: passReg });
      if (ok) { setNombreReg(''); setEmailReg(''); setPassReg(''); setTab('login'); }
    });
  };
  const errPass = passReg ? errorPassword(passReg) : null;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <a className="login-volver" href="../"><span aria-hidden="true">←</span> Conoce AuraCare</a>
        <Logo />
        <h1>{tab === 'login' ? 'Ingresa a AuraCare' : 'Solicita tu acceso'}</h1>
        <p className="sub">Solo para personal autorizado de los centros de protección. Cada acción queda registrada con tu nombre.</p>

        <div className="auth-tabs" role="tablist" aria-label="Acceso">
          <button type="button" role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Iniciar sesión</button>
          <button type="button" role="tab" aria-selected={tab === 'solicitud'} className={tab === 'solicitud' ? 'active' : ''} onClick={() => setTab('solicitud')}>Solicitar acceso</button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={submitLogin}>
            <div className="field">
              <label htmlFor="login-email">Correo institucional</label>
              <input id="login-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@construyendofuturo.org.co" />
            </div>
            <div className="field">
              <label htmlFor="login-pass">Contraseña</label>
              <input id="login-pass" type="password" required autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            <button type="submit" disabled={ocupado} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>{ocupado ? 'Verificando…' : 'Ingresar'}</button>
          </form>
        ) : (
          <form onSubmit={submitSolicitud}>
            <div className="field">
              <label htmlFor="reg-nombre">Nombre completo</label>
              <input id="reg-nombre" required maxLength={80} autoComplete="name" value={nombreReg} onChange={(e) => setNombreReg(e.target.value)} placeholder="Ej: Patricia Gómez" />
            </div>
            <div className="field">
              <label htmlFor="reg-email">Correo institucional</label>
              <input id="reg-email" type="email" required autoComplete="email" value={emailReg} onChange={(e) => setEmailReg(e.target.value)} placeholder="patricia.gomez@construyendofuturo.org.co" />
            </div>
            <div className="field">
              <label htmlFor="reg-pass">Contraseña</label>
              <input id="reg-pass" type="password" required autoComplete="new-password" value={passReg} onChange={(e) => setPassReg(e.target.value)} placeholder="Mínimo 10 caracteres, con letras y números" aria-describedby={errPass ? 'reg-pass-error' : undefined} />
              {errPass && <div id="reg-pass-error" style={{ color: 'var(--alerta)', fontSize: '12.5px', marginTop: '4px' }}>{errPass}</div>}
            </div>
            <div className="nota-aviso" style={{ marginBottom: '14px' }}>
              <span aria-hidden="true">ℹ️</span>
              <span>Tu cuenta queda <b>pendiente de aprobación</b> y sin acceso a datos hasta que un administrador te asigne sede, jornada y rol.</span>
            </div>
            <button type="submit" disabled={ocupado || !!errPass} className="btn btn-primary" style={{ width: '100%' }}>{ocupado ? 'Enviando…' : 'Enviar solicitud'}</button>
          </form>
        )}

        <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12px' }}>
          <button type="button" className="btn-enlace" onClick={abrirTerminos}>Términos, condiciones y política de privacidad</button>
        </div>
        <p className="login-foot">AuraCare Plataforma Médica · Fundación Construyendo Futuro © 2026</p>
      </div>
    </div>
  );
};
