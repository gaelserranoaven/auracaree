# AuraCare 🏥

Plataforma de registro de cuidado para centros de protección de persona mayor (Bogotá · SDIS · Ley 1581 · Res. 1995).
Versión **4.0** — React + Supabase (Auth, Postgres, RLS, Realtime).

## Qué hace

- **Notas clínicas selladas**: fecha, hora y autor los asigna el servidor; cada nota lleva un hash SHA-256 encadenado por sede. No se pueden editar ni borrar; la integridad se verifica desde la app (Registro SDIS → *Verificar integridad*).
- **Signos vitales y alertas automáticas** con rangos configurables (generales y por persona, p. ej. EPOC).
- **Formatos SDIS** FOR-PSS-729: asistencia (Sección 5), dotación (Sección 1), pertenencias en custodia (Sección 4) y novedades de salud (Sección 6) imprimibles a PDF.
- **Entrega de turno** firmada y persistente, con historial.
- **Multi-sede y roles** (6 roles) aplicados en la base de datos con RLS, no solo en la interfaz.
- **Auditoría** de consultas a fichas, cambios de permisos y configuración.
- **Tiempo real** entre usuarios de la misma sede.

## Arranque rápido

```bash
npm install
npm run build          # genera src/dist (se versiona: GitHub Pages sirve estáticos)
npx http-server -p 8000   # o cualquier servidor estático
# abrir http://localhost:8000/src/
npm test               # 17 pruebas (reglas clínicas, fechas, dotación, importación, render de todas las pantallas)
npm run dev            # build en modo watch
```

## Estructura

```
src/
  index.html, main.jsx, App.jsx, styles.css
  components/   pantallas (Dashboard, Ficha, NuevaNota, Asistencia, Dotacion, RegistroSdis, ...)
  lib/          supabase.js · api.js (todas las llamadas) · clinico.js (roles y reglas) · util.js (fechas Bogotá) · importar.js
  dist/         bundle generado (react + supabase locales, sin CDN ni Babel en el navegador)
supabase/migrations/   SQL versionado (01–03 aplicadas; 04 y 05 según docs/OPERACION.md)
tests/                 node:test — reglas clínicas + render de pantallas
docs/                  CHANGELOG, OPERACION (guía de puesta en producción), versiones
```

## Seguridad en una mirada

| Capa | Mecanismo |
|---|---|
| Identidad | Supabase Auth (email + contraseña, sesión JWT, cierre por inactividad de 20 min) |
| Autorización | RLS por rol y sede en todas las tablas; `anon` sin acceso a datos |
| Notas | Trigger de servidor sella y encadena; UPDATE/DELETE/TRUNCATE bloqueados |
| Alertas y límites de dotación | Calculados/validados en triggers (no confiables desde el cliente) |
| Auditoría | Tabla append-only con consultas de fichas y cambios sensibles |
| Cliente | CSP estricta (`script-src 'self'`), sin `eval`, sin HTML dinámico |

La clave `sb_publishable_…` del código es pública por diseño; sin sesión aprobada no da acceso a nada (una vez aplicada la migración 04).

## Documentación

- [`docs/OPERACION.md`](docs/OPERACION.md) — checklist de puesta en producción, alta de usuarios, respaldo
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitectura, modelo de datos y decisiones
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — historial de versiones

## Pendiente conocido

Ver "Limitaciones conocidas" en `ARCHITECTURE.md` (medicación/MAR, modo offline completo, validación médica de rangos, revisión jurídica de textos legales).

**Mantenedor:** Gael (7mo Ingeniería) · **Cliente:** Fundación Construyendo Futuro
