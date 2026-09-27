# AuraCare - Complete Changelog

## [v4.0.0] - 2026-09-26

### Seguridad
- Autenticación con **Supabase Auth** (JWT) en lugar del login por RPC propio; las cuentas nuevas quedan `pendiente` hasta que un SuperAdmin asigna rol, sede y jornada.
- **RLS por rol y sede** en todas las tablas (migración 04, ver `docs/OPERACION.md`); `anon` sin acceso; cierre de sesión por inactividad (20 min).
- Notas clínicas **selladas en el servidor** con hash SHA-256 encadenado por sede, inmutables (UPDATE/DELETE/TRUNCATE bloqueados) y verificables desde la app.
- Alertas, límites de dotación y validación de signos vitales se calculan en triggers de servidor.
- **Auditoría** de consultas a fichas, cambios de permisos, altas y configuración.
- Bundle local (React + Supabase) con **CSP estricta**: sin CDN, sin Babel en el navegador, sin `unsafe-eval`.
- Contraseñas: mínimo 10 caracteres con letras y números; cambio de contraseña desde el perfil; ya no existen contraseñas temporales compartidas.

### Corregido
- Se retiraron los claims falsos de "cifrado E2EE" e "inalterable" (no eran reales en 3.x).
- Fecha/hora en zona horaria de Bogotá (antes UTC: el día cambiaba a las 7 pm, en plena jornada noche).
- La jornada se deriva de la hora, no de un botón manual.
- Guardado con confirmación real: la UI ya no muestra "✓" cuando la BD falló.
- La firma de entrega de turno ahora persiste; el autor de dotación ya no está fijo en el código.
- Sparklines y último valor de signos reflejan las notas reales (antes no se actualizaban).
- Campo de escala de dolor (existía el interruptor pero no el campo).

### Añadido
- Egreso/reingreso y edición de personas mayores; rangos de alerta personalizados por persona (indicación médica).
- Devolución de pertenencias; lencería y observaciones al registrar custodia.
- Límites de dotación (por persona/mes y por unidad/mes) validados en cliente y servidor.
- Participación por actividad e impresión de actividades en la Sección 5.
- Registro SDIS por fecha y botón **Verificar integridad**.
- Historial de entregas de turno y resumen de turno.
- Tiempo real entre usuarios, aviso de desconexión, borrador de nota recuperable.
- Importación de Excel/CSV con validación de duplicados (`read-excel-file` en lugar de `xlsx` 0.18.5, con CVEs conocidos).
- 17 pruebas automatizadas y migraciones SQL versionadas.

### Retirado
- Carpeta `versions-historic/` (contenía credenciales en texto plano).
- Tabla `usuarios` y RPCs de login propio (migración 05, pendiente de aplicar).

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
