import { Modal } from './ui.jsx';

/* Textos legales: la versión completa vive en las páginas públicas (../privacidad.html y ../terminos.html), que se
   leen sin iniciar sesión. Aquí solo va un resumen fiel con enlaces, para que haya una sola versión del texto.
   Se abren en otra pestaña para no perder una nota a medio escribir. Borrador pendiente de revisión jurídica. */
export const URL_PRIVACIDAD = '../privacidad.html';
export const URL_TERMINOS = '../terminos.html';

/* Aviso informativo, no de consentimiento: todo lo que guarda la app es necesario para funcionar (sesión, cierre por
   inactividad, jornada elegida, este aviso y el borrador de la nota). No hay nada opcional que aceptar o rechazar,
   así que no se ofrece una elección que no cambiaría nada. Inventario completo: privacidad.html#navegador. */
export const CookieBanner = ({ onAceptar }) => (
  <div className="cookie-banner" role="region" aria-label="Aviso de almacenamiento en tu navegador">
    <div className="cookie-txt">
      <b>Almacenamiento en tu navegador:</b> AuraCare guarda solo lo necesario para funcionar: tu sesión, la hora de tu última actividad (para cerrarla tras 20 minutos sin uso), la jornada si la eliges a mano y, mientras escribes, el borrador de la nota en esta pestaña. No usamos cookies de terceros, publicidad ni analítica. Detalle en la{' '}
      <a href={URL_PRIVACIDAD + '#navegador'} target="_blank" rel="noopener">política de privacidad</a>.
    </div>
    <div className="cookie-btns">
      <button type="button" className="btn btn-primary" onClick={onAceptar}>Entendido</button>
    </div>
  </div>
);

export const ModalLegal = ({ cerrar }) => (
  <Modal titulo="Privacidad y términos de uso" cerrar={cerrar}
    sub="Resumen. El texto completo está en las páginas públicas, en borrador pendiente de revisión jurídica.">
      <div className="legal-box">
        <h4>Datos de salud</h4>
        <p>La información de salud de las personas mayores es dato sensible (Ley 1581 de 2012). Solo la ve el personal autorizado de cada sede, para su cuidado y las obligaciones del centro. El centro es el Responsable de esos datos; AuraCare los trata por su cuenta y no los usa para nada más.</p>
        <h4>Registros que no se editan ni se borran</h4>
        <p>Las notas, las actas y las firmas de turno llevan fecha, hora y autor asignados por el servidor y un sello SHA-256 encadenado (Resolución 1995 de 1999). Las correcciones se registran como una nota nueva.</p>
        <h4>Tu cuenta</h4>
        <p>Es personal e intransferible: lo que se registra con ella queda a tu nombre. Cierra sesión en equipos compartidos; la sesión se cierra sola tras 20 minutos sin uso. Los cambios de permisos, las altas y la apertura de fichas quedan en un registro de auditoría.</p>
        <h4>Tus derechos</h4>
        <p>Puedes conocer, actualizar y rectificar tus datos, y hacer consultas o reclamos escribiendo a gael.serranoaven@gmail.com. Los plazos y el procedimiento están en la política de privacidad.</p>
      </div>
      <div className="modal-foot">
        <a className="btn btn-ghost" href={URL_PRIVACIDAD} target="_blank" rel="noopener">Política de privacidad</a>
        <a className="btn btn-ghost" href={URL_TERMINOS} target="_blank" rel="noopener">Términos de uso</a>
        <button type="button" className="btn btn-primary" onClick={cerrar}>Entendido</button>
      </div>
  </Modal>
);
