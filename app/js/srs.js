// Repetición espaciada (estilo Anki/Leitner).
// Cada tarjeta vive en una "caja". Acierto → sube una caja. Fallo → vuelve a la 0.
// La caja define cuándo vuelve a salir: 0 = en esta misma sesión.
export const INTERVALOS_DIAS = [0, 1, 3, 7, 21, 60];
export const CAJA_MAX = INTERVALOS_DIAS.length - 1;
export const DIA_MS = 86_400_000;

export const NIVELES = ['nueva', 'dificil', 'media', 'facil', 'dominada'];

/**
 * Registra una respuesta y devuelve el nuevo estado de la tarjeta.
 * Estado: { c: caja, d: próxima fecha (ms), v: vistas, a: aciertos, f: fallos, u: última vez }
 */
export function responder(estado, sabia, ahora = Date.now()) {
  const prev = estado ?? { c: 0, v: 0, a: 0, f: 0 };
  const c = sabia ? Math.min((estado ? prev.c : 0) + 1, CAJA_MAX) : 0;
  return {
    c,
    d: ahora + INTERVALOS_DIAS[c] * DIA_MS,
    v: prev.v + 1,
    a: prev.a + (sabia ? 1 : 0),
    f: prev.f + (sabia ? 0 : 1),
    u: ahora,
  };
}

/** Ícono de dificultad: nueva, difícil, media, fácil, dominada. */
export function dificultad(estado) {
  if (!estado) return 'nueva';
  if (estado.c === 0) return 'dificil';
  if (estado.c <= 2) return 'media';
  if (estado.c < CAJA_MAX) return 'facil';
  return 'dominada';
}

export const vence = (estado, ahora = Date.now()) => !!estado && estado.d <= ahora;
