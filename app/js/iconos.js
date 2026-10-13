// Íconos de línea (SVG en línea, heredan el color del texto).
const s = (d, extra = '') => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICON = {
  // Dificultad (cada nivel con su ícono; el color lo pone la insignia)
  nueva: s('<path fill="currentColor" stroke="none" d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4L12 21.5l-2.4-7.1L2.5 12l7.1-2.4z"/>'),
  dificil: s('<path fill="currentColor" stroke="none" d="M12.6 2c.6 3.6 5.4 5.9 5.4 11a6 6 0 0 1-12 0c0-2.6 1.4-4.5 3-5.9.2 1.8 1 3 2.2 3.5-.3-3.4.4-6.3 1.4-8.6Z"/>'),
  media: s('<circle cx="12" cy="12" r="8.5"/><path fill="currentColor" stroke="none" d="M12 3.5a8.5 8.5 0 0 0 0 17Z"/>'),
  facil: s('<path d="M5 19.5C4.5 10 10 4.5 20 4.5c0 10-5.5 15.5-15 15Z"/><path d="M5 19.5 13 11.5"/>'),
  dominada: s('<path fill="currentColor" stroke="none" d="M3 7.5l4.8 4.3L12 4.5l4.2 7.3L21 7.5l-2.1 11.5H5.1Z"/>'),
  todas: s('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  corazon: s('<path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.6 3.6 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.3 0 5.2 3.1 4.1 6.2C19.5 15.4 12 20 12 20Z"/>'),
  corazonLleno: s('<path fill="currentColor" d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.6 3.6 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.3 0 5.2 3.1 4.1 6.2C19.5 15.4 12 20 12 20Z"/>'),
  audio: s('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  repetir: s('<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>'),
  ajustes: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  atras: s('<path d="M15 5 8 12l7 7"/>'),
  flecha: s('<path d="m9 5 7 7-7 7"/>'),
  jugar: s('<path fill="currentColor" stroke="none" d="M8 4.8v14.4a1 1 0 0 0 1.5.9l11-7.2a1 1 0 0 0 0-1.8l-11-7.2A1 1 0 0 0 8 4.8Z"/>'),
  estrella: s('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z"/>'),
  descargar: s('<path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M5 19.5h14"/>'),
  arbol: s('<path d="M12 21v-7"/><path d="M12 14l-3-2.5M12 15.5l3.2-2.7"/><path d="M7.5 14.5a4.5 4.5 0 0 1-1-8.4 5 5 0 0 1 9.8-1A4.3 4.3 0 0 1 17 14c-1 .6-2.2.7-3.2.4"/><path d="M8 21h8"/>'),
  tienda: s('<path d="M4 9.5h16l-1.2-4.2a1.5 1.5 0 0 0-1.4-1.1H6.6a1.5 1.5 0 0 0-1.4 1.1Z"/><path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M10 20v-5h4v5"/>'),
  libro: s('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>'),
  trofeo: s('<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>'),
  brillo: s('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/>'),
  enviar: s('<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4 18-7Z"/>'),
  cerrar: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  candado: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  usuario: s('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z"/></svg>',
};
