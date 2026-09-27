import { useState } from 'react';
import { Logo, useAccion } from './ui.jsx';

// Mínimo 10 caracteres con letras y números
export const errorPassword = (p) => {
  if (p.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Debe combinar letras y números.';
  return null;
};

export const Login = ({ onLogin, onSolicitarCuenta, abrirTerminos }) => {
  const [tab, setTab] = useState('login');
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
        <Logo />
        <h1>Registro de Cuidado y Notaría Médica</h1>
        <p className="sub">Acceso restringido a personal autorizado · Registros con trazabilidad · Ley 1581 / SDIS.</p>

        <div className="auth-tabs">
          <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Iniciar Sesión</button>
          <button type="button" className={tab === 'solicitud' ? 'active' : ''} onClick={() => setTab('solicitud')}>Solicitar Acceso</button>
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
            <button type="submit" disabled={ocupado} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>{ocupado ? 'Verificando…' : 'Ingresar al Sistema'}</button>
          </form>
        ) : (
          <form onSubmit={submitSolicitud}>
            <div className="field">
              <label htmlFor="reg-nombre">Nombres y Apellidos Completos</label>
              <input id="reg-nombre" required maxLength={80} autoComplete="name" value={nombreReg} onChange={(e) => setNombreReg(e.target.value)} placeholder="Ej: Patricia Gómez" />
            </div>
            <div className="field">
              <label htmlFor="reg-email">Correo institucional</label>
              <input id="reg-email" type="email" required autoComplete="email" value={emailReg} onChange={(e) => setEmailReg(e.target.value)} placeholder="patricia.gomez@construyendofuturo.org.co" />
            </div>
            <div className="field">
              <label htmlFor="reg-pass">Contraseña (mín. 10 caracteres, letras y números)</label>
              <input id="reg-pass" type="password" required autoComplete="new-password" value={passReg} onChange={(e) => setPassReg(e.target.value)} placeholder="Cree su contraseña personal" />
              {errPass && <div style={{ color: 'var(--alerta)', fontSize: '12px', marginTop: '4px' }}>{errPass}</div>}
            </div>
            <div className="nota-aviso" style={{ marginBottom: '14px' }}>
              <span aria-hidden="true">ℹ️</span>
              <span>Por seguridad, su cuenta queda <b>Pendiente de Aprobación</b> y sin acceso a datos hasta que un Administrador le asigne Sede, Jornada y Rol.</span>
            </div>
            <button type="submit" disabled={ocupado || !!errPass} className="btn btn-primary" style={{ width: '100%' }}>{ocupado ? 'Enviando…' : 'Enviar Solicitud de Registro'}</button>
          </form>
        )}

        <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12px' }}>
          <a style={{ color: 'var(--tinta)', cursor: 'pointer', textDecoration: 'underline' }} onClick={abrirTerminos}>Ver Términos, Condiciones y Política de Privacidad</a>
        </div>
        <p className="login-foot">AuraCare Plataforma Médica · Fundación Construyendo Futuro © 2026</p>
      </div>
    </div>
  );
};
