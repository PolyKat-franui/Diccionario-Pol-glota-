// Franui — página web. Animaciones suaves (respetan "reducir movimiento") y datos compartidos con la app.
import { sembrarAdornos, estallido } from './app/js/adornos.js';
import { sonido } from './app/js/sonido.js';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Aparición al hacer scroll ----------
const observador = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('visible');
    observador.unobserve(e.target);
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
const observarRevelar = (root = document) => $$('.revelar', root).forEach((el, i) => {
  el.style.setProperty('--d', `${(i % 4) * 90}ms`);
  observador.observe(el);
});
observarRevelar();

// ---------- Barra: vidrio al bajar, se esconde al bajar y vuelve al subir ----------
const nav = $('#nav');
const menu = $('#menu-movil');
let ultimoY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('solida', y > 24);
  nav.classList.toggle('oculta', y > 320 && y > ultimoY && menu.hidden);
  ultimoY = y;
}, { passive: true });

// ---------- Menú en el celular ----------
const menuBtn = $('#menu-btn');
const cerrarMenu = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-abierto'); };
menuBtn.addEventListener('click', () => {
  const abrir = menu.hidden;
  menu.hidden = !abrir;
  menuBtn.setAttribute('aria-expanded', String(abrir));
  document.body.classList.toggle('menu-abierto', abrir);
});
$$('a', menu).forEach((a) => a.addEventListener('click', cerrarMenu));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { cerrarMenu(); menuBtn.focus(); } });

// ---------- Tipografía cinética: "Hola" en seis idiomas ----------
const SALUDOS = [['Hola', 'español'], ['Hello', 'inglés'], ['Olá', 'portugués'], ['Bonjour', 'francés'], ['Ciao', 'italiano'], ['Hallo', 'alemán']];
let iSaludo = 0;
function rotarSaludo() {
  iSaludo = (iSaludo + 1) % SALUDOS.length;
  const [palabra, idioma] = SALUDOS[iSaludo];
  const rota = $('#rota');
  rota.classList.add('saliendo');
  setTimeout(() => {
    rota.textContent = palabra;
    $('#rota-idioma').textContent = idioma;
    rota.classList.remove('saliendo');
  }, quieto ? 0 : 420);
}
if (!quieto) setInterval(rotarSaludo, 2600);

// ---------- Teléfono de muestra: tarjetas reales del banco que se deslizan ----------
const DEMO = [
  ['Francés', 'Enchanté.', 'Mucho gusto.'],
  ['Italiano', 'Come stai?', '¿Cómo estás?'],
  ['Alemán', 'Bis bald.', 'Hasta pronto.'],
  ['Portugués', 'Tudo bem?', '¿Qué tal?'],
  ['Inglés', 'See you tomorrow.', 'Hasta mañana.'],
];
let iDemo = 0;
function siguienteDemo() {
  const t = $('#demo-tarjeta');
  t.classList.add('sube');
  setTimeout(() => {
    iDemo = (iDemo + 1) % DEMO.length;
    const [idioma, palabra, trad] = DEMO[iDemo];
    $('#demo-idioma').textContent = idioma;
    $('#demo-palabra').textContent = palabra;
    $('#demo-trad').textContent = trad;
    t.classList.remove('sube', 'revelada');
    t.classList.add('entra');
    setTimeout(() => t.classList.remove('entra'), 600);
    setTimeout(() => t.classList.add('revelada'), 1300);
  }, 520);
}

// Pantallas del teléfono como historias de Instagram: menú → tarjetas → premio (barras arriba).
const pantallas = $$('.pantalla');
const barras = $$('#historias i');
let iPantalla = 0;
let timersPantalla = [];
function mostrarPantalla(i) {
  timersPantalla.forEach(clearTimeout); timersPantalla = [];
  iPantalla = i;
  const p = pantallas[i];
  const dur = Number(p.dataset.dur);
  pantallas.forEach((x, k) => x.classList.toggle('activa', k === i));
  barras.forEach((b, k) => {
    b.classList.remove('llenando'); b.classList.toggle('llena', k < i);
    b.style.setProperty('--dur', `${dur}ms`);
  });
  void barras[i].offsetWidth; barras[i].classList.add('llenando');
  if (p.classList.contains('p-tarjeta')) {
    timersPantalla.push(setTimeout(() => $('#demo-tarjeta').classList.add('revelada'), 1200));
    timersPantalla.push(setTimeout(siguienteDemo, 3600), setTimeout(siguienteDemo, 7200));
  }
  if (p.classList.contains('p-premio')) { p.classList.remove('gira'); void p.offsetWidth; p.classList.add('gira'); }
  timersPantalla.push(setTimeout(() => mostrarPantalla((i + 1) % pantallas.length), dur));
}
if (quieto) { pantallas.forEach((x, k) => x.classList.toggle('activa', k === 1)); $('#demo-tarjeta').classList.add('revelada'); barras.forEach((b) => b.classList.add('llena')); }
else mostrarPantalla(0);

// Parallax suave del teléfono
const telefono = $('#telefono');
if (!quieto) addEventListener('scroll', () => {
  const y = Math.min(scrollY, 600);
  telefono.style.transform = `translateY(${y * -0.06}px) rotate(${-4 + y * 0.004}deg)`;
}, { passive: true });

// ---------- Cifras estilo tablero de aeropuerto (split flap) ----------
function animarFlap(el) {
  const final = el.dataset.valor;
  el.textContent = '';
  el.setAttribute('aria-label', final);
  const celdas = [...final].map(() => {
    const c = document.createElement('span');
    c.className = 'celda';
    c.setAttribute('aria-hidden', 'true');
    c.textContent = '0';
    el.append(c);
    return c;
  });
  if (quieto) { celdas.forEach((c, i) => { c.textContent = final[i]; }); return; }
  celdas.forEach((c, i) => {
    let vueltas = 6 + i * 3;
    const tick = () => {
      c.classList.remove('gira'); void c.offsetWidth; c.classList.add('gira');
      c.textContent = vueltas-- > 0 ? String(Math.floor(Math.random() * 10)) : final[i];
      if (vueltas >= 0) setTimeout(tick, 70);
    };
    tick();
  });
}
const obsFlap = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { animarFlap(e.target); obsFlap.unobserve(e.target); }
}), { threshold: 0.6 });
$$('.flap').forEach((f) => obsFlap.observe(f));

// ---------- Manifiesto: las palabras se encienden al hacer scroll ----------
const manifiesto = $('#manifiesto');
const palabras = manifiesto.textContent.trim().split(/\s+/);
manifiesto.setAttribute('aria-label', manifiesto.textContent.trim());
manifiesto.innerHTML = palabras.map((p) => `<span aria-hidden="true">${esc(p)} </span>`).join('');
const spans = $$('span', manifiesto);
function encender() {
  const r = manifiesto.getBoundingClientRect();
  const avance = quieto ? 1 : Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0), 1);
  const n = Math.round(avance * spans.length);
  spans.forEach((s, i) => s.classList.toggle('on', i < n));
}
addEventListener('scroll', encender, { passive: true });
encender();

// ---------- Idiomas (mismo archivo que usa la app) ----------
const nombre = (code) => {
  try { const n = new Intl.DisplayNames(['es'], { type: 'language' }).of(code); return n.charAt(0).toUpperCase() + n.slice(1); }
  catch { return code.toUpperCase(); }
};
const endonimo = (code) => {
  try { const n = new Intl.DisplayNames([code], { type: 'language' }).of(code); return n.charAt(0).toLocaleUpperCase(code) + n.slice(1); }
  catch { return ''; }
};
fetch('app/data/idiomas.json').then((r) => r.json()).then(({ idiomas }) => {
  $('#lista-idiomas').innerHTML = idiomas.map((i) => {
    const tag = i.estado === 'nuevo' ? '<span class="tag tag-nuevo">Nuevo</span>' : i.estado === 'proximamente' ? '<span class="tag tag-pronto">Próximamente</span>' : '';
    return `<li class="idioma ${i.estado} revelar"><span class="monograma">${i.code.toUpperCase()}</span>
      <span class="idioma-txt"><strong>${esc(nombre(i.code))}</strong><small lang="${i.code}">${esc(endonimo(i.code))}</small></span>${tag}</li>`;
  }).join('');
  observarRevelar($('#lista-idiomas'));
}).catch(() => {});

// ---------- Novedades (mismo archivo que usa la app) ----------
fetch('app/data/novedades.json').then((r) => r.json()).then(({ novedades }) => {
  $('#lista-novedades').innerHTML = novedades.map((n) => `
    <li class="hito revelar">
      <p class="sobretitulo"><time datetime="${n.fecha}">${new Date(n.fecha + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · v${esc(n.version)}</p>
      <h3>${esc(n.titulo)}</h3>
      <ul>${n.cambios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </li>`).join('');
  observarRevelar($('#lista-novedades'));
}).catch(() => {});

// ---------- Expresiones de Kitty (mismo archivo que genera scripts/kitty.mjs) ----------
fetch('app/assets/caras/caras.json').then((r) => r.json()).then((caras) => {
  $('#caras-galeria').innerHTML = caras.map((c) => `
    <li><button type="button" data-cara="${c.id}" aria-pressed="false"><img src="app/assets/caras/${c.id}.svg" alt="" width="80" height="64" loading="lazy"><span>${esc(c.nombre)}</span></button></li>`).join('');
}).catch(() => {});

// ---------- Kitty: preguntas frecuentes ----------
const FAQ = [
  ['¿Qué es Franui Polycat?', 'Una app para aprender vocabulario y frases cotidianas de varios idiomas, deslizando tarjetas en sesiones de uno a cinco minutos.'],
  ['¿Qué idiomas tiene?', 'Inglés, español, portugués, francés, italiano y alemán. Vienen más.'],
  ['¿Cómo funciona?', 'Eliges idioma y tema, tocas la tarjeta para ver la traducción y marcas «Lo sé» o «Repasar». Las que te cuestan vuelven antes.'],
  ['¿Necesito una cuenta?', 'Puedes entrar sin cuenta: tu avance se guarda en tu navegador. Las cuentas en la nube llegan pronto.'],
  ['¿Las traducciones son definitivas?', 'Todavía no: están en revisión y la app lo indica en cada tarjeta.'],
];
const CARA_FAQ = ['muy_feliz', 'celebrando', 'guino', 'feliz', 'avergonzada'];
const msgs = $('#kitty-msgs');
const decir = (texto, quien = 'kitty') => {
  const p = document.createElement('p');
  p.className = `msg msg-${quien}`;
  p.textContent = texto;
  msgs.append(p);
  p.scrollIntoView({ block: 'end' });
};
$('#kitty-preguntas').innerHTML = FAQ.map(([q], i) => `<button type="button" class="chip" data-i="${i}">${esc(q)}</button>`).join('');
$$('#kitty-preguntas button').forEach((b) => b.addEventListener('click', () => {
  const [q, r] = FAQ[b.dataset.i];
  decir(q, 'yo');
  setTimeout(() => { decir(r); $('#kitty-cara').src = `app/assets/caras/${CARA_FAQ[b.dataset.i]}.svg`; }, quieto ? 0 : 350);
}));
$('#kitty-fab').addEventListener('click', () => {
  if (!msgs.childElementCount) decir('¡Miau! Soy Kitty. ¿Qué quieres saber de Franui Polycat?');
  $('#kitty-panel').showModal();
});
$('#kitty-cerrar').addEventListener('click', () => $('#kitty-panel').close());
$('#kitty-panel').addEventListener('click', (e) => { if (e.target.id === 'kitty-panel') e.target.close(); });

// Sakuras y monedas que caen despacio por toda la página
sembrarAdornos(document.getElementById('adornos'), { cantidad: 12, base: 'app/assets/' });

// ---------- Cinta de saludos: todos los idiomas, los próximos marcados ----------
const SALUDOS_TODOS = [['es', 'Hola'], ['en', 'Hello'], ['pt', 'Olá'], ['fr', 'Bonjour'], ['it', 'Ciao'], ['de', 'Hallo'],
  ['ja', 'こんにちは', 1], ['ko', '안녕하세요', 1], ['zh', '你好', 1], ['ru', 'Привет', 1], ['ar', 'مرحبا', 1], ['nl', 'Hoi', 1]];
const itemsCinta = SALUDOS_TODOS.map(([code, txt, pronto], i) =>
  `<span class="cinta-item ${pronto ? 'pronto' : ''}" style="--c:var(--nodo-${(i % 6) + 1})"><b lang="${code}">${txt}</b><small>${code.toUpperCase()}${pronto ? ' · pronto' : ''}</small></span>`).join('');
$('#cinta').innerHTML = itemsCinta + itemsCinta; // dos copias para que el giro no tenga corte

// ---------- Pruébalo aquí: mazo de tarjetas que se deslizan (como Tinder) ----------
// Frases reales del banco (traducciones en borrador, como en la app).
const FRASES = [{"es":"¿Cómo estás?","en":"How are you?","pt":"Como você está?","fr":"Comment vas-tu ?","it":"Come stai?","de":"Wie geht es dir?"},{"es":"¿Quieres ir a tomar un café?","en":"Do you want to go for a coffee?","pt":"Você quer tomar um café?","fr":"Tu veux aller prendre un café ?","it":"Vuoi andare a prendere un caffè?","de":"Willst du einen Kaffee trinken gehen?"},{"es":"Que tengas un buen día.","en":"Have a nice day.","pt":"Tenha um bom dia.","fr":"Bonne journée.","it":"Buona giornata.","de":"Einen schönen Tag noch."},{"es":"Me gusta la música.","en":"I like music.","pt":"Eu gosto de música.","fr":"J'aime la musique.","it":"Mi piace la musica.","de":"Ich mag Musik."},{"es":"Vivo en Santiago.","en":"I live in Santiago.","pt":"Eu moro em Santiago.","fr":"J'habite à Santiago.","it":"Vivo a Santiago.","de":"Ich wohne in Santiago."},{"es":"¿Hablas inglés?","en":"Do you speak English?","pt":"Você fala inglês?","fr":"Tu parles anglais ?","it":"Parli inglese?","de":"Sprichst du Englisch?"},{"es":"Vengo de Chile.","en":"I come from Chile.","pt":"Eu venho do Chile.","fr":"Je viens du Chili.","it":"Vengo dal Cile.","de":"Ich komme aus Chile."},{"es":"Buenos días.","en":"Good morning.","pt":"Bom dia.","fr":"Bonjour.","it":"Buongiorno.","de":"Guten Morgen."},{"es":"¿Puedo llevar a un amigo?","en":"Can I bring a friend?","pt":"Posso levar um amigo?","fr":"Je peux venir avec un ami ?","it":"Posso portare un amico?","de":"Kann ich einen Freund mitbringen?"},{"es":"Sírvete.","en":"Help yourself.","pt":"Sirva-se.","fr":"Sers-toi.","it":"Serviti pure.","de":"Bedien dich."}];
const LENGUAS = ['en', 'pt', 'fr', 'it', 'de'];
const POR_MAZO = 5;
let lengua = 'en';
let monedasPrueba = 0;
const mazo = $('#mazo');

$('#prueba-idiomas').innerHTML = LENGUAS.map((c) => `<button type="button" role="radio" class="chip" data-l="${c}" aria-checked="${c === lengua}">${esc(nombre(c))}</button>`).join('');
$$('#prueba-idiomas button').forEach((b) => b.addEventListener('click', () => {
  lengua = b.dataset.l;
  $$('#prueba-idiomas button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  armarMazo();
}));

function armarMazo() {
  const elegidas = [...FRASES].sort(() => Math.random() - 0.5).slice(0, POR_MAZO);
  mazo.innerHTML = `
    <div class="carta carta-fin">
      <img src="app/assets/caras/celebrando.svg" alt="" width="80" height="64">
      <strong>¡Lo lograste!</strong>
      <span>Ganaste <b id="prueba-total">0</b> Kitty tokens. En la app hay 5.000 palabras más.</span>
      <a class="btn primario" href="app/">Seguir en la app</a>
      <button type="button" class="btn" id="prueba-otra">Otra ronda</button>
    </div>` + elegidas.map((f, i) => `
    <div class="carta" data-i="${i}" tabindex="0" role="button" aria-label="${esc(f[lengua])}. Toca para ver la traducción" style="--k:${i}">
      <span class="carta-idioma">${esc(nombre(lengua))} · ${i + 1}/${elegidas.length}</span>
      <span class="carta-frase" lang="${lengua}">${esc(f[lengua])}</span>
      <span class="carta-trad">${esc(f.es)}</span>
      <span class="sello sello-si">LO SÉ</span><span class="sello sello-no">REPASAR</span>
    </div>`).reverse().join('');
  $('#prueba-otra').addEventListener('click', armarMazo);
  $$('.carta[data-i]', mazo).forEach(activarCarta);
}
const cartaArriba = () => $$('.carta[data-i]:not(.fuera)', mazo).pop();

function lanzar(carta, sabia) {
  if (!carta || carta.classList.contains('fuera')) return;
  carta.classList.add('fuera');
  carta.style.transition = 'transform .45s cubic-bezier(.3,.7,.4,1), opacity .45s';
  carta.style.transform = `translateX(${sabia ? 140 : -140}%) rotate(${sabia ? 24 : -24}deg)`;
  carta.style.opacity = '0';
  sonido.deslizar(sabia);
  if (sabia) {
    monedasPrueba += 1;
    const r = carta.getBoundingClientRect();
    estallido(r.left + r.width / 2, r.top + r.height / 3, { base: 'app/assets/', cantidad: 6 });
    setTimeout(() => { sonido.moneda(); $('#prueba-monedas').textContent = monedasPrueba; pulsar($('.prueba-marcador')); }, 250);
  }
  setTimeout(() => {
    carta.remove();
    if (!cartaArriba()) { $('#prueba-total').textContent = monedasPrueba; sonido.fin(); estallido(innerWidth / 2, innerHeight / 2, { base: 'app/assets/', cantidad: 14 }); }
  }, 460);
}
const pulsar = (el) => { el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso'); };

function activarCarta(carta) {
  let x0 = null, dx = 0, movio = false;
  carta.addEventListener('pointerdown', (e) => { if (carta !== cartaArriba()) return; x0 = e.clientX; dx = 0; movio = false; carta.setPointerCapture(e.pointerId); carta.style.transition = 'none'; });
  carta.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    if (Math.abs(dx) > 6) movio = true;
    carta.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
    carta.style.setProperty('--sw', Math.max(-1, Math.min(1, dx / 90)));
  });
  const soltar = () => {
    if (x0 === null) return;
    x0 = null;
    if (Math.abs(dx) > 90) return lanzar(carta, dx > 0);
    carta.style.transition = 'transform .3s var(--ease)'; carta.style.transform = ''; carta.style.setProperty('--sw', 0);
    if (!movio) { carta.classList.toggle('revelada'); sonido.voltear(); }
  };
  carta.addEventListener('pointerup', soltar);
  carta.addEventListener('pointercancel', soltar);
  carta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); carta.classList.toggle('revelada'); }
    if (e.key === 'ArrowRight') lanzar(carta, true);
    if (e.key === 'ArrowLeft') lanzar(carta, false);
  });
}
$('#prueba-si').addEventListener('click', () => lanzar(cartaArriba(), true));
$('#prueba-no').addEventListener('click', () => lanzar(cartaArriba(), false));
armarMazo();

// ---------- Una frase, seis idiomas: avanza solo como historias; tocar salta al siguiente ----------
const ORDEN_FRASE = ['es', 'en', 'pt', 'fr', 'it', 'de'];
let iFrase = 0, iLengua = 0, timerFrase = null;
$('#frase-barras').innerHTML = ORDEN_FRASE.map(() => '<i></i>').join('');
function pintarFrase() {
  const code = ORDEN_FRASE[iLengua];
  const txt = $('#frase-texto');
  txt.classList.remove('entra'); void txt.offsetWidth; txt.classList.add('entra');
  txt.textContent = FRASES[iFrase][code];
  txt.lang = code;
  $('#frase-mono').textContent = code.toUpperCase();
  $('#frase-nombre').textContent = nombre(code);
  $('#frase-tarjeta').style.setProperty('--c', `var(--nodo-${iLengua + 1})`);
  $$('#frase-barras i').forEach((b, k) => { b.classList.toggle('llena', k < iLengua); b.classList.remove('llenando'); });
  const b = $$('#frase-barras i')[iLengua]; void b.offsetWidth; b.classList.add('llenando');
  clearTimeout(timerFrase);
  if (!quieto) timerFrase = setTimeout(avanzarFrase, 2600);
}
function avanzarFrase() {
  iLengua += 1;
  if (iLengua >= ORDEN_FRASE.length) { iLengua = 0; iFrase = (iFrase + 1) % FRASES.length; }
  pintarFrase();
}
$('#frase-tarjeta').addEventListener('click', avanzarFrase);
// Solo corre cuando está a la vista
new IntersectionObserver(([e]) => { if (e.isIntersecting) pintarFrase(); else clearTimeout(timerFrase); }, { threshold: 0.4 }).observe($('#frase-tarjeta'));

// ---------- Kitty: toca una cara y te cuenta cómo se siente ----------
const DICE_KITTY = {
  feliz: '¡Hola! Hoy es un buen día para aprender.', muy_feliz: '¡Me encanta cuando estudias conmigo!',
  guino: 'Un truco: repasa justo antes de olvidar.', sorprendida: '¿¡Ya sabes 10 palabras!? ¡Wow!',
  confundida: '¿Esa palabra? Mmm… búscala conmigo.', mareada: 'Uf, demasiadas tarjetas seguidas…',
  enamorada: 'Esta palabra va directo a favoritos ♥', llorando: 'Se cortó tu racha… ¡mañana volvemos!',
  enojada: '¡No me dejes sin estudiar tres días!', con_sueno: 'Un minuto antes de dormir también cuenta.',
  avergonzada: 'Ups, me equivoqué de idioma…', orgullosa: '¡Dominaste el tema completo!',
  pensando: '¿Cómo se dice «gato» en alemán? Katze.', celebrando: '¡Premio! Lluvia de monedas para ti.',
};
$('#caras-galeria').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cara]');
  if (!b) return;
  const id = b.dataset.cara;
  const img = $('#kitty-grande');
  img.src = `app/assets/caras/${id}.svg`;
  img.alt = `Kitty ${b.textContent.trim().toLowerCase()}, en pixel art`;
  img.classList.remove('brinca'); void img.offsetWidth; img.classList.add('brinca');
  const dice = $('#kitty-dice');
  dice.textContent = DICE_KITTY[id] ?? '¡Miau!';
  dice.classList.remove('entra'); void dice.offsetWidth; dice.classList.add('entra');
  $$('#caras-galeria button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  sonido.toque();
  if (!matchMedia('(min-width: 720px)').matches) img.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
});
