// Kitty en "modo diccionario": responde sin IA buscando en el banco.
// Cuando se conecte una IA (ver docs/RECOMENDACIONES.md), sus reglas son:
// responde en el idioma nativo, corto; propone frases con vocabulario conocido;
// avanza sin repetir; corrige breve y marca lo corregido; no mezcla pronunciaciones.

/** Minúsculas, sin tildes ni signos, para comparar. */
export function normalizar(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:«»"“”…]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quita el artículo inicial ("el agua" → "agua") para buscar también sin él. */
const ARTICULOS = /^(el|la|los|las|o|a|os|as|le|les|l'|il|lo|gli|i|der|die|das|the|a|an)\s+/;
const sinArticulo = (s) => s.replace(ARTICULOS, '').replace(/^l'/, '');

/**
 * entradas: [{ id, meta, nativo, tipos }]  (textos ya resueltos)
 * Devuelve hasta `max` coincidencias, primero las exactas.
 */
export function buscar(consulta, entradas, max = 3) {
  const q = normalizar(consulta);
  if (!q) return [];
  const puntaje = (texto) => {
    const n = normalizar(texto);
    const partes = n.split(' / ').flatMap((p) => [p, sinArticulo(p)]);
    if (partes.includes(q)) return 3;
    if (partes.some((p) => p.startsWith(q))) return 2;
    if (q.length >= 3 && n.includes(q)) return 1;
    return 0;
  };
  return entradas
    .map((e) => ({ e, p: Math.max(puntaje(e.meta), puntaje(e.nativo)) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.e.meta.length - b.e.meta.length)
    .slice(0, max)
    .map((x) => x.e);
}

/** Elige una frase ya estudiada (caja ≥ 1), evitando la última propuesta. */
export function fraseConocida(entradas, progreso, ultima = null, azar = Math.random) {
  const conocidas = entradas.filter((e) => e.tipos.includes('frase') && (progreso[e.id]?.c ?? 0) >= 1 && e.id !== ultima);
  if (!conocidas.length) return null;
  return conocidas[Math.floor(azar() * conocidas.length)];
}
