// Service worker de Franui · Polykat: la app funciona sin internet y se puede instalar.
// Estrategia: primero la red (así siempre ves la versión nueva) y, si no hay conexión, lo guardado.
// El banco de palabras (data/banco/*.json) se guarda la primera vez que se usa.
// Al agregar archivos a la app, súmalos a NUCLEO (tests/pwa.test.mjs lo revisa).
const VERSION = 'franui-v16';
const NUCLEO = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css', 'css/logo.css', 'css/app.css',
  'js/main.js', 'js/i18n.js', 'js/store.js', 'js/srs.js', 'js/sesion.js', 'js/banco.js', 'js/voz.js', 'js/iconos.js',
  'js/sonido.js', 'js/adornos.js', 'js/kitty.js', 'js/nube.js', 'js/nube-config.js', 'js/jardin.js', 'js/recordatorio.js', 'js/musica.js',
  'data/idiomas.json', 'data/novedades.json',
  'assets/app/apple-touch-icon.png',
  'assets/app/favicon-32.png',
  'assets/app/icono-192.png',
  'assets/app/icono-512.png',
  'assets/app/icono-maskable-512.png',
  'assets/burbuja.svg',
  'assets/caras/avergonzada.svg',
  'assets/caras/caras.json',
  'assets/caras/celebrando.svg',
  'assets/caras/con_sueno.svg',
  'assets/caras/confundida.svg',
  'assets/caras/enamorada.svg',
  'assets/caras/enojada.svg',
  'assets/caras/feliz.svg',
  'assets/caras/guino.svg',
  'assets/caras/llorando.svg',
  'assets/caras/mareada.svg',
  'assets/caras/muy_feliz.svg',
  'assets/caras/orgullosa.svg',
  'assets/caras/pensando.svg',
  'assets/caras/sorprendida.svg',
  'assets/cerezas.svg',
  'assets/cofre-abierto.svg',
  'assets/cofre.svg',
  'assets/corazon.svg',
  'assets/diamante.svg',
  'assets/estrella.svg',
  'assets/nube.svg',
  'assets/trebol-celeste.svg',
  'assets/trebol.svg',
  'assets/pocion.svg',
  'assets/destello.svg',
  'assets/flor-celeste.svg',
  'assets/flor-rosa.svg',
  'assets/abeja.svg',
  'assets/flor-0.svg',
  'assets/flor-1.svg',
  'assets/flor-2.svg',
  'assets/flor-3.svg',
  'assets/jardin/abono-grande.svg',
  'assets/jardin/abono-magico.svg',
  'assets/jardin/abono.svg',
  'assets/jardin/arbol-0.svg',
  'assets/jardin/arbol-1.svg',
  'assets/jardin/arbol-2.svg',
  'assets/jardin/arbol-3.svg',
  'assets/jardin/arbol-4.svg',
  'assets/jardin/arbol-5.svg',
  'assets/jardin/arbol-6.svg',
  'assets/jardin/arbol-7.svg',
  'assets/jardin/atardecer.svg',
  'assets/jardin/banca.svg',
  'assets/jardin/caquita.svg',
  'assets/jardin/cesta.svg',
  'assets/jardin/chochin.svg',
  'assets/jardin/cojin.svg',
  'assets/jardin/columpio.svg',
  'assets/jardin/dango.svg',
  'assets/jardin/daruma.svg',
  'assets/jardin/estanque.svg',
  'assets/jardin/farol.svg',
  'assets/jardin/fondo-atardecer.svg',
  'assets/jardin/fondo-dia.svg',
  'assets/jardin/fondo-noche.svg',
  'assets/jardin/furin.svg',
  'assets/jardin/koinobori.svg',
  'assets/jardin/luciernagas.svg',
  'assets/jardin/maneki.svg',
  'assets/jardin/mantel.svg',
  'assets/jardin/mariposas.svg',
  'assets/jardin/noche.svg',
  'assets/jardin/petalo.svg',
  'assets/jardin/petalos.svg',
  'assets/jardin/protector.svg',
  'assets/jardin/set-te.svg',
  'assets/jardin/tanzaku.svg',
  'assets/jardin/teru.svg',
  'assets/jardin/torii.svg',
  'assets/jardin/wagasa.svg',
  'assets/jardin/estanque-atardecer.svg',
  'assets/jardin/estanque-dia.svg',
  'assets/jardin/estanque-noche.svg',
  'assets/jardin/farol-calle-on.svg',
  'assets/jardin/farol-calle.svg',
  'assets/jardin/faroles-atardecer.svg',
  'assets/jardin/faroles-dia.svg',
  'assets/jardin/faroles-noche.svg',
  'assets/jardin/koi-1.svg',
  'assets/jardin/koi-2.svg',
  'assets/jardin/mirador-atardecer.svg',
  'assets/jardin/mirador-dia.svg',
  'assets/jardin/mirador-noche.svg',
  'assets/mensaje.svg',
  'assets/moneda.svg',
  'assets/sakura.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== VERSION && k !== 'franui-recordatorio').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const esFuente = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Fuentes de Google: lo guardado primero (no cambian)
  if (esFuente(url)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copia = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copia));
      return res;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return; // Firebase y otros: directo a la red
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});

// ---------- Recordatorio diario de Kitty (Chrome/Android con la app instalada) ----------
// La app deja { activo, hora, ultimoDiaEstudio, ultimoAviso, titulo, texto } en la caché 'franui-recordatorio'.
const pad2 = (n) => String(n).padStart(2, '0');
async function revisarRecordatorio() {
  const c = await caches.open('franui-recordatorio');
  const r = await c.match('recordatorio.json');
  if (!r) return;
  const e = await r.json();
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}-${pad2(ahora.getDate())}`;
  const [h, m] = (e.hora || '20:00').split(':').map(Number);
  if (!e.activo || ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) return;
  if (e.ultimoDiaEstudio === hoy || e.ultimoAviso === hoy) return;
  await self.registration.showNotification(e.titulo, { body: e.texto, icon: 'assets/app/icono-192.png', badge: 'assets/app/favicon-32.png', tag: 'recordatorio' });
  e.ultimoAviso = hoy;
  await c.put('recordatorio.json', new Response(JSON.stringify(e), { headers: { 'content-type': 'application/json' } }));
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'recordatorio') e.waitUntil(revisarRecordatorio()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((ws) => (ws[0] ? ws[0].focus() : self.clients.openWindow('./#/estudiar?dif=todas'))));
});
