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
- [PROPUESTA] El **corazón = favoritos**. El "lo aprendí fácil" es un botón aparte
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

## 9. Estética [PROPUESTA]
Sensación limpia, simple, lujo, estudio corto. Referencias: Apple, Dior, Chanel, Bvlgari.
Todos los valores viven como variables en `app/css/tokens.css` (cambiarlos solo ahí).
- Paleta de prueba de Francisca: `#EAD1D7 #F0B6C6 #F6D2DB #F4F4F6 #AEB6C2`.
  Esos tonos son claros: se usan para fondos, superficies y acentos. Para texto y
  botones se agregan tonos oscuros (tinta `#2A1F2D`, rosa profundo `#8E2F55`) para
  cumplir contraste 4,5:1.
- Tipografía: títulos y palabra de la tarjeta en **Cormorant Garamond** (serif de
  lujo); cuerpo, IPA y botones en **Noto Sans** (acentos y símbolos IPA).
- Dificultad: nueva `#5F6673`, difícil `#B3261E`, media `#8A5300`, fácil `#2E7D4F`,
  dominada `#6B3FA0` (oscuro: versiones más claras).
- Accesibilidad: contraste ≥ 4,5:1, botones ≥ 44 px, nunca solo color.
- Tres formatos: celular, tablet, computador. Modo claro y oscuro.

## 10. Pantallas de la app
Inicio/cuenta (Entrar, Crear cuenta con usuario + contraseña ≥ 6, Google, Invitado) ·
¿Qué avance conservo? (cuenta vs navegador, con tokens/ejercicios/racha) ·
Barra superior (secciones, racha, tokens, perfil, idioma nativo, configuración) ·
Idiomas → Temas (+ dificultad) → Feed de tarjetas · Favoritos · Ranking (racha;
palabras nuevas = después) · Novedades (compartidas con la web) · Configuración
(brillo, paleta, tamaño de letra, tema claro/oscuro/sistema, perfil, Kitty, favoritos,
sugerencias, tutorial, cosméticos, apoyar, legal).

## 11. Página web
Promociona la app con la misma estética: uso, trayectoria, alcance, objetivo,
apartado de la creadora, novedades. Transiciones inspiradas en Apple/Dior/Chanel.

## 12. Reglas de trabajo [DECIDIDO]
- Hablar en español, texto corto y fácil de leer en el celular.
- Explore → Plan → Code → Commit. Un bloque a la vez.
- Probar todo lo construido (`npm test`) y decir claramente qué no se pudo probar.
- Un commit con mensaje claro tras cada paso que funcione.
- No agregar ni quitar palabras del banco de inglés.
- Traducciones generadas = `borrador` hasta revisión humana.

## 13. Preguntas abiertas
Confirmar paleta y fuentes · Proveedor de IA de Kitty y costo · Dónde vive la cuenta
(propuesta: Supabase) · Corazón = favoritos (confirmar) · ¿Cuenta antes o después de la
primera sesión? · Nombre final.
