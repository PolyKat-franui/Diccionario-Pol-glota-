// Pixel art del Jardín de Sakura (tienda de Kitty), generado por código como el resto del arte.
//   app/assets/jardin/arbol-0…7.svg        el sakura en 8 etapas (64×64, base del tronco en x=32, y=62)
//   app/assets/jardin/fondo-dia|atardecer|noche.svg   cielo y pasto (96×96)
//   app/assets/jardin/<id>.svg              cada objeto del catálogo (app/js/jardin.js)
//   app/assets/jardin/petalo.svg            pétalo que cae en la escena
// Mostrar siempre a escala entera (×1, ×2, ×3…).
// Uso: node scripts/arte-jardin.mjs   (también corre con npm run build)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lienzo, pon, ponTodos, sello, contornear, aTexto } from './kitty-arte.mjs';
import { sakura } from './arte-iconos.mjs';
import { toSvg } from './kitty.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(RAIZ, 'app', 'assets', 'jardin');

// ---------- utilidades ----------
const rect = (g, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pon(g, x, y, c); };
const elipse = (g, cx, cy, rx, ry, c, filtro = () => true) => {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && filtro(x, y)) g[y][x] = c;
  }
};
/** Ruido determinista (siempre el mismo dibujo). */
const ruido = (x, y, s = 1) => { const n = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453; return n - Math.floor(n); };
const salida = (g, colores) => ({ filas: aTexto(g), colores });

// ---------- el sakura en 8 etapas ----------
// Flores en racimos (como el pixel art de referencia), tronco oscuro con ramas que asoman entre las sombras
// y, en las etapas grandes, flores que cuelgan.
const COL_ARBOL = {
  o: '#4A2232', T: '#6B3F3A', D: '#40242A', d: '#7A5236', m: '#9C6B48',
  h: '#FFE6EE', a: '#F8BDCD', b: '#EE94AD', c: '#D26A89', e: '#A64566', v: '#7FAE5A', V: '#A9CF7E', s: '#4F7A3A',
};
const RAMAS = [];
/** Tronco desde la base (32, 62) hacia arriba, con ancho que se afina, y ramas opcionales. */
function tronco(g, alto, ancho, ramas = []) {
  for (let y = 0; y < alto; y++) {
    const w = Math.max(1, Math.round(ancho - (ancho - 1) * (y / alto) * 0.7));
    const x0 = 32 - Math.floor(w / 2) + Math.round(Math.sin(y / 6) * (ancho > 3 ? 1 : 0)); // leve curva
    for (let x = x0; x < x0 + w; x++) pon(g, x, 62 - y, x >= x0 + w - Math.ceil(w / 3) && w > 1 ? 'D' : 'T');
  }
  RAMAS.length = 0;
  for (const [x0, y0, dx, largo] of ramas) for (let k = 0; k < largo; k++) {
    const x = x0 + Math.round(dx * k * 1.2), y = y0 - k;
    pon(g, x, y, 'T'); pon(g, x, y + 1, 'D'); RAMAS.push([x, y], [x, y + 1]);
  }
  if (ancho >= 3) ponTodos(g, [[32 - ancho, 62], [32 + ancho - 1, 62], [31 - ancho, 62], [32 + ancho, 62]], 'D');
}
const TONOS = ['h', 'a', 'b', 'c', 'e'];
/** Copa de flores hecha de racimos: cada racimo con su luz, más la luz general arriba a la izquierda. */
function copa(g, blobs, { verde = 0, colgantes = 0 } = {}) {
  const racimos = [];
  blobs.forEach(([cx, cy, r], bi) => {
    const n = Math.round((r * r) / 4);
    for (let i = 0; i < n; i++) {
      const ang = ruido(i, bi, 21) * Math.PI * 2, dist = Math.sqrt(ruido(i, bi, 22)) * Math.max(1, r - 2.5);
      racimos.push([cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.85, 2.4 + ruido(i, bi, 23) * 2]);
    }
    racimos.push([cx, cy, r * 0.55]);
  });
  const xs = racimos.map(([x, , r]) => [x - r, x + r]).flat(), ys = racimos.map(([, y, r]) => [y - r, y + r]).flat();
  const cx0 = (Math.min(...xs) + Math.max(...xs)) / 2, cy0 = (Math.min(...ys) + Math.max(...ys)) / 2, R = (Math.max(...xs) - Math.min(...xs)) / 2 || 1;
  racimos.sort((p, q) => p[1] - q[1]); // los de abajo se pintan encima
  for (const [cx, cy, r] of racimos) for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r || y < 0 || y > 63 || x < 0 || x > 63) continue;
    const local = ((x - cx) * 0.6 + (y - cy) * 0.8) / r;
    const global = ((x - cx0) * 0.5 + (y - cy0) * 0.8) / R;
    let i = local < -0.6 ? 0 : local < -0.15 ? 1 : local < 0.4 ? 2 : 3;
    i += global < -0.45 ? -1 : global > 0.45 ? 1 : 0;
    let c = TONOS[Math.max(0, Math.min(4, i))];
    if (verde && ruido(x, y, 31) < verde) c = global > 0.1 ? 's' : 'v';
    g[y][x] = c;
  }
  // ramas que asoman entre las sombras de la copa
  for (const [x, y] of RAMAS) if (['c', 'e'].includes(g[y]?.[x])) g[y][x] = 'D';
  // flores colgantes bajo la copa
  if (colgantes) for (let x = 2; x < 62; x++) {
    if (ruido(x, 7, 41) > colgantes) continue;
    let fondo = -1;
    for (let y = 63; y >= 0; y--) if (TONOS.includes(g[y][x])) { fondo = y; break; }
    if (fondo < 0 || fondo > 56) continue;
    const largo = 2 + Math.floor(ruido(x, 8, 42) * 6);
    for (let k = 1; k <= largo; k++) if (g[fondo + k]?.[x] === '.') g[fondo + k][x] = k % 2 ? 'b' : 'a';
  }
}
const ARBOL = [
  // 0 · semilla: montoncito de tierra con una semilla
  (g) => { elipse(g, 32, 62, 6, 2.2, 'd', (x, y) => y <= 62); ponTodos(g, [[31, 59], [32, 59]], 'm'); ponTodos(g, [[31, 58], [32, 58]], 'T'); },
  // 1 · brote
  (g) => { elipse(g, 32, 62, 6, 2.2, 'd', (x, y) => y <= 62); for (let y = 54; y < 61; y++) pon(g, 32, y, 's');
    sello(g, 27, 52, ['.vvv.', 'vVVvs', '.vvs.']); sello(g, 33, 50, ['.vvv.', 'sVVVv', '.svv.']); },
  // 2 · retoño
  (g) => { elipse(g, 32, 62, 7, 2.2, 'd', (x, y) => y <= 62); for (let y = 46; y < 61; y++) pon(g, 32, y, y > 54 ? 'T' : 's');
    sello(g, 25, 50, ['.vvv.', 'vVVvs', '.vvs.']); sello(g, 33, 47, ['.vvvv.', 'sVVVVv', '.svvv.']);
    sello(g, 27, 43, ['.vvv.', 'vVVvs', '.vvs.']); sello(g, 33, 41, ['.vv.', 'vVVs', '.ss.']);
    ponTodos(g, [[31, 40], [32, 39]], 'b'); ponTodos(g, [[31, 39]], 'a'); },
  // 3 · arbolito
  (g) => { tronco(g, 16, 2, [[31, 52, -1, 3]]); copa(g, [[32, 42, 8], [27, 45, 5], [37, 45, 5]], { verde: 0.3 }); },
  // 4 · árbol joven
  (g) => { tronco(g, 22, 3, [[31, 48, -1, 6], [33, 50, 1, 6]]); copa(g, [[32, 33, 10], [23, 38, 7], [41, 38, 7], [32, 40, 8]], { verde: 0.12 }); },
  // 5 · primera flor
  (g) => { tronco(g, 24, 4, [[31, 48, -1, 8], [33, 46, 1, 8]]); copa(g, [[32, 27, 12], [20, 33, 9], [44, 33, 9], [26, 38, 8], [38, 38, 8]], { verde: 0.03 }); },
  // 6 · sakura en flor
  (g) => { tronco(g, 26, 5, [[30, 46, -1, 10], [34, 45, 1, 10], [32, 40, -1, 6]]);
    copa(g, [[32, 21, 13], [18, 27, 10], [46, 27, 10], [24, 35, 9], [40, 35, 9], [32, 32, 11], [11, 34, 6], [53, 34, 6]], { colgantes: 0.35 }); },
  // 7 · gran sakura: copa enorme, flores colgantes y pétalos que caen
  (g) => { tronco(g, 28, 6, [[30, 44, -1, 12], [35, 43, 1, 12], [32, 38, -1, 7], [33, 37, 1, 7]]);
    copa(g, [[32, 17, 14], [16, 23, 11], [48, 23, 11], [8, 32, 7], [56, 32, 7], [22, 33, 10], [42, 33, 10], [32, 29, 12], [32, 8, 8]], { colgantes: 0.6 });
    ponTodos(g, [[6, 50], [14, 56], [52, 52], [58, 58], [44, 59], [20, 60]], 'a'); },
];
function arbol(i) {
  const g = lienzo(64, 64);
  RAMAS.length = 0;
  ARBOL[i](g);
  contornear(g, 'o');
  // las flores colgantes y los pétalos sueltos van sin contorno grueso: se repintan encima
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    if (g[y][x] !== 'o') continue;
    const vecinos = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => g[y + dy]?.[x + dx]);
    const soloColgante = vecinos.filter((v) => v && v !== '.' && v !== 'o').length === 1 && vecinos.some((v) => v === 'a' || v === 'b') && y > 40;
    if (soloColgante && i >= 6) g[y][x] = '.';
  }
  if (i === 7) ponTodos(g, [[6, 50], [14, 56], [52, 52], [58, 58], [44, 59], [20, 60]], 'b');
  return salida(g, COL_ARBOL);
}

// ---------- fondos de la escena (96×96): cielo, monte Fuji con sol o luna, cerezos lejanos y pasto con pétalos ----------
// Referencias de Francisca: separadores japoneses (Fuji con sol rojo), paisajes de atardecer durazno y pixel art de sakuras.
const FONDOS = {
  dia: { cielo: ['#CFE6F2', '#DCEDF2', '#E8F1EE', '#F3F1E6', '#FAF2E4'], fuji: ['#8FA3C8', '#6F84AE', '#FFFFFF', '#DCE6F2'],
    lejos: ['#F6C9D4', '#EBAFC0', '#D98DA5'], pasto: ['#8DBB6E', '#79A95C', '#A3CC82'], astro: ['sol', 24, 18, '#E8584A', '#F07A6A'] },
  atardecer: { cielo: ['#F2A99B', '#F6B8A0', '#F9C7A6', '#FBD5AE', '#FCE1B8'], fuji: ['#A99AB8', '#8A7DA0', '#FCEBEA', '#F2CFD2'],
    lejos: ['#F08FA4', '#E07490', '#C95A7A'], pasto: ['#86A665', '#72914F', '#9DBA7A'], astro: ['solGrande', 48, 26, '#FDE3C2', '#FFF0DA'] },
  noche: { cielo: ['#1C1F45', '#232756', '#2C3166', '#363B74', '#434784'], fuji: ['#3E4677', '#323A66', '#D9DDF0', '#AEB5D6'],
    lejos: ['#8A6C9E', '#76598C', '#5E4778'], pasto: ['#3E6448', '#33573D', '#4B7656'], astro: ['luna', 76, 13, '#F4EFD8'] },
};
function fondo(nombre) {
  const f = FONDOS[nombre];
  const g = lienzo(96, 96);
  const col = {};
  const letra = (hex) => { for (const [k, v] of Object.entries(col)) if (v === hex) return k; const k = String.fromCharCode(65 + Object.keys(col).length); col[k] = hex; return k; };
  // cielo en franjas con tramado
  const banda = 60 / f.cielo.length;
  for (let y = 0; y < 60; y++) for (let x = 0; x < 96; x++) {
    const t = y / banda; let i = Math.floor(t);
    if (t - i > 0.75 && (x + y) % 2 === 0) i += 1;
    g[y][x] = letra(f.cielo[Math.min(i, f.cielo.length - 1)]);
  }
  // nubes alargadas (como en los separadores)
  const nube = (cx, cy, w, c) => { elipse(g, cx, cy, w, 1.6, letra(c)); elipse(g, cx - w * 0.3, cy - 1.4, w * 0.45, 1.6, letra(c)); };
  if (nombre === 'dia') { nube(70, 12, 9, '#FFFFFF'); nube(14, 30, 7, '#FFFFFF'); }
  if (nombre === 'atardecer') { nube(16, 14, 10, '#F7C6C0'); nube(80, 20, 9, '#F7C6C0'); nube(66, 34, 7, '#FBD9CC'); }
  // astro (detrás del Fuji)
  const [tipo, ax, ay, c1, c2] = f.astro;
  if (tipo === 'sol') { elipse(g, ax, ay, 6.5, 6.5, letra(c1)); elipse(g, ax - 1.5, ay - 1.5, 3, 3, letra(c2)); }
  if (tipo === 'solGrande') { elipse(g, ax, ay, 13, 13, letra(c2)); elipse(g, ax, ay, 11, 11, letra(c1)); }
  if (tipo === 'luna') {
    elipse(g, ax, ay, 6, 6, letra(c1)); elipse(g, ax + 3, ay - 2, 5, 5, letra(f.cielo[0]));
    for (const [x, y] of [[10, 8], [24, 18], [40, 6], [58, 22], [88, 30], [16, 34], [48, 4], [66, 10], [30, 40], [86, 4], [6, 22]]) pon(g, x, y, letra('#FFFFFF'));
    for (const [x, y] of [[12, 22], [52, 14], [72, 34], [36, 26]]) pon(g, x, y, letra('#B9BCE8'));
  }
  // monte Fuji: cumbre plana, laderas cóncavas, nieve con bordes irregulares, luz a la izquierda
  const [luz, sombra, nieve, nieveSombra] = f.fuji;
  for (let x = 0; x < 96; x++) {
    const d = Math.abs(x - 48);
    const top = d < 4 ? 24 : Math.round(24 + (d - 4) * 0.55 + ((d - 4) ** 2) * 0.004);
    for (let y = Math.max(0, top); y < 60; y++) {
      const lineaNieve = 32 + Math.round(3 * ruido(Math.floor(x / 2), 1, 5)) + (d < 8 ? 0 : (d - 8) * 0.2);
      const izq = x < 48 + (y - 24) * 0.15;
      g[y][x] = letra(y < lineaNieve ? (izq ? nieve : nieveSombra) : (izq ? luz : sombra));
    }
  }
  // fila de cerezos lejanos frente al Fuji
  for (let x = -2; x < 98; x += 5) {
    const cy = 54 + Math.round(2 * ruido(x, 2, 8)), r = 4 + Math.round(2 * ruido(x, 3, 8));
    elipse(g, x, cy, r, r * 0.8, letra(f.lejos[Math.floor(ruido(x, 4, 8) * 2)]));
  }
  for (let x = 0; x < 96; x++) for (let y = 50; y < 60; y++) if (g[y][x] && ruido(x, y, 11) > 0.93 && y > 52) g[y][x] = letra(f.lejos[2]);
  // pasto con matas y pétalos caídos
  for (let y = 60; y < 96; y++) for (let x = 0; x < 96; x++) {
    const n = ruido(x, y, 3);
    g[y][x] = letra(n > 0.9 ? f.pasto[2] : n < 0.12 || y === 60 ? f.pasto[1] : f.pasto[0]);
    if (ruido(x, y, 13) > 0.975) g[y][x] = letra(nombre === 'noche' ? '#C9A6C8' : '#F7C2CE');
  }
  return salida(g, col);
}

// ---------- objetos de la tienda ----------
const O = '#3A2414'; // contorno común (café oscuro)
const OBJETOS = {
  abono() {
    const g = lienzo(14, 14);
    elipse(g, 6.5, 8.6, 5.4, 4.2, 'S'); rect(g, 4, 2, 6, 3, 'S'); rect(g, 4, 4, 6, 1, 'K');
    elipse(g, 6.5, 8.5, 2.4, 1.5, 'G'); ponTodos(g, [[6, 8], [7, 8]], 'V');
    contornear(g, 'o'); ponTodos(g, [[3, 7], [3, 8]], 'h');
    return salida(g, { o: O, S: '#D2A76E', K: '#7A4B2A', G: '#5E9A44', V: '#A7D27E', h: '#EBCB97' });
  },
  'abono-grande'() {
    const g = lienzo(16, 16);
    elipse(g, 7.5, 10, 6.4, 4.8, 'S'); rect(g, 4, 2, 8, 4, 'S'); rect(g, 4, 5, 8, 1, 'K');
    elipse(g, 7.5, 10, 3.2, 2.2, 'G'); rect(g, 7, 8, 2, 5, 'V'); rect(g, 5, 10, 6, 1, 'V');
    contornear(g, 'o'); ponTodos(g, [[3, 8], [3, 9], [3, 10]], 'h');
    return salida(g, { o: O, S: '#C9965A', K: '#7A4B2A', G: '#4E8A38', V: '#CDEBA8', h: '#E6C08A' });
  },
  'abono-magico'() {
    const g = lienzo(16, 16);
    elipse(g, 7.5, 10, 6, 4.6, 'P'); rect(g, 5, 3, 6, 3, 'P'); rect(g, 5, 5, 6, 1, 'Y');
    elipse(g, 7.5, 10, 2.4, 2.4, 'p'); ponTodos(g, [[7, 9], [8, 9], [7, 10]], 'W');
    contornear(g, 'o'); ponTodos(g, [[3, 9], [3, 10]], 'h');
    sello(g, 13, 0, ['.W.', 'WYW', '.W.']); sello(g, 0, 1, ['.Y.', 'YWY', '.Y.']); pon(g, 14, 6, 'Y');
    return salida(g, { o: '#2E1A40', P: '#8E5BC4', p: '#C79BEA', Y: '#F5C83C', W: '#FFFFFF', h: '#B48BE0' });
  },
  mantel() {
    const g = lienzo(30, 10);
    for (let y = 1; y < 9; y++) { const m = Math.round((8 - y) / 2); for (let x = 1 + m; x < 29 - m; x++) g[y][x] = (Math.floor((x - m) / 3) + Math.floor(y / 2)) % 2 ? 'R' : 'W'; }
    contornear(g, 'o');
    return salida(g, { o: '#7A2436', R: '#D9455F', W: '#FFF4F0' });
  },
  'set-te'() {
    const g = lienzo(16, 10);
    elipse(g, 5, 6.2, 3.6, 2.6, 'T'); rect(g, 3, 6, 5, 1, 'B'); rect(g, 4, 2, 3, 2, 'T'); pon(g, 5, 1, 'B');
    ponTodos(g, [[9, 5], [10, 4]], 'T'); ponTodos(g, [[0, 5], [0, 6]], 'T');            // pico y asa
    rect(g, 11, 6, 2, 2, 'T'); rect(g, 14, 6, 1, 2, 'T'); pon(g, 11, 6, 'g'); pon(g, 14, 6, 'g');
    contornear(g, 'o'); ponTodos(g, [[3, 5], [4, 4]], 'h');
    return salida(g, { o: '#2F3A4A', T: '#EEF4F6', B: '#4A7FB0', g: '#9CCB7A', h: '#FFFFFF' });
  },
  cesta() {
    const g = lienzo(14, 12);
    for (let y = 5; y < 11; y++) for (let x = 1 + (y > 9 ? 1 : 0); x < 13 - (y > 9 ? 1 : 0); x++) g[y][x] = (x + y) % 2 ? 'w' : 'W';
    for (let x = 3; x < 11; x++) { const y = Math.round(4 - 3 * Math.sin(((x - 3) / 7) * Math.PI)); pon(g, x, y, 'w'); }
    rect(g, 2, 5, 3, 1, 'R'); rect(g, 5, 5, 2, 1, 'r'); rect(g, 9, 4, 3, 2, 'R');
    contornear(g, 'o');
    return salida(g, { o: O, w: '#B9833F', W: '#D9A55E', R: '#D9455F', r: '#FFF4F0' });
  },
  dango() {
    const g = lienzo(7, 14);
    for (let y = 1; y < 13; y++) pon(g, 3, y, 't');
    elipse(g, 3, 3, 2.2, 2.2, 'P'); elipse(g, 3, 6.6, 2.2, 2.2, 'W'); elipse(g, 3, 10.2, 2.2, 2.2, 'G');
    contornear(g, 'o'); ponTodos(g, [[2, 2], [2, 6], [2, 9]], 'h');
    return salida(g, { o: '#4A2E2A', t: '#C9A06A', P: '#F4A4C4', W: '#FFF7F0', G: '#9CCB7A', h: '#FFFFFF' });
  },
  cojin() {
    const g = lienzo(12, 6);
    rect(g, 1, 1, 10, 4, 'C'); pon(g, 1, 1, '.'); pon(g, 10, 1, '.'); pon(g, 1, 4, '.'); pon(g, 10, 4, '.');
    ponTodos(g, [[5, 2], [6, 2], [5, 3], [6, 3]], 'c'); rect(g, 2, 1, 7, 1, 'h');
    contornear(g, 'o');
    return salida(g, { o: '#3B2150', C: '#8E5BC4', c: '#5E3A88', h: '#B48BE0' });
  },
  farol() {
    const g = lienzo(12, 22);
    rect(g, 5, 0, 2, 2, 's'); rect(g, 4, 2, 4, 1, 'S');
    for (let y = 3; y < 6; y++) rect(g, 3 - (y - 3), y, 6 + 2 * (y - 3), 1, y === 5 ? 'S' : 's');
    rect(g, 2, 6, 8, 5, 's'); rect(g, 4, 7, 4, 3, 'Y'); pon(g, 5, 8, 'y'); pon(g, 6, 8, 'y');
    rect(g, 3, 11, 6, 1, 'S'); rect(g, 4, 12, 4, 6, 's'); rect(g, 7, 12, 1, 6, 'S'); rect(g, 2, 18, 8, 2, 's'); rect(g, 2, 19, 8, 1, 'S');
    contornear(g, 'o');
    return salida(g, { o: '#3A3530', s: '#B5AFA5', S: '#8A847B', Y: '#F5C83C', y: '#FFF2B8' });
  },
  chochin() {
    const g = lienzo(26, 12);
    for (let x = 1; x < 25; x++) pon(g, x, 1 + Math.round(1.2 * Math.sin((x / 24) * Math.PI)), 'k');
    for (const cx of [4.5, 12.5, 20.5]) {
      const top = 3 + (cx === 12.5 ? 1 : 0);
      elipse(g, cx, top + 4, 2.6, 3.4, 'R'); rect(g, Math.floor(cx) - 1, top, 3, 1, 'k'); rect(g, Math.floor(cx) - 1, top + 8, 3, 1, 'k');
      for (const dy of [3, 5]) for (let x = Math.floor(cx) - 2; x <= Math.floor(cx) + 2; x++) if (g[top + dy][x] === 'R') g[top + dy][x] = 'r';
      pon(g, Math.floor(cx) - 1, top + 3, 'Y');
    }
    return salida(g, { k: '#2A1A1A', R: '#E0485E', r: '#B8324A', Y: '#FFD27A' });
  },
  wagasa() {
    const g = lienzo(20, 20);
    elipse(g, 9.5, 9, 8.6, 7.6, 'U', (x, y) => y <= 9);
    for (let k = 0; k < 5; k++) { const a = Math.PI + (k + 0.5) * (Math.PI / 5); for (let r = 2; r < 8; r++) { const x = Math.round(9.5 + r * Math.cos(a)); const y = Math.round(9 + r * 0.88 * Math.sin(a)); if (g[y]?.[x] === 'U') g[y][x] = 'u'; } }
    for (let x = 1; x < 19; x++) if (g[9][x] === 'U' && x % 3 === 0) g[9][x] = 'W';
    for (let y = 10; y < 19; y++) pon(g, 9, y, 't'); pon(g, 10, 18, 't');
    contornear(g, 'o'); ponTodos(g, [[6, 4], [5, 5], [7, 3]], 'h');
    return salida(g, { o: '#5A1E2A', U: '#D9455F', u: '#A8304A', W: '#FFF4F0', t: '#7A4B2A', h: '#F28A9C' });
  },
  banca() {
    const g = lienzo(24, 12);
    rect(g, 1, 1, 22, 2, 'w'); rect(g, 1, 4, 22, 2, 'W'); rect(g, 1, 5, 22, 1, 'w');
    for (const x of [3, 20]) rect(g, x, 3, 1, 1, 'd');
    for (const x of [2, 3, 20, 21]) rect(g, x, 6, 1, 5, 'd');
    contornear(g, 'o');
    return salida(g, { o: O, w: '#A8703E', W: '#C98E55', d: '#6E4426' });
  },
  estanque() {
    const g = lienzo(32, 12);
    elipse(g, 15.5, 6, 14.4, 4.6, 'A');
    for (let y = 0; y < 12; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'A' && ruido(x, y, 7) > 0.85) g[y][x] = 'a';
    sello(g, 8, 5, ['KKW', '.KK']); sello(g, 20, 6, ['WKK', 'KK.']);
    contornear(g, 's'); contornear(g, 'o');
    for (let x = 0; x < 32; x++) for (let y = 0; y < 12; y++) if (g[y][x] === 's' && ruido(x, y, 9) > 0.6) g[y][x] = 'S';
    return salida(g, { o: '#2F3A3A', A: '#6FB7D6', a: '#B8E2F0', K: '#F08A3C', W: '#FFFFFF', s: '#B5AFA5', S: '#8A847B' });
  },
  furin() {
    const g = lienzo(6, 14);
    rect(g, 2, 0, 2, 3, 'k');
    elipse(g, 2.5, 6, 2.4, 3, 'G', (x, y) => y <= 6); ponTodos(g, [[1, 5], [3, 4]], 'R');
    rect(g, 2, 7, 2, 1, 'k'); rect(g, 2, 8, 2, 6, 'p'); pon(g, 2, 10, 'P');
    return salida(g, { k: '#2A1A1A', G: '#BFE3F0', R: '#E0485E', p: '#F7C2CE', P: '#E0485E' });
  },
  columpio() {
    const g = lienzo(14, 22);
    for (let y = 0; y < 18; y++) { pon(g, 1, y, 'k'); pon(g, 12, y, 'k'); }
    rect(g, 0, 18, 14, 2, 'w'); rect(g, 0, 19, 14, 1, 'd');
    rect(g, 0, 20, 1, 2, 'd'); rect(g, 13, 20, 1, 2, 'd');
    return salida(g, { k: '#7A5A3A', w: '#C98E55', d: '#8A5A2E' });
  },
  maneki() {
    // gato de la suerte: blanco con manchas, pata levantada, collar rojo y moneda dorada
    const g = lienzo(16, 18);
    elipse(g, 7, 13, 5.4, 4.2, 'W'); elipse(g, 7, 6.5, 5.2, 4.2, 'W');
    sello(g, 2, 1, ['W.', 'WW']); sello(g, 10, 1, ['.W', 'WW']); ponTodos(g, [[3, 2], [11, 2]], 'P');
    elipse(g, 13, 4.5, 1.6, 1.8, 'W'); rect(g, 12, 6, 2, 3, 'W'); pon(g, 13, 4, 'P');      // pata en alto
    sello(g, 3, 3, ['OO', 'OOO']); sello(g, 9, 3, ['.KK', 'KKK']);                           // manchas
    ponTodos(g, [[4, 6], [5, 7], [6, 6], [8, 6], [9, 7], [10, 6]], 'k');                       // ojos felices
    ponTodos(g, [[3, 8], [11, 8]], 'P'); pon(g, 7, 8, 'k');
    rect(g, 3, 10, 9, 1, 'R'); pon(g, 7, 11, 'Y');
    rect(g, 5, 12, 4, 4, 'Y'); ponTodos(g, [[6, 13], [7, 14]], 'G');                            // moneda koban
    contornear(g, 'o');
    return salida(g, { o: '#3A2A2A', W: '#FFFBF5', P: '#F4A4C4', O: '#E8944A', K: '#3A3030', k: '#2A1A1A', R: '#D9455F', Y: '#F5C83C', G: '#C98A2E' });
  },
  teru() {
    // teru teru bozu: muñequito de tela que se cuelga para pedir buen tiempo
    const g = lienzo(10, 16);
    rect(g, 4, 0, 2, 3, 'k');
    elipse(g, 4.5, 6, 3, 2.8, 'W');
    for (let y = 9; y < 15; y++) rect(g, 4 - Math.floor((y - 9) / 1.6), y, 2 + 2 * Math.floor((y - 9) / 1.6), 1, 'W');
    contornear(g, 'o');
    ponTodos(g, [[3, 6], [6, 6]], 'k'); ponTodos(g, [[2, 7], [7, 7]], 'p'); ponTodos(g, [[4, 7], [5, 7]], 'k');
    rect(g, 3, 9, 4, 1, 'R'); ponTodos(g, [[2, 10], [7, 10]], 'R');
    return salida(g, { o: '#6A6A7A', W: '#FFFFFF', k: '#2A1A1A', p: '#F7C2CE', R: '#D9455F' });
  },
  daruma() {
    const g = lienzo(12, 13);
    elipse(g, 5.5, 6.6, 5, 5.6, 'R'); elipse(g, 5.5, 5.2, 3.2, 2.6, 'W');
    ponTodos(g, [[3, 4], [4, 4], [7, 4], [8, 4]], 'k'); ponTodos(g, [[4, 5], [7, 5]], 'k'); ponTodos(g, [[5, 7], [6, 7]], 'r');
    rect(g, 4, 10, 4, 1, 'Y'); ponTodos(g, [[3, 9], [8, 9]], 'Y');
    contornear(g, 'o'); ponTodos(g, [[2, 4], [2, 5]], 'h');
    return salida(g, { o: '#4A1A1A', R: '#D9333F', r: '#A8232E', W: '#FFF4E6', k: '#2A1A1A', Y: '#F5C83C', h: '#F07A7F' });
  },
  koinobori() {
    // mástil con tres carpas de tela al viento
    const g = lienzo(18, 24);
    for (let y = 1; y < 24; y++) pon(g, 1, y, 't'); pon(g, 1, 0, 'Y');
    [['B', 'b', 4], ['R', 'r', 10], ['G', 'g', 16]].forEach(([c, c2, cy]) => {
      elipse(g, 9.5, cy, 6.6, 1.9, c);
      for (let x = 5; x < 15; x += 2) if (g[cy - 1]?.[x] === c) g[cy - 1][x] = c2;
      ponTodos(g, [[17, cy - 1], [17, cy + 1], [16, cy]], c);
      pon(g, 4, cy, 'W'); pon(g, 5, cy, 'k');
      pon(g, 2, cy - 1, 'k');
    });
    return salida(g, { t: '#7A5A3A', Y: '#F5C83C', B: '#4A7FB0', b: '#8FB8DA', R: '#E0485E', r: '#F49AAA', G: '#5E9A44', g: '#A7D27E', W: '#FFFFFF', k: '#2A1A1A' });
  },
  torii() {
    const g = lienzo(28, 24);
    rect(g, 0, 2, 28, 2, 'K'); ponTodos(g, [[0, 1], [27, 1]], 'K');           // kasagi con puntas
    rect(g, 1, 4, 26, 1, 'R'); rect(g, 2, 8, 24, 2, 'R');                       // vigas
    rect(g, 13, 4, 2, 4, 'K');                                                   // placa
    for (const x of [5, 20]) { rect(g, x, 5, 3, 17, 'R'); rect(g, x + 2, 5, 1, 17, 'r'); rect(g, x - 1, 22, 5, 2, 'K'); }
    return salida(g, { K: '#2A1A1A', R: '#D9333F', r: '#A8232E' });
  },
  tanzaku() {
    // bambú con papelitos de deseos (tanabata)
    const g = lienzo(12, 28);
    for (let y = 0; y < 28; y++) { pon(g, 5, y, 'G'); pon(g, 6, y, y % 7 === 6 ? 'g' : 'H'); if (y % 7 === 6) pon(g, 5, y, 'g'); }
    sello(g, 7, 2, ['.vv', 'vv.']); sello(g, 2, 5, ['vv.', '.vv']); sello(g, 7, 9, ['vvv']); sello(g, 1, 13, ['.vv', 'vv.']);
    [[1, 8, 'P'], [8, 12, 'Y'], [2, 18, 'B'], [8, 20, 'L']].forEach(([x, y, c]) => { pon(g, x + (x < 5 ? 1 : 0), y - 1, 'k'); rect(g, x, y, 2, 5, c); });
    return salida(g, { G: '#7FAE5A', H: '#A9CF7E', g: '#4F7A3A', v: '#6E9E4C', P: '#F7A8BA', Y: '#F8D77E', B: '#9CC6E8', L: '#C9A6E0', k: '#7A5A3A' });
  },
  petalos() {
    const g = lienzo(12, 12);
    for (const [x, y] of [[1, 2], [7, 1], [4, 7]]) sello(g, x, y, ['.aa.', 'abba', '.bb.']);
    contornear(g, 'o');
    return salida(g, { o: '#9C3A5A', a: '#FBD3DC', b: '#F2A0B4' });
  },
  mariposas() {
    const g = lienzo(9, 7);
    sello(g, 0, 0, ['.MM...MM.', 'MPPM.MPPM', 'MPPMkMPPM', '.MMPkPMM.', '..MPkPM..', '..MM.MM..']);
    return salida(g, { M: '#7A3B69', P: '#F4A4C4', k: '#2A1A1A' });
  },
  luciernagas() {
    const g = lienzo(5, 5);
    sello(g, 0, 0, ['..y..', '.yYy.', 'yYWYy', '.yYy.', '..y..']);
    return salida(g, { y: '#E8B83A', Y: '#FFE27A', W: '#FFFBE0' });
  },
  atardecer() {
    const g = lienzo(16, 16);
    elipse(g, 7.5, 10, 6, 6, 'S', (x, y) => y <= 10); elipse(g, 6.5, 8, 3, 3, 's', (x, y) => y <= 10);
    rect(g, 0, 11, 16, 1, 'L'); rect(g, 2, 13, 12, 1, 'l'); rect(g, 5, 15, 6, 1, 'L');
    return salida(g, { S: '#FF9A6A', s: '#FFD49A', L: '#C77AA6', l: '#EE9B9B' });
  },
  noche() {
    const g = lienzo(16, 16);
    elipse(g, 7, 8, 6, 6, 'M'); elipse(g, 10, 6, 5, 5, '.');
    contornear(g, 'o');
    sello(g, 11, 9, ['.W.', 'WYW', '.W.']); pon(g, 13, 2, 'W');
    return salida(g, { o: '#3A3F78', M: '#F4EFD8', W: '#FFFFFF', Y: '#FFE27A' });
  },
  protector() {
    // sakura dorada: la «sakura de reserva» que protege la racha
    const { filas } = sakura();
    const dorado = { o: '#6B3E12', a: '#FCE7A6', b: '#F8D77E', m: '#F2BE4A', c: '#D99A2B', n: '#B8701E', h: '#FFFFFF' };
    const g = filas.map((f) => [...f]);
    sello(g, 18, 0, ['.W.', 'WWW', '.W.'].map((r) => r.replace(/W/g, 'h')));
    return salida(g, dorado);
  },
};
const petalo = () => { const g = lienzo(4, 3); sello(g, 0, 0, ['.ab.', 'abbb', '.bb.']); return salida(g, { a: '#FBD3DC', b: '#F2A0B4' }); };

export function archivos() {
  const out = {};
  for (let i = 0; i < 8; i++) { const { filas, colores } = arbol(i); out[`arbol-${i}.svg`] = toSvg(filas, { titulo: `Sakura, etapa ${i}`, colores }); }
  for (const f of Object.keys(FONDOS)) { const { filas, colores } = fondo(f); out[`fondo-${f}.svg`] = toSvg(filas, { titulo: `Fondo ${f}`, colores }); }
  for (const [id, fn] of Object.entries(OBJETOS)) { const { filas, colores } = fn(); out[`${id}.svg`] = toSvg(filas, { titulo: id, colores }); }
  const p = petalo(); out['petalo.svg'] = toSvg(p.filas, { titulo: 'Pétalo', colores: p.colores });
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) rmSync(join(OUT, f));
  const todo = archivos();
  for (const [ruta, svg] of Object.entries(todo)) writeFileSync(join(OUT, ruta), svg);
  console.log(`✓ ${Object.keys(todo).length} dibujos del jardín en app/assets/jardin/`);
}
