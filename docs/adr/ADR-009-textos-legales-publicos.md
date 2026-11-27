# ADR-009: Textos legales públicos como fuente única y aviso de almacenamiento informativo

**Estado:** aceptada (los textos siguen en borrador, pendientes de revisión jurídica) · **Fecha:** 2026-11-26 · **Fase:** D del pre-lanzamiento

> Los ADR-001 a 008 están en Obsidian (`Claude/Proyectos/2_AuraCare-ADR-Index.md`). Desde este, los ADR también se versionan en `docs/adr/`.

## Contexto

- La política de tratamiento de datos y los términos solo existían como un modal dentro de la app, visible después de entrar a la pantalla de ingreso, con un texto distinto al de la landing. El pie de la landing decía que "los términos están dentro de la aplicación".
- La Ley 1581 de 2012 y el Decreto 1377 de 2013 piden una política de tratamiento disponible para los titulares, con la identificación del responsable y un canal de consultas y reclamos. Quien no tiene cuenta (una familia, un visitante, un director que evalúa AuraCare) no podía leerla.
- El aviso de almacenamiento de la app ofrecía "Solo necesarias" y "Entendido", pero la app solo guarda datos estrictamente necesarios. Las dos opciones hacían lo mismo: era una elección que no cambiaba nada.
- La empresa que operará AuraCare aún no está constituida.

## Decisión

1. **Fuente única:** el texto completo vive en `privacidad.html` y `terminos.html`, páginas estáticas públicas, sin JavaScript, con el diseño de la landing, indexables y en el sitemap. La app no repite el texto: el modal es un resumen fiel con enlaces a las dos páginas, que se abren en otra pestaña para no perder una nota a medio escribir.
2. **Borrador visible:** ambas páginas llevan el aviso "Borrador, pendiente de revisión jurídica" y todo dato faltante va como marcador `[PENDIENTE: …]` visible. Una prueba (`tests/legal.test.mjs`) impide marcadores invisibles y números de identificación escritos a mano.
3. **Responsable provisional:** responde Gael, como persona natural, hasta que la empresa quede inscrita. Entonces la empresa asume el papel y se actualizan las dos páginas.
4. **Dos papeles:** para la información de la plataforma, el centro es Responsable y AuraCare Encargado. Para el sitio y los contactos comerciales, AuraCare es Responsable. Quién es Responsable de las cuentas del personal queda para la asesoría jurídica.
5. **Aviso informativo, no de consentimiento:** como todo lo que guarda la app es necesario para funcionar, el aviso describe qué se guarda y tiene un solo botón ("Entendido"). Si algún día se agrega almacenamiento opcional (por ejemplo, analítica), se vuelve a pedir consentimiento previo antes de activarlo.
6. **Inventario vigilado:** la tabla "Lo que se guarda en tu navegador" de la política debe nombrar cada clave `auracare_*` que use el código. La prueba falla si aparece una clave nueva sin documentar.

## Consecuencias

- Hay una sola versión del texto que mantener, y se puede enlazar y compartir sin cuenta.
- Las URL `privacidad.html` y `terminos.html` pasan a ser públicas y estables: si cambia el dominio, se actualizan el canonical y el sitemap, no el contenido.
- Quien ya había respondido el aviso anterior no lo vuelve a ver (se conserva la misma clave `auracare_cookie_consent`).
- La responsabilidad legal recae hoy en una persona natural. Constituir la empresa es un paso pendiente con efecto legal, no solo de texto.
- Mientras sean borrador, las páginas no deben presentarse como definitivas (sección 8 de `docs/MOBILE-Y-PRIVACIDAD.md`).
