// Publicación: modo completo y modo pausa (sitio.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { armar } from '../scripts/dist.mjs';

test('en pausa, la web y la app muestran «Volvemos pronto» y el service worker limpia la app instalada', () => {
  const d = join(mkdtempSync(join(tmpdir(), 'dist-')), 'dist');
  assert.equal(armar(d, { pausado: true }), 'pausa');
  for (const pagina of ['index.html', 'app/index.html']) {
    const html = readFileSync(join(d, pagina), 'utf8');
    assert.match(html, /Estamos haciendo una pausa/);
    for (const [, src] of html.matchAll(/(?:src|href)="((?:css|assets)\/[^"]+)"/g)) assert.ok(existsSync(join(d, dirname(pagina), src)), `${pagina}: falta ${src}`);
  }
  assert.match(readFileSync(join(d, 'app/sw.js'), 'utf8'), /unregister/);
  assert.ok(!existsSync(join(d, 'app/js/main.js')), 'la app no se publica en pausa');
  for (const f of ['privacidad', 'terminos', 'cookies']) assert.ok(existsSync(join(d, `legal/${f}.html`)), `en pausa siguen los textos legales (${f})`);
  assert.match(readFileSync(join(d, 'index.html'), 'utf8'), /href="legal\/privacidad.html"/);
  assert.match(readFileSync(join(d, 'app/index.html'), 'utf8'), /href="\.\.\/legal\/privacidad.html"/);
});

test('sin pausa, se publica la web y la app completas', () => {
  const d = join(mkdtempSync(join(tmpdir(), 'dist-')), 'dist');
  assert.equal(armar(d, { pausado: false }), 'completo');
  assert.ok(existsSync(join(d, 'app/js/main.js')));
  assert.ok(existsSync(join(d, 'web.js')));
});

function dirname(p) { return p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '.'; }

test('textos legales: existen, enlazan entre sí y sus recursos existen', () => {
  const raiz = new URL('../', import.meta.url).pathname;
  for (const f of ['privacidad', 'terminos', 'cookies']) {
    const html = readFileSync(join(raiz, 'web/legal', `${f}.html`), 'utf8');
    assert.match(html, /Borrador/);
    for (const [, href] of html.matchAll(/href="(\.\.\/app\/[^"]+|[a-z]+\.(?:html|css))"/g)) {
      assert.ok(existsSync(join(raiz, 'web/legal', href)) || existsSync(join(raiz, href.replace('../', ''))), `${f}: no existe ${href}`);
    }
  }
  assert.match(readFileSync(join(raiz, 'web/index.html'), 'utf8'), /legal\/privacidad\.html/);
});
