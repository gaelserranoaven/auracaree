# AuraCare

Plataforma de registro de cuidado para centros de protección de persona mayor (Bogotá · SDIS · Ley 1581 · Res. 1995).
Versión **4.0** — React + Supabase (Auth, Postgres, RLS, Realtime). Piloto activo desde el 2026-09-28.

## Qué hace

- **Notas clínicas selladas**: fecha, hora y autor los asigna el servidor; cada nota lleva un hash SHA-256 encadenado por sede. No se pueden editar ni borrar; la integridad se verifica desde la app (Registro SDIS → *Verificar integridad*).
- **Signos vitales y alertas automáticas** con rangos configurables (generales y por persona, p. ej. EPOC).
- **Formatos SDIS** FOR-PSS-729: asistencia (Sección 5), dotación (Sección 1), pertenencias en custodia (Sección 4) y novedades de salud (Sección 6) imprimibles a PDF.
- **Entrega y recibo de turno** firmados y persistentes, con historial.
- **Multi-sede y roles** (6 roles) aplicados en la base de datos con RLS, no solo en la interfaz.
- **Auditoría** de consultas a fichas, cambios de permisos y configuración.
- **Tiempo real** entre usuarios de la misma sede.

## Arranque rápido

```bash
npm install
npm run build          # genera src/dist (se versiona: GitHub Pages sirve estáticos)
npx http-server -p 8000   # o cualquier servidor estático
# abrir http://localhost:8000/src/
npm test               # 29 pruebas (reglas clínicas, render de todas las pantallas, indexación, sitio publicado)
npm run dev            # build en modo watch
npm run sitio          # arma _site/ con lo que publica GitHub Pages (lista permitida)
```

## Estructura

```
index.html, landing.css   landing pública (estática, sin JavaScript)
src/
  index.html, main.jsx, App.jsx, styles.css
  components/   pantallas (Dashboard, Ficha, NuevaNota, Asistencia, Dotacion, RegistroSdis, ...)
  lib/          supabase.js · api.js (todas las llamadas) · clinico.js (roles y reglas) · util.js (fechas Bogotá) · importar.js
  dist/         bundle generado (react + supabase locales, sin CDN ni Babel en el navegador)
supabase/
  migrations/   SQL versionado 01–07 (todas aplicadas en el piloto)
  functions/    Edge Function crear-usuario
tests/          node:test: reglas clínicas, render de pantallas, guardias de indexación y del sitio publicado
tools/          armar-sitio.mjs (lista de archivos que publica GitHub Pages)
.github/        workflow de publicación en GitHub Pages
docs/           CHANGELOG, OPERACION (guía de puesta en producción), MOBILE-Y-PRIVACIDAD (pre-lanzamiento), versiones históricas
```

## Publicación

GitHub Pages publica desde el workflow `.github/workflows/pages.yml` (Source: *GitHub Actions*). Solo se sirve la lista permitida de `tools/armar-sitio.mjs`: la landing, las páginas públicas, `src/index.html` y `src/dist/`. La documentación, las migraciones, las pruebas y el código fuente no se publican en el sitio (el repositorio es público, así que siguen visibles en GitHub).

## Seguridad en una mirada

| Capa | Mecanismo |
|---|---|
| Identidad | Supabase Auth (email + contraseña, sesión JWT, cierre por inactividad de 20 min con aviso de 60 s) |
| Autorización | RLS por rol y sede en todas las tablas; `anon` sin acceso a datos |
| Notas | Trigger de servidor sella y encadena; UPDATE/DELETE/TRUNCATE bloqueados |
| Alertas y límites de dotación | Calculados/validados en triggers (no confiables desde el cliente) |
| Auditoría | Tabla append-only con consultas de fichas y cambios sensibles |
| Cliente | CSP estricta (`script-src 'self'`), sin `eval`, sin HTML dinámico, `noindex` y cero analítica |

La clave `sb_publishable_…` del código es pública por diseño; sin sesión aprobada no da acceso a nada.

## Documentación

- [`docs/OPERACION.md`](docs/OPERACION.md) — checklist de puesta en producción, alta de usuarios, respaldo
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitectura, modelo de datos y decisiones
- [`docs/MOBILE-Y-PRIVACIDAD.md`](docs/MOBILE-Y-PRIVACIDAD.md) — plan de pre-lanzamiento, privacidad y móvil
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — historial de versiones
- `docs/versions/` — notas de versiones anteriores a la v4.0 (históricas)

## Pendiente conocido

Ver "Limitaciones conocidas" en `ARCHITECTURE.md` (medicación/MAR, modo offline completo, validación médica de rangos, revisión jurídica de textos legales).

**Mantenedor:** Gael (7mo Ingeniería) · **Cliente:** Fundación Construyendo Futuro
