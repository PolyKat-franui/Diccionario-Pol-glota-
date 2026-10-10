// Carga del banco de palabras (JSON generado por scripts/build-banco.mjs).
// Cada idioma se descarga solo cuando se necesita.
let conceptos = null;
const porId = new Map();
const pendientes = {};
const listos = {};

export async function cargarConceptos() {
  if (conceptos) return conceptos;
  const raw = await (await fetch('data/banco/conceptos.json')).json();
  conceptos = raw.map(([id, tipos, megas, temas, rango, nivel]) => ({ id, tipos, megas, temas, rango, nivel }));
  conceptos.forEach((c) => porId.set(c.id, c));
  return conceptos;
}

export function cargarIdioma(lang) {
  pendientes[lang] ??= fetch(`data/banco/${lang}.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((data) => { listos[lang] = data; return data; });
  return pendientes[lang];
}

export async function prepararPar(meta, nativo) {
  await Promise.all([cargarConceptos(), cargarIdioma(meta), cargarIdioma(nativo)]);
}

export const concepto = (id) => porId.get(id);

/** { texto, ipa, borrador } o null si ese idioma aún no tiene traducción. */
export function texto(lang, id) {
  const v = listos[lang]?.[id];
  return v ? { texto: v[0], ipa: v[1] || '', borrador: !!v[2] } : null;
}

/** Conceptos que tienen texto en ambos idiomas del par. */
export function disponibles(meta, nativo) {
  return (conceptos ?? []).filter((c) => listos[meta]?.[c.id] && listos[nativo]?.[c.id]);
}

/** Cuántas filas tiene traducidas un idioma (para mostrar cobertura). */
export const cobertura = (lang) => Object.keys(listos[lang] ?? {}).length;
export const totalConceptos = () => conceptos?.length ?? 0;
