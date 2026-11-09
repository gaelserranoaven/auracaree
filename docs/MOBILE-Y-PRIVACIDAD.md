# AuraCare — Pre-lanzamiento, privacidad y móvil

**Guía de trabajo para Claude Code** · versión 1 · 2026-11-08
**Repo:** `github.com/gaelserranoaven/auracaree` (rama `master`, v4.0, piloto activo desde 2026-09-28)
**Sitio publicado:** `https://gaelserranoaven.github.io/auracaree/` (URL inferida del remoto; confirmar en *Settings → Pages*)

> Este documento es la fuente de verdad del trabajo de pre-lanzamiento. Cubre 40 puntos de dos checklists de lanzamiento web, el cumplimiento de la Ley 1581 y el camino a la app móvil. Cada punto dice qué hacer, en qué archivo, quién lo hace y cómo se verifica.
> Etiquetas de acción: **[HACER]** Claude Code lo implementa en el repo · **[DECIDIR]** necesita una decisión o dato de Gael · **[EXTERNO]** lo hace Gael en un panel (Supabase, GitHub, DNS, Search Console) · **[DIFERIDO]** depende de algo que aún no existe (dominio) · **[N/A]** no aplica hoy.

---

## 0. Prompt de arranque (copiar y pegar en Claude Code)

```text
Lee docs/MOBILE-Y-PRIVACIDAD.md completo antes de tocar nada.

Trabaja en la rama feature/prelanzamiento (créala desde master; nunca hagas commits
directos en master: master despliega el piloto real por GitHub Pages).

Ejecuta las fases de la sección 4 en orden, UNA a la vez. Al terminar cada fase:
1) corre `npm run build` y `npm test`, 2) resume qué cambió y qué verificaste,
3) agrega la entrada en docs/CHANGELOG.md, 4) espera mi OK antes de la siguiente.

Reglas duras (sección 2): no inventes datos legales (razón social, NIT, correo, dominio),
deja un marcador visible [PENDIENTE: ...] y pregúntame. No ejecutes SQL contra
producción y no hagas push: yo ejecuto el SQL en el SQL Editor y yo hago el push con
GitHub Desktop. La app (src/) conserva noindex y cero analítica. Entrega archivos
completos, no fragmentos.

Empieza por la Fase A: confirma el estado inicial (git status, rama, conteo de pruebas
de `npm test`) y verifica qué archivos sirve hoy GitHub Pages.
```

---

## 1. Contexto verificado (2026-11-08)

**Producto.** Registro de cuidado para centros de protección de persona mayor en Bogotá (SDIS). Notas clínicas selladas con SHA-256 encadenado por sede, signos vitales con alertas, asistencia, dotación, pertenencias en custodia, entrega de turno y formato FOR-PSS-729. Seis roles aplicados por RLS en la base de datos. Piloto real en una sede desde 2026-09-28.

**Stack.**
- Frontend: React 18 empaquetado con esbuild (`build.mjs` → `src/dist/`, que **se versiona** porque GitHub Pages sirve estáticos). 20 pantallas, 17 componentes. Sin CDN ni Babel en el navegador.
- Backend: Supabase propio (región `us-east-1`): Auth, Postgres con RLS (34 políticas), Realtime, una Edge Function (`crear-usuario`) y 7 migraciones en `supabase/migrations/`.
- Landing: `index.html` + `landing.css` en la raíz, estática, **sin JavaScript** (`script-src 'none'`, sin build). La app vive en `src/index.html`.
- Pruebas: `npm test` (`tests/clinico.test.mjs`, `tests/smoke.test.mjs`). El README dice 17 pruebas y Obsidian dice 23: **verificar el conteo real** y corregir.

**CSP actuales.**
- Landing: `default-src 'self'; script-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; form-action 'none'`.
- App: `script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co`. Se aplica por `<meta>` porque Pages no permite encabezados.

**Hallazgos verificados desde afuera el 2026-11-08.**

| Hallazgo | Resultado | Implicación |
|---|---|---|
| HTTP → HTTPS | `301` y encabezado HSTS presentes | Punto "Forzar HTTPS" **verificado** en `github.io`. Repetir con el dominio propio. |
| `/robots.txt` y `/404.html` | `404` | No existen. |
| `/docs/OPERACION.md`, `/ARCHITECTURE.md` | `200` | **Públicos.** Exponen la guía operativa y la arquitectura. |
| `/supabase/migrations/04_rls_por_rol_y_sede.sql` | `200` | **Pública.** Publica el esquema y las políticas RLS. |
| `/.impeccable/review/mobile.png` | `200` | Las capturas de diseño son públicas (el repo tiene `.nojekyll`, que sirve las carpetas con punto). |
| `Cache-Control` de la landing | `max-age=600` | Pages fija la caché; no se configura. |

No es una brecha por sí sola (la protección real es RLS), pero publicar esquema, políticas y guía operativa de una app de datos de salud es superficie innecesaria. Se resuelve en la **Fase A**.

**Almacenamiento local de la app (inventario para la política de privacidad).**

| Clave / mecanismo | Dónde | Contenido | Cuándo se borra |
|---|---|---|---|
| `sb-<ref>-auth-token` (Supabase) | `localStorage` | Sesión JWT (`persistSession: true`) | Al cerrar sesión |
| `auracare_cookie_consent` | `localStorage` | `all` o `necessary` | Manual |
| Clave de jornada (`CLAVE`, en `Centro.jsx`) | `localStorage` | Centro Día/Noche elegido y hasta cuándo | Al cambiar jornada |
| `auracare_borrador_<uid>` | `sessionStorage` | **Borrador de nota clínica**: persona, tipo, descripción y signos | Al cerrar sesión; **se conserva** en el cierre por inactividad (20 min, con aviso de 60 s) |

El borrador clínico en `sessionStorage` es dato sensible en el dispositivo. Es aceptable por pestaña, pero debe constar en la política y **no puede migrarse a `localStorage`** en la PWA.

**Deriva de documentación a corregir.** `README.md` (17 pruebas; migraciones "04 y 05 según OPERACION") y `docs/versions/v3-4-features.md` ("solo localStorage, sin backend") están desactualizados. La referencia vigente es `ARCHITECTURE.md` v4.0 y `docs/OPERACION.md`.

---

## 2. Reglas de trabajo (innegociables)

1. **Rama aparte.** Todo en `feature/prelanzamiento`. `master` despliega el piloto real; solo Gael hace merge y push (GitHub Desktop).
2. **Nada de SQL contra producción.** Claude Code escribe scripts en `supabase/scripts/` (no son migraciones) con conteos previos, transacción y verificación posterior. Gael los ejecuta en el SQL Editor. Las migraciones nuevas siguen la numeración (`08_…`) y se prueban primero en un proyecto o rama de Supabase de prueba, nunca en el del piloto.
3. **No inventar.** Ni razón social, NIT, correo, dirección, dominio, clientes, testimonios, cifras de uso, precios ni certificaciones (`PRODUCT.md`: "Honest claims only"). Todo dato faltante se escribe como `[PENDIENTE: …]`, visible, y se pregunta.
4. **Dato de salud no sale del sistema.** Ni en logs, ni en analítica, ni en notificaciones push, ni en caché del service worker, ni en mensajes de error.
5. **La app (`src/`) conserva `noindex, nofollow` y cero analítica.** Se agrega una prueba que lo verifica.
6. **CSP: solo se relaja con justificación.** Todo cambio al CSP queda explicado en `docs/CHANGELOG.md` y limitado al mínimo (origen exacto, no comodines).
7. **Los textos legales son borrador** hasta que los revise asesoría jurídica. Cada uno lleva el encabezado visible: *"BORRADOR — pendiente de revisión jurídica"*.
8. **Build y pruebas siempre.** `npm run build` antes de cada commit (se versiona `src/dist`) y `npm test` en verde.
9. **Estilo.** Español de Colombia con tuteo. Sin emojis en la app (íconos Phosphor). Un acento azul `#1F4BE8`; verde solo para estado. Archivos completos, no fragmentos.
10. **Secretos.** La clave `sb_publishable_…` es pública por diseño. La `service_role` y cualquier contraseña **nunca** se escriben en el repo ni en el chat.
11. **Al cerrar cada fase**, generar un resumen para Obsidian (`Claude/Proyectos/AuraCare.md` y `Claude/log.md`) y, si hubo decisión de arquitectura, un ADR nuevo (ADR-009 en adelante).
12. **Preguntar antes de:** elegir proveedor de analítica o CAPTCHA, comprar o configurar dominio, decidir el camino móvil nativo.

---

## 3. Tablero de los 40 puntos

### Parte 1 — "20 cosas antes de lanzar tu web"

| # | Punto | Alcance | Estado hoy | Acción | Fase |
|---|---|---|---|---|---|
| 1 | Aviso legal | Landing | Falta: no identifica al responsable | **[HACER]** sección "Quiénes somos" en `privacidad.html` con `[PENDIENTE: razón social, NIT, correo]`. **[DECIDIR]** datos. | D |
| 2 | Política de privacidad | Landing | **Crítico:** el pie dice que los términos están "dentro de la aplicación" (tras el login) | **[HACER]** `privacidad.html` y `terminos.html` públicos, en borrador. Enlazar desde ambos pies y desde `Legal.jsx`. | D |
| 3 | Aviso de cookies | Landing y app | Landing sin cookies ni scripts. La app tiene banner. | **[HACER]** el banner enlaza a la política pública y muestra el inventario real (sección 1). Si se agrega analítica, se revisa. | D |
| 4 | Forzar HTTPS | Infra | **Verificado:** 301 + HSTS en `github.io` | **[EXTERNO]** confirmar "Enforce HTTPS" en Pages. Repetir al tener dominio. | F |
| 5 | Meta títulos y descripciones | Landing | Hay `title`, `description`, `og:title/description/type`. Falta `og:image`, `og:url`, `canonical`, `twitter:*`. | **[HACER]** | B |
| 6 | Datos estructurados | Landing | Ninguno | **[HACER]** JSON-LD `Organization` y `SoftwareApplication`. **Sin** `aggregateRating`, `offers` ni reseñas inventadas. | B |
| 7 | Sitemap y robots.txt | Landing | No existen | **[HACER]** ver Fase B (nota sobre project site). | B |
| 8 | Ficha de Google | — | — | **[N/A]** no hay local físico. | — |
| 9 | Favicon | Landing y app | La landing tiene SVG inline. **La app no tiene ícono.** | **[HACER]** SVG + PNG 32, 180 (apple-touch), 192 y 512 (incluye maskable). Sirve también para la PWA. | B |
| 10 | Texto alternativo | Landing | Sin `<img>` (todo SVG/CSS) | **[N/A]** hoy. Regla: toda `<img>` nueva lleva `alt`; SVG decorativo lleva `aria-hidden`. | — |
| 11 | Imágenes comprimidas | Landing | No hay imágenes | **[HACER]** la imagen `og:image` (1200×630), optimizada y generada con los tokens de `DESIGN.md`, sin datos clínicos reales. | B |
| 12 | Velocidad de carga | Landing y app | Fuentes desde Google Fonts. Landing ~18 KB HTML + ~23 KB CSS, sin JS. App: `app.js` ~581 KB minificado. | **[HACER]** medir línea base, alojar fuentes propias, revisar el bundle. | C |
| 13 | Contraste | Landing y app | Auditado el 28-sep | **[HACER]** re-verificar con axe tras los cambios. | B, C |
| 14 | Se ve bien en el móvil | Landing y app | Trabajado en los commits del 6–7 de octubre | **[HACER]** verificación a 360, 390 y 414 px. | B |
| 15 | Página 404 | Landing | `404.html` devuelve 404 | **[HACER]** `404.html` de marca, `noindex`, con enlace al inicio. | B |
| 16 | Enlaces rotos | Landing | Sin verificación automática | **[HACER]** prueba `tests/enlaces.test.mjs` que comprueba anclas (`#id`) y archivos locales. | B |
| 17 | Formularios contra spam | App | **"Solicitar acceso" es público** y crea perfiles pendientes: un bot puede inundar `perfiles`. La landing no tiene formularios. | **[HACER]** honeypot y control de tiempo en el cliente (defensa débil). **[EXTERNO]** CAPTCHA y límites en Supabase Auth. **[DECIDIR]** proveedor. | E |
| 18 | Botón de WhatsApp visible | Landing | 3 llamados a `wa.me/573108247722` | **[HACER]** solo verificar que se mantiene. | — |
| 19 | Analítica instalada | Landing | Ninguna | **[DECIDIR]** ver Fase G. | G |
| 20 | Una sola llamada a la acción | Landing | "Agendar demo" es la única primaria | **[HACER]** mantener. Ingresar y Solicitar acceso siguen como secundarias. | — |

### Parte 2 — "Otras 20 cosas antes de lanzar tu web"

| # | Punto | Alcance | Estado hoy | Acción | Fase |
|---|---|---|---|---|---|
| 21 | Quitar el noindex | Landing y app | Landing indexable. App con `noindex, nofollow` (**correcto**). | **[HACER]** prueba de guardia: la landing no tiene `noindex`; `src/index.html` sí. | A |
| 22 | Alta en Search Console | Infra | No hecha | **[EXTERNO]** propiedad de prefijo de URL. Claude Code agrega el `<meta name="google-site-verification">` cuando Gael entregue el token. Enviar el sitemap. | F |
| 23 | Alta en Bing Webmaster | Infra | No hecha | **[EXTERNO]** importar desde Search Console, o `msvalidate.01`. | F |
| 24 | Teléfono y correo tocables | Landing | Solo WhatsApp | **[HACER]** `tel:+573108247722` y `mailto:` en el pie. **[DECIDIR]** correo de contacto. | D |
| 25 | Íconos de redes a cuentas reales | Landing | Sin redes | **[DIFERIDO]** no agregar íconos sin cuenta real. | — |
| 26 | Redirecciones 301 | Infra | — | **[DIFERIDO]** Pages no permite 301 propias en un project site. Con dominio propio, GitHub redirige `www` ↔ apex si ambos DNS están bien (verificar). | — |
| 27 | Una sola versión del dominio | Infra | — | **[DIFERIDO]** depende del dominio. | — |
| 28 | URLs canónicas | Landing | Faltan | **[HACER]** con la URL de Pages; cambiar al tener dominio. | B |
| 29 | URLs limpias | Landing y app | La app vive en `/src/` | **[DIFERIDO]** **no mover `/src/` ahora**: rompería marcadores del piloto y la *Site URL* de Supabase Auth. Evaluar `/app/` con dominio. | — |
| 30 | Jerarquía de enlaces internos | Landing | Una sola página con anclas | **[HACER]** pie con Privacidad, Términos, Ingresar. | D |
| 31 | Una página por intención de búsqueda | Landing | Una sola página | **[DECIDIR]** más adelante (p. ej. `/seguridad`). Evitar páginas delgadas. | — |
| 32 | Vista previa al compartir | Landing | Falta `og:image` | **[HACER]** `og:image`, `og:url`, `og:site_name`, `og:locale=es_CO`, `twitter:card=summary_large_image`. Gael prueba pegando el enlace en WhatsApp. | B |
| 33 | Caché configurada | Infra | `max-age=600` fijo en Pages | **[N/A]** no configurable. Ya se versionan las URL de `dist/`. El service worker tendrá su propia estrategia. | H |
| 34 | SSL con renovación automática | Infra | Lo gestiona GitHub | **[N/A]** nada que hacer. Verificar al activar el dominio. | F |
| 35 | Copias de seguridad automáticas | Supabase | Plan gratuito sin respaldos | **[EXTERNO]** plan Pro (respaldos diarios) + `pg_dump` semanal a almacenamiento **bajo control de la Fundación, cifrado**. **Nunca a GitHub ni a un Drive personal.** Claude Code redacta el script sin credenciales (variable de entorno) y la prueba de restauración en `docs/OPERACION.md`. | F |
| 36 | Aviso si la web se cae | Infra | No hay | **[EXTERNO]** monitor HTTP de landing, app y estado de Supabase Auth, con alerta a WhatsApp o correo. Claude Code lo documenta. | F |
| 37 | Borrar el contenido de prueba | Supabase | `OPERACION.md` paso 6 | **[DECIDIR] [EXTERNO] ALTO RIESGO.** Ver Fase F. | F |
| 38 | Probarla en varios navegadores | Landing y app | Sin pruebas | **[HACER]** opcional: Playwright en Chromium, Firefox y WebKit (WebKit aproxima Safari/iOS) sobre la landing y la pantalla de login, sin autenticación. | F |
| 39 | Página de gracias tras el formulario | App | No hay pantalla explícita (no aparece "gracias" ni "recibida" en `Login.jsx`) | **[HACER]** estado "Solicitud recibida" con los siguientes pasos. **Sin inventar plazos.** | E |
| 40 | Medir conversiones | Landing | No hay | **[DECIDIR]** con el punto 19. | G |

---

## 4. Fases de ejecución

Cada fase es un conjunto de commits en `feature/prelanzamiento`. Tamaño: S (horas), M (un día), L (varios días).

### Fase A — Base, higiene y superficie pública · S

**Objetivo.** Partir de un estado conocido y dejar de publicar lo que no debe ser público.

1. Crear la rama. Registrar `git status`, conteo de `npm test` y versión.
2. Corregir la deriva: README (conteo de pruebas, estado de migraciones, estructura), `docs/versions/v3-4-features.md` (marcar como histórico) y `package.json`.
3. Prueba de guardia `tests/indexacion.test.mjs`: la landing no contiene `noindex`; `src/index.html` sí; ningún HTML contiene `googletagmanager`/píxeles de terceros.
4. **Reducir lo que Pages publica.** Hoy se sirve todo el repo. Propuesta: cambiar la fuente de Pages a **GitHub Actions** y publicar solo una lista permitida: `index.html`, `landing.css`, `404.html`, `robots.txt`, `sitemap.xml`, `privacidad.html`, `terminos.html`, `fonts/`, `icons/`, `src/` (con `dist/`). Quedan fuera `docs/`, `supabase/`, `tests/`, `.impeccable/`, `*.md`. Claude Code escribe `.github/workflows/pages.yml`; **Gael cambia en *Settings → Pages → Source → GitHub Actions***.
5. Verificar con `curl -I` que las rutas excluidas devuelven 404 y que `/src/` sigue sirviendo el piloto.
6. Comprobar la visibilidad del repo (privado/público) y anotarla.

**Terminado cuando:** pruebas en verde, workflow probado en la rama, y `curl` confirma que `docs/OPERACION.md` y `supabase/migrations/*` ya no se sirven.

### Fase B — Landing: SEO técnico y compartir · M

Archivos: `index.html`, `landing.css`, nuevos `404.html`, `robots.txt`, `sitemap.xml`, `icons/`, `og/og-image.png`.

1. `<head>` de la landing: `canonical`, `og:url`, `og:site_name`, `og:locale` (`es_CO`), `og:image` (+ `og:image:alt`, ancho y alto), `twitter:card`, `twitter:title/description/image`. Mantener los textos actuales sin afirmar nada que no esté en `PRODUCT.md`.
2. JSON-LD (`<script type="application/ld+json">`). **Ojo:** el CSP de la landing es `script-src 'none'`. Los bloques JSON-LD **no se ejecutan**, pero Chrome puede reportarlos; verificar que no rompan y, si el CSP los bloquea en la práctica, documentar la alternativa antes de relajar nada.
3. `robots.txt`: permitir todo, **sin** `Disallow: /src/` (la app se mantiene fuera del índice con `noindex`, y un `Disallow` impediría que el buscador lea ese `noindex`). Incluir la línea `Sitemap:`.
   **Importante:** en un *project site* de Pages el archivo vive bajo `/auracaree/` y los buscadores solo leen `robots.txt` en la raíz del host. **No será efectivo hasta tener dominio propio.** Crearlo ya, y enviar el sitemap directamente desde Search Console.
4. `sitemap.xml`: landing, `privacidad.html`, `terminos.html`. **No** incluir `/src/`.
5. `404.html`: marca, mensaje breve, enlace al inicio, `noindex`.
6. Íconos: generar con un script (`tools/iconos.mjs`, con `sharp` como devDependency) desde el SVG de marca: 32, 180, 192, 512 y maskable. Enlazarlos en la landing y en `src/index.html`.
7. `og-image.png` 1200×630, < 150 KB, con tokens de `DESIGN.md` y la nota sellada como objeto central. Sin logos de clientes ni cifras.
8. `tests/enlaces.test.mjs`: cada `href="#id"` tiene su `id`; cada ruta local existe; ningún `target="_blank"` sin `rel="noopener"`.
9. Re-verificar contraste (axe) y revisión a 360/390/414 px.

**Terminado cuando:** Lighthouse SEO ≥ 95 y Accesibilidad ≥ 95 en la landing (objetivos propuestos), pruebas en verde y vista previa correcta al pegar el enlace en WhatsApp (lo prueba Gael).

### Fase C — Rendimiento y fuentes propias · M

**Por qué importa más allá de la velocidad.** Hoy cada visita a la landing **y a la app clínica** pide las fuentes a servidores de Google, lo que le entrega a un tercero la IP del visitante. Además, una PWA offline necesita las fuentes locales.

1. **Medir antes:** `npx lighthouse` (móvil) a la landing y a la pantalla de login; guardar el resultado en `docs/rendimiento-linea-base.md`.
2. Alojar localmente Geist y Geist Mono (landing) y Sora, IBM Plex Sans e IBM Plex Mono (app), en `.woff2`, desde paquetes npm (`@fontsource/*` o `geist`). Verificar la licencia (OFL) y conservarla en `fonts/LICENSES.md`. Usar `font-display: swap` y subconjunto latino.
3. Quitar `fonts.googleapis.com` y `fonts.gstatic.com` de los dos CSP y los `preconnect`. Prueba de guardia: ningún archivo del sitio publicado referencia esos dominios.
4. Analizar el bundle de la app con `metafile` de esbuild; identificar dependencias pesadas (`read-excel-file`, íconos) y cargarlas bajo demanda si el ahorro es real.
5. **Medir después** y comparar.

**Terminado cuando:** CSP sin dominios de Google, Lighthouse móvil de la landing ≥ 90 en Rendimiento, y el informe antes/después en `docs/`.

### Fase D — Páginas legales públicas y alineación de la app · L

Esta fase depende de la sección 5 y de los datos de Gael.

1. `privacidad.html` y `terminos.html` estáticas (sin JS, mismo diseño de la landing), en **borrador**, con el encabezado de revisión jurídica pendiente.
   - Contenido mínimo de la política: quién es el responsable (marcadores `[PENDIENTE]`), qué datos se tratan, finalidad, base y autorización, derechos del titular (conocer, actualizar, rectificar, suprimir con sus excepciones), canal y procedimiento de consultas y reclamos, encargados y subencargados (Supabase, alojamiento), transferencia internacional, seguridad, retención, cambios, fecha de vigencia.
2. Pie de la landing: enlaces a ambas páginas, `mailto:` y `tel:` cuando haya correo.
3. `Legal.jsx`: el modal y el banner enlazan a las páginas públicas y se alinean con ellas (una sola versión del texto). Reemplazar la frase "los términos completos están dentro de la aplicación".
4. Que el banner describa el almacenamiento real (tabla de la sección 1).
5. Revisar `docs/CHANGELOG.md` y registrar el ADR-009.

**Terminado cuando:** las URL públicas responden sin login, no quedan marcadores `[PENDIENTE]` sin responsable asignado en la lista de la sección 9, y las pruebas de enlaces cubren las páginas nuevas.

### Fase E — "Solicitar acceso": antispam y confirmación · M

1. Confirmar cómo funciona hoy `onSolicitarCuenta` (en `App.jsx`) y qué ve la persona al enviar.
2. Honeypot (campo oculto accesible con `tabindex=-1` y `aria-hidden`) y rechazo de envíos en menos de 2–3 segundos. Son defensas débiles: complementan, no sustituyen.
3. **Preparar el CAPTCHA** (Cloudflare Turnstile o hCaptcha, a decidir con Gael): componente, ajuste mínimo del CSP (`script-src`, `frame-src` y `connect-src` solo del origen exacto) y documentación. **Gael activa el CAPTCHA y los límites en *Supabase → Auth → Attack Protection*.**
4. Estado "Solicitud recibida": qué pasó, quién la aprueba, que no tiene acceso hasta la aprobación, cómo contactar. **Sin inventar plazos.** Accesible (`role="status"`, foco al título).
5. Propuesta de SQL (no ejecutar) para listar y depurar perfiles `pendiente` antiguos, con el criterio definido por Gael.

**Terminado cuando:** el flujo funciona de extremo a extremo en un entorno de prueba, el CAPTCHA es opcional por configuración hasta que Gael lo active, y las pruebas de render cubren la pantalla nueva.

### Fase F — Operación y guías externas · M

Claude Code redacta guías paso a paso en `docs/OPERACION.md`. Gael ejecuta lo externo.

- **Search Console y Bing.** Propiedad de prefijo de URL del sitio de Pages; verificación por `<meta>`; envío de `sitemap.xml`.
- **Respaldos.** Plan Pro de Supabase; `scripts/respaldo.ps1` (sin credenciales dentro: usa variable de entorno), destino cifrado bajo control de la Fundación y **prueba de restauración** documentada. Registrar quién guarda las llaves.
- **Monitoreo.** Monitor HTTP de la landing y de la app, y comprobación del estado de Supabase Auth (el endpoint de salud pide la clave publishable en el encabezado; verificar). Alerta a un canal que alguien lea.
- **Limpieza de datos de prueba (paso 6 de OPERACION, ALTO RIESGO).** Claude Code escribe `supabase/scripts/limpiar_demo.sql` con: conteo previo por tabla; identificación **estricta** de los registros de demo (`r1`…`r4` y sus dependientes); transacción; `disable trigger notas_no_update_delete` y `enable` en el mismo bloque; conteo posterior; prueba de que `verificar_cadena_notas(sede)` sigue íntegra. **El piloto lleva en marcha desde 2026-09-28, así que puede haber datos reales mezclados: no ejecutar sin confirmar con la Fundación y sin respaldo previo.** Gael lo ejecuta.
- **Navegadores (opcional).** Playwright sobre landing y login.
- **HTTPS.** Confirmar "Enforce HTTPS" y repetir `curl -I http://…` tras activar dominio.

### Fase G — Analítica y conversiones · S (tras decisión)

**Propuesta por defecto:** medir solo los clics al WhatsApp y las visitas, **solo en la landing**, sin cookies y sin identificar personas. **Cero analítica dentro de la app.**

Condiciones: elegir proveedor sin cookies (verificar su licencia y precio para uso comercial); el CSP de la landing hoy es `script-src 'none'`, por lo que cualquier script de terceros exige abrirlo solo para ese origen exacto; la política de privacidad debe describirlo; si el proveedor usa cookies o identificadores, se necesita aviso y consentimiento previo.

### Fase H — PWA · M

Requisitos y trampas:

1. `src/manifest.webmanifest`: `name`, `short_name`, `start_url: "./index.html"`, `scope: "./"` (el sitio vive bajo `/auracaree/src/`, así que **todas las rutas son relativas**), `display: standalone`, `lang: es-CO`, `theme_color`/`background_color` de `DESIGN.md`, íconos 192/512 y maskable.
2. `src/sw.js` con alcance `/src/`. Cachea **solo la carcasa** (HTML, `dist/app.*`, chunks, fuentes locales, íconos). **Nunca** cachea peticiones a `*.supabase.co` (REST, Auth, Realtime), ni respuestas con datos de salud. Estrategia: caché primero para archivos versionados; red primero para la navegación. Aviso "Nueva versión disponible".
3. Offline: la carcasa abre sin red y el aviso global existente explica que los cambios no se guardan. **No persistir datos clínicos offline** hasta tener el diseño de cola cifrada (roadmap v4.1).
4. Botón "Instalar" en *Más* con `beforeinstallprompt` (Android). iOS: instalar desde Safari con *Compartir → Añadir a pantalla de inicio*; probar sesión e inactividad en un iPhone real.
5. Verificar en DevTools (*Application → Cache Storage*) que no hay respuestas de Supabase y que al cerrar sesión no queda nada clínico.
6. **Push (fase posterior):** carga útil **sin datos del residente** ("Hay una alerta nueva"), claves VAPID, tabla de suscripciones con RLS y Edge Function. Primero política y consentimiento.

**Terminado cuando:** Lighthouse PWA/instalable en verde, auditoría de caché sin datos de salud y prueba en Android real.

### Fase I — Android nativo · decisión pendiente (ver sección 6)

No iniciar sin respuesta de Gael a "¿por qué nativo?".

---

## 5. Privacidad y cumplimiento (Ley 1581 de 2012)

> Marco de trabajo para llevar a asesoría jurídica. No es asesoría legal.

### 5.1 Roles y responsabilidades (propuesta a validar)

La Ley 1581 define dos roles: **Responsable** (decide sobre la base de datos y sus fines) y **Encargado** (trata los datos por cuenta del Responsable). Declararse "responsables los dos" es posible, pero diluye quién responde ante la SIC. Propuesta:

| Tratamiento | Titulares | Responsable | Encargado | Subencargados |
|---|---|---|---|---|
| Salud de personas mayores (notas, signos, fichas, alertas) | Residentes (o sus representantes legales) | **Fundación / centro** | **AuraCare** | Supabase (`us-east-1`), GitHub Pages (solo estático) |
| Cuentas del personal (nombre, correo, rol, sede, jornada, auditoría) | Personal del centro | **Por definir con jurídica** (propuesta: Fundación) | AuraCare | Supabase |
| Contactos comerciales (WhatsApp, correo) | Directores y coordinadores | **AuraCare** | — | WhatsApp (Meta) |
| Datos técnicos (IP en registros de infraestructura) | Visitantes | Proveedores | — | GitHub, Supabase |

Cada **centro cliente** es un Responsable distinto: la matriz y el contrato se firman por centro.
**[DECIDIR]** ¿"AuraCare" opera como empresa con NIT o como persona natural? Cambia el contrato, la cuenta de desarrollador y quién firma.

### 5.2 Documentos a producir (todos en borrador, en `docs/legal/`)

| Documento | Para quién | Estado |
|---|---|---|
| Política de privacidad pública de AuraCare | Visitantes, contactos, cuentas | Fase D |
| Términos de uso de la plataforma | Personal del centro | Fase D |
| Contrato de transmisión de datos AuraCare–Fundación | Entre partes | **[PENDIENTE]** (confirmar con jurídica el articulado aplicable del Decreto 1074 de 2015) |
| Plantilla de Política de Tratamiento del Responsable | Cada centro | **[PENDIENTE]** |
| Aviso de privacidad y formato de autorización | Residentes o representantes | **[PENDIENTE]** (datos sensibles: la autorización es facultativa y debe informarlo) |
| Procedimiento de consultas y reclamos | Titulares | **[PENDIENTE]** (la ley fija 10 días hábiles para consultas y 15 para reclamos; confirmar) |
| Protocolo de incidentes de seguridad | Equipo y centros | **[PENDIENTE]** (incluir el reporte a la SIC; confirmar plazo) |
| Política de retención y supresión | Todos | **[PENDIENTE]** ver 5.3 |
| Inventario de bases de datos (¿RNBD?) | Responsable | **[PENDIENTE]** verificar si la inscripción en el Registro Nacional de Bases de Datos aplica al Responsable |
| Política de seguridad de la información | Interno | **[PENDIENTE]** |

### 5.3 Conflicto a resolver: supresión de cuenta vs. historia clínica inmutable

Las tiendas de aplicaciones exigen poder eliminar la cuenta. Pero las notas son inmutables por diseño (ADR-006) y la Res. 1995/1999 obliga a conservar la historia clínica. Propuesta a validar:

- "Eliminar cuenta" = **suspender y revocar acceso** (ya existe `suspender`), no borrar la fila.
- Se conserva la identidad mínima necesaria para la **autoría** de las notas durante el plazo legal de conservación (confirmar los años con jurídica).
- Cumplido el plazo, **anonimizar**, no borrar la cadena de hashes.
- Las solicitudes de supresión del titular se atienden con la excepción por deber legal de conservación, explicada por escrito.
- Cualquier migración (`08_…`) se prueba primero en un proyecto de pruebas.

### 5.4 Controles técnicos ya existentes (referencia para la política)

| Control | Mecanismo |
|---|---|
| Identidad | Supabase Auth, sesión JWT, cierre por inactividad a los 20 min con aviso a los 60 s |
| Autorización | 6 roles, RLS por rol y sede, `anon` sin acceso a tablas |
| Integridad | Notas selladas con SHA-256 encadenado; UPDATE/DELETE/TRUNCATE bloqueados; `verificar_cadena_notas(sede)` |
| Trazabilidad | Tabla `auditoria` append-only |
| Cuentas | Alta por aprobación o creación directa con clave temporal de un solo uso |
| Cliente | CSP estricta, sin `eval`, sin HTML dinámico |
| Pendientes | MFA para SuperAdmin, verificación de correo, protección de contraseñas filtradas y respaldos (plan Pro), validación médica de rangos clínicos |

### 5.5 Lista de políticas y puntos aportada por Gael

> **PENDIENTE: pegar aquí la lista completa.** Por cada ítem, Claude Code crea una fila con ID, requisito, fuente, responsable (Fundación / AuraCare / Supabase), artefacto (documento, código o configuración), archivo destino, estado y criterio de terminado. Los ítems que no se puedan hacer hoy quedan marcados con la dependencia.

| ID | Requisito | Fuente | Responsable | Artefacto | Archivo destino | Estado | Criterio de terminado |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

---

## 6. Camino móvil

### 6.1 Decisión abierta: ¿por qué nativo?

| | PWA | Capacitor (WebView) | Kotlin + Compose (nativo) |
|---|---|---|---|
| Reutiliza | 100% | ~90% | Solo el backend |
| Reescribe | Nada | Casi nada | 20 pantallas, `api.js`, `clinico.js`, `importar.js` y pruebas |
| Tiendas | No | Sí | Sí |
| Offline cifrado | Limitado | Incómodo | Room + SQLCipher |
| Seguridad | Navegador | Superficie del WebView | Keystore, biometría, sin WebView |
| Bases de código a mantener | 1 | 1 | **2** (web + Android) |

**Respuesta de Gael pendiente:** ¿el requisito nativo es de rendimiento, de seguridad o una exigencia externa? Hasta responderla, el trabajo móvil se limita a la **Fase H (PWA)**.

### 6.2 Si se elige Kotlin + Compose (repo aparte `auracare-android`)

- Arquitectura limpia por módulos (`core:model`, `core:data`, `core:domain`, `feature:*`), guiada por la skill `android-clean-architecture`. Cliente `supabase-kt` (librería comunitaria).
- Backend **sin cambios**: RLS, triggers, sellado y Edge Function se reutilizan tal cual.
- Cortes verticales en este orden: login → lista de personas mayores → nueva nota con signos → alertas → asistencia → entrega y recibo de turno → perfil.
- **Pruebas de paridad:** portar los casos de `tests/clinico.test.mjs` a JUnit con los mismos datos de entrada, para garantizar que ambos clientes calculan igual. Pruebas de contrato contra un proyecto Supabase de pruebas, nunca el del piloto.
- Seguridad móvil: token y claves en Keystore; `BiometricPrompt`; `FLAG_SECURE` en pantallas clínicas; `allowBackup="false"`; `network_security_config` solo con TLS; sin datos de salud en notificaciones; R8; Play App Signing.
- Offline: Room con SQLCipher, cola de escrituras cifrada, borrado al cerrar sesión. Diseño aprobado antes de codificar.

### 6.3 Distribución (decisión pendiente)

- **Privada** (pruebas internas o cerradas de Play, o app privada de organización): solo entra quien invitas. Recomendada para el piloto y la expansión inicial.
- **Pública:** exige política pública, formulario de seguridad de datos, eliminación de cuenta dentro de la app y declaraciones de apps de salud. Verificar los formularios vigentes en Play Console.
- Las **cuentas personales** creadas después del 13-nov-2023 deben correr una prueba cerrada con **12 testers durante 14 días** antes de producción. Las **cuentas de organización** están exentas pero piden número D-U-N-S.
- Diseñar políticas y formularios **como si fuera pública**, para que cambiar de modelo no cueste.

### 6.4 iOS

No hay Mac. Xcode solo corre en macOS y la cuenta de desarrollador de Apple tiene costo anual. Camino realista: **PWA en Safari**. Alternativas: compilar con un Mac en la nube o CI con macOS, o posponer iOS.

---

## 7. Verificación y definición de terminado global

```bash
npm run build && npm test                      # build versionado + pruebas en verde
npx lighthouse http://localhost:8000/ --form-factor=mobile \
  --only-categories=performance,accessibility,seo,best-practices   # landing, antes y después
npx http-server -p 8000                        # servir en local (abrir /, /src/, /404.html)

# Superficie pública (tras Fase A, contra el sitio publicado)
curl -sI https://gaelserranoaven.github.io/auracaree/docs/OPERACION.md            # esperado: 404
curl -sI https://gaelserranoaven.github.io/auracaree/supabase/migrations/04_rls_por_rol_y_sede.sql   # esperado: 404
curl -sI http://gaelserranoaven.github.io/auracaree/                              # esperado: 301 a https
```

Objetivos propuestos (no garantías): Lighthouse móvil de la landing con Rendimiento ≥ 90, Accesibilidad ≥ 95, SEO ≥ 95. Guardias automáticas: landing sin `noindex`, app con `noindex`, sin dominios de Google Fonts, sin analítica en `src/`, enlaces internos válidos.

Manual: iPhone con Safari y Android con Chrome; vista previa al compartir en WhatsApp; flujo completo de "Solicitar acceso" en un entorno de prueba.

---

## 8. Fuera de alcance (no hacer)

- Mover la app de `/src/` o cambiar la *Site URL* de Supabase mientras el piloto esté en marcha.
- Ejecutar SQL o migraciones en el proyecto Supabase del piloto.
- Analítica, píxeles o scripts de terceros dentro de la app.
- Guardar respaldos de la base en GitHub o en cuentas personales.
- Cifrado de extremo a extremo (se retiró a propósito; ver `ARCHITECTURE.md`, decisión 2).
- Íconos de redes sociales, testimonios, logos de clientes o cifras de uso sin evidencia.
- Cualquier texto legal presentado como definitivo antes de la revisión jurídica.

---

## 9. Pendientes que dependen de Gael

**Datos.**
- [ ] Razón social, NIT y correo de contacto del responsable (o confirmar persona natural).
- [ ] Teléfono y correo que deben aparecer como tocables en el pie.
- [ ] Token de verificación de Search Console (y Bing, si se usa).

**Decisiones.**
- [ ] ¿Por qué nativo? (rendimiento, seguridad o exigencia externa) → define Fase I.
- [ ] Proveedor de CAPTCHA (Turnstile o hCaptcha).
- [ ] Analítica: ¿sí o no?, y proveedor.
- [ ] Dominio propio: ¿cuándo y cuál?
- [ ] Distribución: ¿privada o pública?, y tipo de cuenta de Play (D-U-N-S).
- [ ] Criterio para depurar perfiles `pendiente` antiguos.

**Acciones externas.**
- [ ] Pages → Source → GitHub Actions (Fase A).
- [ ] Pages → confirmar "Enforce HTTPS".
- [ ] Supabase: plan Pro, CAPTCHA y límites de intentos, protección de contraseñas filtradas, MFA.
- [ ] Alta en Search Console y envío del sitemap.
- [ ] Monitor de disponibilidad con alertas.
- [ ] Ejecutar los scripts SQL que Claude Code prepare, tras respaldo y confirmación de la Fundación.
- [ ] Llevar los borradores de `docs/legal/` a asesoría jurídica.
- [ ] Pegar la lista de políticas en la sección 5.5.

---

## 10. Referencias

- Repo: `ARCHITECTURE.md`, `PRODUCT.md`, `DESIGN.md`, `docs/OPERACION.md`, `docs/CHANGELOG.md`, `supabase/migrations/`.
- Obsidian (`Obsidian-Claude/Claude/Proyectos/`): `AuraCare.md`, `2_AuraCare-ADR-Index.md` (ADR-001 a 008), `AuraCare-v4-Seguridad-y-Presentacion.md`.
- Skills útiles: `apple-design` (revisión de UI móvil), `android-clean-architecture`, `architecture`, `testing-strategy`, `deploy-checklist`.
