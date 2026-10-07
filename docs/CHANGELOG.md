# AuraCare - Complete Changelog

## [Sin publicar]

### Cambiado
- **Accesibilidad (revisión HIG)**: la pestaña activa del celular ya no depende solo del color; el anillo de foco y el badge de cifrado cumplen contraste; los textos de 10 a 10.5 px suben a 11 o 12 px.
- **Un color, un significado**: el azul `#1F4BE8` de la presentación es el acento de marca (botones primarios, selección, pestaña y menú activos, foco). El verde queda solo para estado: signos en rango, sello e integridad de la cadena.
- Los avisos de error y alerta quedan en pantalla hasta cerrarlos. Las confirmaciones usan diálogos propios con verbos específicos en lugar del `confirm` del navegador.
- **Celular, revisión con capturas reales**: la cabecera pasa de unos 270 px a unos 150 (logo y sede en una fila; perfil y salir quedan en Más), los indicadores del panel van en 2×2 y las alertas activas suben sobre la entrega de turno y las notas.
- **Estado clínico a la vista**: las tarjetas de Personas mayores muestran "Alerta crítica" o "En vigilancia" (con símbolo, texto y borde). El nombre y el cargo de quien tiene la sesión se ven en la barra superior (escritorio) y en la hoja Más (celular). "Cerrar sesión" se mantiene en rojo a propósito, para que se use con cuidado.
- **Selector de sede**: el nombre largo baja a 2 líneas en vez de cortarse; si tiene más de 20 caracteres, en el celular el selector pasa a su propia fila a todo el ancho. La barra superior del celular ya no repite el nombre de la sede. Con una cantidad impar de indicadores, el último ocupa todo el ancho.
- **Celular, página más ancha que la pantalla (Usuarios y Dotación)**: un correo largo en una tarjeta de usuario, o un selector con nombres largos, ensanchaba toda la página (~500 px en una pantalla de 390) y Safari reducía el zoom, dejando el encabezado más corto que el contenido. Las columnas de grid ahora pueden encogerse (`minmax(0, 1fr)`). Se revisaron las 12 pantallas a 360 y 390 px sin desborde.
- La hora de compilación aparece abajo en el menú Más del celular, y las URL de `dist/` llevan una versión para saltar la caché de GitHub Pages.
- **Nueva nota en el celular**: los signos vitales van en 2 columnas con el estado (en rango, vigilancia, crítico) debajo de cada campo, los rangos de referencia quedan plegados (abiertos en escritorio) y el botón "Guardar y sellar nota" queda fijo sobre la barra inferior. Si falta algo para guardar, el formulario lo dice (por ejemplo "Falta la descripción: 10 caracteres más"). Los botones primarios deshabilitados se ven grises y legibles en toda la app, y "Guardar rangos" ya no dice "0 cambio(s)".
- **Asistencia en el celular**: cada persona va en su bloque, con el nombre y la cédula arriba y "Firma / No firma" a todo el ancho debajo (44 px de alto); el motivo de "No firma" ocupa su propia línea. El encabezado muestra cuántas personas ya están registradas ("6 de 8 registradas"). "Firma" va en verde (positivo) y "No firma" en rojo (negativo). Los botones de exportar PDF usan un ícono en vez del carácter ⬇, que iOS dibuja como emoji.
- Sesión: aviso de 60 s antes del cierre por inactividad, que conserva el borrador de la nota; salir con una nota sin guardar pide confirmación.

### Añadido
- **Centro Día / Centro Noche**: el indicador de jornada de la barra superior ahora es un interruptor real. Por defecto sigue la hora de Bogotá; si se cambia a mano, vale en ese equipo hasta el próximo cambio de jornada (06:00 o 18:00).
- Tema visual **Centro Noche** (paleta oscura en toda la app; el formato SDIS se mantiene en blanco como el papel) y animación de cielo al cambiar: el sol se oculta y sale la luna, o al revés. Se omite con "reducir movimiento".
- **El centro elegido es la jornada registrada**: notas, actas y recibos quedan en Centro Día o Centro Noche según el interruptor (el servidor valida el valor; si no llega, usa la hora de Bogotá).
- **Recibir turno**: quien llega lee el acta pendiente y firma "Recibí turno", con observaciones opcionales; varias personas pueden firmar la misma acta y cada acta muestra quién la recibió. No se puede recibir un turno propio.
- **Entregar turno**: selector de jornada en el acta (para el turno noche que entrega pasadas las 06:00), cargo de quien firma y conteo de novedades de convivencia.
- **Rol Profesional Psicosocial**: entrega turno sobre sucesos con los usuarios, convivencia y novedades del servicio; registra notas (sin signos vitales), asistencia y actividades.
- Nuevo tipo de nota **Convivencia** (discusiones, conflictos entre usuarios).

- **Agregar usuario** (SuperAdmin): crea la cuenta ya activa con rol, sede y jornada, sin esperar la solicitud. Se muestra una clave temporal una sola vez y el primer ingreso obliga a crear una contraseña personal (Edge Function `crear-usuario`).
- **Suspender / reactivar sede** (SuperAdmin), con motivo. Las sedes nunca se eliminan: la base de datos lo bloquea y toda su información queda para auditoría.

### Cambiado
- **Gestión de usuarios** rediseñada: tarjetas con avatar, color por rol, estado, búsqueda y filtro por rol; los cambios de rol/sede/jornada se hacen en "Editar acceso" con etiquetas visibles y se guardan juntos (antes cada lista guardaba al instante). Las solicitudes pueden aprobarse o rechazarse.
- **Sin emojis**: avisos, recuadros y botones usan íconos de Phosphor (una sola familia, que también reemplaza los íconos dibujados a mano del menú). Los avisos tienen tipo (éxito, error, alerta, información, sello) y su ícono.
- Sin guiones largos en el texto visible, incluido el formato SDIS (casillas de jornada como [X] / [ ]).
- Migración `07_sedes_suspender_y_clave_temporal.sql`.
- Migración `06_centro_turnos_profesional.sql` (rol, tipo de nota, jornada elegida, tabla `recepciones_turno`, RLS).

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
