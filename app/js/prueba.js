// Prueba de Kitty: al final de la sesión, la persona escribe qué significa la palabra.
// Se acepta sin tildes ni mayúsculas, sin artículo, cualquiera de las traducciones válidas
// y un error pequeño (una letra; dos en palabras largas).
const ARTICULOS = /^(el|la|los|las|un|una|unos|unas|lo|the|a|an|to|o|os|as|um|uma|le|les|l|un|une|des|il|i|gli|uno|der|die|das|den|dem|ein|eine|einen|sich)\s+/;

export function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/'/g, ' ')
    .replace(/\s+/g, ' ').trim().replace(ARTICULOS, '').trim();
}

/** Todas las respuestas válidas de una traducción como «la respuesta / responder, contestar». */
export function opciones(traduccion) {
  return String(traduccion ?? '').split(/[\/,;]| o | or /).map(normalizar).filter(Boolean);
}

function distancia(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0]; fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = tmp;
    }
  }
  return fila[b.length];
}

/** ¿La respuesta escrita corresponde a la traducción? */
export function esCorrecta(respuesta, traduccion) {
  const r = normalizar(respuesta);
  if (!r) return false;
  return opciones(traduccion).some((o) => o === r || distancia(o, r) <= (o.length > 7 ? 2 : o.length > 3 ? 1 : 0));
}

/** Elige hasta n palabras de la sesión (primero las que dijo saber), sin repetir. */
export function elegir(respondidas, n = 3, azar = Math.random) {
  const unicas = [...new Map(respondidas.map((x) => [x.id, x])).values()];
  const mezcla = (l) => l.map((x) => [azar(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  return [...mezcla(unicas.filter((x) => x.sabia)), ...mezcla(unicas.filter((x) => !x.sabia))].slice(0, n).map((x) => x.id);
}

/** Lo que dice Kitty en el idioma que se aprende. */
export const KITTY_DICE = {
  si: { en: 'Yes! Great!', es: '¡Sí! ¡Muy bien!', pt: 'Sim! Isso aí!', fr: 'Oui ! Bravo !', it: 'Sì! Bravo!', de: 'Ja! Richtig!' },
  no: { en: 'Nope…', es: 'No…', pt: 'Não…', fr: 'Non…', it: 'No…', de: 'Nein…' },
};
