# Franui — instrucciones para Claude

- Antes de trabajar, lee `.claude/skills/franui/SKILL.md` (especificación y decisiones).
- Habla con Francisca en español, con texto corto y fácil de leer en el celular.
- Flujo: Explore → Plan → Code → Commit. Un bloque a la vez (plan en `docs/RECOMENDACIONES.md`).
- Después de cambiar algo: `npm test` y, si tocas la interfaz, `NODE_PATH=$(npm root -g) npm run test:e2e`.
  Di claramente qué no se pudo probar.
- Si cambias `banco/`: `npm run build` y commitea también `app/data/banco/`.
- No agregar ni quitar palabras de `banco/banco_palabras_ingles.tsv`.
- Toda traducción generada va como `borrador`.
- Colores y fuentes solo en `app/css/tokens.css`. Contraste ≥ 4,5:1, botones ≥ 44 px, nunca solo color.
- Textos de interfaz: agregar la clave en los 6 idiomas de `app/js/i18n.js` (hay una prueba que lo exige).
- Commit con mensaje claro después de cada paso que funcione.
