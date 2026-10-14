import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esCorrecta, normalizar, opciones, elegir } from '../app/js/prueba.js';

test('acepta sin tildes, mayúsculas ni artículo', () => {
  assert.ok(esCorrecta('Respuesta', 'la respuesta / responder'));
  assert.ok(esCorrecta('responder', 'la respuesta / responder'));
  assert.ok(esCorrecta('cancion', 'la canción'));
  assert.ok(esCorrecta('Das Haus', 'das Haus'));
});
test('acepta un error pequeño, no uno grande', () => {
  assert.ok(esCorrecta('respusta', 'la respuesta'));
  assert.ok(!esCorrecta('pregunta', 'la respuesta'));
  assert.ok(!esCorrecta('', 'la respuesta'));
  assert.ok(!esCorrecta('mar', 'mal'), 'palabras cortas: exactas');
});
test('separa varias traducciones', () => {
  assert.deepEqual(opciones('todo / completamente, todos'), ['todo', 'completamente', 'todos']);
  assert.equal(normalizar('  ¡Hola! (saludo) '), 'hola');
});
test('elige primero las que dijo saber, sin repetir', () => {
  const r = [{ id: 'a', sabia: false }, { id: 'b', sabia: true }, { id: 'b', sabia: true }, { id: 'c', sabia: true }];
  const e = elegir(r, 3, () => 0.5);
  assert.equal(e.length, 3);
  assert.deepEqual(new Set(e.slice(0, 2)), new Set(['b', 'c']));
  assert.equal(e[2], 'a');
});
