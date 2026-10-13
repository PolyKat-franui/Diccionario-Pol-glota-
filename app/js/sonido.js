// Sonidos de interacción, sintetizados con Web Audio (sin archivos de audio).
// Suenan solo después de que la persona toca algo (regla de los navegadores) y se apagan en Ajustes.
let ctx = null;
let salida = null;
let activo = true;

export function activarSonido(on) { activo = !!on; }

function audio() {
  if (!activo) return null;
  try {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      salida = ctx.createGain();
      salida.gain.value = 0.7;
      salida.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Un tono con ataque y caída cortos. t0 en segundos desde ahora. */
function tono(f, t0, dur, { tipo = 'square', vol = 0.1, hasta = null } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + t0;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(salida);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/** Soplido corto (ruido filtrado) para deslizar y voltear. */
function soplido(t0, dur, desde, hasta, vol = 0.12) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + t0;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filtro = c.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = 1.2;
  filtro.frequency.setValueAtTime(desde, t);
  filtro.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filtro).connect(g).connect(salida);
  src.start(t);
}

const vibrar = (ms) => { try { if (activo) navigator.vibrate?.(ms); } catch { /* sin vibración */ } };

export const sonido = {
  /** Clic suave para cualquier botón. */
  toque() { tono(1600, 0, 0.035, { tipo: 'triangle', vol: 0.04 }); },
  /** Moneda clásica de tragamonedas: dos notas brillantes. */
  moneda(retardo = 0, agudo = 0) {
    const k = 2 ** (agudo / 12);
    tono(988 * k, retardo, 0.07, { vol: 0.07 });
    tono(1319 * k, retardo + 0.065, 0.32, { vol: 0.07 });
    vibrar(12);
  },
  /** Varias monedas seguidas, cada una un poco más aguda. */
  monedas(n = 3) { for (let i = 0; i < n; i++) this.moneda(i * 0.09, i); },
  /** Me gusta: burbuja que sube + destello. */
  like() {
    tono(520, 0, 0.14, { tipo: 'sine', vol: 0.16, hasta: 1240 });
    tono(2093, 0.1, 0.12, { tipo: 'triangle', vol: 0.05 });
    vibrar(10);
  },
  quitar() { tono(700, 0, 0.12, { tipo: 'sine', vol: 0.08, hasta: 380 }); },
  /** Voltear la tarjeta. */
  voltear() { soplido(0, 0.16, 900, 3200, 0.08); tono(880, 0.05, 0.08, { tipo: 'triangle', vol: 0.05 }); },
  /** Deslizar: «Lo sé» sube, «Repasar» baja. */
  deslizar(sabia) {
    soplido(0, 0.22, sabia ? 600 : 2400, sabia ? 2800 : 500, 0.1);
    if (sabia) { tono(659, 0.04, 0.1, { tipo: 'triangle', vol: 0.08 }); tono(988, 0.12, 0.16, { tipo: 'triangle', vol: 0.08 }); }
    else tono(392, 0.05, 0.16, { tipo: 'triangle', vol: 0.07, hasta: 330 });
  },
  /** Rodillos girando (tic-tic que se frena). */
  rodillos(dur = 1.4) {
    let t = 0;
    let paso = 0.045;
    while (t < dur) { tono(1200 + Math.random() * 400, t, 0.025, { tipo: 'square', vol: 0.035 }); t += paso; paso *= 1.07; }
  },
  /** Un rodillo se detiene. */
  tope(retardo = 0) { tono(330, retardo, 0.09, { tipo: 'square', vol: 0.08 }); tono(660, retardo + 0.01, 0.06, { tipo: 'triangle', vol: 0.06 }); vibrar(20); },
  /** ¡Premio! Arpegio, lluvia de monedas y acorde final. */
  premio() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, i * 0.08, 0.18, { tipo: 'square', vol: 0.07 }));
    for (let i = 0; i < 10; i++) this.moneda(0.45 + i * 0.08, (i % 5) * 2);
    [1047, 1319, 1568].forEach((f) => tono(f, 1.35, 0.9, { tipo: 'triangle', vol: 0.06 }));
    vibrar([30, 40, 30, 40, 60]);
  },
  /** Sesión completa. */
  fin() { [784, 988, 1175, 1568].forEach((f, i) => tono(f, i * 0.1, 0.25, { tipo: 'triangle', vol: 0.08 })); },
};
