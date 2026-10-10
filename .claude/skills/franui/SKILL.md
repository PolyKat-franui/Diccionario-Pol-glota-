---
name: franui
description: Especificación del proyecto Franui (Diccionario Políglota) — objetivo, idiomas, banco de palabras, tarjetas, SRS, estética, Kitty, rachas, ranking, configuración y reglas de trabajo. Úsala antes de construir o cambiar la app, la página web o el banco de palabras.
---

# Franui — Diccionario Políglota

Lee esto completo antes de tocar la app, la web o el banco.
- **[DECIDIDO]** no se reabre sin que Francisca lo pida.
- **[PROPUESTA]** úsalo, pero avísalo y pregunta si se mantiene.
- **[ABIERTO]** pregunta antes de construir.

Esta versión (2026-10-09) reemplaza al "Plan maestro" anterior donde se contradicen:
pasan a ser **6 idiomas** (se suma portugués), el nombre provisional es **Franui**,
la estética es **lujo rosado/perla** y el proyecto es una **startup**.

## 1. Objetivo [DECIDIDO]
App para aprender vocabulario y frases cotidianas de varios idiomas a la vez, sin
los pasos obligados de apps como Duolingo. Recuerdo activo + repetición espaciada
(SRS), sesiones rápidas, repetir frases para perder el miedo a hablar.
Formato tipo TikTok / Reels / Tinder: se desliza para pasar al siguiente contenido.
Interactiva, enfocada a juego, "dopamina rápida".

- Creadora: Francisca Ignacia Sanhueza Flores (Universidad de Chile).
- Público: cualquiera con celular, tablet o computador.
- La interfaz se traduce al **idioma nativo** que elige la persona.
- Es una startup: antes de publicar, revisar licencias de las fuentes (Wiktionary
  CC BY-SA, Tatoeba CC BY) y el apartado legal.

## 2. Idiomas [DECIDIDO]
Primera prueba: inglés, español, portugués, francés, italiano, alemán.
Cualquiera puede ser nativo o idioma a aprender.
Estados de un idioma (`app/data/idiomas.json`): `disponible`, `nuevo` (colorido +
etiqueta "Nuevo"), `proximamente` (gris + etiqueta "Próximamente", no se puede abrir).

## 3. Banco de palabras [DECIDIDO]
- Banco base en inglés: 5.000 filas cerradas (no agregar ni quitar).
  Columnas: palabra, tipo, mega_tema, tema, nivel, rango_1000, fuentes. "|" separa
  varios valores. Una palabra puede tener varios temas.
- 13 mega temas: Conversación y vida social; Lenguaje, números y tiempo; Personas y
  relaciones; Cuerpo, salud y emociones; Comida y bebida; Hogar y vida diaria; Ropa
  y compras; Lugares y viajes; Naturaleza y animales; Trabajo, estudios y sociedad;
  Ocio, arte y tecnología; Descripción y formas; Acciones y mente.
- Modelo en el repo: **concepto + traducciones** (ver `banco/README.md`).
  - `banco/conceptos.tsv`: una fila por concepto del banco inglés, con `id`.
  - `banco/traducciones/<idioma>.tsv`: `id, texto, ipa, estado, fuente`.
  - `estado` = `borrador` hasta que una persona lo confirma → `revisada`.
    Nunca mostrar un borrador como definitivo (la tarjeta lleva la marca).
  - `node scripts/build-banco.mjs` genera `app/data/banco/<idioma>.json`.
- Fuentes: Wiktionary (palabras, traducciones, IPA, audio) y Tatoeba (frases).
- Estado 2026-10-09: inglés 5.000/5.000; los otros 5 idiomas 313/5.000 ("Conversación y
  vida social" completo), todo `borrador`. Detalle en `banco/README.md`.
- Orden: primero lo cotidiano, después lo complejo.

## 4. Método de estudio [DECIDIDO]
- **Kaizen**: microsesiones de 1 a 5 min. Bloques de 10 tarjetas.
- **Kumon**: temas en bloques progresivos; un bloque se domina antes de abrir el siguiente.
- **Anki / SRS** (`app/js/srs.js`): cajas con intervalos crecientes
  (caja 0 = misma sesión, 1 = 1 día, 2 = 3 días, 3 = 7 días, 4 = 21 días, 5 = 60 días).
  Acierto sube una caja, fallo vuelve a la 0 y la tarjeta reaparece en la sesión.
- Íconos de dificultad (círculo con color + palabra, nunca solo color):
  nueva, difícil, media, fácil, dominada.

## 5. Tarjeta [DECIDIDO + PROPUESTA]
Muestra: palabra/frase grande en el idioma a aprender, debajo la traducción al
idioma nativo (tamaño normal), tipo gramatical, ícono de dificultad, corazón,
botón de audio, IPA como ayuda opcional (pequeña).
- [PROPUESTA] La traducción aparece **difuminada** y se revela al tocar (recuerdo activo).
- Riel derecho (estilo reels): corazón, audio y Kitty.
- [DECIDIDO 2026-10-09] El **corazón = favoritos**. El "lo aprendí fácil" es un botón aparte
  (✓ "Lo sé"). Deslizar sin marcar = "repasar" → vuelve a salir.
  Motivo: la especificación usaba el corazón para dos cosas a la vez.

## 6. Variables [DECIDIDO]
- Kitty tokens: +1 por tarjeta revisada, +5 al terminar una sesión.
- Racha: día con al menos 1 tarjeta estudiada. Ícono: patita de Kitty rosa y blanca.
- Favoritos: carpeta "Palabras favoritas".

## 7. Pronunciación
- Prototipo: voz del navegador (Web Speech API). [DECIDIDO]
- Audio de Wiktionary / servicio TTS y reconocimiento de voz: tarea secundaria.

## 8. Kitty (chatbot) [DECIDIDO + ABIERTO]
Ícono de Kitty en app y web. Responde en el idioma nativo, corto y directo, propone
frases con vocabulario conocido, avanza en dificultad sin repetir, corrige breve y
marca lo corregido, no mezcla pronunciaciones.
[ABIERTO] Proveedor de IA. Nota técnica: una app no puede "usar la cuenta de Google"
de alguien para hablar con Claude/ChatGPT/Gemini; se necesita una API con clave
guardada en un servidor propio (nunca en el navegador). Ver `docs/RECOMENDACIONES.md`.
Logo: pixel art, gato blanco completo, bigotes blancos, patitas rosadas, collar de perlas
(`app/assets/kitty.svg`, generado por `scripts/kitty.mjs`).

## 9. Estética [DECIDIDO 2026-10-09]
Sensación limpia, simple, lujo "old money", estudio corto. Referencias: Apple, Dior, Chanel, Bvlgari.
Todos los valores viven como variables en `app/css/tokens.css` (cambiarlos solo ahí).
- **Paleta de Francisca:** Creme `#EEE4DA` · Sand `#D8C4AC` · Dusty Pink `#C8A49F` ·
  Burgundy `#4D0E13` · Deep Taupe `#7E615F` · Rose Ebony `#634649` · Old Burgundy `#493036` ·
  Boy Red `#6F5E53` · Black Shadows `#C0B7B0`.
  - Texto: Old Burgundy; texto secundario: Boy Red. **Texto siempre oscuro.**
  - Botón principal: Burgundy con letras Creme. Fondos Creme; detalles Dusty Pink y Sand.
  - Paletas en Ajustes: Crema (por defecto), Taupe, Arena. Modo oscuro con los mismos tonos.
  - Descartados: rosados fuertes (#F0B6C6, #8E2F55) y la paleta rosa/lavanda anterior.
- **Tipografía:** títulos y palabra de la tarjeta en **Bodoni Moda** (serif de alto contraste,
  estilo moda); texto en **Jost** (sans geométrica fina); IPA en Noto Sans. Etiquetas en
  mayúsculas con mucho espaciado.
- Dificultad: nueva `#6F5E53`, difícil `#8E1B24`, media `#87561F`, fácil `#3F5B40`,
  dominada `#4B3A6B` (oscuro: versiones más claras).
- Accesibilidad: contraste ≥ 4,5:1 (prueba automática), botones ≥ 44 px, nunca solo color.
- Tres formatos: celular, tablet, computador. Modo claro y oscuro.

## 10. Pantallas de la app
Inicio/cuenta (Entrar, Crear cuenta con usuario + contraseña ≥ 6, Google, Invitado) —
[DECIDIDO 2026-10-09] se pide **antes de estudiar**, solo la primera vez; la sesión queda
guardada y no se vuelve a pedir ·
¿Qué avance conservo? (cuenta vs navegador, con tokens/ejercicios/racha) ·
Barra superior (secciones, racha, tokens, perfil, idioma nativo, configuración) ·
Idiomas → Temas (+ dificultad) → Feed de tarjetas · Favoritos · Ranking (racha;
palabras nuevas = después) · Novedades (compartidas con la web) · Configuración
(brillo, paleta, tamaño de letra, tema claro/oscuro/sistema, perfil, Kitty, favoritos,
sugerencias, tutorial, cosméticos, apoyar, legal).

## 11. Página web [HECHA v0.2 — 2026-10-09]
`web/` (se publica en `/`; la app va en `/app/`). Usa los mismos tokens, logo, `idiomas.json`
y `novedades.json` que la app. Secciones: portada (título + "Hola" que cambia de idioma +
teléfono con tarjetas reales), cifras tipo tablero de aeropuerto, manifiesto que se enciende
al hacer scroll, método, cómo funciona, idiomas, Kitty, creadora, novedades + "lo que viene",
llamado final y pie legal ("en preparación"). Kitty responde preguntas frecuentes.
- Pendiente de Francisca: foto (`web/img/francisca.jpg`) y 2–3 líneas propias para "La creadora".
- Sin cifras inventadas ni testimonios falsos (ver docs/RECOMENDACIONES.md §8).

## 11b. Kitty 2.0 [HECHO v0.3 — diseño aprobado por Francisca 2026-10-10]
Todo el pixel art se dibuja con código en `scripts/kitty-arte.mjs`; `node scripts/kitty.mjs`
genera los SVG en `app/assets/` (una prueba falla si quedan desactualizados).
- **Kitty**: gata blanca **delgada en forma de campana** (cabeza angosta con orejas, cuerpo que
  se ensancha, dos patitas abajo, cola en "?"), ojos verticales juntos, mejillas Dusty Pink,
  collar de perlas, contorno Old Burgundy y un destello dorado. Sin bigotes oscuros.
- **14 expresiones** (`app/assets/caras/`, nombres en `caras.json`): feliz, muy feliz, guiño,
  sorprendida, confundida, mareada, enamorada, llorando, enojada, con sueño, avergonzada,
  orgullosa, pensando, celebrando. Uso en la app: hola → muy feliz; encontró la palabra → feliz;
  no la encontró → confundida; propone frase → guiño; explica la tarjeta → orgullosa;
  fin de sesión → celebrando (o muy feliz); todo al día → orgullosa; sin traducción → pensando;
  favoritos vacíos → enamorada. La web muestra la galería completa.
- **Patita**: simple, blanca con contorno grueso y almohadillas rosadas grandes (3 dedos + 1).
- **Moneda de Kitty tokens**: dorada, redonda, con la misma patita grabada; gira al ganar tokens.
- Referencias de Francisca: no se guardan en el repo (tienen derechos de autor).

## 12. Reglas de trabajo [DECIDIDO]
- Hablar en español, texto corto y fácil de leer en el celular.
- Explore → Plan → Code → Commit. Un bloque a la vez.
- Probar todo lo construido (`npm test`) y decir claramente qué no se pudo probar.
- Un commit con mensaje claro tras cada paso que funcione.
- No agregar ni quitar palabras del banco de inglés.
- Traducciones generadas = `borrador` hasta revisión humana.

## 13. Preguntas abiertas
Confirmar paleta y fuentes · Proveedor de IA de Kitty y costo · Dónde vive la cuenta
(propuesta: Supabase) · Nombre final.
