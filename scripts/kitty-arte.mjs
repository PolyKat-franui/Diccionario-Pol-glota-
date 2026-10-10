// Kitty — pixel art dibujado con código (cada celda = un pixel).
// Kitty son sus 14 expresiones de cara; la expresión "feliz" es el logo (decisión 2026-10-10).
// Para retocar: cambia coordenadas o colores aquí y corre `node scripts/kitty.mjs`.

export const COLORES = {
  O: '#493036', // contorno (Old Burgundy)
  W: '#FFFFFF', // pelaje
  S: '#EFE6E1', // sombra suave del pelaje
  P: '#E3B9B3', // interior de las orejas (Dusty Pink suave)
  B: '#EDBDB7', // mejillas
  E: '#2B1418', // ojos
  N: '#C48780', // nariz
  M: '#493036', // boca
  R: '#C9727C', // lengua, corazones, signos (rosa profundo)
  L: '#F3E3CF', // perla
  G: '#B9A79E', // perla en sombra
  Y: '#C9A063', // destellos y estrellas (dorado suave)
  T: '#9DB8D6', // lágrimas
  Z: '#7E615F', // Zzz y burbujas (Deep Taupe)
  K: '#2B1418', // lentes
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

// ---------- Caras (expresiones) ----------
const CX = 14;        // eje de la cara
const OJO_I = CX - 6; // ojo izquierdo (2 px de ancho)
const OJO_D = espejo(CX, OJO_I) - 1;

function caraBase() {
  const g = lienzo(28, 24);
  simetrico(g, CX, [[CX - 9, 7], [CX - 10, 8], [CX - 9, 8], [CX - 8, 8], [CX - 10, 9], [CX - 9, 9], [CX - 8, 9], [CX - 7, 9]], 'W');
  silueta(g, CX, { 10: 9, 11: 11, 12: 11, 13: 11, 14: 11, 15: 11, 16: 11, 17: 11, 18: 11, 19: 11, 20: 10, 21: 8 });
  contornear(g);
  simetrico(g, CX, [[CX - 9, 8], [CX - 9, 9], [CX - 8, 9]], 'P');
  // bigotes cortos a los lados
  simetrico(g, CX, [[0, 15], [1, 15], [0, 17], [1, 17]], 'O');
  return g;
}
const mejillas = (g, fuerte = false) => {
  simetrico(g, CX, [[CX - 9, 17], [CX - 8, 17]], 'B');
  if (fuerte) simetrico(g, CX, [[CX - 10, 17], [CX - 9, 18], [CX - 8, 18], [CX - 7, 17]], 'B');
};
const ojosPunto = (g, y = 14) => simetrico(g, CX, [[OJO_I, y], [OJO_I + 1, y], [OJO_I, y + 1], [OJO_I + 1, y + 1]], 'E');
const ojosFelices = (g) => simetrico(g, CX, [[OJO_I - 1, 15], [OJO_I, 14], [OJO_I + 1, 14], [OJO_I + 2, 15]], 'E'); // ^ ^
const ojosCerrados = (g) => simetrico(g, CX, [[OJO_I - 1, 15], [OJO_I, 15], [OJO_I + 1, 15], [OJO_I + 2, 15]], 'E'); // — —
const ojosApretados = (g) => {                                                             // > <
  ponTodos(g, [[OJO_I - 1, 13], [OJO_I, 14], [OJO_I + 1, 15], [OJO_I, 16], [OJO_I - 1, 17]], 'E');
  ponTodos(g, [[espejo(CX, OJO_I - 1), 13], [espejo(CX, OJO_I), 14], [espejo(CX, OJO_I + 1), 15], [espejo(CX, OJO_I), 16], [espejo(CX, OJO_I - 1), 17]], 'E');
};
const bocaGato = (g) => ponTodos(g, [[CX - 2, 16], [CX + 1, 16], [CX - 1, 17], [CX, 17]], 'M');        // ω
const bocaAbierta = (g) => { ponTodos(g, [[CX - 2, 16], [CX + 1, 16], [CX - 1, 18], [CX, 18]], 'M'); ponTodos(g, [[CX - 1, 16], [CX, 16], [CX - 1, 17], [CX, 17]], 'R'); ponTodos(g, [[CX - 2, 17], [CX + 1, 17]], 'M'); };
const bocaO = (g) => ponTodos(g, [[CX - 1, 16], [CX, 16], [CX - 2, 17], [CX + 1, 17], [CX - 1, 18], [CX, 18]], 'M');
const bocaRecta = (g) => ponTodos(g, [[CX - 1, 17], [CX, 17]], 'M');
const bocaOndulada = (g) => ponTodos(g, [[CX - 3, 17], [CX - 2, 16], [CX - 1, 17], [CX, 16], [CX + 1, 17], [CX + 2, 16]], 'M');
const nariz = (g) => ponTodos(g, [[CX - 1, 15], [CX, 15]], 'N');

const CORAZON = ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'];
const CORAZON_OJO = ['R.R', 'RRR', '.R.'];
const ESTRELLA = ['..Y..', '.YYY.', 'YYYYY', '.YYY.', '.Y.Y.'];
const DESTELLO = ['.Y.', 'YYY', '.Y.'];
const ESPIRAL = ['EEEE', 'E..E', 'E.EE', 'E...'];
const ENOJO = ['.R.R.', 'RR.RR', '.....', 'RR.RR', '.R.R.'];
const EXCLAMACION = ['RR', 'RR', 'RR', '..', 'RR'];
const PREGUNTA = ['.RRR.', 'R...R', '...R.', '..R..', '.....', '..R..'];
const ZZZ = ['ZZZZZ', '...Z.', '..Z..', '.Z...', 'ZZZZZ'];
const ZZ = ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'];
const GOTA = ['.T.', 'TTT', 'TTT', '.T.'];

export const EXPRESIONES = {
  feliz: { nombre: 'Feliz', dibujar: (g) => { ojosPunto(g); nariz(g); bocaGato(g); mejillas(g); } },
  muy_feliz: { nombre: 'Muy feliz', dibujar: (g) => { ojosFelices(g); bocaAbierta(g); mejillas(g, true); } },
  guino: { nombre: 'Guiño', dibujar: (g) => {
    simetrico(g, CX, [], 'E');
    ponTodos(g, [[OJO_I, 14], [OJO_I + 1, 14], [OJO_I, 15], [OJO_I + 1, 15]], 'E');
    ponTodos(g, [[espejo(CX, OJO_I) - 1, 15], [espejo(CX, OJO_I), 15], [espejo(CX, OJO_I) + 1, 15], [espejo(CX, OJO_I) - 2, 14]], 'E');
    nariz(g); bocaGato(g); mejillas(g); sello(g, 22, 1, ESTRELLA);
  } },
  sorprendida: { nombre: 'Sorprendida', dibujar: (g) => {
    simetrico(g, CX, [[OJO_I - 1, 13], [OJO_I, 13], [OJO_I + 1, 13], [OJO_I - 1, 14], [OJO_I + 1, 14], [OJO_I - 1, 15], [OJO_I, 15], [OJO_I + 1, 15]], 'E');
    bocaO(g); sello(g, 10, 0, EXCLAMACION); sello(g, 14, 0, PREGUNTA);
  } },
  confundida: { nombre: 'Confundida', dibujar: (g) => {
    ojosPunto(g); bocaOndulada(g); sello(g, 13, 0, PREGUNTA); sello(g, 20, 1, PREGUNTA); sello(g, 20, 11, GOTA);
  } },
  mareada: { nombre: 'Mareada', dibujar: (g) => {
    sello(g, OJO_I - 1, 13, ESPIRAL); sello(g, espejo(CX, OJO_I + 1) - 1, 13, ESPIRAL);
    bocaOndulada(g); sello(g, 3, 1, ESTRELLA); sello(g, 20, 0, ESTRELLA); ponTodos(g, [[10, 2], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 2]], 'Y');
  } },
  enamorada: { nombre: 'Enamorada', dibujar: (g) => {
    sello(g, OJO_I - 1, 13, CORAZON_OJO); sello(g, espejo(CX, OJO_I + 1), 13, CORAZON_OJO);
    bocaAbierta(g); mejillas(g, true); sello(g, 10, 0, CORAZON);
  } },
  llorando: { nombre: 'Llorando', dibujar: (g) => {
    ojosApretados(g); bocaAbierta(g);
    simetrico(g, CX, [[OJO_I - 2, 17], [OJO_I - 2, 18], [OJO_I - 3, 19], [OJO_I - 3, 20], [OJO_I - 2, 19], [OJO_I - 3, 21]], 'T');
    simetrico(g, CX, [[CX - 12, 13], [CX - 13, 12]], 'T');
  } },
  enojada: { nombre: 'Enojada', dibujar: (g) => {
    simetrico(g, CX, [[OJO_I, 15], [OJO_I + 1, 15]], 'E');
    simetrico(g, CX, [[OJO_I - 1, 12], [OJO_I, 13], [OJO_I + 1, 13], [OJO_I + 2, 14]], 'E'); // cejas
    ponTodos(g, [[CX - 2, 18], [CX - 1, 17], [CX, 17], [CX + 1, 18]], 'M');                 // boca hacia abajo
    sello(g, 21, 2, ENOJO);
  } },
  con_sueno: { nombre: 'Con sueño', dibujar: (g) => {
    ojosCerrados(g); nariz(g); bocaGato(g); mejillas(g); sello(g, 1, 0, ZZZ); sello(g, 7, 3, ZZ);
  } },
  avergonzada: { nombre: 'Avergonzada', dibujar: (g) => {
    ojosApretados(g); bocaOndulada(g); mejillas(g, true);
    simetrico(g, CX, [[CX - 12, 11], [CX - 13, 10], [CX - 11, 9]], 'R');
  } },
  orgullosa: { nombre: 'Orgullosa', dibujar: (g) => {
    for (let x = CX - 10; x < CX + 10; x++) pon(g, x, 13, 'K');
    simetrico(g, CX, [[OJO_I - 2, 14], [OJO_I - 1, 14], [OJO_I, 14], [OJO_I + 1, 14], [OJO_I + 2, 14], [OJO_I - 1, 15], [OJO_I, 15], [OJO_I + 1, 15]], 'K');
    simetrico(g, CX, [[OJO_I - 1, 14]], 'H');
    ponTodos(g, [[CX - 2, 17], [CX - 1, 17], [CX, 17], [CX + 1, 16]], 'M'); // sonrisa de lado
    sello(g, 22, 2, DESTELLO);
  } },
  pensando: { nombre: 'Pensando', dibujar: (g) => {
    simetrico(g, CX, [[OJO_I + 1, 13], [OJO_I + 1, 14]], 'E');
    bocaRecta(g); nariz(g);
    sello(g, 18, 6, ['ZZ', 'ZZ']); sello(g, 21, 2, ['.ZZ.', 'ZZZZ', '.ZZ.']); pon(g, 16, 9, 'Z');
  } },
  celebrando: { nombre: 'Celebrando', dibujar: (g) => {
    ojosFelices(g); bocaAbierta(g); mejillas(g);
    sello(g, 1, 3, DESTELLO); sello(g, 5, 0, DESTELLO); sello(g, 22, 0, ESTRELLA); sello(g, 19, 5, DESTELLO);
  } },
};

export function cara(nombre) {
  const g = caraBase();
  EXPRESIONES[nombre].dibujar(g);
  return aTexto(g);
}
