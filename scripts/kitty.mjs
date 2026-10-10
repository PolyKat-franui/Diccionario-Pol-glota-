// Genera todo el pixel art de Franui como SVG (tamaño exacto, sin deformar).
//   app/assets/caras/<id>.svg      14 expresiones de Kitty, 28×24 (+ caras.json). Logo = caras/feliz.svg
//   app/assets/sakura.svg · moneda.svg · estrella.svg · cerezas.svg · mensaje.svg · burbuja.svg
//   docs/arte.html                 catálogo visual de todo lo anterior
// Regla: mostrar siempre a escala entera (ancho × 1, 2, 3…) para que los pixeles no se deformen.
// Uso: node scripts/kitty.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cara, EXPRESIONES } from './kitty-arte.mjs';
import { COLORES } from './kitty-arte.mjs';
import { ICONOS } from './arte-iconos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(RAIZ, 'app', 'assets');

/** filas → SVG con viewBox del tamaño exacto del dibujo. */
export function toSvg(filas, { titulo, colores = COLORES } = {}) {
  const w = Math.max(...filas.map((r) => r.length));
  const h = filas.length;
  const rects = [];
  filas.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      const ch = fila[x];
      let largo = 1;
      while (fila[x + largo] === ch) largo++;
      if (colores[ch]) rects.push(`<rect x="${x}" y="${y}" width="${largo}" height="1" fill="${colores[ch]}"/>`);
      x += largo;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" role="img" aria-label="${titulo}"><title>${titulo}</title>${rects.join('')}</svg>\n`;
}

const TITULOS = { sakura: 'Racha', moneda: 'Kitty token', estrella: 'Estrella', cerezas: 'Cerezas', mensaje: 'Mensaje', burbuja: 'Burbuja de texto' };

/** Todos los archivos que se generan: { ruta relativa a app/assets: svg }. */
export function archivos() {
  const out = {};
  for (const [id, f] of Object.entries(ICONOS)) {
    const { filas, colores } = f();
    out[`${id}.svg`] = toSvg(filas, { titulo: TITULOS[id], colores });
  }
  for (const [id, { nombre }] of Object.entries(EXPRESIONES)) out[`caras/${id}.svg`] = toSvg(cara(id), { titulo: `Kitty: ${nombre}` });
  out['caras/caras.json'] = JSON.stringify(Object.entries(EXPRESIONES).map(([id, { nombre }]) => ({ id, nombre })), null, 2) + '\n';
  return out;
}

function catalogo(lista) {
  const fila = (titulo, items) => `<h2>${titulo}</h2><div class="g">${items.join('')}</div>`;
  const img = (ruta, nombre, k = 3) => `<figure><img src="../app/assets/${ruta}" style="zoom:${k}" alt=""><figcaption>${nombre}</figcaption></figure>`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Franui — catálogo de pixel art</title>
<style>body{font:15px system-ui;background:#F4EDE6;color:#493036;margin:24px}h1,h2{font-weight:500}.g{display:flex;flex-wrap:wrap;gap:20px;align-items:end}
figure{margin:0;display:grid;justify-items:center;gap:6px}img{image-rendering:pixelated}p{max-width:640px}</style>
<h1>Franui — catálogo de pixel art</h1>
<p>Generado por <code>node scripts/kitty.mjs</code>. Mostrar siempre a escala entera (×1, ×2, ×3…).</p>
${fila('Íconos', Object.keys(ICONOS).map((id) => img(`${id}.svg`, TITULOS[id], 4)))}
${fila('Kitty (sus expresiones; «Feliz» es el logo)', lista.caras.map((c) => img(`caras/${c.id}.svg`, c.nombre)))}
<h2>Burbuja con texto</h2>
<link rel="stylesheet" href="../app/css/app.css">
<p><span class="burbuja-texto">¡Hola! Soy Kitty.</span></p>
<p><span class="burbuja-texto">La burbuja se estira sola con textos más largos, sin deformarse.</span></p>
</html>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const dir of ['caras']) {
    mkdirSync(join(OUT, dir), { recursive: true });
    for (const f of readdirSync(join(OUT, dir))) rmSync(join(OUT, dir, f));
  }
  const todo = archivos();
  for (const [ruta, contenido] of Object.entries(todo)) writeFileSync(join(OUT, ruta), contenido);
  writeFileSync(join(RAIZ, 'docs', 'arte.html'), catalogo({ caras: JSON.parse(todo['caras/caras.json']) }));
  console.log(`✓ ${Object.keys(todo).length} archivos en app/assets/ y catálogo en docs/arte.html`);
}
