# AuraCare

Plataforma de registro de cuidado para centros de protección de persona mayor (Bogotá · SDIS · Ley 1581 · Res. 1995).
Versión **4.0** — React + Supabase (Auth, Postgres, RLS, Realtime). Piloto activo desde el 2026-09-28.

## Qué hace

- **Notas clínicas selladas**: fecha, hora y autor los asigna el servidor; cada nota lleva un hash SHA-256 encadenado por sede. No se pueden editar ni borrar desde la aplicación; la integridad se verifica desde la app (Registro SDIS → *Verificar integridad*).
- **Signos vitales y alertas automáticas** con rangos configurables (generales y por persona, p. ej. EPOC).
- **Formatos SDIS** FOR-PSS-729: asistencia (Sección 5) y novedades de salud (Sección 6) imprimibles a PDF. La dotación (Sección 1) y las pertenencias en custodia (Sección 4) se registran, pero todavía no tienen formato de impresión.
- **Entrega y recibo de turno** firmados y persistentes, con historial.
- **Multi-sede y roles** (7 roles) aplicados en la base de datos con RLS, no solo en la interfaz.
- **Auditoría** de cambios de permisos, altas y configuración (por trigger en la base) y de apertura de fichas e impresión de la Sección 6 (las registra la aplicación).
- **Tiempo real** entre usuarios de la misma sede.

## Arranque rápido

```bash
npm install
npm run build          # genera src/dist (se versiona: GitHub Pages sirve estáticos)
npx http-server -p 8000   # o cualquier servidor estático
# abrir http://localhost:8000/src/
npm test               # 58 pruebas (reglas clínicas, sesión, consultas, render de pantallas, indexación, enlaces, fuentes, textos legales, sitio publicado)
npm run dev            # build en modo watch
npm run build -- --analizar  # build + peso del bundle por paquete
npm run sitio          # arma _site/ con lo que publica GitHub Pages (lista permitida)
npm run iconos         # regenera icons/ y og/og-image.png (solo al cambiar la marca; usa sharp y Chrome)
npm run fuentes        # copia las fuentes de la landing a fonts/ y reúne las licencias (tras actualizar @fontsource)
```

## Estructura

```
index.html, landing.css   landing pública (estática, sin JavaScript)
privacidad.html, terminos.html   política de privacidad y términos de uso (públicos, en borrador)
404.html, robots.txt, sitemap.xml
icons/, og/               íconos (landing, app, PWA) e imagen para compartir
fonts/                    fuentes de la landing (Geist) y LICENCIAS.txt de todas las familias (OFL 1.1)
src/
  index.html, main.jsx, App.jsx, styles.css, fuentes.css (Sora e IBM Plex, locales)
  components/   pantallas (Dashboard, Ficha, NuevaNota, Asistencia, Dotacion, RegistroSdis, ...)
  lib/          supabase.js · api.js (todas las llamadas) · clinico.js (roles y reglas) · util.js (fechas Bogotá) · sesion.js (inactividad) · importar.js
  dist/         bundle generado (react + supabase locales, sin CDN ni Babel en el navegador)
supabase/
  migrations/   SQL versionado 01–07 (todas aplicadas en el piloto)
  functions/    Edge Function crear-usuario
tests/          node:test: reglas clínicas, render de pantallas, guardias de indexación y del sitio publicado
tools/          armar-sitio.mjs (lista que publica GitHub Pages) · iconos.mjs y og/ (íconos e imagen para compartir) · fuentes.mjs
.github/        workflow de publicación en GitHub Pages
docs/           CHANGELOG, OPERACION (guía de puesta en producción), MOBILE-Y-PRIVACIDAD (pre-lanzamiento), versiones históricas
```

## Publicación

GitHub Pages publica desde el workflow `.github/workflows/pages.yml` (Source: *GitHub Actions*). Solo se sirve la lista permitida de `tools/armar-sitio.mjs`: la landing, las páginas públicas, `src/index.html` y `src/dist/`. La documentación, las migraciones, las pruebas y el código fuente no se publican en el sitio (el repositorio es público, así que siguen visibles en GitHub).

## Seguridad en una mirada

| Capa | Mecanismo |
|---|---|
| Identidad | Supabase Auth (email + contraseña, sesión JWT, cierre por inactividad de 20 min con aviso de 60 s; el límite también se revisa al volver a abrir el navegador) |
| Autorización | RLS por rol y sede en todas las tablas; `anon` sin acceso a datos |
| Notas | Trigger de servidor sella y encadena; UPDATE/DELETE/TRUNCATE bloqueados |
| Alertas y límites de dotación | Calculados/validados en triggers (no confiables desde el cliente) |
| Auditoría | Tabla append-only con consultas de fichas y cambios sensibles |
| Cliente | CSP estricta (`script-src 'self'`, `font-src 'self'`), sin `eval`, sin HTML dinámico, `noindex`, cero analítica y sin peticiones a terceros fuera de Supabase (las fuentes se sirven desde el sitio) |

La clave `sb_publishable_…` del código es pública por diseño; sin sesión aprobada no da acceso a nada.

## Documentación

- [`docs/OPERACION.md`](docs/OPERACION.md) — checklist de puesta en producción, alta de usuarios, respaldo
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitectura, modelo de datos y decisiones
- [`docs/MOBILE-Y-PRIVACIDAD.md`](docs/MOBILE-Y-PRIVACIDAD.md) — plan de pre-lanzamiento, privacidad y móvil
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — historial de versiones
- [`docs/adr/`](docs/adr/) — decisiones de arquitectura desde el ADR-009 (las anteriores están en Obsidian)
- [`docs/rendimiento-linea-base.md`](docs/rendimiento-linea-base.md) — medición de rendimiento antes y después de la Fase C
- `docs/versions/` — notas de versiones anteriores a la v4.0 (históricas)

## Pendiente conocido

Ver "Limitaciones conocidas" en `ARCHITECTURE.md` (medicación/MAR, modo offline completo, validación médica de rangos, revisión jurídica de textos legales). Los datos legales pendientes y su responsable están en `docs/MOBILE-Y-PRIVACIDAD.md`, sección 9.

**Mantenedor:** Gael (7mo Ingeniería) · **Cliente:** Fundación Construyendo Futuro
