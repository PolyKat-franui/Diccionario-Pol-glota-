// Recordatorio diario de Kitty.
// 1) Calendario (.ics): funciona en cualquier celular, también iPhone.
// 2) Notificación del service worker (periodicSync): solo donde el navegador lo permite (Chrome/Android con la app instalada).
//    El service worker no puede leer localStorage, así que le dejamos un JSON chico en la caché.

export const CACHE_RECORDATORIO = 'franui-recordatorio';
export const URL_ESTADO = 'recordatorio.json';

const dosDig = (n) => String(n).padStart(2, '0');
const escICS = (s) => String(s).replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** Evento diario (RRULE:FREQ=DAILY) a la hora local elegida, con alarma. Devuelve el texto .ics. */
export function crearICS({ hora = '20:00', titulo, descripcion = '', url = '', ahora = new Date() }) {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(ahora);
  const fecha = `${d.getFullYear()}${dosDig(d.getMonth() + 1)}${dosDig(d.getDate())}`;
  const ini = `${fecha}T${dosDig(h)}${dosDig(m)}00`;
  const finMin = h * 60 + m + 5;
  const fin = `${fecha}T${dosDig(Math.floor(finMin / 60) % 24)}${dosDig(finMin % 60)}00`;
  const sello = d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Franui Polykat//Recordatorio//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:recordatorio-${fecha}@franui-polykat`,
    `DTSTAMP:${sello}`,
    `DTSTART:${ini}`, `DTEND:${fin}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escICS(titulo)}`,
    descripcion ? `DESCRIPTION:${escICS(descripcion)}` : null,
    url ? `URL:${url}` : null,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escICS(titulo)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].filter((l) => l !== null).join('\r\n');
}

/** ¿Toca avisar? Solo después de la hora, si hoy no estudió y si aún no avisó hoy. */
export function tocaAvisar({ activo, hora, ultimoDiaEstudio, ultimoAviso }, ahora = new Date()) {
  if (!activo) return false;
  const pad = dosDig;
  const hoy = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
  const [h, m] = (hora || '20:00').split(':').map(Number);
  if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) return false;
  return ultimoDiaEstudio !== hoy && ultimoAviso !== hoy;
}

/** Guarda en la caché lo que el service worker necesita saber. */
export async function publicarEstado(estado) {
  if (!('caches' in self)) return;
  const c = await caches.open(CACHE_RECORDATORIO);
  await c.put(URL_ESTADO, new Response(JSON.stringify(estado), { headers: { 'content-type': 'application/json' } }));
}

/** Pide permiso y registra la revisión periódica. Devuelve 'ok' | 'sin-permiso' | 'no-soporta'. */
export async function activarAvisos() {
  if (!('Notification' in self) || !('serviceWorker' in navigator)) return 'no-soporta';
  const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permiso !== 'granted') return 'sin-permiso';
  const reg = await navigator.serviceWorker.ready;
  if (!('periodicSync' in reg)) return 'no-soporta';
  try {
    await reg.periodicSync.register('recordatorio', { minInterval: 60 * 60 * 1000 });
    return 'ok';
  } catch { return 'no-soporta'; }
}

export async function desactivarAvisos() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  await reg.periodicSync?.unregister('recordatorio').catch(() => {});
}
