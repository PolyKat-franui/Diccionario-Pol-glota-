// Service worker de la pausa: borra lo guardado por la app instalada y se da de baja,
// para que el celular muestre la pantalla «Volvemos pronto» en vez de la app antigua.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
