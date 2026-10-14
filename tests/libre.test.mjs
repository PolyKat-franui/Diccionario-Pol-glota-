import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../app/js/store.js';
import { filtrarLibre } from '../app/js/sesion.js';

test('estudio libre: no mueve el calendario si la sabes; si fallas, vuelve pronto sin perder su caja', () => {
  const e = store.estadoInicial();
  const prog = store.progresoDe(e, 'en');
  prog.pina = { c: 4, d: 9e12, v: 5, a: 5, f: 0, u: 1 };
  store.registrarPractica(e, 'en', 'pina', true, 1000);
  assert.deepEqual(prog.pina, { c: 4, d: 9e12, v: 5, a: 5, f: 0, u: 1 }, 'sabiéndola, nada cambia');
  assert.equal(e.tokens, 1);
  assert.equal(e.liga.xp, 1);
  store.registrarPractica(e, 'en', 'pina', false, 2000);
  assert.equal(prog.pina.c, 4, 'conserva su caja');
  assert.equal(prog.pina.d, 2000, 'vence ya: vuelve en el próximo repaso');
  store.registrarPractica(e, 'en', 'nueva', true, 3000);
  assert.equal(prog.nueva, undefined, 'una palabra nueva no se agenda en estudio libre');
});

test('estudio libre: filtra por texto (sin tildes), tema, nivel y favoritos', () => {
  const conceptos = [
    { id: 'a', megas: ['Comida'] }, { id: 'b', megas: ['Comida'] }, { id: 'c', megas: ['Viajes'] },
  ];
  const niveles = { a: 'dominada', b: 'nueva', c: 'facil' };
  const txt = { a: ['pineapple', 'piña'], b: ['bread', 'pan'], c: ['train', 'tren'] };
  const ctx = { nivelDe: (id) => niveles[id], textos: (id) => txt[id] };
  const ids = (f) => filtrarLibre(conceptos, f, ctx).map((c) => c.id);
  assert.deepEqual(ids({ texto: 'pina' }), ['a']);
  assert.deepEqual(ids({ mega: 'Comida' }), ['a', 'b']);
  assert.deepEqual(ids({ nivel: 'vistas' }), ['a', 'c']);
  assert.deepEqual(ids({ nivel: 'dominada' }), ['a']);
  assert.deepEqual(ids({ nivel: 'favoritos', favoritos: new Set(['c']) }), ['c']);
});
