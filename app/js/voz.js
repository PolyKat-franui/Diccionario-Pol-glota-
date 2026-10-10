// Pronunciación con la voz del navegador (Web Speech API, sin costo).
// Más adelante: audio de Wiktionary o un servicio de texto a voz (ver docs/RECOMENDACIONES.md).
const PREFERIDAS = {
  en: ['en-US', 'en-GB'],
  es: ['es-419', 'es-MX', 'es-US', 'es-ES'],
  pt: ['pt-BR', 'pt-PT'],
  fr: ['fr-FR', 'fr-CA'],
  it: ['it-IT'],
  de: ['de-DE'],
};

export const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Texto que se lee: sin paréntesis aclaratorios, alternativas "a / b" como pausa. */
export function textoParaLeer(texto) {
  return texto.replace(/\([^)]*\)/g, '').replace(/\s*\/\s*/g, ', ').replace(/…/g, '').trim();
}

/** Devuelve false si el navegador no puede leer ese idioma. */
export function hablar(texto, lang) {
  if (!hayVoz()) return false;
  const synth = window.speechSynthesis;
  const voces = synth.getVoices();
  const u = new SpeechSynthesisUtterance(textoParaLeer(texto));
  const locales = PREFERIDAS[lang] ?? [lang];
  u.lang = locales[0];
  const voz = locales.map((l) => voces.find((v) => v.lang.replace('_', '-') === l)).find(Boolean)
    ?? voces.find((v) => v.lang.toLowerCase().startsWith(lang));
  if (voz) { u.voice = voz; u.lang = voz.lang; }
  else if (voces.length) return false; // hay voces, pero ninguna de este idioma
  u.rate = 0.9;
  synth.cancel();
  synth.speak(u);
  return true;
}
