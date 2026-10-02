# AuraCare — Arquitectura (v4.0)

## Visión general

```
Navegador (React 18, bundle estático en GitHub Pages)
   │  HTTPS + JWT (Supabase Auth)
   ▼
Supabase: PostgREST · Auth · Realtime
   │
   ▼
Postgres: tablas públicas con RLS · esquema `private` (helpers) · triggers de servidor
```

- **Frontend**: React 18 empaquetado con esbuild (`npm run build` → `src/dist`). Sin CDN, sin Babel en el navegador. CSP estricta.
- **Backend**: Supabase (proyecto `auracare`, región us-east-1). No hay servidor propio: las reglas de negocio críticas viven en Postgres.
- **Despliegue**: GitHub Pages sirve `src/` (la raíz redirige a `src/index.html`).

## Modelo de datos (schema `public`)

| Tabla | Propósito | Escritura |
|---|---|---|
| `perfiles` | Rol, sede, jornada y estado del usuario (1:1 con `auth.users`) | Solo SuperAdmin (rol/sede/jornada/estado); cada usuario su nombre |
| `sedes`, `config_sedes` | Unidades operativas y parámetros clínicos | SuperAdmin / Admin de sede |
| `residentes` | Personas mayores (estado activo/egresado, rangos personalizados) | SuperAdmin, Admin sede/turno; Médico edita |
| `notas` | Bitácora clínica **inmutable** con hash encadenado | Auxiliar, Médico, SuperAdmin (solo INSERT) |
| `alertas` | Generadas por trigger al guardar una nota | Solo se marcan "atendida" |
| `asistencias`, `actividades` | Sección 5 SDIS (solo del día) | Auxiliar, Admin, SuperAdmin |
| `entregas`, `pertenencias` | Dotación (con límites) y custodia | Auxiliar, Admin, SuperAdmin |
| `entregas_turno` | Acta de entrega de turno (inmutable) | Roles operativos, médico y profesional |
| `recepciones_turno` | Firma "Recibí turno" sobre un acta (inmutable, una por persona y acta) | Roles operativos, médico y profesional |
| `rangos_clinicos`, `elementos_dotacion` | Fuente única de verdad de umbrales y reglas | Solo SuperAdmin |
| `auditoria` | Registro append-only | Triggers + inserción de lecturas por el cliente |

Esquema `private`: `rol()`, `tiene_rol()`, `puede_sede()`, `hash_nota()`, `estado_signo()`, `validar_signos()` y las funciones de trigger. No está expuesto por la API REST.

## Decisiones importantes

1. **Sellado en servidor (no en el cliente).** El trigger `notas_antes_insert` asigna `id`, `autor`, `fecha`, `hora`, `jornada` (hora de Bogotá), `seq` por sede y `hash = SHA-256(prev_hash | id | sede | seq | persona | tipo | fecha | hora | descripción | signos | autor | timestamp)`. Un advisory lock por sede serializa la cadena. `verificar_cadena_notas(sede)` recalcula todo; una alteración directa en la BD se detecta (probado).
2. **Sin cifrado E2EE.** La versión 3.x lo anunciaba pero no era real (la clave salía de la contraseña, el texto plano se guardaba igual y nunca se descifraba). Se retiró. La protección real es: TLS, cifrado en reposo del proveedor, RLS y auditoría. Un E2EE verdadero impediría búsqueda, impresión SDIS y recuperación de claves; no se justifica hoy.
3. **Registro de usuarios por aprobación.** Cualquiera puede solicitar acceso; el trigger crea el perfil siempre como `pendiente/auxiliar`. Sin aprobación de un SuperAdmin, RLS no devuelve nada. Nadie comparte ni ve contraseñas.
4. **Jornada = centro elegido, no bloqueante.** La app tiene un interruptor Centro Día / Centro Noche que por defecto sigue la hora de Bogotá; la jornada elegida se envía y el servidor la valida (si falta, usa la hora). Se registra en cada nota, acta y recibo (no forma parte del hash de la nota); si un usuario está fuera de su jornada autorizada ve un aviso. No se bloquea porque impedir documentar un evento clínico por 5 minutos de turno es más riesgoso que el aviso. Puede endurecerse en RLS si la Fundación lo exige.
5. **Rangos en tabla, no en código.** Cliente y servidor leen `rangos_clinicos`; cada residente puede tener overrides. Los valores actuales son la referencia de la Fundación y **requieren validación médica**.
6. **Confirmación real de guardado.** Todas las escrituras esperan la respuesta de la BD antes de mostrar "✓"; en error se muestra el motivo. El borrador de una nota vive en `sessionStorage` para no perderlo ante un corte.

## Pruebas

- `tests/clinico.test.mjs`: umbrales, overrides por residente, límites de dotación, fecha/jornada en hora de Bogotá, permisos por rol, importación CSV/Excel.
- `tests/smoke.test.mjs`: renderiza las 20 pantallas con datos de ejemplo y verifica que no se afirme E2EE ni se muestre un hash falso.
- Pruebas de triggers en BD (ejecutadas en una transacción con rollback contra el proyecto real): alta→perfil pendiente, sellado y encadenado, alertas, inmutabilidad, validación de signos, límites de dotación, asistencia solo del día, atención de alertas, devolución de pertenencias, entrega de turno y **detección de alteración directa**.

## Limitaciones conocidas

1. **Sin modo offline completo.** Hay aviso de desconexión y borrador de nota; una cola de escrituras offline queda pendiente.
2. **Sin módulo de medicación (MAR), alergias ni contactos familiares/EPS.** Los tipos de nota "administración de medicamento" existen, pero no hay control de dosis/horarios.
3. **Rangos clínicos sin validar por un médico.** Los mismos umbrales aplican a todos salvo overrides individuales.
4. **Textos legales provisionales.** Revisar con asesoría jurídica antes de operar con datos reales.
5. **Sin verificación de correo/MFA por defecto.** Ver `docs/OPERACION.md` para las opciones de Supabase Auth.
6. **Plan gratuito de Supabase**: pausa el proyecto tras 1 semana de inactividad y no incluye respaldos. Para producción con datos de pacientes se requiere plan Pro.
7. **Encabezados HTTP de seguridad** (frame-ancestors, HSTS) no configurables en GitHub Pages; la CSP se aplica por `<meta>`.

## Roadmap sugerido

- v4.1: cola offline, MAR (medicación), alergias/contactos, MFA para SuperAdmin.
- v4.2: reportes mensuales SDIS, exportación auditada, notificaciones push.
- Infra: dominio propio + hosting con encabezados de seguridad, respaldo diario y monitoreo.
