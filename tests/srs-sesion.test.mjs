import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responder, dificultad, DIA_MS, CAJA_MAX } from '../app/js/srs.js';
import { armarSesion, bloques, bloqueActual, grupoDificultad, ordenar, practicaLibre } from '../app/js/sesion.js';

const T0 = Date.UTC(2026, 9, 9, 12);

test('acertar sube de caja y aleja la próxima repetición', () => {
  let e = responder(undefined, true, T0);
  assert.equal(e.c, 1);
  assert.equal(e.d, T0 + 1 * DIA_MS);
  e = responder(e, true, T0);
  assert.equal(e.c, 2);
  assert.equal(e.d, T0 + 3 * DIA_MS);
  assert.deepEqual([e.v, e.a, e.f], [2, 2, 0]);
});

test('fallar vuelve a la caja 0 y la tarjeta vence enseguida', () => {
  const e = responder({ c: 4, v: 5, a: 5, f: 0, d: 0 }, false, T0);
  assert.equal(e.c, 0);
  assert.equal(e.d, T0);
  assert.equal(e.f, 1);
});

test('la caja no pasa del máximo', () => {
  let e;
  for (let i = 0; i < 20; i++) e = responder(e, true, T0);
  assert.equal(e.c, CAJA_MAX);
});

test('íconos de dificultad: nueva, difícil, media, fácil, dominada', () => {
  assert.equal(dificultad(undefined), 'nueva');
  assert.equal(dificultad({ c: 0 }), 'dificil');
  assert.equal(dificultad({ c: 1 }), 'media');
  assert.equal(dificultad({ c: 3 }), 'facil');
  assert.equal(dificultad({ c: CAJA_MAX }), 'dominada');
});

const ids = Array.from({ length: 25 }, (_, i) => `en${String(i + 1).padStart(4, '0')}`);

test('sesión nueva: 10 tarjetas nuevas del primer bloque (Kumon)', () => {
  const s = armarSesion({ ids, progreso: {}, ahora: T0 });
  assert.equal(s.cola.length, 10);
  assert.deepEqual(s.cola, ids.slice(0, 10));
  assert.equal(s.bloque, 0);
  assert.equal(s.totalBloques, 3);
});

test('el bloque 2 se abre al dominar el 80 % del bloque 1', () => {
  const prog = {};
  ids.slice(0, 8).forEach((id) => { prog[id] = responder(undefined, true, T0); });
  assert.equal(bloqueActual(bloques(ids), prog), 1);
  const s = armarSesion({ ids, progreso: prog, ahora: T0 });
  // las 8 acertadas no vencen hoy; las 2 sin ver del bloque 1 ya no son "nuevas del bloque actual"
  assert.deepEqual(s.cola, ids.slice(10, 20));
});

test('las tarjetas vencidas van primero', () => {
  const prog = { [ids[0]]: responder(undefined, false, T0) };
  const s = armarSesion({ ids, progreso: prog, ahora: T0 + 1000 });
  assert.equal(s.cola[0], ids[0]);
  assert.equal(s.cola.length, 10);
});

test('todo al día cuando no hay nada pendiente', () => {
  const prog = Object.fromEntries(ids.map((id) => [id, responder(undefined, true, T0)]));
  const s = armarSesion({ ids, progreso: prog, ahora: T0 + 1000 });
  assert.equal(s.motivo, 'aldia');
  assert.equal(practicaLibre({ ids, progreso: prog, azar: () => 0.5 }).length, 10);
});

test('dificultad elegible por nivel y orden de lo básico a lo complejo', () => {
  assert.equal(grupoDificultad({ nivel: 'Pre-A1' }), 'facil');
  assert.equal(grupoDificultad({ nivel: 'A2' }), 'medio');
  assert.equal(grupoDificultad({ nivel: '' }), 'medio');
  assert.equal(grupoDificultad({ nivel: 'B1' }), 'dificil');
  const o = ordenar([{ id: 'c', nivel: 'B1', rango: 0 }, { id: 'b', nivel: 'A1', rango: 300 }, { id: 'a', nivel: 'A1', rango: 10 }]);
  assert.deepEqual(o.map((x) => x.id), ['a', 'b', 'c']);
});
