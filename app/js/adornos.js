// Adornos de fondo: sakuras y monedas pixel art que flotan y caen despacio (app y página web).
// Van detrás del contenido, no se pueden tocar y se apagan con «reducir movimiento».
const PIEZAS = [['sakura', 23, 23], ['sakura', 23, 23], ['sakura', 23, 23], ['moneda', 24, 24], ['estrella', 21, 21]];

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

/** Lluvia corta de sakuras y monedas desde un punto (al tocar una neurona, al elegir idioma…). */
export function estallido(x, y, { base = 'assets/', cantidad = 10 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < cantidad; i++) {
    const [n, w, h] = PIEZAS[i % PIEZAS.length];
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
