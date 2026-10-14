// Armado de sesiones: Kaizen (bloques cortos) + Kumon (dominar un bloque antes del siguiente) + SRS.
import { vence } from './srs.js';

export const TAM_SESION = 10;
export const TAM_BLOQUE = 10;
export const UMBRAL_BLOQUE = 0.8; // 80 % del bloque acertado al menos una vez → se abre el siguiente

const ORDEN_NIVEL = { 'Pre-A1': 0, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

/** Dificultad elegida en Temas: facil (Pre-A1/A1), medio (A2 o sin nivel), dificil (B1 en adelante). */
export function grupoDificultad(concepto) {
  const n = ORDEN_NIVEL[concepto.nivel];
  if (n === undefined) return 'medio';
  if (n <= 1) return 'facil';
  if (n === 2) return 'medio';
  return 'dificil';
}

/** Orden Kumon: de lo más básico y frecuente a lo más complejo. */
export function ordenar(conceptos) {
  return [...conceptos].sort((a, b) =>
    (ORDEN_NIVEL[a.nivel] ?? 2.5) - (ORDEN_NIVEL[b.nivel] ?? 2.5)
    || (a.rango || 9999) - (b.rango || 9999)
    || a.id.localeCompare(b.id));
}

export function bloques(ids, tam = TAM_BLOQUE) {
  const out = [];
  for (let i = 0; i < ids.length; i += tam) out.push(ids.slice(i, i + tam));
  return out;
}

export function bloqueDominado(bloque, progreso) {
  const ok = bloque.filter((id) => (progreso[id]?.c ?? 0) >= 1).length;
  return ok / bloque.length >= UMBRAL_BLOQUE;
}

/** Índice del primer bloque que todavía no se domina (o el último si todos están dominados). */
export function bloqueActual(listaBloques, progreso) {
  const i = listaBloques.findIndex((b) => !bloqueDominado(b, progreso));
  return i === -1 ? Math.max(listaBloques.length - 1, 0) : i;
}

/**
 * Arma la cola de una sesión.
 * 1) tarjetas vencidas de los bloques abiertos (las más atrasadas primero)
 * 2) tarjetas nuevas del bloque actual
 * Si no hay nada → motivo "aldia" (se ofrece práctica libre).
 */
export function armarSesion({ ids, progreso, ahora = Date.now(), tam = TAM_SESION }) {
  const lista = bloques(ids);
  const actual = bloqueActual(lista, progreso);
  const abiertos = lista.slice(0, actual + 1).flat();
  const vencidas = abiertos.filter((id) => vence(progreso[id], ahora)).sort((a, b) => progreso[a].d - progreso[b].d);
  const nuevas = (lista[actual] ?? []).filter((id) => !progreso[id]);
  const cola = [...vencidas, ...nuevas].slice(0, tam);
  return { cola, bloque: actual, totalBloques: lista.length, motivo: cola.length ? 'normal' : 'aldia' };
}

/** Práctica libre: repasa tarjetas ya vistas aunque no les toque. */
export function practicaLibre({ ids, progreso, tam = TAM_SESION, azar = Math.random }) {
  const vistas = ids.filter((id) => progreso[id]);
  const base = vistas.length ? vistas : ids;
  const copia = [...base];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, tam);
}

/** Donde vuelve a entrar una tarjeta fallada dentro de la sesión (un poco más adelante). */
export const REINSERTAR_EN = 3;
export const MAX_REPETICIONES = 2;

/**
 * Estudio libre: filtra el banco para elegir qué repasar.
 * filtro = { texto, mega, nivel ('todas'|'vistas'|nivel de srs), favoritos (Set) }; nivelDe(id) da el nivel actual.
 */
export function filtrarLibre(conceptos, { texto = '', mega = '', nivel = 'todas', favoritos = null } = {}, { nivelDe, textos }) {
  const q = texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return conceptos.filter((c) => {
    if (mega && !c.megas.includes(mega)) return false;
    const n = nivelDe(c.id);
    if (nivel === 'vistas' && n === 'nueva') return false;
    if (nivel === 'favoritos' && !favoritos?.has(c.id)) return false;
    if (!['todas', 'vistas', 'favoritos'].includes(nivel) && n !== nivel) return false;
    if (q && !textos(c.id).some((s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))) return false;
    return true;
  });
}
