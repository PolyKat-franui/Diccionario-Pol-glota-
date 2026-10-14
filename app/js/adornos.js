// Adornos de fondo: sakuras y monedas pixel art que flotan y caen despacio (app y página web).
// Van detrás del contenido, no se pueden tocar y se apagan con «reducir movimiento».
const PIEZAS = [['sakura', 23, 23], ['flor-rosa', 9, 7], ['sakura', 23, 23], ['moneda', 24, 24], ['destello', 11, 11], ['sakura', 23, 23],
  ['flor-celeste', 9, 7], ['trebol', 15, 14], ['estrella', 21, 21], ['trebol-celeste', 15, 14]];
/** Para estallidos y lluvias: solo lo clásico (sakuras, monedas y estrellas). */
const PIEZAS_LLUVIA = [['sakura', 23, 23], ['sakura', 23, 23], ['sakura', 23, 23], ['moneda', 24, 24], ['estrella', 21, 21]];

/**
 * Llena `capa` con adornos.
 * @param {HTMLElement} capa  contenedor (posición absoluta o fija, ocupa el área a decorar)
 * @param {{ cantidad?: number, base?: string }} opciones  base = carpeta de los assets ('assets/' en la app)
 */
export function sembrarAdornos(capa, { cantidad = 14, base = 'assets/' } = {}) {
  if (!capa || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  capa.innerHTML = Array.from({ length: cantidad }, (_, i) => {
    const [n, w, h] = PIEZAS[i % PIEZAS.length];
    const escala = Math.random() < 0.3 ? 2 : 1; // a veces más grande (siempre escala entera)
    const x = (Math.random() * 100).toFixed(1);
    const dur = (14 + Math.random() * 16).toFixed(1);
    const retraso = (-Math.random() * 30).toFixed(1);
    const vaiven = Math.round(20 + Math.random() * 60);
    return `<img class="adorno adorno-${n}" src="${base}${n}.svg" alt="" width="${w * escala}" height="${h * escala}"
      style="--x:${x}%;--dur:${dur}s;--retraso:${retraso}s;--vaiven:${vaiven}px">`;
  }).join('');
}

/**
 * Visitantes: una abeja que cruza volando y nubes que pasan despacio (decoran los espacios vacíos).
 * Van detrás del contenido y no se pueden tocar.
 */
export function sembrarVisitantes(capa, { base = 'assets/', nubes = 2, abejas = 1 } = {}) {
  if (!capa || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const html = [];
  for (let i = 0; i < nubes; i++) {
    const k = i % 2 ? 2 : 3;
    html.push(`<img class="visitante nube-pasa" src="${base}nube.svg" alt="" width="${24 * k}" height="${10 * k}"
      style="--y:${(6 + i * 22 + Math.random() * 8).toFixed(1)}%;--dur:${(70 + i * 25 + Math.random() * 20).toFixed(0)}s;--retraso:-${(Math.random() * 60).toFixed(0)}s">`);
  }
  for (let i = 0; i < abejas; i++) {
    html.push(`<img class="visitante abeja-vuela" src="${base}abeja.svg" alt="" width="32" height="24"
      style="--y:${(30 + Math.random() * 40).toFixed(1)}%;--dur:${(22 + Math.random() * 10).toFixed(0)}s;--retraso:-${(Math.random() * 20).toFixed(0)}s">`);
  }
  capa.insertAdjacentHTML('beforeend', html.join(''));
}

/** Lluvia corta de sakuras y monedas desde un punto (al tocar una neurona, al elegir idioma…). */
export function estallido(x, y, { base = 'assets/', cantidad = 10 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < cantidad; i++) {
    const [n, w, h] = PIEZAS_LLUVIA[i % PIEZAS_LLUVIA.length];
    const img = document.createElement('img');
    img.src = `${base}${n}.svg`; img.alt = ''; img.width = w; img.height = h; img.className = 'chispa-adorno';
    img.style.left = `${x - w / 2}px`; img.style.top = `${y - h / 2}px`;
    document.body.append(img);
    const ang = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 90;
    img.animate([
      { transform: 'translate(0, 0) scale(.3) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 40}px) scale(1.2) rotate(200deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${Math.cos(ang) * dist * 1.2}px, ${Math.sin(ang) * dist + 60}px) scale(.8) rotate(360deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.2, .7, .4, 1)', fill: 'forwards' })
      .finished.then(() => img.remove()).catch(() => img.remove());
  }
}

/** Lluvia de sakuras (y algunas monedas) que cae por toda la pantalla: racha del día, meta cumplida… */
export function lluvia({ base = 'assets/', cantidad = 26, monedas = 0.2, dur = 2600 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < cantidad; i++) {
    const moneda = Math.random() < monedas;
    const [n, w, h] = moneda ? ['moneda', 24, 24] : ['sakura', 23, 23];
    const k = Math.random() < 0.35 ? 2 : 1; // escala entera
    const img = document.createElement('img');
    img.src = `${base}${n}.svg`; img.alt = ''; img.width = w * k; img.height = h * k; img.className = 'chispa-adorno';
    img.style.left = `${Math.random() * 100}vw`; img.style.top = `${-60 - Math.random() * 80}px`;
    document.body.append(img);
    const vaiven = (Math.random() - 0.5) * 160;
    img.animate([
      { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
      { transform: `translate(${vaiven}px, 55vh) rotate(${180 + Math.random() * 180}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${-vaiven / 2}px, calc(100vh + 160px)) rotate(540deg)`, opacity: 0.9 },
    ], { duration: dur * (0.7 + Math.random() * 0.6), delay: Math.random() * 700, easing: 'cubic-bezier(.3, .2, .6, 1)', fill: 'backwards' })
      .finished.then(() => img.remove()).catch(() => img.remove());
  }
}
