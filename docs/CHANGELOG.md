# AuraCare - Complete Changelog

## [v3.4.1] - 2026-09-16

### Added
- Persistencia real de datos vía Supabase (Postgres): sedes, residentes, notas, alertas, asistencias, actividades, entregas, pertenencias y usuarios ya no se pierden al recargar.
- Autenticación con contraseñas hasheadas (bcrypt) mediante función RPC `login_usuario`, en vez de comparación en texto plano en el cliente.
- Campo de contraseña en el formulario de autoregistro y en la invitación de usuarios desde Administración (antes las cuentas creadas por esos flujos no podían iniciar sesión: bug corregido).

### Fixed
- Se eliminó `USUARIOS_BD` y el resto de datos de ejemplo hardcodeados que exponían contraseñas en texto plano dentro del bundle JS enviado al navegador.
- El campo de contraseña del login ya no precarga un valor por defecto que causaba "contraseña incorrecta" al primer intento.
- Se eliminaron `src/main.js` y `src/styles.css`, archivos huérfanos que la documentación describía como el JS/CSS reales pero que `index.html` nunca referenciaba.

### Known Issues
- Las políticas RLS de las tablas operativas son abiertas (nivel demo) — pendiente Supabase Auth + RLS por rol antes de producción.

## [v3.4] - 2026-08-17

### Added
- Streamlined dashboard interface
- Enhanced CSS styling system
- Improved form validation UI
- Better accessibility features
- Optimized layout for larger displays

### Fixed
- Navigation consistency issues
- CSS media query improvements
- Form field responsiveness

### Known Issues
- Local storage only (no persistence between sessions)
- Single-user interface

---

## [v3.3.1] - 2026-08-10

### Fixed
- Minor UI bugs from v3.3
- CSS refinements

---

## [v3.3] - 2026-08-01

### Added
- New dashboard layout
- Enhanced data visualization
- Improved form styling

---

## [v3.2] - 2026-07-15

### Added
- Core dashboard functionality
- Patient management interface
- Basic scheduling module

---

## [v3.1] - 2026-07-01

### Added
- Initial platform structure
- Navigation framework

---

## [v3.0] - 2026-06-15

### Added
- Foundation release
- Basic HTML structure

---

**Note:** Detailed feature documentation available in `docs/versions/` directory.
