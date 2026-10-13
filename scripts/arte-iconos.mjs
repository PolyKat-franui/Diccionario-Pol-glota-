// Íconos pixel art de Franui: sakura (racha), moneda, estrella, cerezas, notificación y burbuja vacía.
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

// ---------- Sakura (flor de cerezo: ícono de la racha) ----------
const COLORES_SAKURA = { o: '#602B27', a: '#FBC4CD', b: '#F5A3AE', m: '#EC8893', c: '#DB6A72', n: '#C2545E', h: '#FFE6EA' };

/**
 * Sakura de 5 pétalos (como la referencia): cada pétalo es una forma propia con contorno,
 * hay un pequeño espacio entre pétalos, muesca en la punta y centro más oscuro.
 */
function dibujarSakura(n, R, { brillo = true } = {}) {
  const g = lienzo(n, n);
  const cx = (n - 1) / 2, cy = (n - 1) / 2 + R * 0.04;
  const etiqueta = lienzo(n, n).map((f) => f.map(() => 0));
  const ejes = Array.from({ length: 5 }, (_, k) => -Math.PI / 2 + (k * 2 * Math.PI) / 5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = x - cx, dy = y - cy;
    ejes.forEach((a, k) => {
      const u = dx * Math.cos(a) + dy * Math.sin(a);       // a lo largo del pétalo
      const v = -dx * Math.sin(a) + dy * Math.cos(a);      // a lo ancho
      const ancho = R * 0.31 * (0.55 + 0.45 * Math.min(1, u / (R * 0.55)));
      const dentro = ((u - R * 0.56) / (R * 0.46)) ** 2 + (v / ancho) ** 2 <= 1;
      const muesca = u > R * 0.86 && Math.abs(v) < R * 0.11;
      if (dentro && !muesca) etiqueta[y][x] = k + 1;
    });
    if (Math.hypot(dx, dy) < R * 0.24) etiqueta[y][x] = 9; // centro
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const e = etiqueta[y][x];
    if (!e) continue;
    const r = Math.hypot(x - cx, y - cy);
    if (e === 9) { g[y][x] = r < R * 0.12 ? 'n' : 'c'; continue; }
    const borde = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => { const o = etiqueta[y + ay]?.[x + ax] ?? 0; return o !== e && o !== 9; });
    g[y][x] = borde ? 'o' : r < R * 0.38 ? 'm' : 'a';
  }
  if (brillo) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot(x - cx, y - cy);
    if (g[y][x] === 'a' && r > R * 0.66 && r < R * 0.76) g[y][x] = 'b';
  }
  return g;
}

export function sakura() {
  const g = dibujarSakura(23, 11.2);
  return { filas: aTexto(g), colores: COLORES_SAKURA };
}

// ---------- Moneda de Kitty tokens (como la referencia, con una sakura en relieve) ----------
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
  // sakura en relieve (contorno oscuro y relleno claro)
  const flor = dibujarSakura(15, 7.3, { brillo: false }).map((fila) => fila.map((ch) => (ch === '.' ? '.' : ch === 'o' ? 'r' : ['n', 'c'].includes(ch) ? 'd' : 'l')));
  sello(g, 4, 4, aTexto(flor));
  // destello arriba a la derecha
  sello(g, 18, 0, ['..h..', '..h..', 'hhhhh', '..h..', '..h..'].map((f) => f.replace(/h/g, 'H')));
  return { filas: aTexto(g), colores: { o: '#5A3418', d: '#C98A2E', f: '#F2BE4A', l: '#FCDB7E', r: '#B8701E', h: '#FFF6D8', H: '#FFFFFF' } };
}

// ---------- Estrella (polígono de 5 puntas: líneas rectas y caras con volumen) ----------
export function estrella() {
  const n = 21;
  const g = lienzo(n, n);
  const cx = 10, cy = 11, R = 10.4, r = 5.1;
  const vert = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  });
  const dentro = (px, py) => { // regla par-impar
    let c = false;
    for (let i = 0, j = vert.length - 1; i < vert.length; j = i++) {
      const [xi, yi] = vert[i], [xj, yj] = vert[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!dentro(x, y)) continue;
    // cada punta tiene una cara clara (izquierda) y una oscura (derecha), como una estrella tallada
    const a = Math.atan2(y - cy, x - cx) + Math.PI / 2;
    const sector = ((((a % (2 * Math.PI / 5)) + 2 * Math.PI / 5) % (2 * Math.PI / 5)));
    const cerca = Math.hypot(x - cx, y - cy) < 1.6;
    g[y][x] = cerca ? 'l' : sector < Math.PI / 5 ? 'D' : 'Y';
  }
  contornear(g, 'o');
  ponTodos(g, [[9, 4], [9, 5], [8, 7]], 'h');
  return { filas: aTexto(g), colores: { o: '#A8521A', Y: '#FFD54F', D: '#F0A82E', l: '#FFF0A8', h: '#FFFFFF' } };
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
  return { filas: aTexto(g), colores: { o: '#211A18', R: '#8E3D36', D: '#602B27', h: '#C98A82', t: '#3F5B40', V: '#8FB06A' } };
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
  return { filas: aTexto(g), colores: { o: '#5C524B', W: '#F1F0EB', S: '#CFCDBF', s: 'rgba(33,26,24,.18)', R: '#602B27', h: '#A86A63' } };
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
  return { filas: aTexto(g), colores: { o: '#5C524B', W: '#F7F6F2', S: '#DEDCD2', Y: '#E4B95B' } };
}

/** Corazón: ícono (logo) provisorio de la app, 13×12. Simétrico, con brillo arriba a la izquierda. */
function corazon() {
  const filas = [
    '..ooo...ooo..',
    '.oRRRo.oRRRo.',
    'oRhhRRoRRRRDo',
    'oRhRRRRRRRRDo',
    'oRRRRRRRRRRDo',
    'oRRRRRRRRRRDo',
    '.oRRRRRRRRDo.',
    '..oRRRRRRDo..',
    '...oRRRRDo...',
    '....oRRDo....',
    '.....oDo.....',
    '......o......',
  ];
  return { filas, colores: { o: '#4A1F24', R: '#C0405A', D: '#8E2840', h: '#F4A0B2' } };
}


// ---------- Sakura que florece (meta diaria): brote → capullo → flor chica → flor mediana → sakura ----------
// Mismo lienzo de 23×23 y mismos colores que la sakura, más tallo y hojas.
const COLORES_FLOR = { ...COLORES_SAKURA, t: '#3F5B40', V: '#8FB06A', W: '#B9D48E' };
function tallo(g, desde) {
  for (let y = Math.ceil(desde); y < 23; y++) { pon(g, 11, y, 't'); }
  sello(g, 12, 17, ['.ttt.', 'tVVWt', '.tVVt', '..tt.']);
  sello(g, 6, 19, ['.ttt.', 'tWVVt', 'tVVt.', '.tt..']);
}
export function flor0() { // brote: tallo corto con dos hojas
  const g = lienzo(23, 23);
  for (let y = 15; y < 23; y++) pon(g, 11, y, 't');
  sello(g, 12, 12, ['.ttt..', 'tVVWt.', 'tVVVVt', '.tttt.']);
  sello(g, 5, 13, ['..ttt.', '.tWVVt', 'tVVVVt', '.tttt.']);
  return { filas: aTexto(g), colores: COLORES_FLOR };
}
export function flor1() { // capullo cerrado
  const g = lienzo(23, 23);
  tallo(g, 15);
  for (let y = 0; y < 23; y++) for (let x = 0; x < 23; x++) {
    const dy = y - 10.5, dx = x - 11;
    const rx = 3.4 * Math.min(1, (y - 4.5) / 4.5);   // punta arriba
    if (y >= 5 && y <= 15 && (dx / Math.max(rx, .5)) ** 2 + (dy / 5) ** 2 <= 1) g[y][x] = dx > 0.5 || dy > 2.5 ? 'm' : 'a';
  }
  contornear(g, 'o');
  ponTodos(g, [[10, 8], [10, 9]], 'h');
  sello(g, 8, 14, ['tV.Vt', '.tVt.']);
  return { filas: aTexto(g), colores: COLORES_FLOR };
}
function florChica(R) {
  const g = dibujarSakura(23, R);
  const cy = 11 + R * 0.04;
  const base = lienzo(23, 23);
  tallo(base, cy + R * 0.5);
  for (let y = 0; y < 23; y++) for (let x = 0; x < 23; x++) if (g[y][x] === '.' && base[y][x] !== '.') g[y][x] = base[y][x];
  return { filas: aTexto(g), colores: COLORES_FLOR };
}
export const flor2 = () => florChica(6.4);
export const flor3 = () => florChica(8.8);

// ---------- Cofre de monedas (premio cada 7 días de racha) ----------
const COLORES_COFRE = { o: '#3A2414', w: '#9A5B2E', W: '#C27C43', d: '#6E3E1E', g: '#F2BE4A', G: '#C98A2E', h: '#FFF6D8', k: '#3A2414', f: '#FCDB7E', s: '#FFFFFF' };
function cuerpoCofre(g, y0) {
  for (let y = y0; y < y0 + 9; y++) for (let x = 2; x < 22; x++) g[y][x] = y === y0 ? 'G' : (y - y0) % 4 === 0 ? 'd' : 'w';
  for (let y = y0; y < y0 + 9; y++) { g[y][4] = 'g'; g[y][19] = 'g'; }
  for (let x = 2; x < 22; x++) g[y0 + 8][x] = 'd';
}
export function cofre() {
  const g = lienzo(24, 20);
  // tapa redondeada
  const anchos = [16, 18, 20, 20, 20, 20];
  anchos.forEach((w, i) => { for (let x = 12 - w / 2; x < 12 + w / 2; x++) g[3 + i][x] = i === 0 ? 'W' : i === 5 ? 'G' : i < 2 ? 'W' : 'w'; });
  for (let y = 3; y < 9; y++) { g[y][4] = 'g'; g[y][19] = 'g'; }
  cuerpoCofre(g, 9);
  // cerradura
  sello(g, 10, 7, ['gggg', 'gGGg', 'gkkg', 'gGGg', 'gggg']);
  contornear(g, 'o');
  ponTodos(g, [[6, 4], [7, 4], [8, 4]], 'h');
  return { filas: aTexto(g), colores: COLORES_COFRE };
}
export function cofreAbierto() {
  const g = lienzo(24, 20);
  // tapa abierta (vista por dentro, detrás)
  for (let y = 1; y < 6; y++) for (let x = 3; x < 21; x++) g[y][x] = y === 1 ? 'W' : 'd';
  for (let y = 1; y < 6; y++) { g[y][4] = 'g'; g[y][19] = 'g'; }
  // monedas asomando
  const monedas = [[6, 7], [9, 6], [12, 7], [15, 6], [18, 7], [7.5, 8], [11, 8.4], [14.5, 8], [17, 8.5]];
  for (const [cx, cy] of monedas) for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) if (Math.hypot(x - cx, y - cy) <= 1.6) g[y][x] = 'g';
  ponTodos(g, [[6, 6], [9, 5], [12, 6], [15, 5], [18, 6]], 'f');
  cuerpoCofre(g, 9);
  sello(g, 10, 10, ['gggg', 'gkkg', 'gggg']);
  contornear(g, 'o');
  // destellos
  sello(g, 0, 0, ['.s.', 'sss', '.s.']);
  sello(g, 21, 2, ['.s.', 'sss', '.s.']);
  return { filas: aTexto(g), colores: COLORES_COFRE };
}

export const ICONOS = { sakura, moneda, estrella, cerezas, mensaje, burbuja, corazon, 'flor-0': flor0, 'flor-1': flor1, 'flor-2': flor2, 'flor-3': flor3, cofre, 'cofre-abierto': cofreAbierto };
