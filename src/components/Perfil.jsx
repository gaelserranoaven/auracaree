import { useEffect, useState } from 'react';
import { useApp, useAccion } from './ui.jsx';
import { errorPassword } from './Login.jsx';

export const PerfilUsuario = ({ usuario, rol, sede, onLogout, onActualizarNombre, onCambiarPassword }) => {
  const { avisar } = useApp();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [ocupado, ejecutar] = useAccion();
  useEffect(() => setNombre(usuario.nombre), [usuario.id, usuario.nombre]);

  const guardarNombre = () => ejecutar(async () => { await onActualizarNombre(nombre.trim()); avisar('Nombre actualizado ✓'); });
  const errP = p1 ? errorPassword(p1) : null;
  const cambiarPass = () => ejecutar(async () => {
    if (errorPassword(p1)) return;
    if (p1 !== p2) { avisar('Las contraseñas no coinciden.'); return; }
    await onCambiarPassword(p1);
    setP1(''); setP2('');
    avisar('Contraseña actualizada ✓');
  });

  const jornadaTxt = usuario.jornadaPermitida === 'ambos' ? '☀ Día y ☾ Noche' : usuario.jornadaPermitida === 'dia' ? '☀ Exclusivo Turno Día' : '☾ Exclusivo Turno Noche';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '740px' }}>
      <div className="panel">
        <div className="panel-head"><h3>Perfil del Profesional</h3></div>
        <div className="panel-body">
          <div className="ficha-head">
            <div className="avatar-xl" aria-hidden="true">{usuario.nombre[0]}</div>
            <div>
              <h2>{usuario.nombre}</h2>
              <div className="meta">{usuario.email} · {rol.nombre}</div>
            </div>
          </div>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="perfil-nombre">Nombre mostrado</label>
              <input id="perfil-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength="80" />
            </div>
            <div className="field"><label>Unidad Operativa Asignada</label><input value={sede ? sede.nombre : '—'} disabled style={{ background: 'var(--superficie-3)' }} /></div>
            <div className="field"><label>Horario Autorizado</label><input value={jornadaTxt} disabled style={{ background: 'var(--superficie-3)' }} /></div>
          </div>
          <div className="form-foot">
            <button className="btn btn-primary" disabled={ocupado || !nombre.trim() || nombre.trim() === usuario.nombre} onClick={guardarNombre}>Guardar Nombre</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Cambiar contraseña</h3></div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="pass-nueva">Nueva contraseña</label>
              <input id="pass-nueva" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
              {errP && <div style={{ color: 'var(--alerta-t)', fontSize: '12px', marginTop: '4px' }}>{errP}</div>}
            </div>
            <div className="field">
              <label htmlFor="pass-rep">Repetir contraseña</label>
              <input id="pass-rep" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
            </div>
          </div>
          <div className="form-foot">
            <button className="btn btn-tinta" disabled={ocupado || !p1 || !!errP || p1 !== p2} onClick={cambiarPass}>Actualizar contraseña</button>
            <button className="btn btn-peligro" onClick={onLogout}>🚪 Cerrar Sesión Segura</button>
          </div>
        </div>
      </div>
    </div>
  );
};
