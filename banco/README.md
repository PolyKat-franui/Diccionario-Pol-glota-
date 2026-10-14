# Banco de palabras

| Archivo | Qué es |
|---|---|
| `banco_palabras_ingles.tsv` | Banco original de Francisca (5.000 filas, **cerrado**: no agregar ni quitar). |
| `conceptos.tsv` | El mismo banco con un `id` estable por fila (`en0001` … `en5000`). |
| `traducciones/<idioma>.tsv` | Una fila por concepto traducido: `id, texto, ipa, estado, fuente`. |

- `estado`: `borrador` (sin revisar) o `revisada` (confirmada por una persona).
  La app muestra "Traducción en revisión" en los borradores.
- `fuente`: de dónde salió (`ia`, `wiktionary`, `deepl`, `manual`…).
- Sustantivos con artículo (`el agua`, `der Kaffee`) para aprender el género.
- Palabras con dos usos (`sustantivo|verbo`) se traducen como `la respuesta / responder`.
- Inglés (`en.tsv`) = las palabras del banco, todas `revisada`.

## Cómo trabajar

1. Edita el TSV (Excel, Google Sheets o un editor de texto; guarda como TSV UTF-8).
2. `npm run build` → valida y genera `app/data/banco/*.json`.
3. `npm test` → comprueba que todo sigue bien.
4. Commit.

Para revisar una traducción: cambia `borrador` por `revisada` en su fila.

## Agregar un idioma

1. Crea `traducciones/<código>.tsv` con el mismo encabezado.
2. Agrégalo en `app/data/idiomas.json` (`disponible`, `nuevo` o `proximamente`).
3. Si también será idioma de la interfaz: agrega su bloque en `app/js/i18n.js`.

## Si cambia el banco de inglés

`node scripts/importar-banco-ingles.mjs banco/banco_palabras_ingles.tsv`
conserva los `id` existentes (misma palabra + tipo), así no se pierden traducciones ni progreso.

## Oraciones de ejemplo

`ejemplos/<código>.tsv` (columnas `id`, `ejemplo`, `nota`, `estado`, `fuente`):

- `ejemplo`: oración corta; la palabra de la tarjeta va entre `*asteriscos*` una vez.
- `nota`: solo en idiomas nativos, aclara una confusión de la palabra en inglés
  (p. ej. *account* vs *bill*). Se abre tocando «💡 Ojo con esta palabra».
- Todo lo generado con IA va como `borrador`.

`npm run build` crea `app/data/banco/ej-<código>.json`.

## Estado (2026-10-14)

- Inglés, español, portugués, francés, italiano y alemán: 5.000 / 5.000 (traducciones en `borrador`).
- Ejemplos: las 1.000 palabras más usadas en los 6 idiomas, en `borrador`.
