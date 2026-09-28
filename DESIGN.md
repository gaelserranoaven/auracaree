---
name: AuraCare · Presentación
description: Página de producto de AuraCare. Capítulos de día y de noche, un solo acento azul, la nota sellada como objeto héroe.
colors:
  acento: "#1F4BE8"
  acento-hover: "#1A3FC4"
  acento-noche: "#7B96FF"
  dia-suelo: "#FFFFFF"
  dia-suelo-2: "#F5F5F7"
  dia-tinta: "#1D1D1F"
  dia-tinta-2: "#6E6E73"
  dia-linea: "#E2E2E7"
  noche-suelo: "#000000"
  noche-suelo-2: "#161617"
  noche-panel: "#1C1C1E"
  noche-tinta: "#F5F5F7"
  noche-tinta-2: "#A1A1A6"
  noche-linea: "#2C2C2E"
  estado-ok: "#0B7A5B"
  estado-vigilancia: "#9A5E08"
  estado-critico: "#B83A1F"
  noche-ok: "#4FD1A5"
  noche-vigilancia: "#F2B654"
  noche-critico: "#FF8A70"
typography:
  display:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(3rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5.4vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 2.1vw, 1.4375rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.005em"
  instrumento:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  dato:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  control: "8px"
  pieza: "22px"
  objeto: "24px"
  monitor: "28px"
  pastilla: "999px"
spacing:
  gutter-movil: "16px"
  gutter: "24px"
  bloque: "56px"
  capitulo: "128px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.dia-suelo}"
    rounded: "{rounded.pastilla}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.acento-hover}"
  button-primary-noche:
    backgroundColor: "{colors.acento-noche}"
    textColor: "#050A1F"
    rounded: "{rounded.pastilla}"
    height: "48px"
  link-flecha:
    textColor: "{colors.acento}"
    typography: "{typography.body}"
    height: "44px"
  pieza:
    backgroundColor: "{colors.dia-suelo}"
    rounded: "{rounded.pieza}"
    padding: "28px"
  nota-sellada:
    backgroundColor: "{colors.noche-panel}"
    textColor: "{colors.noche-tinta}"
    rounded: "{rounded.objeto}"
    padding: "22px"
---

# Design System: AuraCare · Presentación

## Overview

**North star: el turno.** La página se lee como una jornada: capítulos de día sobre blanco y #F5F5F7, y capítulos de noche sobre negro puro. El objeto héroe no es un aparato sino la nota sellada: la portada muestra la app trabajando y el capítulo del sello la ensambla con el scroll (escribir → sellar → encadenar). El lenguaje es el de una página de producto de primer nivel (Apple / Android): tipografía grande y apretada, mucho aire, un solo acento y ningún adorno que no sea el producto.

Aplica a `index.html` + `landing.css` (estático, sin JS). La app (`src/`) conserva todavía su sistema anterior (tinta #0E3A5D + verde); alinearla con esta paleta es una decisión pendiente, no un hecho.

## Colors

### Primary
- **Azul Aura** `#1F4BE8` — acciones y enlaces sobre día (6.5:1 con texto blanco). Hover `#1A3FC4`.
- **Azul Aura de noche** `#7B96FF` — el mismo acento sobre negro (6.6:1 sobre #161617); con texto `#050A1F` encima.

### Neutral
- Día: suelo `#FFFFFF`, suelo 2 `#F5F5F7`, tinta `#1D1D1F`, tinta 2 `#6E6E73` (4.66:1 sobre #F5F5F7), línea `#E2E2E7`.
- Noche: suelo `#000000`, suelo 2 `#161617`, panel `#1C1C1E`, tinta `#F5F5F7`, tinta 2 `#A1A1A6`, línea `#2C2C2E`.
- Modo oscuro del sistema: los capítulos de día pasan a `#101012` / `#1C1C1E` y el acento a `#7B96FF`; los de noche siguen en negro, así la alternancia se mantiene.

### Named Rules
- **Un acento, una función.** El azul solo significa "puedes actuar aquí". Nunca decora.
- **El color clínico vive dentro del producto.** Rojo `#B83A1F`, ámbar `#9A5E08` y verde `#0B7A5B` (y sus versiones de noche) aparecen solo en la interfaz recreada, siempre con símbolo y texto (▲ Crítico, ● Vigilancia, En rango).

## Typography

Geist para todo el texto; Geist Mono solo para lo que es medición o dato: signos vitales, horas, sellos SHA-256, documentos.

### Hierarchy
- Display (h1): clamp(3rem, 9vw, 6rem), 700, interlineado 1.02, tracking −0.04em.
- Headline (h2): clamp(2.25rem, 5.4vw, 4rem), 700, 1.06, −0.035em.
- Title (h3): 1.3125rem, 700, −0.015em.
- Lead: clamp(1.125rem, 2.1vw, 1.4375rem), 400, color tinta 2.
- Body: 1.0625rem (17px), 1.55.
- Instrumento: Geist Mono 500, clamp(2.25rem, 5vw, 3.5rem), para las lecturas del monitor.

### Named Rules
- **El tracking depende del tamaño.** Negativo en titulares, casi cero en el cuerpo; nunca un valor único.
- **Sin antetítulos.** El encabezado habla solo; no hay etiquetas pequeñas encima.

## Layout

Contenedor de 1080px, márgenes de 24px (16px en ≤480px). Capítulos a sangre completa con 128px de padding vertical (96px en ≤820px). Texto de portada y titulares centrados; el sello y la sección de cumplimiento en dos columnas; bento de 6 columnas (4+2, 2+2+2) que colapsa a una en ≤820px; día/noche como dos mitades que se apilan en móvil. Puntos de quiebre: 1100px, 820px y 480px.

## Elevation & Depth

La profundidad existe solo en los objetos del producto (ventana de la app y teléfono): sombra con desplazamiento `0 1px 2px` + `0 30px 60px -20px` tintada azul en claro y negra en oscuro. Las piezas del bento y los paneles no llevan sombra ni borde: se separan por el tono del suelo. La barra superior es la única capa de vidrio (blur 20px, saturate 1.8), y con transparencia reducida pasa a sólida.

## Shapes

Controles tipo pastilla (999px); piezas del bento 22px; nota sellada 24px; monitor 28px; teléfono 38px; chips 6–8px.

## Components

### Buttons
Pastilla azul de 48px de alto (32px en la barra), texto 500; `:active` escala a 0.97 con ease-out `cubic-bezier(.23,1,.32,1)`. En capítulos de noche usa el azul de noche con texto `#050A1F`. Hover solo con puntero fino.

### Enlaces con flecha
Texto azul 17px con "›" que avanza 3px al pasar el mouse; área mínima de 44px de alto.

### Navigation
Barra sticky de 52px, vidrio, logo a la izquierda, anclas en texto de 13px (se ocultan en ≤820px), "Ingresar" y la pastilla "Agendar demo".

### Nota sellada (signature)
Tarjeta de noche con etiqueta de tipo, chips de signos, estampa del servidor (fecha, hora, autor), bloque del sello en Geist Mono y "✓ Cadena íntegra". Con scroll timelines (≥821px y sin movimiento reducido) aparecen en secuencia la estampa, el sello, el eslabón con la nota anterior y la verificación; sin soporte todo se ve estático y completo.

### Monitor
Superficie `#050608`, trazo de ECG que se dibuja al entrar en pantalla y lecturas en Geist Mono con estado en color, símbolo y texto.

## Do's and Don'ts

### Do:
- Mostrar el producto trabajando, con datos de ejemplo rotulados como tales.
- Alternar capítulos de día y de noche para contar el turno.
- Mantener el contraste AA en ambos modos y áreas táctiles de 44px.

### Don't:
- Inventar clientes, cifras, testimonios o precios.
- Usar el azul como decoración o el color clínico fuera de la interfaz.
- Añadir antetítulos, grillas de tarjetas iguales con ícono, texto con degradado o resplandores de color.
- Animar más de un momento: el sello es el único momento coreografiado.
