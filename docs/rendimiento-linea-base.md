# Rendimiento: línea base y resultado de la Fase C

**Fecha:** 2026-11-26 · **Rama:** `feature/prelanzamiento` · **Fase:** C (rendimiento y fuentes propias)

## Método

- Sitio armado con `tools/armar-sitio.mjs` (lo mismo que publica GitHub Pages) y servido en local bajo `/auracaree/`, con gzip y `Cache-Control: max-age=600`, como Pages.
- Lighthouse 13.6.0, perfil **móvil** (red y CPU simuladas), Chrome sin interfaz. Tres corridas por página; se informa la **mediana**.
- Páginas: la landing (`/auracaree/`) y la app sin sesión (`/auracaree/src/`, pantalla de ingreso).
- Ambas mediciones se hicieron de noche (hora de Bogotá), así que la app se vio en el tema **Centro Noche** en las dos. En local la latencia a Google Fonts es la real (internet) y la del sitio es casi cero: en GitHub Pages la mejora del primer pintado será menor que aquí, pero se mantiene, porque se eliminan dos orígenes nuevos (DNS, TLS y una hoja de estilos intermedia).

## Resultado

| | Landing antes | Landing después | App antes | App después |
|---|---|---|---|---|
| Rendimiento | 100 | 100 | 94 | **97** |
| Accesibilidad | 100 | 100 | 96 | **100** |
| Buenas prácticas | 100 | 100 | 100 | 100 |
| SEO | 100 | 100 | 50 | 50 (esperado: la app es `noindex`) |
| Primer pintado (FCP) | 1.540 ms | **759 ms** | 1.543 ms | **760 ms** |
| Pintado principal (LCP) | 1.540 ms | **759 ms** | 2.961 ms | **2.565 ms** |
| Bloqueo total (TBT) | 0 ms | 82 ms | 11 ms | 23 ms |
| Desplazamiento (CLS) | 0,000 | 0,001 | 0,009 | 0,009 |
| Peticiones | 6 | 5 | 8 | 7 |
| Transferido | 65,7 KB | 65,2 KB | 238,7 KB | 251,3 KB |
| Fuentes descargadas | 51,2 KB | 51,7 KB | 64,0 KB | 77,9 KB |
| Orígenes de terceros | `fonts.googleapis.com`, `fonts.gstatic.com` | **ninguno** | `fonts.googleapis.com`, `fonts.gstatic.com` | **ninguno** |

Lectura:

- **Privacidad.** Antes, cada visita a la landing y a la app clínica le entregaba a Google la IP del visitante (y de cada persona del personal al ingresar). Ahora ninguna página publicada pide nada a un tercero, salvo la app a Supabase (su backend).
- **Velocidad.** El primer pintado baja a la mitad en las dos páginas. El LCP de la app sigue en ~2,6 s porque depende de descargar y ejecutar `app.js` (159 KB comprimido), no de las fuentes.
- **La app descarga 14 KB más de fuentes.** Google servía IBM Plex Sans recortada a los pesos pedidos; aquí se usa el archivo variable completo (100 a 700, 44,8 KB), que cubre los tres pesos de la app en una sola petición. Se aceptó: el ahorro de la petición extra y de los dos orígenes pesa más que esos 14 KB.
- **TBT de la landing (0 → 82 ms).** La landing no tiene JavaScript: es trabajo de estilo y decodificación de fuentes que ahora ocurre antes (las fuentes llegan antes). No baja la nota (sigue en 100) y está dentro del ruido entre corridas.
- **Accesibilidad de la app (96 → 100).** No es por las fuentes: Lighthouse encontró que, en Centro Noche, el enlace "Términos, condiciones y política de privacidad" del aviso de almacenamiento tenía contraste **1,29:1** (usaba `--vital-suave`, casi transparente de noche, sobre el fondo azul fijo del aviso). Ahora va en blanco en las dos jornadas.

## Bundle de la app (`npm run build -- --analizar`)

| Salida | Minificado | gzip |
|---|---|---|
| `dist/app.js` | 568,2 KB | 159,4 KB |
| `dist/app.css` | 52,2 KB | 11,3 KB |
| `dist/chunks/universal-*.js` (importar Excel, bajo demanda) | 63,2 KB | 17,8 KB |

Composición de `app.js` por paquete: código propio 132,6 KB · `react-dom` 127,4 · `@supabase/auth-js` 101,5 · `@phosphor-icons/react` 79,6 · `@supabase/realtime-js` 32,0 · `@supabase/phoenix` 25,2 · `@supabase/storage-js` 22,3 · `@supabase/postgrest-js` 17,0 · `@supabase/supabase-js` 10,9 · `react` 7,1.

Decisiones:

- **`read-excel-file` ya se carga bajo demanda** (solo al importar un archivo en Personas mayores). Nada que hacer.
- **Íconos (79,6 KB): no se cambió.** La app usa unos 30 íconos en 3 pesos (regular, bold y fill), pero cada componente de Phosphor trae sus 6 pesos. Generar componentes propios con solo esos 3 ahorraría del orden de 40 KB minificados (~10 KB comprimidos, ~6 % del total), a cambio de un generador más que mantener. No compensa hoy; revisar si el bundle crece.
- **Supabase (~209 KB): no se cambió.** `createClient` incluye `storage-js` aunque la app no usa Storage (22 KB). Separar los clientes (`auth-js`, `postgrest-js`, `realtime-js`) tocaría la sesión y el tiempo real del piloto por ~6 KB comprimidos.
- Las fuentes de la app pasan por esbuild (`src/fuentes.css`) y salen a `dist/fonts/` con hash en el nombre: cambian de URL solo cuando cambia el archivo, así que la caché del navegador no sirve una fuente vieja.

## Cómo repetir la medición

```bash
npm run build && npm run sitio            # arma _site/
# servir _site/ bajo /auracaree/ (cualquier servidor estático con esa ruta base) y luego:
npx lighthouse@13.6.0 http://localhost:4173/auracaree/     --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo
npx lighthouse@13.6.0 http://localhost:4173/auracaree/src/ --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo
```

Medir a la misma hora (o forzar la misma jornada) para que la app se vea con el mismo tema en ambas corridas.
