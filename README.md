# Franui — Diccionario Políglota

App para aprender el vocabulario y las frases cotidianas de varios idiomas a la vez,
deslizando tarjetas como en TikTok o Reels. Método: recuerdo activo, repetición
espaciada (SRS), Kaizen (sesiones de 1 a 5 minutos) y Kumon (bloques progresivos).

Creadora: **Francisca Ignacia Sanhueza Flores** (Universidad de Chile).

## Probarla

```bash
npm start          # abre http://localhost:5173
```

No necesita instalar nada más (solo Node 20 o superior). La app es HTML, CSS y JavaScript sin dependencias.

## Pruebas

```bash
npm test                                   # lógica, banco, textos, contraste
NODE_PATH=$(npm root -g) npm run test:e2e  # recorrido completo en Chromium (necesita Playwright)
```

## Qué hay

- **Inicio:** entrar, crear cuenta, Google o continuar sin cuenta (las cuentas en la nube llegan en el bloque 4).
- **Idiomas:** inglés, español, portugués, francés, italiano, alemán (Nuevo) y otros (Próximamente).
- **Temas:** los 13 mega temas del banco, con dificultad (fácil/medio/difícil) y bloques de 10.
- **Tarjetas:** palabra grande, traducción que se revela al tocar, tipo, IPA, audio, corazón (favoritos), ícono de dificultad (nueva, difícil, media, fácil, dominada).
- **Kitty tokens**, **racha** (patita de Kitty), **favoritos**, **ranking** (local por ahora), **novedades**.
- **Kitty:** chat en modo diccionario (sin IA conectada todavía).
- **Ajustes:** tema claro/oscuro, 3 paletas, tamaño de letra, brillo, IPA, perfil, sugerencias, tutorial, legal.
- Interfaz en 6 idiomas según el idioma nativo. Celular, tablet y computador.

## Estructura

```
app/                 la app (se publica tal cual)
  css/tokens.css     colores, fuentes y tamaños (cambiar la estética aquí)
  js/                lógica (srs, sesion, store) e interfaz (main)
  data/              idiomas, novedades y banco en JSON (generado)
  assets/            Kitty y patita en pixel art (generados)
banco/               banco de palabras en TSV (fuente de verdad) → ver banco/README.md
scripts/             build del banco, importador, pixel art, servidor local
tests/               pruebas
docs/RECOMENDACIONES.md   recomendaciones de la IA (guardado, traducción, legal, plan…)
.claude/skills/franui     especificación del proyecto para Claude
```

## Publicar

Cualquier hosting estático sirve (GitHub Pages, Netlify, Cloudflare Pages): publica la carpeta `app/`.
