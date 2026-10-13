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
- Racha: día con al menos 1 tarjeta estudiada. Ícono: **sakura** (flor de cerezo), decidido 2026-10-10.
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
Nombre de la app [PROVISORIO 2026-10-10, en discusión]: **Polyglok** (antes «Franui»). Se usa en títulos y textos;
los nombres internos (carpetas, `franui:v1`, esta skill) no cambian.
Logo [DECIDIDO 2026-10-10, ajustado 2026-10-13]: **«POLYGLOK in progress»** (antes decía «Polyglot») en letra de
máquina de escribir (Special Elite, `--font-logo`), con un cursor que parpadea después de «in progress».
Eslogan (por ahora): **«Be fluent in multiple languages»**, en mayúsculas espaciadas bajo una línea.
No se traducen. Estilos en `app/css/logo.css` (una línea, apilado y marca completa con eslogan).
Ícono de la app (pestaña del navegador, pantalla de carga): **un corazón** pixel art, provisorio hasta
encontrar uno definitivo. Kitty: el ícono de cuerpo entero que dibujó Francisca (gato blanco sentado,
collar morado y cascabel), 20×16, en 14 expresiones.

## 9. Estética [DECIDIDO 2026-10-09]
Sensación limpia, simple, lujo "old money", estudio corto. Referencias: Apple, Dior, Chanel, Bvlgari.
Todos los valores viven como variables en `app/css/tokens.css` (cambiarlos solo ahí).
- **Paleta "Higo" de Francisca [DECIDIDO 2026-10-10, reemplaza a la anterior]:**
  Gris piedra `#B4B1AD` · Lino `#CFCDBF` · Higo `#602B27` · Taupe `#8A7C70` · Carbón `#211A18`.
  Otros tonos (fondos, texto secundario) son mezclas más claras u oscuras de estos cinco.
  - Texto: Carbón; texto secundario: Taupe oscurecido `#5C524B`. **Texto siempre oscuro** en modo claro.
  - Botón principal: Higo con letras claras. Fondo Lino aclarado `#E4E2DA`; tarjetas `#F1F0EB`;
    bordes y detalles Gris piedra y Taupe. Zonas oscuras (pie de la web): Carbón con letras Lino.
  - Paletas en Ajustes: Higo (por defecto), Piedra, Carbón, **Tamarindo** y **Medianoche** (2026-10-10).
    Cada una en claro y oscuro. Modo oscuro de Higo: fondo Carbón, texto Lino.
    - Tamarindo: Mountain Boulder `#BFB8B4` · Warm Grey Flannel `#ADA39D` · Ardcoat `#E4DFDF` ·
      Sassafras `#5B3A3E` · Tamarind `#34141A` · Prairie Dog `#936F6A`.
    - Medianoche: Midnight Express `#202937` · Dance of the Goddesses `#E6D7CD` · New Wool `#D4C1B9` ·
      Bluish Black `#423D42` · Trillium `#A99898` · Paradise Grape `#766664`.
    - La página web usa siempre Higo; las paletas son para personalizar la app.
  - Pixel art con los mismos tonos (contornos Carbón, corazones Higo). La sakura conserva su rosado
    y la moneda/estrella su dorado, para que se reconozcan.
  - Descartadas: la paleta Creme/Sand/Dusty Pink/Burgundy (2026-10-09), los rosados fuertes y la rosa/lavanda.
- **Tipografía [CAMBIADA 2026-10-13]:** títulos y palabra de la tarjeta en **Fredoka** (redonda, gruesa,
  alegre); texto en **Nunito** (muy legible). Logo en Special Elite. Descartadas por finas: Bodoni Moda y Jost.
- Dificultad [2026-10-13]: insignia de color con **ícono** y texto blanco: nueva (destello, `#0369A1`),
  difícil (llama, `#B91C1C`), media (medio círculo, `#B45309`), fácil (hoja, `#047857`), dominada (corona, `#6D28D9`).
- Temas [2026-10-13]: **sin subtemas**, solo los 13 mega temas, dibujados como **red de neuronas** (el idioma es
  el núcleo; cada tema, una neurona de su color con anillo de % de avance; impulsos recorren las conexiones).
  Colores `--tema-1…13` en tokens.css. Favoritos separados por idioma (pestañas).
- Accesibilidad: contraste ≥ 4,5:1 (prueba automática), botones ≥ 44 px, nunca solo color.
- Tres formatos: celular, tablet, computador. Modo claro y oscuro.

## 9b. Dinámica y recompensas [DECIDIDO 2026-10-13]
- Tarjeta: **deslizar → = Lo sé, ← = Repasar** (con sello de color y la tarjeta sale volando). Los botones
  quedan como alternativa accesible (y teclado: ← →, 1, 2). El scroll vertical sigue pasando tarjetas.
- Kitty grande abajo a la derecha de la tarjeta, solo como ayuda (abre el chat con «esta palabra»).
- Sonidos sintetizados (`app/js/sonido.js`, sin archivos): clic suave en botones, moneda de tragamonedas al
  responder (las monedas vuelan al contador), «me gusta», voltear, deslizar, rodillos y premio. Vibración
  suave en celulares. Se apagan en Ajustes → «Sonidos y vibración».
- **Premios incrementales**: cada 10 palabras revisadas en el día sale UN aviso de premio (tragamonedas con
  3 rodillos que caen en monedas). Valor 10, 15, 23, 34, 51… (×1,5 cada vez). Se reinicia cada día.
  Lógica en `store.contarRevision` / `premioDeNivel` (con pruebas). Solo cuentan respuestas explícitas.
- Movimiento: cada vista entra con una transición; botones se hunden al tocar; íconos activos rebotan.
  Todo respeta «reducir movimiento».

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

## 11b. Kitty e íconos pixel art [DECIDIDO 2026-10-10]
Todo se dibuja con código (`scripts/kitty-arte.mjs` y `scripts/arte-iconos.mjs`);
`node scripts/kitty.mjs` genera los SVG en `app/assets/` y el catálogo `docs/arte.html`.
- **Kitty = sus 14 expresiones** (`app/assets/caras/`, nombres en `caras.json`). La cara
  **feliz** es el logo (barra, botón de Kitty, inicio, ícono de pestaña, web). Uso: hola → muy feliz;
  encontró la palabra → feliz; no la encontró → confundida; propone frase → guiño; explica la
  tarjeta → orgullosa; fin de sesión → celebrando (o muy feliz); todo al día → orgullosa;
  sin traducción → pensando; favoritos vacíos → enamorada.
- **Sakura** (reemplaza a la patita): 5 pétalos separados con contorno café, muesca en la
  punta y centro más oscuro, como la referencia de Francisca. Ícono de la racha; al terminar una
  sesión caen sakuras. 23×23.
- **Moneda de Kitty tokens**: dorada, contorno grueso, borde brillante, anillo interior, sakura en
  relieve y destello. 24×24. Gira al ganar tokens.
- **Estrella**: polígono de 5 puntas con líneas rectas y caras claras/oscuras (tallada). 21×21.
- **Mensaje** (notificación: burbuja con corazón), **burbuja vacía** para texto (clase CSS
  `.burbuja-texto`, se estira con `border-image`) y **cerezas**.
  [ABIERTO] Cerezas y estrellas serán otras variables de puntos; Francisca las define después.
- Descartado (2026-10-10): Kitty de cuerpo entero, las 12 skins y la patita (no le gustaron).
- **Regla: el pixel art se muestra siempre a escala entera** de su tamaño (×1, ×2, ×3…); si no,
  los pixeles quedan disparejos. Una prueba lo revisa en la app y la web.
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
