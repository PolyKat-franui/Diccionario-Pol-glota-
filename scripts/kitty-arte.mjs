// Kitty — pixel art dibujado con código (cada celda = un pixel).
// Kitty = ícono de cuerpo entero de Francisca (2026-10-13) en 14 expresiones. El logo de la app es un corazón.
// Para retocar: cambia coordenadas o colores aquí y corre `node scripts/kitty.mjs`.

export const COLORES = {
  O: '#3B2F4A', // contorno
  W: '#FFFFFF', // pelaje
  P: '#F4A4C4', // orejas y nariz
  E: '#1E1A28', // ojos
  B: '#E2DAEC', // mejillas
  C: '#7A4B94', // collar
  Y: '#F5C83C', // cascabel, destellos y estrellas
  R: '#E0567A', // corazones, lengua, signos
  T: '#7FB2E5', // lágrimas
  Z: '#8A7C70', // Zzz y burbujas de pensamiento
  K: '#1E1A28', // lentes
  H: '#FFFFFF', // brillo
};

// ---------- utilidades de dibujo ----------
export function lienzo(w, h) { return Array.from({ length: h }, () => Array(w).fill('.')); }
export const pon = (g, x, y, c) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
export const ponTodos = (g, celdas, c) => celdas.forEach(([x, y]) => pon(g, x, y, c));
/** Espejo horizontal respecto del eje de la figura (figura simétrica entre cx-1 y cx). */
export const espejo = (cx, x) => 2 * cx - 1 - x;
export const simetrico = (g, cx, celdas, c) => { ponTodos(g, celdas, c); ponTodos(g, celdas.map(([x, y]) => [espejo(cx, x), y]), c); };
/** Rellena filas simétricas: anchos = { y: medioAncho }. */
export function silueta(g, cx, anchos, c = 'W') {
  for (const [y, hw] of Object.entries(anchos)) for (let x = cx - hw; x < cx + hw; x++) pon(g, x, Number(y), c);
}
/** Contorno automático alrededor de todo lo que no es vacío. */
export function contornear(g, c = 'O') {
  const copia = g.map((r) => [...r]);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (copia[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (copia[y + dy]?.[x + dx] ?? '.') !== '.')) g[y][x] = c;
  }
  return g;
}
export const aTexto = (g) => g.map((r) => r.join(''));
export function sello(g, x0, y0, filas, mapa = {}) {
  filas.forEach((fila, dy) => [...fila].forEach((ch, dx) => { if (ch !== '.') pon(g, x0 + dx, y0 + dy, mapa[ch] ?? ch); }));
}

// ---------- Kitty (ícono de Francisca, 2026-10-13) ----------
// Gato blanco sentado de cuerpo entero, 20×16, con collar y cascabel. Es la expresión "feliz".
// Las demás expresiones cambian ojos, boca y mejillas, y agregan un signo arriba a la derecha
// (zona libre: columnas 15-19, filas 0-8).
const KITTY = [
  '...O........O.......',
  '..OWO......OWO......',
  '..OWPO....OPWO......',
  '..OWWOOOOOOWWO......',
  '.OWWWWWWWWWWWWO.....',
  '.OWWEWWWWWWEWWO.....',
  '.OWWEWWWWWWEWWO.....',
  '.OWBWWWPPWWWBWO.....',
  '..OWWWOWWOWWWO......',
  '..OCCCCCYCCCCCOO..OO',
  '..OWWWWWWWWWWWO.OWWO',
  '..OWWWWWWWWWWWO.OWO.',
  '.OWWWWWWWWWWWWWOOWO.',
  '.OWWWWWWWWWWWWWWWO..',
  '.OWWWOWWWWOWWWWWO...',
  '..OOO.OOOO.OOOOO....',
];
export const KITTY_ANCHO = 20;
export const KITTY_ALTO = 16;
const OJO_I = 4, OJO_D = 11; // columnas de los ojos (filas 5-6)

const base = () => KITTY.map((f) => [...f]);
const limpiarOjos = (g) => { for (const x of [OJO_I, OJO_D]) { pon(g, x, 5, 'W'); pon(g, x, 6, 'W'); } };
const ambos = (g, celdas, c) => { ponTodos(g, celdas, c); ponTodos(g, celdas.map(([x, y]) => [x + (OJO_D - OJO_I), y]), c); };
const ojosFelices = (g) => { limpiarOjos(g); ambos(g, [[OJO_I - 1, 6], [OJO_I, 5], [OJO_I + 1, 6]], 'E'); };   // ^ ^
const ojosCerrados = (g) => { limpiarOjos(g); ambos(g, [[OJO_I - 1, 6], [OJO_I, 6], [OJO_I + 1, 6]], 'E'); };  // — —
const ojosApretados = (g) => {                                                                             // > <
  limpiarOjos(g);
  ponTodos(g, [[OJO_I - 1, 4], [OJO_I, 5], [OJO_I - 1, 6]], 'E');
  ponTodos(g, [[OJO_D + 1, 4], [OJO_D, 5], [OJO_D + 1, 6]], 'E');
};
const ojosGrandes = (g) => ambos(g, [[OJO_I + 1, 5], [OJO_I + 1, 6]], 'E');
const bocaAbierta = (g) => ponTodos(g, [[7, 8], [8, 8]], 'R');
const bocaO = (g) => { ponTodos(g, [[6, 8], [9, 8]], 'W'); ponTodos(g, [[7, 8], [8, 8]], 'E'); };
const mejillasFuertes = (g) => ponTodos(g, [[3, 7], [12, 7], [2, 7], [13, 7]], 'P');

const CORAZON = ['RR.RR', 'RRRRR', 'RRRRR', '.RRR.', '..R..'];
const CORAZON_OJO = ['R.R', 'RRR', '.R.'];
const ESTRELLA = ['..Y..', '.YYY.', 'YYYYY', '.YYY.', '.Y.Y.'];
const DESTELLO = ['.Y.', 'YYY', '.Y.'];
const ENOJO = ['R.R', '.R.', 'R.R'];
const EXCLAMACION = ['RR', 'RR', 'RR', '..', 'RR'];
const PREGUNTA = ['.RRR.', 'R...R', '...R.', '..R..', '.....', '..R..'];
const ZZZ = ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'];
const ZZ = ['ZZZ', '.Z.', 'ZZZ'];
const GOTA = ['.T.', 'TTT', '.T.'];
const NUBE = ['.ZZZ.', 'ZZZZZ', '.ZZZ.'];

export const EXPRESIONES = {
  feliz: { nombre: 'Feliz', dibujar: () => {} },
  muy_feliz: { nombre: 'Muy feliz', dibujar: (g) => { ojosFelices(g); bocaAbierta(g); mejillasFuertes(g); } },
  guino: { nombre: 'Guiño', dibujar: (g) => {
    pon(g, OJO_D, 5, 'W'); ponTodos(g, [[OJO_D - 1, 6], [OJO_D, 6], [OJO_D + 1, 6]], 'E'); sello(g, 15, 0, ESTRELLA);
  } },
  sorprendida: { nombre: 'Sorprendida', dibujar: (g) => { ojosGrandes(g); bocaO(g); sello(g, 16, 1, EXCLAMACION); } },
  confundida: { nombre: 'Confundida', dibujar: (g) => { sello(g, 15, 0, PREGUNTA); sello(g, 15, 6, GOTA); } },
  mareada: { nombre: 'Mareada', dibujar: (g) => {
    limpiarOjos(g); ambos(g, [[OJO_I - 1, 4], [OJO_I + 1, 4], [OJO_I, 5], [OJO_I - 1, 6], [OJO_I + 1, 6]], 'E');
    sello(g, 15, 0, ESTRELLA); sello(g, 16, 6, DESTELLO);
  } },
  enamorada: { nombre: 'Enamorada', dibujar: (g) => {
    limpiarOjos(g); sello(g, OJO_I - 1, 4, CORAZON_OJO); sello(g, OJO_D - 1, 4, CORAZON_OJO);
    bocaAbierta(g); mejillasFuertes(g); sello(g, 15, 1, CORAZON);
  } },
  llorando: { nombre: 'Llorando', dibujar: (g) => {
    ojosApretados(g); bocaAbierta(g); ponTodos(g, [[3, 7], [12, 7], [3, 8], [12, 8]], 'T'); sello(g, 15, 1, GOTA);
  } },
  enojada: { nombre: 'Enojada', dibujar: (g) => {
    ponTodos(g, [[OJO_I - 1, 4], [OJO_I, 4], [OJO_D, 4], [OJO_D + 1, 4]], 'E'); pon(g, OJO_I, 5, 'W'); pon(g, OJO_D, 5, 'W');
    bocaO(g); sello(g, 16, 1, ENOJO);
  } },
  con_sueno: { nombre: 'Con sueño', dibujar: (g) => { ojosCerrados(g); sello(g, 15, 0, ZZZ); sello(g, 17, 5, ZZ); } },
  avergonzada: { nombre: 'Avergonzada', dibujar: (g) => { ojosApretados(g); mejillasFuertes(g); sello(g, 16, 2, GOTA); } },
  orgullosa: { nombre: 'Orgullosa', dibujar: (g) => {
    for (let x = 2; x <= 13; x++) pon(g, x, 5, 'K');
    ambos(g, [[OJO_I - 1, 6], [OJO_I, 6], [OJO_I + 1, 6]], 'K'); ambos(g, [[OJO_I - 1, 5]], 'H');
    sello(g, 16, 1, DESTELLO);
  } },
  pensando: { nombre: 'Pensando', dibujar: (g) => {
    limpiarOjos(g); ambos(g, [[OJO_I + 1, 4], [OJO_I + 1, 5]], 'E'); sello(g, 15, 0, NUBE); pon(g, 15, 5, 'Z'); pon(g, 16, 4, 'Z');
  } },
  celebrando: { nombre: 'Celebrando', dibujar: (g) => {
    ojosFelices(g); bocaAbierta(g); sello(g, 15, 0, ESTRELLA); sello(g, 17, 6, DESTELLO);
  } },
};

export function cara(nombre) {
  const g = base();
  EXPRESIONES[nombre].dibujar(g);
  return aTexto(g);
}
