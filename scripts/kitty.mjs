// Genera todo el pixel art de Franui como SVG (tamaño exacto, sin deformar).
//   app/assets/kitty.svg           Kitty sobre círculo Creme, 32×32 (usar a 32, 64, 96, 128… px)
//   app/assets/kitty-sola.svg      Kitty sin fondo, 29×25
//   app/assets/caras/<id>.svg      14 expresiones, 28×24 (+ caras.json)
//   app/assets/skins/<id>.svg      12 skins de Kitty, 21×21 (+ skins.json)
//   app/assets/patita.svg · moneda.svg · estrella.svg · cerezas.svg · mensaje.svg · burbuja.svg
//   docs/arte.html                 catálogo visual de todo lo anterior
// Regla: mostrar siempre a escala entera (ancho × 1, 2, 3…) para que los pixeles no se deformen.
// Uso: node scripts/kitty.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORES, kittyCuerpo, cara, EXPRESIONES } from './kitty-arte.mjs';
import { ICONOS } from './arte-iconos.mjs';
import { SKINS, skin } from './arte-skins.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(RAIZ, 'app', 'assets');

/** filas → SVG. Sin fondo: viewBox del tamaño exacto. Con fondo: círculo de `lado` px y desplazamiento entero. */
export function toSvg(filas, { titulo, fondo, lado, colores = COLORES } = {}) {
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
  const W = fondo ? lado : w, H = fondo ? lado : h;
  const ox = fondo ? Math.floor((lado - w) / 2) : 0, oy = fondo ? Math.ceil((lado - h) / 2) : 0;
  const circulo = fondo ? `<circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="${fondo}"/>` : '';
  const grupo = ox || oy ? `<g transform="translate(${ox} ${oy})">${rects.join('')}</g>` : rects.join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges" role="img" aria-label="${titulo}"><title>${titulo}</title>${circulo}${grupo}</svg>\n`;
}

const TITULOS = { patita: 'Racha', moneda: 'Kitty token', estrella: 'Estrella', cerezas: 'Cerezas', mensaje: 'Mensaje', burbuja: 'Burbuja de texto' };

/** Todos los archivos que se generan: { ruta relativa a app/assets: svg }. */
export function archivos() {
  const out = {};
  const cuerpo = kittyCuerpo();
  out['kitty.svg'] = toSvg(cuerpo, { titulo: 'Kitty', fondo: '#EEE4DA', lado: 32 });
  out['kitty-sola.svg'] = toSvg(cuerpo, { titulo: 'Kitty' });
  for (const [id, f] of Object.entries(ICONOS)) {
    const { filas, colores } = f();
    out[`${id}.svg`] = toSvg(filas, { titulo: TITULOS[id], colores });
  }
  for (const [id, { nombre }] of Object.entries(EXPRESIONES)) out[`caras/${id}.svg`] = toSvg(cara(id), { titulo: `Kitty: ${nombre}` });
  for (const s of SKINS) {
    const { filas, colores } = skin(s.id);
    out[`skins/${s.id}.svg`] = toSvg(filas, { titulo: `Kitty ${s.nombre}`, colores });
  }
  out['caras/caras.json'] = JSON.stringify(Object.entries(EXPRESIONES).map(([id, { nombre }]) => ({ id, nombre })), null, 2) + '\n';
  out['skins/skins.json'] = JSON.stringify(SKINS.map(({ id, nombre, accesorio }) => ({ id, nombre, accesorio })), null, 2) + '\n';
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
${fila('Kitty', [img('kitty.svg', 'Kitty (logo)', 4), img('kitty-sola.svg', 'Kitty sin fondo', 4)])}
${fila('Íconos', Object.keys(ICONOS).map((id) => img(`${id}.svg`, TITULOS[id], 4)))}
${fila('Expresiones', lista.caras.map((c) => img(`caras/${c.id}.svg`, c.nombre)))}
${fila('Skins', lista.skins.map((s) => img(`skins/${s.id}.svg`, s.nombre, 4)))}
<h2>Burbuja con texto</h2>
<link rel="stylesheet" href="../app/css/app.css">
<p><span class="burbuja-texto">¡Hola! Soy Kitty.</span></p>
<p><span class="burbuja-texto">La burbuja se estira sola con textos más largos, sin deformarse.</span></p>
</html>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const dir of ['caras', 'skins']) {
    mkdirSync(join(OUT, dir), { recursive: true });
    for (const f of readdirSync(join(OUT, dir))) rmSync(join(OUT, dir, f));
  }
  const todo = archivos();
  for (const [ruta, contenido] of Object.entries(todo)) writeFileSync(join(OUT, ruta), contenido);
  writeFileSync(join(RAIZ, 'docs', 'arte.html'), catalogo({ caras: JSON.parse(todo['caras/caras.json']), skins: SKINS }));
  console.log(`✓ ${Object.keys(todo).length} archivos en app/assets/ y catálogo en docs/arte.html`);
}
