// App instalable: manifest, íconos (sakura sobre carmesí) y service worker con todos los archivos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const APP = new URL('../app/', import.meta.url).pathname;
const leer = (r) => readFileSync(join(APP, r), 'utf8');
const pngTam = (r) => { const b = readFileSync(join(APP, r)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const archivos = (dir) => readdirSync(join(APP, dir)).flatMap((f) => (statSync(join(APP, dir, f)).isDirectory() ? archivos(join(dir, f)) : [join(dir, f)]));

test('manifest: nombre, colores carmesí e íconos con su tamaño real', () => {
  const m = JSON.parse(leer('manifest.webmanifest'));
  assert.equal(m.name, 'Franui · Polycat');
  assert.equal(m.display, 'standalone');
  assert.equal(m.background_color, '#9E2A3A');
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) {
    const [w, h] = pngTam(i.src);
    assert.equal(`${w}x${h}`, i.sizes, i.src);
  }
  assert.deepEqual(pngTam('assets/app/apple-touch-icon.png'), [180, 180]);
});

test('index.html enlaza el manifest y el ícono para iPhone', () => {
  const html = leer('index.html');
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/);
  assert.match(html, /apple-touch-icon\.png/);
});

test('service worker: guarda todos los archivos de la app para usarla sin internet', () => {
  const sw = leer('sw.js');
  const bloque = sw.slice(sw.indexOf('const NUCLEO'), sw.indexOf('];', sw.indexOf('const NUCLEO')));
  const nucleo = [...bloque.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const necesarios = [...archivos('js'), ...archivos('css'), ...archivos('assets'), 'data/idiomas.json', 'data/novedades.json', 'index.html', 'manifest.webmanifest'];
  for (const f of necesarios) assert.ok(nucleo.includes(f), `falta en NUCLEO de sw.js: ${f}`);
  for (const f of nucleo.filter((x) => x.includes('.'))) assert.ok(existsSync(join(APP, f)), `NUCLEO nombra un archivo que no existe: ${f}`);
});
