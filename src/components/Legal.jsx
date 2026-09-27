export const CookieBanner = ({ onAceptar, onRechazar, abrirTerminos }) => (
  <div className="cookie-banner" role="dialog" aria-label="Aviso de almacenamiento local">
    <div className="cookie-txt">
      <b>Almacenamiento técnico:</b> AuraCare guarda en tu navegador únicamente lo necesario para mantener tu sesión segura y recordar esta preferencia. No usamos cookies de terceros ni rastreo comercial. Consulta los <a onClick={abrirTerminos}>Términos, Condiciones y Política de Privacidad</a> (Ley 1581 de 2012).
    </div>
    <div className="cookie-btns">
      <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={onRechazar}>Solo necesarias</button>
      <button className="btn btn-primary" onClick={onAceptar}>Entendido</button>
    </div>
  </div>
);

/* TEXTO PROVISIONAL: debe ser revisado por asesoría jurídica de la Fundación antes de operar con datos reales. */
export const ModalLegal = ({ cerrar }) => (
  <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
    <div className="modal" role="dialog" aria-label="Términos, condiciones y tratamiento de datos">
      <h3>Términos, Condiciones y Tratamiento de Datos (Ley 1581 / Res. 1995)</h3>
      <p className="sub">Marco de confidencialidad médica y protección de datos para la Fundación Construyendo Futuro.</p>
      <div className="legal-box">
        <h4>1. Datos sensibles de salud (Ley 1581 de 2012)</h4>
        <p>La información de historias clínicas, diagnósticos y signos vitales es <b>DATO SENSIBLE DE SALUD</b>. Solo puede consultarla personal autorizado de la sede correspondiente, para el cuidado de la persona mayor y las obligaciones de vigilancia de la SDIS.</p>
        <h4>2. Integridad de los registros (Resolución 1995 de 1999)</h4>
        <p>Las notas clínicas se guardan con fecha, hora y autor asignados por el servidor y un sello SHA-256 encadenado. Desde la aplicación no pueden editarse ni eliminarse; las correcciones se registran como una nota nueva. El administrador puede verificar la integridad de la cadena en cualquier momento.</p>
        <h4>3. Seguridad y trazabilidad</h4>
        <p>El acceso requiere cuenta personal aprobada. Los cambios de permisos, altas de personas mayores y consultas de fichas clínicas quedan en un registro de auditoría. La conexión viaja cifrada (TLS) y los datos se almacenan cifrados en reposo por el proveedor de infraestructura.</p>
        <h4>4. Deber de reserva</h4>
        <p>Cada usuario es responsable de su contraseña, de cerrar sesión en equipos compartidos y de no divulgar información de las personas mayores. La sesión se cierra automáticamente tras un periodo de inactividad.</p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-primary" onClick={cerrar}>Entendido</button>
      </div>
    </div>
  </div>
);
