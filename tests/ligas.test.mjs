import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../app/js/store.js';

const fecha = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();

test('semana ISO y días para el cierre', () => {
  assert.equal(store.semanaISO(fecha(2026, 10, 14)), '2026-W42');
  assert.equal(store.semanaISO(fecha(2026, 10, 12)), '2026-W42'); // lunes
  assert.equal(store.semanaISO(fecha(2026, 10, 18)), '2026-W42'); // domingo
  assert.equal(store.semanaISO(fecha(2026, 10, 19)), '2026-W43');
  assert.equal(store.semanaISO(fecha(2027, 1, 1)), '2026-W53');
  assert.equal(store.diasParaCierre(fecha(2026, 10, 12)), 7);
  assert.equal(store.diasParaCierre(fecha(2026, 10, 18)), 1);
});

test('ligas: cada palabra suma XP; con 100 XP subes y con menos de 20 bajas', () => {
  const e = store.estadoInicial();
  for (let i = 0; i < 100; i++) store.registrarRespuesta(e, 'en', `w${i}`, true, fecha(2026, 10, 14));
  assert.deepEqual([e.liga.nivel, e.liga.xp, e.liga.semana], [0, 100, '2026-W42']);
  assert.equal(store.actualizarLiga(e, fecha(2026, 10, 20)), 'sube');
  assert.deepEqual([e.liga.nivel, e.liga.xp], [1, 0]);
  store.registrarRespuesta(e, 'en', 'x', true, fecha(2026, 10, 21));
  assert.equal(store.actualizarLiga(e, fecha(2026, 10, 27)), 'baja', 'menos de 20 XP');
  assert.equal(e.liga.nivel, 0);
  assert.equal(store.actualizarLiga(e, fecha(2026, 11, 3)), 'igual', 'Brote no baja');
});

test('ligas: si pasa más de una semana sin estudiar, baja una liga', () => {
  const e = store.estadoInicial();
  e.liga = { nivel: 2, semana: '2026-W40', xp: 300, cambio: null };
  assert.equal(store.actualizarLiga(e, fecha(2026, 10, 14)), 'baja');
  assert.equal(e.liga.nivel, 1);
  assert.equal(store.actualizarLiga(e, fecha(2026, 10, 15)), null, 'misma semana: nada');
  assert.equal(store.actualizarLiga(e, fecha(2026, 12, 29)), 'baja');
});
