import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readTsv } from '../scripts/tsv.mjs';
import { clavesFaltantes, MEGA_TEMAS } from '../app/js/i18n.js';
import { buscar, normalizar } from '../app/js/kitty.js';
import { textoParaLeer } from '../app/js/voz.js';

const R = (p) => new URL(`../${p}`, import.meta.url).pathname;

test('el banco valida (ids, traducciones, estados)', () => {
  const out = execFileSync('node', [R('scripts/build-banco.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /Banco válido: 5000 conceptos/);
});

test('el banco de inglés sigue cerrado: mismas 5.000 palabras, mismo orden', () => {
  const original = readTsv(R('banco/banco_palabras_ingles.tsv')).map((r) => r.palabra);
  const repo = readTsv(R('banco/conceptos.tsv')).map((r) => r.palabra);
  assert.equal(original.length, 5000);
  assert.deepEqual(repo, original);
});

test('todas las traducciones generadas están marcadas como borrador', () => {
  for (const l of ['es', 'pt', 'fr', 'it', 'de']) {
    const filas = readTsv(R(`banco/traducciones/${l}.tsv`));
    assert.ok(filas.length > 0);
    assert.ok(filas.every((f) => f.estado === 'borrador' || f.fuente !== 'ia'), `${l}: hay traducciones de IA sin marcar`);
  }
});

test('los 13 mega temas del banco tienen traducción en la interfaz', () => {
  const megas = new Set(readTsv(R('banco/conceptos.tsv')).flatMap((r) => r.mega_tema.split('|').map((s) => s.trim())));
  assert.equal(megas.size, 13);
  for (const m of megas) assert.ok(MEGA_TEMAS.includes(m), m);
});

test('la interfaz tiene todos los textos en los 6 idiomas', () => {
  for (const [l, faltan] of Object.entries(clavesFaltantes())) assert.deepEqual(faltan, [], l);
});

test('Kitty encuentra palabras sin importar tildes ni artículos', () => {
  const e = [
    { id: '1', meta: 'water', nativo: 'el agua', tipos: ['sustantivo'] },
    { id: '2', meta: 'How are you?', nativo: '¿Cómo estás?', tipos: ['frase'] },
  ];
  assert.equal(buscar('agua', e)[0].id, '1');
  assert.equal(buscar('como estas', e)[0].id, '2');
  assert.equal(buscar('zzz', e).length, 0);
  assert.equal(normalizar('¿Cómo ESTÁS?'), 'como estas');
});

test('la voz no lee paréntesis aclaratorios', () => {
  assert.equal(textoParaLeer('ocupado (línea)'), 'ocupado');
  assert.equal(textoParaLeer('la respuesta / responder'), 'la respuesta, responder');
});

test('el diccionario JSON de la app está al día con los TSV', () => {
  const es = JSON.parse(readFileSync(R('app/data/banco/es.json'), 'utf8'));
  const filas = readTsv(R('banco/traducciones/es.tsv')).filter((f) => f.texto);
  assert.equal(Object.keys(es).length, filas.length, 'corre: npm run build');
});
