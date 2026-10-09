// Genera el pixel art de Kitty y de la patita de racha como SVG.
// Para retocar: edita las grillas (cada letra = un pixel) y corre `node scripts/kitty.mjs`.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'assets');

// Kitty: gato blanco completo, bigotes blancos, patitas rosadas, collar de perlas.
const KITTY = [
  '..........................',
  '.....O............O.......',
  '....OPO..........OPO......',
  '....OPPO........OPPO......',
  '...OPPPWOOOOOOOOWPPPO.....',
  '...OWPWWWWWWWWWWWWPWO.....',
  '..OWWWWWWWWWWWWWWWWWWO....',
  '..OWWWWWWWWWWWWWWWWWWO....',
  '..OWWEEWWWWWWWWWWEEWWO....',
  'KKKWWEEWWWWWWWWWWEEWWKKK..',
  '..KKWWWWWWWNNWWWWWWWKK....',
  '..OWWWWWWWMWWMWWWWWWWO....',
  '...OWWWWWWWMMWWWWWWWO.....',
  '....OLGLGLGLLGLGLGLO.....O',
  '...OWWWWWWWLLWWWWWWWO...OWO',
  '..OWWWWWWWWWWWWWWWWWWO..OWO',
  '..OWWWWWWWWWWWWWWWWWWO..OWO',
  '.OWWWWWWWWWWWWWWWWWWWWO.OWO',
  '.OWWWWWSWWWWWWWWSWWWWWO.OWO',
  '.OWWWWWSWWWWWWWWSWWWWWOOWWO',
  '.OWWWWWSWWWWWWWWSWWWWWWWWO.',
  '.OPPPWOPPPOWWOPPPOWPPPWWO..',
  '..OOOOOOOOOOOOOOOOOOOOOO...',
  '..........................',
];

const KITTY_COLORS = {
  O: '#4A3B4F', // contorno
  W: '#FFFFFF', // pelaje
  S: '#E4DCE6', // sombra suave
  P: '#F0B6C6', // patitas y orejas
  E: '#2A1F2D', // ojos
  H: '#FFFFFF', // brillo del ojo
  N: '#E37C9C', // nariz
  M: '#4A3B4F', // boca
  K: '#FFFFFF', // bigotes
  L: '#FBF3EA', // perla
  G: '#B9A9B2', // perla en sombra
};

// Patita de racha (rosa y blanco). El contorno se calcula solo.
const PAW = [
  '.............',
  '....W...W....',
  '...WPW.WPW...',
  '...WPW.WPW...',
  '.W..W...W..W.',
  'WPW.......WPW',
  'WPW..WWW..WPW',
  '.W..WPPPW..W.',
  '...WPPPPPW...',
  '..WPPPPPPPW..',
  '..WPPPWPPPW..',
  '...WWW.WWW...',
  '.............',
];
const PAW_COLORS = { W: '#FFFFFF', P: '#F0B6C6', O: '#B4466E' };

function addOutline(grid, fill = 'O') {
  const g = grid.map((r) => r.split(''));
  const h = g.length, w = Math.max(...grid.map((r) => r.length));
  const out = g.map((r) => [...r]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if ((g[y][x] ?? '.') !== '.') continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.');
    if (near) out[y][x] = fill;
  }
  return out.map((r) => r.join(''));
}

function toSvg(grid, colors, { title, background } = {}) {
  const w = Math.max(...grid.map((r) => r.length));
  const h = grid.length;
  const rects = [];
  grid.forEach((row, y) => {
    // une pixeles iguales seguidos en una sola franja para un SVG más liviano
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let len = 1;
      while (row[x + len] === ch) len++;
      if (colors[ch]) rects.push(`<rect x="${x}" y="${y}" width="${len}" height="1" fill="${colors[ch]}"/>`);
      x += len;
    }
  });
  const pad = background ? 3 : 0;
  const size = Math.max(w, h) + pad * 2;
  const ox = (size - w) / 2, oy = (size - h) / 2;
  const bg = background ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="${title}"><title>${title}</title>${bg}<g transform="translate(${ox} ${oy})">${rects.join('')}</g></svg>\n`;
}

writeFileSync(join(OUT, 'kitty.svg'), toSvg(KITTY, KITTY_COLORS, { title: 'Kitty', background: '#F6D2DB' }));
writeFileSync(join(OUT, 'kitty-sola.svg'), toSvg(KITTY, KITTY_COLORS, { title: 'Kitty' }));
writeFileSync(join(OUT, 'patita.svg'), toSvg(addOutline(PAW), PAW_COLORS, { title: 'Racha' }));
console.log('✓ app/assets/kitty.svg, kitty-sola.svg, patita.svg');
