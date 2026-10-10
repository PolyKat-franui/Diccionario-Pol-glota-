// Íconos pixel art de Franui: patita, moneda, estrella, cerezas, notificación y burbuja vacía.
// Cada función devuelve { filas, colores }. Se exportan en tamaño exacto (sin relleno)
// y se muestran siempre a escala entera (1x, 2x, 3x…) para que no se deformen.
import { lienzo, pon, ponTodos, silueta, sello, contornear, aTexto } from './kitty-arte.mjs';

/** Distancia al centro, para dibujar círculos. */
const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

/** Sombra: pinta `c` en el vacío que está justo abajo/derecha de algo dibujado. */
function sombra(g, c = 's', dx = 1, dy = 1) {
  const copia = g.map((r) => [...r]);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (copia[y][x] !== '.') continue;
    if ((copia[y - dy]?.[x - dx] ?? '.') !== '.') g[y][x] = c;
  }
}

// ---------- Patita (como la referencia: 3 dedos con anillo + almohadilla con hendidura) ----------
export function patita() {
  const g = lienzo(20, 18);
  // silueta con 3 bultos arriba (un dedo central y dos laterales)
  silueta(g, 10, { 1: 2, 2: 3, 3: 3, 4: 8, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9, 10: 9, 11: 9, 12: 9, 13: 9, 14: 8, 15: 7, 16: 5 }, 'W');
  ponTodos(g, [[3, 2], [4, 2], [5, 2], [14, 2], [15, 2], [16, 2], [2, 3], [3, 3], [4, 3], [5, 3], [14, 3], [15, 3], [16, 3], [17, 3]], 'W');
  contornear(g);
  // dedo central
  ponTodos(g, [[9, 2], [10, 2], [8, 3], [11, 3], [8, 4], [11, 4], [9, 5], [10, 5]], 'O');
  ponTodos(g, [[9, 3], [10, 3], [9, 4], [10, 4]], 'P');
  // dedos laterales (bajo cada bulto)
  for (const x0 of [2, 14]) {
    ponTodos(g, [[x0 + 1, 3], [x0 + 2, 3], [x0, 4], [x0 + 3, 4], [x0, 5], [x0 + 3, 5], [x0 + 1, 6], [x0 + 2, 6]], 'O');
    ponTodos(g, [[x0 + 1, 4], [x0 + 2, 4], [x0 + 1, 5], [x0 + 2, 5]], 'P');
  }
  // almohadilla grande con hendidura abajo
  sello(g, 5, 8, [
    '..OOOOOO..',
    '.OPPPPPPO.',
    'OPPPPPPPPO',
    'OPPPPPPPPO',
    'OPPPPPPPPO',
    'OPPPOOPPPO',
    '.OOO..OOO.',
  ]);
  return { filas: aTexto(g), colores: { O: '#493036', W: '#FFFFFF', P: '#E8AFAA' } };
}

// ---------- Moneda de Kitty tokens (como la referencia, con la patita en relieve) ----------
export function moneda() {
  const n = 24, c = 11.5;
  const g = lienzo(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (dist(x, y, c, c) <= 10.6) g[y][x] = 'f';
  contornear(g, 'o');
  const copia = g.map((r) => [...r]);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (copia[y][x] !== 'f') continue;
    const d = dist(x, y, c, c);
    if (d > 8.7) g[y][x] = x + y < 22 ? 'l' : 'd';      // borde: claro arriba-izquierda, oscuro abajo-derecha
    else if (d > 7.7) g[y][x] = 'r';                      // anillo interior
  }
  // brillos en el borde
  ponTodos(g, [[6, 3], [5, 4], [4, 5], [3, 7], [7, 3]], 'h');
  ponTodos(g, [[20, 13], [20, 14], [19, 16]], 'h');
  // patita en relieve: contorno oscuro y relleno claro
  const p = lienzo(12, 11);
  sello(p, 1, 1, [
    '....WW....',
    '.W..WW..W.',
    '.W......W.',
    '...WWWW...',
    '..WWWWWW..',
    '..WWWWWW..',
    '..WW..WW..',
  ]);
  ponTodos(p, [[5, 1], [6, 1]], 'W');
  contornear(p, 'r');
  sello(g, 6, 6, aTexto(p), { W: 'l' });
  ponTodos(g, [[11, 8], [8, 9]], 'h');
  // destello arriba a la derecha
  sello(g, 18, 0, ['..h..', '..h..', 'hhhhh', '..h..', '..h..'].map((f) => f.replace(/h/g, 'H')));
  return { filas: aTexto(g), colores: { o: '#5A3418', d: '#C98A2E', f: '#F2BE4A', l: '#FCDB7E', r: '#B8701E', h: '#FFF6D8', H: '#FFFFFF' } };
}

// ---------- Estrella (otra variable de puntos, por definir) ----------
export function estrella() {
  const g = lienzo(17, 16);
  sello(g, 1, 1, [
    '.......Y.......',
    '......YYY......',
    '......YYY......',
    '.....YYYYY.....',
    'YYYYYYYYYYYYYYY',
    '.YYYYYYYYYYYYY.',
    '..YYYYYYYYYYY..',
    '...YYYYYYYYY...',
    '...YYYYYYYYY...',
    '..YYYYY.YYYYY..',
    '..YYYY...YYYY..',
    '.YYY.......YYY.',
  ]);
  contornear(g, 'o');
  // volumen: claro a la izquierda, dorado a la derecha, brillo arriba
  for (let y = 0; y < 16; y++) for (let x = 0; x < 17; x++) if (g[y][x] === 'Y' && x > 8 && y > 4) g[y][x] = 'D';
  ponTodos(g, [[8, 3], [8, 4], [7, 5], [7, 6]], 'h');
  ponTodos(g, [[4, 6], [5, 6], [3, 6]], 'l');
  return { filas: aTexto(g), colores: { o: '#B8611E', Y: '#FFD75A', D: '#F2B33A', l: '#FFF0A8', h: '#FFFFFF' } };
}

// ---------- Cerezas (otra variable de puntos, por definir) ----------
export function cerezas() {
  const g = lienzo(18, 17);
  for (const [cx, cy] of [[5.5, 11.5], [11.5, 12.5]]) {
    for (let y = 0; y < 17; y++) for (let x = 0; x < 18; x++) if (dist(x, y, cx, cy) <= 3.6) g[y][x] = 'R';
  }
  contornear(g, 'o');
  // separación entre las dos cerezas
  ponTodos(g, [[8, 10], [8, 11], [8, 12], [9, 13]], 'o');
  // sombra y brillo de cada cereza
  for (let y = 0; y < 17; y++) for (let x = 0; x < 18; x++) {
    if (g[y][x] !== 'R') continue;
    const izq = x <= 8;
    const [cx, cy] = izq ? [5.5, 11.5] : [11.5, 12.5];
    if ((x - cx) + (y - cy) > 2.2) g[y][x] = 'D';
  }
  ponTodos(g, [[4, 10], [4, 11], [3, 11]], 'h');
  ponTodos(g, [[10, 11], [10, 12], [9, 12]], 'h');
  // tallos y hojas
  ponTodos(g, [[5, 7], [6, 6], [7, 5], [8, 4], [9, 3], [11, 8], [11, 7], [10, 6], [10, 5], [10, 4], [9, 3], [9, 2]], 't');
  sello(g, 10, 0, ['.ttttt', 'tVVVVt', '.tVVt.', '..tt..']);
  sello(g, 3, 1, ['.ttt.', 'tVVVt', '.ttt.']);
  return { filas: aTexto(g), colores: { o: '#4D0E13', R: '#A8323E', D: '#7E1F2B', h: '#E8707A', t: '#3F5B40', V: '#8FB06A' } };
}

// ---------- Mensaje (ícono de notificación: burbuja con corazón) ----------
export function mensaje() {
  const g = lienzo(22, 20);
  sello(g, 1, 1, [
    '...WWWWWWWWWWWW...',
    '.WWWWWWWWWWWWWWWW.',
    'WWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWW',
    '.WWWWWWWWWWWWWWWW.',
    '...WWWWWWWWWWWW...',
    '....WWW...........',
    '....WW............',
    '....W.............',
  ]);
  contornear(g, 'o');
  sombra(g, 's');
  // sombra interior suave abajo a la derecha
  for (let y = 0; y < 20; y++) for (let x = 0; x < 22; x++) if (g[y][x] === 'W' && (g[y + 1]?.[x] === 'o' || g[y][x + 1] === 'o')) g[y][x] = 'S';
  // corazón
  sello(g, 7, 4, [
    '.RR.RR.',
    'RhRRRRR',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...',
  ]);
  return { filas: aTexto(g), colores: { o: '#7E615F', W: '#F6EEE6', S: '#E4D6CA', s: 'rgba(73,48,54,.18)', R: '#B54A55', h: '#E9A0A6' } };
}

// ---------- Burbuja vacía (para poner texto encima; se estira con CSS border-image) ----------
export function burbuja() {
  const g = lienzo(32, 22);
  sello(g, 1, 4, [
    '..WWWWWWWWWWWWWWWWWWWWWWWWW..',
    '.WWWWWWWWWWWWWWWWWWWWWWWWWWW.',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    '.WWWWWWWWWWWWWWWWWWWWWWWWWWW.',
    '..WWWWWWWWWWWWWWWWWWWWWWWWW..',
    '......................WWW....',
    '.......................WW....',
    '........................W....',
  ]);
  contornear(g, 'o');
  // sombra interior abajo
  for (let y = 0; y < 22; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'W' && g[y + 1]?.[x] === 'o') g[y][x] = 'S';
  // estrellita en la esquina
  const e = lienzo(9, 8);
  sello(e, 1, 1, ['...Y...', '..YYY..', 'YYYYYYY', '.YYYYY.', '.YY.YY.']);
  contornear(e, 'o');
  sello(g, 0, 0, aTexto(e));
  return { filas: aTexto(g), colores: { o: '#7E615F', W: '#FFFDF9', S: '#EAE0D6', Y: '#E4B95B' } };
}

export const ICONOS = { patita, moneda, estrella, cerezas, mensaje, burbuja };
