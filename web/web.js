// Franui — página web. Animaciones suaves (respetan "reducir movimiento") y datos compartidos con la app.
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
setTimeout(() => $('#demo-tarjeta').classList.add('revelada'), 1200);
if (!quieto) setInterval(siguienteDemo, 3600);

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
    <li><img src="app/assets/caras/${c.id}.svg" alt="Kitty ${esc(c.nombre.toLowerCase())}" width="80" height="64" loading="lazy"><span>${esc(c.nombre)}</span></li>`).join('');
}).catch(() => {});

// ---------- Kitty: preguntas frecuentes ----------
const FAQ = [
  ['¿Qué es Polyglok?', 'Una app para aprender vocabulario y frases cotidianas de varios idiomas, deslizando tarjetas en sesiones de uno a cinco minutos.'],
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
  if (!msgs.childElementCount) decir('¡Miau! Soy Kitty. ¿Qué quieres saber de Polyglok?');
  $('#kitty-panel').showModal();
});
$('#kitty-cerrar').addEventListener('click', () => $('#kitty-panel').close());
$('#kitty-panel').addEventListener('click', (e) => { if (e.target.id === 'kitty-panel') e.target.close(); });
