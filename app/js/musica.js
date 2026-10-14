// Música de fondo lo-fi en 8 bits, compuesta aquí mismo con Web Audio (sin archivos y sin derechos de autor).
// Acordes suaves + melodía pentatónica + bombo y platillo de ruido. Se programa unos compases por delante.
// Está apagada por defecto; se enciende en Ajustes y se pausa al salir de la app.
const BPM = 72;
const NEGRA = 60 / BPM;
// Fmaj7 · Em7 · Dm7 · Cmaj7 (MIDI)
const ACORDES = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const ESCALA = [72, 74, 76, 79, 81, 84]; // do pentatónica

let ctx = null, bus = null, ruido = null, timer = null, encendida = false;
let paso = 0, proximo = 0;
let azar = 7;
const rnd = () => ((azar = (azar * 9301 + 49297) % 233280) / 233280);
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function preparar() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const filtro = ctx.createBiquadFilter(); // calidez lo-fi
  filtro.type = 'lowpass'; filtro.frequency.value = 1800;
  bus = ctx.createGain(); bus.gain.value = 0;
  bus.connect(filtro).connect(ctx.destination);
  ruido = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function nota(f, t, dur, tipo, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

function golpe(t, bombo) {
  if (bombo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.25);
  } else {
    const s = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    s.buffer = ruido; hp.type = 'highpass'; hp.frequency.value = 6000;
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(hp).connect(g).connect(bus); s.start(t); s.stop(t + 0.08);
  }
}

// Un paso = una corchea; 8 por compás, un acorde por compás.
function programar() {
  while (proximo < ctx.currentTime + 0.6) {
    const t = proximo, compas = Math.floor(paso / 8) % 4, c = paso % 8;
    const ac = ACORDES[compas];
    if (c === 0) ac.forEach((m) => nota(hz(m), t, NEGRA * 4, 'triangle', 0.045));
    if (c === 0 || c === 5) nota(hz(ac[0] - 12), t, NEGRA * 1.5, 'triangle', 0.09);
    if (c === 0 || c === 3 || c === 6 && rnd() < 0.5) golpe(t, true);
    if (c % 2 === 1) golpe(t + (c % 4 === 1 ? 0.04 : 0), false); // swing suave
    if (rnd() < 0.32) nota(hz(ESCALA[Math.floor(rnd() * ESCALA.length)]), t, NEGRA * 0.9, 'square', 0.022);
    paso++; proximo += NEGRA / 2;
  }
}

export function musicaActiva() { return encendida; }

/** Enciende o apaga la música (llamar desde un toque de la persona). */
export function musica(on) {
  encendida = !!on;
  if (!encendida) {
    if (bus) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    clearInterval(timer); timer = null;
    return;
  }
  if (document.hidden || !preparar()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!timer) {
    proximo = ctx.currentTime + 0.1;
    timer = setInterval(programar, 200);
    programar();
  }
  bus.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2);
}

document.addEventListener('visibilitychange', () => {
  if (!encendida) return;
  if (document.hidden) { clearInterval(timer); timer = null; ctx?.suspend(); } else musica(true);
});
