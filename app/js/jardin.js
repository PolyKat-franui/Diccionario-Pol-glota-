// Jardín de Sakura: juego incremental que acompaña el estudio.
// Ciclo: estudias → ganas Kitty tokens → compras abono → el árbol crece → el árbol produce tokens solo
//        → compras decoraciones y ambientes → cada una sube lo que produce el árbol.
// Todo es lógica pura (sin DOM) para poder probarla: tests/jardin.test.mjs.

/** Escena del jardín en pixeles lógicos (se dibuja a escala entera: ×3 en celular, ×4 en computador). */
export const ESCENA = { w: 96, h: 96, suelo: 60 };

/** Etapas del árbol (dibujos arbol-0…7). Después de la 7 el nivel sigue subiendo con el mismo dibujo. */
export const ETAPAS = 8;
/** Crecimiento total que necesita el nivel n (crece cada vez más, como en los juegos incrementales). */
export const umbral = (n) => (n <= 0 ? 0 : Math.round((10 * (1.8 ** n - 1)) / 0.8));
export function nivelDe(crecimiento) {
  let n = 0;
  while (umbral(n + 1) <= crecimiento) n++;
  return n;
}
export const etapaDe = (nivel) => Math.min(ETAPAS - 1, nivel);

/** Crecimiento por estudiar: cada palabra revisada riega el árbol; cumplir la meta del día da un extra. */
export const CRECE_POR_PALABRA = 1;
export const CRECE_POR_META = 10;

/** Producción pasiva: tokens por hora = nivel × (1 + 10 % por cada objeto de la tienda que tengas). Se junta hasta 8 h. */
export const BONO_POR_OBJETO = 0.1;
export const MAX_HORAS = 8;

/**
 * Catálogo de la tienda de Kitty. pos = lugar inicial en la escena (pixeles lógicos, esquina sup. izq.);
 * w×h = tamaño real del dibujo (tests/jardin.test.mjs revisa que coincida con el SVG).
 */
export const CATALOGO = [
  // Abono: se usa al comprarlo y hace crecer el árbol
  { id: 'abono', tipo: 'abono', precio: 15, crece: 10, w: 14, h: 14 },
  { id: 'abono-grande', tipo: 'abono', precio: 45, crece: 35, w: 16, h: 16 },
  { id: 'abono-magico', tipo: 'abono', precio: 120, crece: 110, w: 16, h: 16 },
  // Decoraciones: un rincón para tomar el té bajo el sakura
  { id: 'mantel', tipo: 'decor', precio: 40, w: 30, h: 10, pos: [6, 80] },
  { id: 'set-te', tipo: 'decor', precio: 60, w: 16, h: 10, pos: [13, 76] },
  { id: 'cesta', tipo: 'decor', precio: 35, w: 14, h: 12, pos: [26, 72] },
  { id: 'dango', tipo: 'decor', precio: 25, w: 7, h: 14, pos: [4, 70] },
  { id: 'cojin', tipo: 'decor', precio: 30, w: 12, h: 6, pos: [36, 86] },
  { id: 'farol', tipo: 'decor', precio: 90, w: 12, h: 22, pos: [80, 54] },
  { id: 'chochin', tipo: 'decor', precio: 70, w: 26, h: 12, pos: [8, 44] },
  { id: 'wagasa', tipo: 'decor', precio: 80, w: 20, h: 20, pos: [70, 70] },
  { id: 'banca', tipo: 'decor', precio: 110, w: 24, h: 12, pos: [62, 62] },
  { id: 'estanque', tipo: 'decor', precio: 180, w: 32, h: 12, pos: [58, 82] },
  { id: 'furin', tipo: 'decor', precio: 50, w: 6, h: 14, pos: [76, 40] },
  { id: 'columpio', tipo: 'decor', precio: 150, w: 14, h: 22, pos: [60, 40] },
  // Amuletos y detalles japoneses (referencias de Francisca)
  { id: 'maneki', tipo: 'decor', precio: 130, w: 16, h: 18, pos: [42, 74] },
  { id: 'teru', tipo: 'decor', precio: 45, w: 10, h: 16, pos: [14, 40] },
  { id: 'daruma', tipo: 'decor', precio: 75, w: 12, h: 13, pos: [30, 80] },
  { id: 'koinobori', tipo: 'decor', precio: 120, w: 18, h: 24, pos: [76, 34] },
  { id: 'torii', tipo: 'decor', precio: 220, w: 28, h: 24, pos: [2, 36] },
  { id: 'tanzaku', tipo: 'decor', precio: 65, w: 12, h: 28, pos: [84, 56] },
  // Ambiente: efectos que se mueven en la escena
  { id: 'petalos', tipo: 'ambiente', precio: 60, w: 12, h: 12 },
  { id: 'mariposas', tipo: 'ambiente', precio: 90, w: 9, h: 7 },
  { id: 'luciernagas', tipo: 'ambiente', precio: 120, w: 5, h: 5 },
  // Fondos del cielo (el día viene incluido)
  { id: 'atardecer', tipo: 'fondo', precio: 100, w: 16, h: 16 },
  { id: 'noche', tipo: 'fondo', precio: 150, w: 16, h: 16 },
  // Especial: protege la racha si un día no estudias (máximo 2 guardadas)
  { id: 'protector', tipo: 'especial', precio: 60, max: 2, w: 23, h: 23 },
];
export const objeto = (id) => CATALOGO.find((o) => o.id === id);
export const FONDOS = ['dia', 'atardecer', 'noche'];

export function jardinInicial() {
  return { crecimiento: 0, tiene: {}, ocultos: {}, pos: {}, fondo: 'dia', cosecha: null, protectores: 0, caquitas: [], ultimaCaquita: null, limpiadas: 0 };
}

/** Objetos permanentes que tienes (decoraciones, ambientes y fondos): cada uno suma producción. */
export const objetosPermanentes = (j) => CATALOGO.filter((o) => ['decor', 'ambiente', 'fondo'].includes(o.tipo) && j.tiene[o.id]).length;
export const produccionPorHora = (j) => Math.round(nivelDe(j.crecimiento) * (1 + BONO_POR_OBJETO * objetosPermanentes(j)) * 100) / 100;

/** Tokens listos para recoger. La primera vez solo empieza a contar. */
export function pendiente(j, ahora = Date.now()) {
  if (!j.cosecha) return 0;
  const horas = Math.min(MAX_HORAS, Math.max(0, (ahora - j.cosecha) / 3.6e6));
  return Math.floor(horas * produccionPorHora(j));
}
/** Recoge lo producido: suma los tokens al estado y reinicia el conteo. Devuelve cuántos. */
export function recoger(estado, ahora = Date.now()) {
  const j = estado.jardin;
  const n = pendiente(j, ahora);
  j.cosecha = ahora;
  estado.tokens += n;
  return n;
}
/** Empieza a contar la producción (al abrir el jardín por primera vez). */
export function iniciar(estado, ahora = Date.now()) {
  if (!estado.jardin.cosecha) estado.jardin.cosecha = ahora;
}

/** Riega el árbol (estudiar o abono). Devuelve { antes, despues } de nivel. */
export function crecer(estado, n) {
  const j = estado.jardin;
  const antes = nivelDe(j.crecimiento);
  j.crecimiento += n;
  return { antes, despues: nivelDe(j.crecimiento) };
}

/** ¿Se puede comprar? Devuelve null si sí, o el motivo: 'tienes' | 'max' | 'monedas'. */
export function motivoNoCompra(estado, id) {
  const o = objeto(id);
  const j = estado.jardin;
  if (!o) return 'tienes';
  if (['decor', 'ambiente', 'fondo'].includes(o.tipo) && j.tiene[id]) return 'tienes';
  if (o.tipo === 'especial' && j.protectores >= o.max) return 'max';
  if (estado.tokens < o.precio) return 'monedas';
  return null;
}

/** Compra en la tienda de Kitty. Devuelve { ok, motivo?, antes?, despues? }. */
export function comprar(estado, id) {
  const motivo = motivoNoCompra(estado, id);
  if (motivo) return { ok: false, motivo };
  const o = objeto(id);
  const j = estado.jardin;
  estado.tokens -= o.precio;
  if (o.tipo === 'abono') return { ok: true, ...crecer(estado, o.crece) };
  if (o.tipo === 'especial') { j.protectores += 1; return { ok: true }; }
  j.tiene[id] = true;
  if (o.tipo === 'fondo') j.fondo = id;
  return { ok: true };
}

/** Muestra u oculta una decoración que ya tienes. */
export function alternarVisible(j, id) {
  if (!j.tiene[id]) return false;
  if (j.ocultos[id]) delete j.ocultos[id];
  else j.ocultos[id] = true;
  return !j.ocultos[id];
}

/** Posición de una decoración en la escena (la guardada o la inicial), siempre dentro de la escena. */
export function posicion(j, id) {
  const o = objeto(id);
  const [x, y] = j.pos[id] ?? o.pos ?? [0, 0];
  return [Math.max(0, Math.min(ESCENA.w - o.w, Math.round(x))), Math.max(0, Math.min(ESCENA.h - o.h, Math.round(y)))];
}
export function mover(j, id, x, y) {
  const o = objeto(id);
  j.pos[id] = [Math.max(0, Math.min(ESCENA.w - o.w, Math.round(x))), Math.max(0, Math.min(ESCENA.h - o.h, Math.round(y)))];
  return j.pos[id];
}

/** Mundo de sakuras: espacios para recorrer, que se desbloquean con el nivel del árbol. */
export const MUNDO = [
  { id: 'te', nivel: 0 },
  { id: 'estanque', nivel: 2 },
  { id: 'faroles', nivel: 4 },
  { id: 'mirador', nivel: 6 },
];
export const espaciosAbiertos = (j) => MUNDO.filter((e) => nivelDe(j.crecimiento) >= e.nivel).map((e) => e.id);
/** Faroles de la calle: posición (pixeles lógicos) y tamaño a escala de perspectiva (más lejos = ×1, cerca = ×2). */
export const FAROLES_CALLE = [
  { x: 14, y: 64, e: 2 }, { x: 66, y: 64, e: 2 },
  { x: 34, y: 50, e: 1 }, { x: 54, y: 50, e: 1 },
]

// ---------- Caquitas de Kitty (idea de Francisca, 2026-10-14) ----------
// De vez en cuando Kitty deja una caquita en el jardín. Tocarla la limpia: da tokens y sirve de abono natural.
export const CAQUITA = { cadaHoras: 3, max: 3, tokens: 3, crece: 1, w: 10, h: 9 };
/** Lugar en el pasto (pixeles lógicos), lejos del tronco, elegido con un número 0–1. */
const lugarCaquita = (r1, r2) => {
  const x = Math.round(4 + r1 * 80);
  return [x > 36 && x < 52 ? x + 18 : x, Math.round(76 + r2 * 10)];
};
/** Agrega las caquitas que tocan desde la última (una cada 3 h, máximo 3 a la vez). Devuelve cuántas nuevas. */
export function aparecerCaquitas(j, ahora = Date.now(), azar = Math.random) {
  j.caquitas ??= [];
  if (!j.ultimaCaquita) { j.ultimaCaquita = ahora; return 0; }
  const n = Math.floor((ahora - j.ultimaCaquita) / (CAQUITA.cadaHoras * 3.6e6));
  if (n <= 0) return 0;
  j.ultimaCaquita += n * CAQUITA.cadaHoras * 3.6e6;
  let nuevas = 0;
  for (let i = 0; i < n && j.caquitas.length < CAQUITA.max; i++) { j.caquitas.push(lugarCaquita(azar(), azar())); nuevas++; }
  return nuevas;
}
/** Limpia la caquita i: suma tokens y crecimiento. Devuelve { tokens, antes, despues } o null. */
export function limpiarCaquita(estado, i) {
  const j = estado.jardin;
  if (!j.caquitas?.[i]) return null;
  j.caquitas.splice(i, 1);
  j.limpiadas = (j.limpiadas ?? 0) + 1;
  estado.tokens += CAQUITA.tokens;
  return { tokens: CAQUITA.tokens, ...crecer(estado, CAQUITA.crece) };
}
