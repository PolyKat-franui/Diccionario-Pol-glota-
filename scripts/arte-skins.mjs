// Skins de Kitty (estilo gatitos sentados de tres cuartos, con sombra suave).
// Una plantilla común + patrón de pelaje + accesorio divertido por skin.
// Letras: O contorno · F pelaje · L pecho claro · D manchas/rayas oscuras · N manchas naranjas
//         P rosa (orejas, nariz, patitas) · E ojos · B mejillas · s sombra · resto: accesorios.
import { lienzo, pon, ponTodos, sello, contornear, aTexto } from './kitty-arte.mjs';

const ANCHO = 21, ALTO = 21, Y0 = 3; // Y0: espacio arriba para coronas y moños

function base() {
  const g = lienzo(ANCHO, ALTO);
  sello(g, 0, Y0, [
    '..F.........F.......',
    '..FF.......FF.......',
    '..FFFFFFFFFFF.......',
    '.FFFFFFFFFFFFF......',
    '.FFFFFFFFFFFFF......',
    '.FFFFFFFFFFFFF......',
    '.FFFFFFFFFFFFF......',
    '..FFFFFFFFFFF.......',
    '...FFFFFFFFF........',
    '...FFFFFFFFFF.......',
    '..FFFFFFFFFFFF......',
    '..FFFFFFFFFFFF.FF...',
    '..FFFFFFFFFFFF..FF..',
    '..FFFFFFFFFFFF..FF..',
    '..FFFFFFFFFFFFFFFF..',
    '..FFFFFFFFFFFFFFF...',
  ]);
  contornear(g);
  // sombra suave abajo a la derecha (como la referencia)
  const copia = g.map((r) => [...r]);
  for (let y = 1; y < ALTO; y++) for (let x = 1; x < ANCHO; x++) if (copia[y][x] === '.' && copia[y - 1][x - 1] !== '.') g[y][x] = 's';
  return g;
}
const Y = (y) => y + Y0;
/** Pinta solo sobre el pelaje (no sobre contorno ni vacío). */
const sobrePelaje = (g, celdas, c) => celdas.forEach(([x, y]) => { if (['F', 'L', 'D', 'N'].includes(g[Y(y)]?.[x])) pon(g, x, Y(y), c); });

function cara(g) {
  ponTodos(g, [[3, Y(1)], [11, Y(1)]], 'P');                 // interior de las orejas
  ponTodos(g, [[4, Y(5)], [10, Y(5)]], 'E');                 // ojos
  pon(g, 7, Y(6), 'P');                                       // nariz
  ponTodos(g, [[3, Y(6)], [11, Y(6)]], 'B');                 // mejillas
  ponTodos(g, [[6, Y(12)], [6, Y(13)], [6, Y(14)], [6, Y(15)], [9, Y(12)], [9, Y(13)], [9, Y(14)], [9, Y(15)]], 'O'); // patas delanteras
  ponTodos(g, [[7, Y(15)], [8, Y(15)], [4, Y(15)]], 'P');    // deditos
}

// ---------- patrones de pelaje ----------
const PECHO = [[5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [5, 9], [6, 9], [7, 9], [8, 9], [5, 10], [6, 10], [7, 10], [8, 10], [5, 11], [7, 11], [8, 11]];
const CARA_BAJA = [[4, 6], [5, 6], [6, 6], [8, 6], [9, 6], [10, 6], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7]];
const RAYAS = [[6, 2], [7, 2], [8, 2], [7, 3], [3, 3], [11, 3], [2, 4], [12, 4], [3, 10], [3, 12], [12, 10], [12, 12], [16, 12], [17, 13], [16, 14], [10, 14]];
const PATRONES = {
  liso: () => {},
  pecho: (g) => sobrePelaje(g, PECHO, 'L'),
  atigrado: (g) => { sobrePelaje(g, PECHO, 'L'); sobrePelaje(g, RAYAS, 'D'); },
  capa: (g) => { // cabeza y lomo oscuros, cara baja y pecho claros
    for (let y = 0; y < 16; y++) for (let x = 0; x < ANCHO; x++) sobrePelaje(g, [[x, y]], 'D');
    sobrePelaje(g, [...PECHO, ...CARA_BAJA, [7, 5], [6, 11], [7, 12], [8, 12], [7, 13], [8, 13], [7, 14], [8, 14]], 'L');
  },
  calico: (g) => {
    sobrePelaje(g, [[2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 1], [11, 9], [12, 9], [12, 10], [12, 11], [3, 13], [3, 14]], 'D');
    sobrePelaje(g, [[9, 2], [10, 2], [11, 2], [12, 2], [10, 3], [11, 3], [12, 3], [12, 4], [11, 12], [12, 12], [12, 13], [11, 13], [16, 12], [17, 13], [16, 13], [17, 14]], 'N');
  },
  siames: (g) => {
    sobrePelaje(g, [[2, 0], [12, 0], [2, 1], [12, 1], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [5, 6], [6, 6], [8, 6], [9, 6], [6, 7], [7, 7], [8, 7],
      [7, 14], [8, 14], [3, 14], [4, 14], [14, 14], [15, 14], [16, 14], [17, 14], [16, 12], [16, 13], [17, 13], [15, 11], [16, 11]], 'D');
  },
};

// ---------- accesorios divertidos ----------
const ACCESORIOS = {
  perlas: (g) => { for (let x = 4; x <= 10; x++) pon(g, x, Y(8), x % 2 ? 'p' : 'q'); pon(g, 7, Y(9), 'p'); },
  corbatin: (g) => { ponTodos(g, [[5, Y(8)], [6, Y(8)], [8, Y(8)], [9, Y(8)], [5, Y(9)], [9, Y(9)]], 'r'); pon(g, 7, Y(8), 'u'); },
  mono: (g) => sello(g, 9, Y(-2), ['rr.rr', 'rrurr', '.r.r.']),
  corona: (g) => sello(g, 4, Y(-3), ['g.g.g.g', 'ggggggg', 'gwgggwg', 'ggggggg']),
  flor: (g) => sello(g, 0, Y(-1), ['.w.', 'wgw', '.w.']),
  bufanda: (g) => { for (let x = 3; x <= 11; x++) pon(g, x, Y(8), x % 2 ? 'r' : 'u'); ponTodos(g, [[4, Y(9)], [4, Y(10)], [5, Y(10)]], 'r'); },
  cascabel: (g) => { for (let x = 4; x <= 10; x++) pon(g, x, Y(8), 'r'); ponTodos(g, [[7, Y(9)]], 'g'); pon(g, 7, Y(10), 'g'); },
  gafas: (g) => { ponTodos(g, [[3, Y(4)], [4, Y(4)], [5, Y(4)], [3, Y(5)], [5, Y(5)], [9, Y(4)], [10, Y(4)], [11, Y(4)], [9, Y(5)], [11, Y(5)], [6, Y(4)], [7, Y(4)], [8, Y(4)]], 'k'); },
  boina: (g) => sello(g, 3, Y(-1), ['..uuuu.', '.uuuuuuu', 'uuuuuuuu'].map((f) => f.padEnd(8, '.'))),
  hoja: (g) => sello(g, 7, Y(-2), ['.vv', 'vvv', 'v..']),
  corazon: (g) => sello(g, 14, Y(-2), ['hh.hh', 'hhhhh', '.hhh.', '..h..']),
  estrella: (g) => sello(g, 13, Y(-2), ['..g..', '.ggg.', 'ggggg', '.g.g.']),
};

const ACC = { p: '#FBF3EA', q: '#B9A79E', r: '#B54A55', u: '#4D0E13', g: '#E4B24A', w: '#FFFFFF', k: '#2B1418', v: '#6F9A52', h: '#E58FA0' };
const SOMBRA = 'rgba(43,20,24,.22)';

export const SKINS = [
  { id: 'clasica', nombre: 'Clásica', patron: 'liso', accesorio: 'perlas', c: { O: '#493036', F: '#FFFFFF', L: '#FFFFFF', P: '#E8AFAA', E: '#2B1418', B: '#F2C6C0' } },
  { id: 'gris', nombre: 'Gris lectora', patron: 'pecho', accesorio: 'gafas', c: { O: '#3E3A3D', F: '#A6A2A6', L: '#C9C6C9', P: '#E3A9AE', E: '#5E9C83', B: '#C9A6AB' } },
  { id: 'naranja', nombre: 'Naranja atigrada', patron: 'atigrado', accesorio: 'bufanda', c: { O: '#6B3E1A', F: '#F2B45E', L: '#F8D9A6', D: '#D9873A', P: '#E8A3A0', E: '#4F8A57', B: '#F0A48A' } },
  { id: 'jengibre', nombre: 'Jengibre', patron: 'pecho', accesorio: 'hoja', c: { O: '#6A3418', F: '#E2925C', L: '#F2C49C', P: '#E8A3A0', E: '#4F8A57', B: '#EB9C82' } },
  { id: 'capa', nombre: 'Capa gris', patron: 'capa', accesorio: 'estrella', c: { O: '#3A3335', F: '#FFFFFF', L: '#FFFFFF', D: '#6E6567', P: '#E8AFAA', E: '#4A78B5', B: '#F2C6C0' } },
  { id: 'plateada', nombre: 'Plateada real', patron: 'atigrado', accesorio: 'corona', c: { O: '#4A4A52', F: '#D8D8DE', L: '#F2F2F5', D: '#9C9CA6', P: '#E8AFAA', E: '#5E9C83', B: '#EBC3C3' } },
  { id: 'negra', nombre: 'Negra', patron: 'liso', accesorio: 'cascabel', c: { O: '#120E0F', F: '#2E2A2C', L: '#2E2A2C', P: '#E3A0A8', E: '#E2B24A', B: '#5A3A40' } },
  { id: 'calico', nombre: 'Calicó', patron: 'calico', accesorio: 'flor', c: { O: '#4A3530', F: '#FFFFFF', L: '#FFFFFF', D: '#4A4042', N: '#EFA25A', P: '#E8AFAA', E: '#6E9A4F', B: '#F2C6C0' } },
  { id: 'cafe', nombre: 'Café parisina', patron: 'atigrado', accesorio: 'boina', c: { O: '#4A3122', F: '#B98E6E', L: '#DCC3AA', D: '#8A6448', P: '#E3A4A0', E: '#4F8A57', B: '#D9A08E' } },
  { id: 'siamesa', nombre: 'Siamesa', patron: 'siames', accesorio: 'mono', c: { O: '#4A372E', F: '#F3E8D8', L: '#F3E8D8', D: '#6B4E3D', P: '#D9A0A0', E: '#4A86C8', B: '#E8C2B4' } },
  { id: 'rosa', nombre: 'Rosa', patron: 'pecho', accesorio: 'corazon', c: { O: '#7A4650', F: '#F5CDD3', L: '#FBE6E9', P: '#E897A6', E: '#4A86C8', B: '#EE9FAE' } },
  { id: 'esmoquin', nombre: 'Esmoquin', patron: 'capa', accesorio: 'corbatin', c: { O: '#120E0F', F: '#FFFFFF', L: '#FFFFFF', D: '#2E2A2C', P: '#E8AFAA', E: '#C9A03A', B: '#F2C6C0' } },
];

export function skin(id) {
  const s = SKINS.find((k) => k.id === id);
  const g = base();
  PATRONES[s.patron](g);
  cara(g);
  ACCESORIOS[s.accesorio](g);
  return { filas: aTexto(g), colores: { s: SOMBRA, D: s.c.F, N: s.c.F, ...ACC, ...s.c } };
}
