import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../app/js/store.js';

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const dia = (d, h = 10) => new Date(2026, 9, d, h).getTime();

test('el progreso se guarda y sigue ahí al volver a abrir la app', () => {
  const storage = memoria();
  const s = store.cargar(storage);
  s.perfil.elegido = true;
  s.aprendiendo = 'en';
  store.registrarRespuesta(s, 'en', 'en1972', true, dia(9));
  store.alternarFavorito(s, 'en', 'en1972');
  assert.ok(store.guardar(s, storage));
  const otraVez = store.cargar(storage);
  assert.equal(otraVez.tokens, 1);
  assert.equal(otraVez.progreso.en.en1972.c, 1);
  assert.deepEqual(otraVez.favoritos.en, ['en1972']);
  assert.equal(otraVez.aprendiendo, 'en');
});

test('datos dañados o almacenamiento bloqueado no rompen la app', () => {
  const rota = { getItem: () => '{no es json', setItem: () => { throw new Error('lleno'); } };
  const s = store.cargar(rota);
  assert.equal(s.tokens, 0);
  assert.equal(store.guardar(s, rota), false);
});

test('racha: suma días seguidos, no duplica el mismo día y se reinicia tras un día sin estudiar', () => {
  const r = { actual: 0, mejor: 0, ultimoDia: null };
  store.marcarDiaEstudiado(r, dia(1));
  store.marcarDiaEstudiado(r, dia(1, 22));
  store.marcarDiaEstudiado(r, dia(2));
  store.marcarDiaEstudiado(r, dia(3));
  assert.equal(r.actual, 3);
  assert.equal(store.rachaVigente(r, dia(4)), 3);  // ayer estudió: la racha sigue viva
  assert.equal(store.rachaVigente(r, dia(5)), 0);  // un día completo sin estudiar
  store.marcarDiaEstudiado(r, dia(5));
  assert.equal(r.actual, 1);
  assert.equal(r.mejor, 3);
});

test('Kitty tokens: +1 por tarjeta y +5 al terminar la sesión', () => {
  const s = store.estadoInicial();
  store.registrarRespuesta(s, 'en', 'a', true, dia(9));
  store.registrarRespuesta(s, 'en', 'b', false, dia(9));
  store.terminarSesion(s);
  assert.equal(s.tokens, 7);
  assert.equal(s.ejercicios, 2);
  assert.equal(s.racha.actual, 1);
});

test('favoritos: el corazón agrega y quita', () => {
  const s = store.estadoInicial();
  assert.equal(store.alternarFavorito(s, 'fr', 'x'), true);
  assert.ok(store.esFavorito(s, 'fr', 'x'));
  assert.equal(store.alternarFavorito(s, 'fr', 'x'), false);
  assert.ok(!store.esFavorito(s, 'fr', 'x'));
});

test('¿Qué avance conservo?: detecta avances distintos y conserva el elegido', () => {
  const cuenta = store.estadoInicial(); cuenta.tokens = 50; cuenta.ejercicios = 40;
  const nav = store.estadoInicial(); nav.tokens = 3; nav.ejercicios = 3;
  assert.ok(store.hayConflicto(cuenta, nav));
  assert.ok(!store.hayConflicto(cuenta, store.estadoInicial())); // navegador vacío: no hay que preguntar
  assert.equal(store.elegirAvance(cuenta, nav, 'cuenta').tokens, 50);
  assert.equal(store.elegirAvance(cuenta, nav, 'navegador').tokens, 3);
});

test('sugerencias: se guardan sin texto vacío', () => {
  const s = store.estadoInicial();
  assert.equal(store.agregarSugerencia(s, '   '), false);
  assert.equal(store.agregarSugerencia(s, 'Agregar japonés'), true);
  assert.equal(s.sugerencias[0].enviada, false);
});

test('normalizar completa campos nuevos en datos antiguos', () => {
  const s = store.normalizar({ tokens: 9, ajustes: { tema: 'oscuro' } });
  assert.equal(s.tokens, 9);
  assert.equal(s.ajustes.tema, 'oscuro');
  assert.equal(s.ajustes.paleta, 'creme');
  assert.equal(store.normalizar({ ajustes: { paleta: 'lavanda' } }).ajustes.paleta, 'creme');
  assert.deepEqual(s.racha, { actual: 0, mejor: 0, ultimoDia: null });
});
