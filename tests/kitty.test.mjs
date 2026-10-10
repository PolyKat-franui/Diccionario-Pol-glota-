// Kitty 2.0: el pixel art está bien formado y los SVG publicados coinciden con el código.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLORES, kittyCuerpo, cara, EXPRESIONES, patita, moneda } from '../scripts/kitty-arte.mjs';
import { toSvg } from '../scripts/kitty.mjs';

const ASSETS = new URL('../app/assets/', import.meta.url);
const dibujos = { kitty: kittyCuerpo(), patita: patita(), moneda: moneda(), ...Object.fromEntries(Object.keys(EXPRESIONES).map((k) => [`cara:${k}`, cara(k)])) };

test('14 expresiones de Kitty', () => {
  assert.equal(Object.keys(EXPRESIONES).length, 14);
  const lista = JSON.parse(readFileSync(new URL('caras/caras.json', ASSETS), 'utf8'));
  assert.deepEqual(lista.map((c) => c.id), Object.keys(EXPRESIONES));
});

for (const [nombre, filas] of Object.entries(dibujos)) {
  test(`pixel art bien formado: ${nombre}`, () => {
    const ancho = filas[0].length;
    assert.ok(filas.every((f) => f.length === ancho), 'todas las filas del mismo ancho');
    const desconocidos = [...new Set(filas.join(''))].filter((ch) => ch !== '.' && !COLORES[ch]);
    assert.deepEqual(desconocidos, [], 'solo colores definidos');
  });
}

test('la patita y la moneda son simétricas', () => {
  // en la moneda se ignoran los brillos (son asimétricos a propósito): solo forma y patita
  for (const filas of [patita(), moneda().map((f) => f.replace(/[lhd]/g, 'f'))]) {
    for (const f of filas) assert.equal(f, [...f].reverse().join(''));
  }
});

test('los SVG de app/assets están al día (si falla: node scripts/kitty.mjs)', () => {
  const leer = (p) => readFileSync(new URL(p, ASSETS), 'utf8');
  assert.equal(leer('kitty-sola.svg'), toSvg(kittyCuerpo(), { titulo: 'Kitty' }));
  assert.equal(leer('patita.svg'), toSvg(patita(), { titulo: 'Racha' }));
  assert.equal(leer('moneda.svg'), toSvg(moneda(), { titulo: 'Kitty token' }));
  for (const [k, v] of Object.entries(EXPRESIONES)) assert.equal(leer(`caras/${k}.svg`), toSvg(cara(k), { titulo: `Kitty: ${v.nombre}` }));
});
