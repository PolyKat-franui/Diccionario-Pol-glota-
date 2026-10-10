// Genera los SVG de Kitty 2.0 a partir de scripts/kitty-arte.mjs.
//   app/assets/kitty.svg        Kitty de cuerpo entero sobre círculo Creme (logo, botón)
//   app/assets/kitty-sola.svg   Kitty sin fondo
//   app/assets/caras/<nombre>.svg  14 expresiones (+ caras.json con sus nombres)
//   app/assets/patita.svg       patita de racha
//   app/assets/moneda.svg       moneda de Kitty tokens
// Uso: node scripts/kitty.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORES, kittyCuerpo, cara, EXPRESIONES, patita, moneda } from './kitty-arte.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'assets');
const CARAS = join(OUT, 'caras');

export function toSvg(filas, { titulo, fondo } = {}) {
  const w = Math.max(...filas.map((r) => r.length));
  const h = filas.length;
  const rects = [];
  filas.forEach((fila, y) => {
    // une pixeles iguales seguidos en una sola franja para un SVG más liviano
    let x = 0;
    while (x < fila.length) {
      const ch = fila[x];
      let largo = 1;
      while (fila[x + largo] === ch) largo++;
      if (COLORES[ch]) rects.push(`<rect x="${x}" y="${y}" width="${largo}" height="1" fill="${COLORES[ch]}"/>`);
      x += largo;
    }
  });
  const pad = fondo ? 4 : 0;
  const lado = Math.max(w, h) + pad * 2;
  const ox = (lado - w) / 2, oy = (lado - h) / 2;
  const circulo = fondo ? `<circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="${fondo}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" role="img" aria-label="${titulo}"><title>${titulo}</title>${circulo}<g transform="translate(${ox} ${oy})">${rects.join('')}</g></svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(CARAS, { recursive: true });
  for (const f of readdirSync(CARAS)) rmSync(join(CARAS, f));
  const cuerpo = kittyCuerpo();
  writeFileSync(join(OUT, 'kitty.svg'), toSvg(cuerpo, { titulo: 'Kitty', fondo: '#EEE4DA' }));
  writeFileSync(join(OUT, 'kitty-sola.svg'), toSvg(cuerpo, { titulo: 'Kitty' }));
  writeFileSync(join(OUT, 'patita.svg'), toSvg(patita(), { titulo: 'Racha' }));
  writeFileSync(join(OUT, 'moneda.svg'), toSvg(moneda(), { titulo: 'Kitty token' }));
  for (const [nombre, { nombre: etiqueta }] of Object.entries(EXPRESIONES)) {
    writeFileSync(join(CARAS, `${nombre}.svg`), toSvg(cara(nombre), { titulo: `Kitty: ${etiqueta}` }));
  }
  const lista = Object.entries(EXPRESIONES).map(([id, { nombre }]) => ({ id, nombre }));
  writeFileSync(join(CARAS, 'caras.json'), JSON.stringify(lista, null, 2) + '\n');
  console.log(`✓ Kitty, patita, moneda y ${Object.keys(EXPRESIONES).length} caras en app/assets/`);
}
