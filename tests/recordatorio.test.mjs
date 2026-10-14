import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearICS, tocaAvisar } from '../app/js/recordatorio.js';

test('calendario: evento diario a la hora elegida, con alarma', () => {
  const ics = crearICS({ hora: '20:30', titulo: 'Estudiar con Kitty, hoy', url: 'https://x/app/', ahora: new Date(2026, 9, 14, 9) });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261014T203000\r\n/);
  assert.match(ics, /DTEND:20261014T203500\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.match(ics, /SUMMARY:Estudiar con Kitty\\, hoy/);
  assert.match(ics, /BEGIN:VALARM[\s\S]*END:VALARM/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test('aviso: solo después de la hora, si hoy no estudió y una vez al día', () => {
  const tarde = new Date(2026, 9, 14, 21, 0);
  const base = { activo: true, hora: '20:00', ultimoDiaEstudio: '2026-10-13', ultimoAviso: null };
  assert.equal(tocaAvisar(base, tarde), true);
  assert.equal(tocaAvisar(base, new Date(2026, 9, 14, 19, 59)), false, 'antes de la hora');
  assert.equal(tocaAvisar({ ...base, ultimoDiaEstudio: '2026-10-14' }, tarde), false, 'ya estudió hoy');
  assert.equal(tocaAvisar({ ...base, ultimoAviso: '2026-10-14' }, tarde), false, 'ya avisó hoy');
  assert.equal(tocaAvisar({ ...base, activo: false }, tarde), false);
});
